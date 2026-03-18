import { getRedis } from './client';

export interface ClickEvent {
  linkId: string;
  workspaceId: string;
  slug: string;
  clickedAt: string; // ISO string
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  referrerDomain?: string;
  referrerType?: string;
  isBot: boolean;
  ipHash?: string;
  ua?: string;
}

const CLICK_BUFFER_KEY = 'click:buffer';

/**
 * Push a click event onto the Redis list buffer (fire-and-forget, non-blocking)
 */
export async function bufferClickEvent(event: ClickEvent): Promise<void> {
  const redis = getRedis();
  await redis.rpush(CLICK_BUFFER_KEY, JSON.stringify(event));
}

/**
 * Drain up to `count` events from the buffer for processing
 */
export async function drainClickBuffer(count = 500): Promise<ClickEvent[]> {
  const redis = getRedis();
  
  // Use a pipeline to atomically pop N events
  const pipeline = redis.pipeline();
  for (let i = 0; i < count; i++) {
    pipeline.lpop(CLICK_BUFFER_KEY);
  }
  
  const results = await pipeline.exec();
  if (!results) return [];

  return results
    .map(([err, value]) => {
      if (err || !value) return null;
      try {
        return JSON.parse(value as string) as ClickEvent;
      } catch {
        return null;
      }
    })
    .filter((e): e is ClickEvent => e !== null);
}

/**
 * Get buffer length for monitoring
 */
export async function getClickBufferLength(): Promise<number> {
  const redis = getRedis();
  return redis.llen(CLICK_BUFFER_KEY);
}
