import { NextRequest } from "next/server";
import { getRedisClient } from "@/lib/redis";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
  failureCount: number;
  lastFailureAt: number;
  maxFailures: number;
  baseBlockMs: number;
}

export interface RateLimitConfig {
  maxRequests: number; // Max requests per window
  windowMs: number; // Time window in milliseconds
  maxFailures: number; // Max failures before exponential backoff
  baseBlockMs: number; // Base block duration for failures
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10, // 10 requests
  windowMs: 60 * 1000, // per minute
  maxFailures: 5, // 5 failures
  baseBlockMs: 1000, // 1 second base block
};

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
  isBlocked?: boolean;
}

// -------------------------------------------------------
// In-Memory Store (fallback when Redis is unavailable)
// -------------------------------------------------------

const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_STORE_SIZE = 10000;

const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function computeBlockExpiry(entry: RateLimitEntry): number {
  if (entry.failureCount < entry.maxFailures || entry.lastFailureAt === 0) {
    return 0;
  }
  const backoffMs = entry.baseBlockMs * Math.pow(2, entry.failureCount - entry.maxFailures);
  return entry.lastFailureAt + Math.min(backoffMs, 60 * 60 * 1000); // Cap at 1 hour
}

function evictIfNeeded() {
  if (rateLimitStore.size <= MAX_STORE_SIZE) return;

  const now = Date.now();
  const entries = [...rateLimitStore.entries()].sort((a, b) => {
    const aExpiry = Math.max(a[1].resetAt, computeBlockExpiry(a[1]));
    const bExpiry = Math.max(b[1].resetAt, computeBlockExpiry(b[1]));
    return aExpiry - bExpiry;
  });
  // Remove expired first, then oldest if still over limit
  for (const [key, entry] of entries) {
    if (rateLimitStore.size <= MAX_STORE_SIZE) break;
    if (entry.resetAt < now && computeBlockExpiry(entry) < now) {
      rateLimitStore.delete(key);
    }
  }
  // If still over limit, forcefully evict oldest
  if (rateLimitStore.size > MAX_STORE_SIZE) {
    for (const [key] of entries) {
      if (rateLimitStore.size <= MAX_STORE_SIZE) break;
      rateLimitStore.delete(key);
    }
  }
}

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now && computeBlockExpiry(entry) < now) {
      rateLimitStore.delete(key);
    }
  }

  evictIfNeeded();
}

// -------------------------------------------------------
// getClientIP (synchronous — reads request headers only)
// -------------------------------------------------------

export function getClientIP(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  // Log warning when IP cannot be determined - this should be investigated
  console.warn(
    "getClientIP: Unable to determine client IP. Available headers:",
    Object.fromEntries(
      ["x-forwarded-for", "x-real-ip", "cf-connecting-ip", "true-client-ip"]
        .map((h) => [h, request.headers.get(h)])
        .filter(([, v]) => v !== null)
    )
  );
  return null;
}

// -------------------------------------------------------
// In-Memory Implementations
// -------------------------------------------------------

function checkRateLimitMemory(key: string, config: RateLimitConfig): RateLimitResult {
  cleanupExpiredEntries();

  const { maxRequests, windowMs, maxFailures, baseBlockMs } = config;
  const now = Date.now();
  let entry = rateLimitStore.get(key);

  if (!entry) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
      failureCount: 0,
      lastFailureAt: 0,
      maxFailures,
      baseBlockMs,
    };
    rateLimitStore.set(key, entry);
    evictIfNeeded();
  }

  // Reset counter if window expired
  if (entry.resetAt < now) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }

  // Check if blocked due to failures (exponential backoff)
  // Use entry.maxFailures and entry.baseBlockMs (not local config) to match computeBlockExpiry()
  if (entry.failureCount >= entry.maxFailures) {
    const backoffMs = entry.baseBlockMs * Math.pow(2, entry.failureCount - entry.maxFailures);
    const blockExpiresAt = entry.lastFailureAt + Math.min(backoffMs, 60 * 60 * 1000);

    if (now < blockExpiresAt) {
      return {
        allowed: false,
        retryAfterMs: blockExpiresAt - now,
        isBlocked: true,
      };
    }
    // Block expired, reset failure count
    entry.failureCount = 0;
  }

  // Increment counter first (aligns with Redis INCR-then-check pattern)
  entry.count++;

  // Check request count limit (using > to match Redis behavior after increment)
  if (entry.count > maxRequests) {
    return {
      allowed: false,
      retryAfterMs: entry.resetAt - now,
      isBlocked: false,
    };
  }

  return { allowed: true };
}

