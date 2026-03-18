export { getRedis, closeRedis } from './client';
export { getCachedLink, setCachedLink, invalidateCachedLink } from './cache';
export { checkRateLimit, getDailyIPSalt } from './ratelimit';
export type { RateLimitResult } from './ratelimit';
export { bufferClickEvent, drainClickBuffer, getClickBufferLength } from './events';
export type { ClickEvent } from './events';
