import { createHash } from 'crypto';

/**
 * Get the daily rotating salt key name (e.g. "salt:2024-01-15")
 */
export function getDailySaltKey(): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
  return `salt:${date}`;
}

/**
 * Hash an IP address with a daily rotating salt.
 * GDPR-safe: raw IP never stored. Irreversible.
 */
export async function hashIP(ip: string, salt: string): Promise<string> {
  return createHash('sha256')
    .update(`${salt}:${ip}`)
    .digest('hex')
    .slice(0, 32); // 32 hex chars = 16 bytes = 128 bits
}

/**
 * Validate a URL — must be http:// or https://, max 2048 chars, no localhost
 */
export function isValidUrl(url: string): boolean {
  if (url.length > 2048) return false;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false;
    if (hostname.endsWith('.local')) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalise a referrer URL to its hostname only
 */
export function getReferrerDomain(referer?: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Classify a referrer domain into a traffic type
 */
export function classifyReferrer(domain: string | null): string {
  if (!domain) return 'direct';

  const social = ['t.co', 'twitter.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'tiktok.com', 'youtube.com', 'reddit.com', 'pinterest.com', 'wa.me', 'api.whatsapp.com'];
  const search = ['google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com', 'baidu.com', 'yandex.com'];
  const email = ['mail.google.com', 'outlook.live.com', 'mail.yahoo.com'];

  if (social.some(s => domain.includes(s))) return 'social';
  if (search.some(s => domain.includes(s))) return 'search';
  if (email.some(s => domain.includes(s))) return 'email';

  return 'other';
}