/**
 * Mask a rate-limit key for safe logging (avoid leaking IPs/emails).
 * Shows first 4 and last 2 chars with the middle masked.
 */
function maskKey(key: string): string {
  if (key.length <= 8) return "***";
  return `${key.slice(0, 4)}***${key.slice(-2)}`;
}

function recordFailureMemory(key: string, config?: RateLimitConfig): void {
  let entry = rateLimitStore.get(key);
  const effectiveConfig = config || DEFAULT_CONFIG;

  if (!entry) {
    entry = {
      count: 0,
      resetAt: Date.now() + effectiveConfig.windowMs,
      failureCount: 0,
      lastFailureAt: 0,
      maxFailures: effectiveConfig.maxFailures,
      baseBlockMs: effectiveConfig.baseBlockMs,
    };
    rateLimitStore.set(key, entry);
    evictIfNeeded();
  } else {
    // Sync config values on existing entries to match Redis behavior
    // (Redis stores maxFailures/baseBlockMs on every recordFailure call)
    if (entry.maxFailures !== effectiveConfig.maxFailures || entry.baseBlockMs !== effectiveConfig.baseBlockMs) {
      console.warn(
        `Rate limit config overwrite for key "${maskKey(key)}": ` +
        `maxFailures ${entry.maxFailures}→${effectiveConfig.maxFailures}, ` +
        `baseBlockMs ${entry.baseBlockMs}→${effectiveConfig.baseBlockMs}`
      );
    }
    entry.maxFailures = effectiveConfig.maxFailures;
    entry.baseBlockMs = effectiveConfig.baseBlockMs;
  }

  entry.failureCount++;
  entry.lastFailureAt = Date.now();
}

function resetFailuresMemory(key: string): void {
  const entry = rateLimitStore.get(key);
  if (entry) {
    entry.failureCount = 0;
    entry.lastFailureAt = 0;
    // Reset to defaults to match resetFailuresRedis which deletes these keys
    // (next checkRateLimitRedis reads null → falls back to config defaults)
    entry.maxFailures = DEFAULT_CONFIG.maxFailures;
    entry.baseBlockMs = DEFAULT_CONFIG.baseBlockMs;
  }
}

// -------------------------------------------------------
// Redis Lua Scripts (for atomic operations)
// -------------------------------------------------------

// Atomic failure reset: only delete if fail count matches observed value (strict CAS guard)
const RESET_FAILURES_SCRIPT = `
local failCountKey = KEYS[1]
local failTimeKey = KEYS[2]
local maxFailuresKey = KEYS[3]
local baseBlockMsKey = KEYS[4]
local observedFailCount = tonumber(ARGV[1])

local currentFailCount = tonumber(redis.call('GET', failCountKey) or '0')

-- Only reset if count matches what caller observed (prevents race conditions)
if currentFailCount == observedFailCount then
  redis.call('DEL', failCountKey)
  redis.call('DEL', failTimeKey)
  redis.call('DEL', maxFailuresKey)
  redis.call('DEL', baseBlockMsKey)
  return 1
end

return 0
`;

