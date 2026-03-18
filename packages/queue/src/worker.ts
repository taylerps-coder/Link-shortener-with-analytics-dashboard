import { Worker } from 'bullmq';
import { drainClickBuffer, getRedis } from '@linksnap/redis';
import { insertClick, incrementClickCount } from '@linksnap/db';
import { parseUserAgent, getReferrerDomain, classifyReferrer, hashIP } from '@linksnap/utils';
import { connection, QUEUE_CLICK_FLUSH, QUEUE_DNS_VERIFY, dnsVerifyQueue } from './queues';
import type { DNSVerifyJobData } from './queues';

// DNS module for verification
import { promises as dns } from 'dns';

// ─── Click Flush Worker ───────────────────────────────────────────────────────

const clickWorker = new Worker(
  QUEUE_CLICK_FLUSH,
  async (job) => {
    const events = await drainClickBuffer(500);
    
    if (events.length === 0) {
      return { processed: 0 };
    }

    const redis = getRedis();
    
    // Get today's IP salt
    const date = new Date().toISOString().split('T')[0];
    const salt = await redis.get(`salt:${date}`) ?? 'fallback-salt';

    // Enrich and insert all events
    const inserts = await Promise.allSettled(
      events.map(async (event) => {
        // Enrich UA if needed
        let { device, browser, os, isBot } = event;
        if (event.ua && !device) {
          const parsed = parseUserAgent(event.ua);
          device = parsed.device;
          browser = parsed.browser;
          os = parsed.os;
          isBot = parsed.isBot;
        }

        // Skip bots
        if (isBot) return;

        await insertClick({
          linkId: event.linkId,
          workspaceId: event.workspaceId,
          country: event.country,
          city: event.city,
          device,
          browser,
          os,
          referrerDomain: event.referrerDomain,
          referrerType: event.referrerType,
          isBot: event.isBot,
          ipHash: event.ipHash,
        });

        await incrementClickCount(event.linkId);
      })
    );

    const processed = inserts.filter(r => r.status === 'fulfilled').length;
    console.log(`[click-flush] Processed ${processed}/${events.length} click events`);
    return { processed };
  },
  { connection, concurrency: 1 }
);

// Schedule the click flush job every 5 seconds if not already running
async function scheduleClickFlush() {
  const { clickFlushQueue } = await import('./queues');
  
  // Repeatable job: flush clicks every 5 seconds
  await clickFlushQueue.add(
    'flush',
    {},
    {
      repeat: { every: 5000 },
      jobId: 'click-flush-repeatable',
    }
  );
  console.log('[queue] Scheduled click-flush job (every 5s)');
}

// ─── DNS Verification Worker ──────────────────────────────────────────────────

// Exponential backoff schedule in seconds
const DNS_RETRY_DELAYS = [30, 120, 600, 3600, 7200, 14400, 28800];

const dnsWorker = new Worker<DNSVerifyJobData>(
  QUEUE_DNS_VERIFY,
  async (job) => {
    const { domainId, domain, workspaceId, attempt } = job.data;
    const proxyTarget = process.env.PROXY_CNAME_TARGET ?? 'proxy.sho.rt';
    
    console.log(`[dns-verify] Verifying CNAME for ${domain} (attempt ${attempt + 1})`);
    
    try {
      const records = await dns.resolveCname(domain);
      const verified = records.some(r => r.toLowerCase() === proxyTarget.toLowerCase());
      
      if (verified) {
        // Mark domain as active in DB
        const { db, customDomains } = await import('@linksnap/db');
        const { eq } = await import('drizzle-orm');
        
        await db.update(customDomains)
          .set({ status: 'active', verifiedAt: new Date() })
          .where(eq(customDomains.id, domainId));
        
        console.log(`[dns-verify] ${domain} verified successfully!`);
        return { verified: true };
      }
    } catch (err) {
      // DNS lookup failed — domain not ready yet
    }

    // Not verified yet
    if (attempt < DNS_RETRY_DELAYS.length - 1) {
      const nextAttempt = attempt + 1;
      const delay = DNS_RETRY_DELAYS[nextAttempt] * 1000;
      
      await dnsVerifyQueue.add('verify', {
        domainId, domain, workspaceId, attempt: nextAttempt,
      }, { delay });
      
      console.log(`[dns-verify] ${domain} not verified. Retry ${nextAttempt + 1} in ${DNS_RETRY_DELAYS[nextAttempt]}s`);
    } else {
      // Max attempts reached — mark as failed
      const { db, customDomains } = await import('@linksnap/db');
      const { eq } = await import('drizzle-orm');
      
      await db.update(customDomains)
        .set({ status: 'failed' })
        .where(eq(customDomains.id, domainId));
      
      console.log(`[dns-verify] ${domain} verification failed after max attempts`);
    }

    return { verified: false };
  },
  { connection, concurrency: 5 }
);

// Error handlers
clickWorker.on('failed', (job, err) => {
  console.error(`[click-flush] Job ${job?.id} failed:`, err);
});

dnsWorker.on('failed', (job, err) => {
  console.error(`[dns-verify] Job ${job?.id} failed:`, err);
});

// Graceful shutdown
async function shutdown() {
  console.log('[queue] Shutting down workers...');
  await clickWorker.close();
  await dnsWorker.close();
  await connection.quit();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start
(async () => {
  await scheduleClickFlush();
  console.log('[queue] Workers started. Listening for jobs...');
})();

export { clickWorker, dnsWorker };
