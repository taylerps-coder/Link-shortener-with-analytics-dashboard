import { Hono } from 'hono';
import { parseUserAgent, getReferrerDomain, classifyReferrer } from '@linksnap/utils';

// ─── Env bindings (defined in wrangler.toml) ──────────────────────────────────
interface Bindings {
  LINKSNAP_KV: KVNamespace;
  REDIS_URL: string;
  DATABASE_URL: string;
  APP_DOMAIN: string;
  PROXY_CNAME_TARGET: string;
}

interface LinkData {
  id: string;
  originalUrl: string;
  expiresAt?: string;
  active: boolean;
}

const app = new Hono<{ Bindings: Bindings }>();

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }));

// ─── Slug Redirect ────────────────────────────────────────────────────────────
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const env = c.env;

  // ── 1. Cache lookup (KV = Cloudflare Edge cache) ──────────────────────────
  let link: LinkData | null = null;
  
  const cached = await env.LINKSNAP_KV.get(slug);
  if (cached) {
    try {
      link = JSON.parse(cached) as LinkData;
    } catch {
      link = null;
    }
  }

  // ── 2. Fallback: fetch from origin (Next.js API) ──────────────────────────
  if (!link) {
    try {
      const apiUrl = `https://${env.APP_DOMAIN}/api/internal/links/${slug}`;
      const res = await fetch(apiUrl, {
        headers: { 'X-Internal-Token': env.DATABASE_URL }, // Use a proper secret in prod
      });
      
      if (res.ok) {
        link = await res.json() as LinkData;
        // Cache in KV for 1 hour
        if (link) {
          await env.LINKSNAP_KV.put(slug, JSON.stringify(link), { expirationTtl: 3600 });
        }
      }
    } catch (err) {
      console.error('Origin fetch failed:', err);
    }
  }

  // ── 3. Not found ──────────────────────────────────────────────────────────
  if (!link || !link.active) {
    return c.text('Link not found', 404);
  }

  // ── 4. Expiry check ───────────────────────────────────────────────────────
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return c.text('This link has expired.', 410);
  }

  // ── 5. Fire click event (non-blocking) ────────────────────────────────────
  const ua = c.req.header('user-agent');
  const referer = c.req.header('referer');
  const country = c.req.header('cf-ipcountry');
  const city = c.req.header('cf-ipcity');
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for');

  const parsed = parseUserAgent(ua);
  const referrerDomain = getReferrerDomain(referer);
  const referrerType = classifyReferrer(referrerDomain);

  // Fire and forget — do NOT await to keep latency minimal
  c.executionCtx.waitUntil(
    recordClick({
      linkId: link.id,
      slug,
      country,
      city,
      device: parsed.device,
      browser: parsed.browser,
      os: parsed.os,
      referrerDomain: referrerDomain ?? undefined,
      referrerType,
      isBot: parsed.isBot,
      ip: ip ?? undefined,
      env,
    })
  );

  // ── 6. 302 Redirect ───────────────────────────────────────────────────────
  return c.redirect(link.originalUrl, 302);
});

// ─── Record Click (async, sent to origin) ────────────────────────────────────
async function recordClick(params: {
  linkId: string;
  slug: string;
  country?: string | null;
  city?: string | null;
  device: string;
  browser: string;
  os: string;
  referrerDomain?: string;
  referrerType: string;
  isBot: boolean;
  ip?: string;
  env: Bindings;
}) {
  if (params.isBot) return; // Drop bots

  try {
    await fetch(`https://${params.env.APP_DOMAIN}/api/internal/clicks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': params.env.DATABASE_URL,
      },
      body: JSON.stringify({
        linkId: params.linkId,
        clickedAt: new Date().toISOString(),
        country: params.country,
        city: params.city,
        device: params.device,
        browser: params.browser,
        os: params.os,
        referrerDomain: params.referrerDomain,
        referrerType: params.referrerType,
        isBot: params.isBot,
        ip: params.ip,
      }),
    });
  } catch (err) {
    console.error('Failed to record click:', err);
  }
}

export default app;