// Atomic failure recording: INCR failCount, SET failTime/maxFailures/baseBlockMs, EXPIRE all
const RECORD_FAILURE_SCRIPT = `
local failCountKey = KEYS[1]
local failTimeKey = KEYS[2]
local maxFailuresKey = KEYS[3]
local baseBlockMsKey = KEYS[4]
local nowMs = ARGV[1]
local maxFailures = ARGV[2]
local baseBlockMs = ARGV[3]
local ttl = tonumber(ARGV[4])

local newCount = redis.call('INCR', failCountKey)
redis.call('SET', failTimeKey, nowMs)
redis.call('SET', maxFailuresKey, maxFailures)
redis.call('SET', baseBlockMsKey, baseBlockMs)
redis.call('EXPIRE', failCountKey, ttl)
redis.call('EXPIRE', failTimeKey, ttl)
redis.call('EXPIRE', maxFailuresKey, ttl)
redis.call('EXPIRE', baseBlockMsKey, ttl)

return newCount
`;

// Atomic INCR + conditional PEXPIRE (prevents TTL loss on crash)
const INCR_WITH_EXPIRE_SCRIPT = `
local key = KEYS[1]
local windowMs = tonumber(ARGV[1])

local count = redis.call('INCR', key)
if count == 1 then
  redis.call('PEXPIRE', key, windowMs)
end

return count
`;

// -------------------------------------------------------
// Redis Implementations
// -------------------------------------------------------

async function checkRateLimitRedis(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const redis = getRedisClient()!;
  const { maxRequests, windowMs, maxFailures, baseBlockMs } = config;
  const now = Date.now();

  // Check failure-based block first
  const failCountKey = `rl:fc:${key}`;
  const failTimeKey = `rl:ft:${key}`;
  const maxFailuresKey = `rl:mf:${key}`;
  const baseBlockMsKey = `rl:bb:${key}`;

  const [failCountRaw, failTimeRaw, storedMaxFailuresRaw, storedBaseBlockMsRaw] = await Promise.all([
    redis.get<number>(failCountKey),
    redis.get<number>(failTimeKey),
    redis.get<number>(maxFailuresKey),
    redis.get<number>(baseBlockMsKey),
  ]);

  const failCount = Number(failCountRaw) || 0;
  const lastFailAt = Number(failTimeRaw) || 0;
  // Use stored config values if available, fall back to passed config
  const effectiveMaxFailures = Number(storedMaxFailuresRaw) || maxFailures;
  const effectiveBaseBlockMs = Number(storedBaseBlockMsRaw) || baseBlockMs;

  if (failCount >= effectiveMaxFailures && lastFailAt > 0) {
    const backoffMs = effectiveBaseBlockMs * Math.pow(2, failCount - effectiveMaxFailures);
    const blockExpiresAt = lastFailAt + Math.min(backoffMs, 60 * 60 * 1000);
    if (now < blockExpiresAt) {
      return { allowed: false, retryAfterMs: blockExpiresAt - now, isBlocked: true };
    }
    // Block expired, atomically reset if count hasn't changed (prevents race)
    const resetResult = await redis.eval(
      RESET_FAILURES_SCRIPT,
      [failCountKey, failTimeKey, maxFailuresKey, baseBlockMsKey],
      [String(failCount)]
    ) as number;

    // If CAS failed (resetResult=0), another process modified the fail count
    // Re-read current state and maintain block if still above threshold
    if (resetResult === 0) {
      const [currentFailCountRaw, currentFailTimeRaw] = await Promise.all([
        redis.get<number>(failCountKey),
        redis.get<number>(failTimeKey),
      ]);
      const currentFailCount = Number(currentFailCountRaw) || 0;
      const freshLastFailAt = Number(currentFailTimeRaw) || 0;

      // Only treat as blocked if BOTH conditions are met:
      // 1. Fail count still above threshold
      // 2. We have a valid timestamp (freshLastFailAt > 0)
      // Missing timestamp indicates data corruption/expiry — fail open (allow through)
      if (currentFailCount >= effectiveMaxFailures && freshLastFailAt > 0) {
        // Still blocked, recompute backoff using fresh currentFailCount and freshLastFailAt
        const freshBackoffMs = effectiveBaseBlockMs * Math.pow(2, currentFailCount - effectiveMaxFailures);
        const freshBlockExpiresAt = freshLastFailAt + Math.min(freshBackoffMs, 60 * 60 * 1000);

        // Check if block has expired (freshBlockExpiresAt <= now)
        if (freshBlockExpiresAt <= now) {
          // Block expired, allow through (will reset on next recordFailure or allow)
          // Fall through to sliding window check below
        } else {
          return { allowed: false, retryAfterMs: Math.max(0, freshBlockExpiresAt - now), isBlocked: true };
        }
      }
      // Fail count dropped below threshold or timestamp missing — allow through
    }
  }

  // Sliding window counter (atomic INCR + conditional PEXPIRE)
  const windowKey = `rl:w:${key}`;
  const count = await redis.eval(
    INCR_WITH_EXPIRE_SCRIPT,
    [windowKey],
    [String(windowMs)]
  ) as number;

  if (count > maxRequests) {
    const ttl = await redis.pttl(windowKey);
    return { allowed: false, retryAfterMs: ttl > 0 ? ttl : windowMs, isBlocked: false };
  }

  return { allowed: true };
}

