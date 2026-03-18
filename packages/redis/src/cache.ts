import { getRedis } from './client';

/**
 * Simple in-process LRU cache (L1)
 * Avoids Redis round-trip for hot slugs
 */
class LRUCache<K, V> {
  private map: Map<K, V>;
  private max: number;

  constructor(max: number) {
    this.map = new Map();
    this.max = max;
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key)!;
    // Move to end (most recently used)
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.max) {
      // Delete least recently used (first item)
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) this.map.delete(firstKey);
    }
    this.map.set(key, value);
  }

  delete(key: K): void {
    this.map.delete(key);
  }
}

// L1: In-process LRU, holds up to 1000 slugs, ~0.1ms hit latency
const l1Cache = new LRUCache<string, { url: string; linkId: string; expiresAt?: number }>(1000);

const CACHE_TTL = 3600; // 1 hour Redis TTL

/**
 * Get cached URL for slug.
 * L1 → L2 (Redis) cascade.
 */
export async function getCachedLink(slug: string): Promise<{ url: string; linkId: string } | null> {
  // L1
  const l1 = l1Cache.get(slug);
  if (l1) {
    if (l1.expiresAt && Date.now() > l1.expiresAt) {
      l1Cache.delete(slug);
    } else {
      return { url: l1.url, linkId: l1.linkId };
    }
  }

  // L2 (Redis)
  const redis = getRedis();
  const raw = await redis.get(`link:${slug}`);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw) as { url: string; linkId: string };
    // Backfill L1
    l1Cache.set(slug, { ...data, expiresAt: Date.now() + CACHE_TTL * 1000 });
    return data;
  } catch {
    return null;
  }
}

/**
 * Cache a slug → URL mapping in both L1 and L2 (Redis)
 */
export async function setCachedLink(slug: string, url: string, linkId: string, ttl = CACHE_TTL): Promise<void> {
  const redis = getRedis();
  const data = { url, linkId };
  await redis.setex(`link:${slug}`, ttl, JSON.stringify(data));
  l1Cache.set(slug, { ...data, expiresAt: Date.now() + ttl * 1000 });
}

/**
 * Invalidate a slug from both cache layers
 */
export async function invalidateCachedLink(slug: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`link:${slug}`);
  l1Cache.delete(slug);
}
