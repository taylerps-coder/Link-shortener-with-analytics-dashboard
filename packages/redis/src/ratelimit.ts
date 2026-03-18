import { getRedis } from './client';

/**
 * Sliding window rate limiter using atomic Lua scripts.
 * Tracks counts in a sorted set keyed by {prefix}:{identifier}.
 */
const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local id = ARGV[4]

-- Remove old entries outside the window
redis.call('ZREMRANGEBYSCORE', key, 0, now - window * 1000)

-- Count current entries
local current = redis.call('ZCARD', key)

if current < limit then
  -- Add this request
  redis.call('ZADD', key, now, id .. ':' .. now)
  redis.call('EXPIRE', key, window + 1)
  return {current + 1, limit, 0}
else
  -- Rate limited
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local reset = 0
  if #oldest > 0 then
    reset = tonumber(oldest[2]) + window * 1000
  end
  return {current, limit, reset}
end
`;

export interface RateLimitResult {
  current: number;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds when the window resets
  limited: boolean;
}

const PLAN_LIMITS: Record<string, { links: number; api: number }> = {
  free: { links: 10, api: 100 },
  pro: { links: 500, api: 2000 },
  team: { links: 999999, api: 10000 },
};

export async function checkRateLimit(
  workspaceId: string,
  type: 'links' | 'api',
  plan: 'free' | 'pro' | 'team' = 'free',
  windowSeconds = 3600
): Promise<RateLimitResult> {
  const redis = getRedis();
  const key = `rl:${type}:${workspaceId}`;
  const now = Date.now();
  const limit = PLAN_LIMITS[plan][type];
  const uniqueId = `${workspaceId}:${now}`;

  const result = await redis.eval(
    RATE_LIMIT_SCRIPT,
    1,
    key,
    String(now),
    String(windowSeconds),
    String(limit),
    uniqueId
  ) as [number, number, number];

  const [current, , reset] = result;
  const limited = current > limit;

  return {
    current,
    limit,
    remaining: Math.max(0, limit - current),
    reset: reset ? Math.ceil(reset / 1000) : Math.ceil((now + windowSeconds * 1000) / 1000),
    limited,
  };
}

/**
 * Get the daily IP salt, creating it fresh each day
 */
export async function getDailyIPSalt(): Promise<string> {
  const redis = getRedis();
  const date = new Date().toISOString().split('T')[0];
  const key = `salt:${date}`;

  let salt = await redis.get(key);
  if (!salt) {
    // Generate a new salt for today
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    salt = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    // Expire after 48 hours to allow for time zone differences
    await redis.setex(key, 172800, salt);
  }
  return salt;
}