async function recordFailureRedis(key: string, config?: RateLimitConfig): Promise<void> {
  const redis = getRedisClient()!;
  const failCountKey = `rl:fc:${key}`;
  const failTimeKey = `rl:ft:${key}`;
  const maxFailuresKey = `rl:mf:${key}`;
  const baseBlockMsKey = `rl:bb:${key}`;

  const effective = config || DEFAULT_CONFIG;

  // Atomic Lua script ensures all failure state is written consistently
  await redis.eval(
    RECORD_FAILURE_SCRIPT,
    [failCountKey, failTimeKey, maxFailuresKey, baseBlockMsKey],
    [String(Date.now()), String(effective.maxFailures), String(effective.baseBlockMs), "3600"]
  );
}

async function resetFailuresRedis(key: string): Promise<void> {
  const redis = getRedisClient()!;
  // Single atomic DEL command — prevents partial state if one key fails
  await redis.del(
    `rl:fc:${key}`,
    `rl:ft:${key}`,
    `rl:mf:${key}`,
    `rl:bb:${key}`
  );
}

// -------------------------------------------------------
// Exported Functions — Redis with in-memory fallback
//
// Uses Redis when configured (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
// Falls back to in-memory if Redis is not configured or on connection error.
// -------------------------------------------------------

/**
 * Check rate limit for a given key (usually IP or IP+action).
 * Returns whether the request is allowed and optional retry-after time.
 */
export async function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {}
): Promise<RateLimitResult> {
  const effective = { ...DEFAULT_CONFIG, ...config };
  const redis = getRedisClient();
  if (!redis) return checkRateLimitMemory(key, effective);
  try {
    return await checkRateLimitRedis(key, effective);
  } catch (error) {
    console.error("Redis rate limit error, falling back to in-memory:", error instanceof Error ? error.message : error);
    return checkRateLimitMemory(key, effective);
  }
}

/**
 * Record a failed attempt (e.g., invalid credentials).
 * This increases the failure counter for exponential backoff.
 */
export async function recordFailure(key: string, config?: Partial<RateLimitConfig>): Promise<void> {
  const effective = config ? { ...DEFAULT_CONFIG, ...config } : DEFAULT_CONFIG;
  const redis = getRedisClient();
  if (!redis) { recordFailureMemory(key, effective); return; }
  try {
    await recordFailureRedis(key, effective);
  } catch (error) {
    console.error("Redis recordFailure error, falling back to in-memory:", error instanceof Error ? error.message : error);
    recordFailureMemory(key, effective);
  }
}

/**
 * Reset failure count on successful action.
 */
export async function resetFailures(key: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) { resetFailuresMemory(key); return; }
  try {
    await resetFailuresRedis(key);
  } catch (error) {
    console.error("Redis resetFailures error, falling back to in-memory:", error instanceof Error ? error.message : error);
    resetFailuresMemory(key);
  }
}
