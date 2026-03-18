import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// ─── Queue Names ──────────────────────────────────────────────────────────────
export const QUEUE_CLICK_FLUSH = 'click-flush';
export const QUEUE_DNS_VERIFY = 'dns-verify';

// ─── Click Flush Queue ────────────────────────────────────────────────────────
export const clickFlushQueue = new Queue(QUEUE_CLICK_FLUSH, {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
});

// ─── DNS Verification Queue ───────────────────────────────────────────────────
export interface DNSVerifyJobData {
  domainId: number;
  domain: string;
  workspaceId: string;
  attempt: number;
}

export const dnsVerifyQueue = new Queue<DNSVerifyJobData>(QUEUE_DNS_VERIFY, {
  connection,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 1, // Each job is one attempt; we reschedule manually
  },
});

export { connection };
