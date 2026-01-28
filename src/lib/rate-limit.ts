import { NextRequest } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
  failureCount: number;
  lastFailureAt: number;
}

// In-memory store - for production, consider using Redis
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

/**
 * Compute the block expiry time for an entry based on exponential backoff.
 */
function computeBlockExpiry(entry: RateLimitEntry, maxFailures: number, baseBlockMs: number): number {
  if (entry.failureCount < maxFailures || entry.lastFailureAt === 0) {
    return 0; // No block active
  }
  const backoffMs = baseBlockMs * Math.pow(2, entry.failureCount - maxFailures);
  return entry.lastFailureAt + Math.min(backoffMs, 60 * 60 * 1000); // Cap at 1 hour
}

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    // Compute the actual block expiry using the same backoff formula
    const blockExpiry = computeBlockExpiry(entry, DEFAULT_CONFIG.maxFailures, DEFAULT_CONFIG.baseBlockMs);
    // Only delete if both the rate limit window and any active block have expired
    if (entry.resetAt < now && blockExpiry < now) {
      rateLimitStore.delete(key);
    }
  }
}

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

/**
 * Check rate limit for a given key (usually IP or IP+action).
 * Returns whether the request is allowed and optional retry-after time.
 */
export function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {}
): RateLimitResult {
  cleanupExpiredEntries();

  const { maxRequests, windowMs, maxFailures, baseBlockMs } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const now = Date.now();
  let entry = rateLimitStore.get(key);

  if (!entry) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
      failureCount: 0,
      lastFailureAt: 0,
    };
    rateLimitStore.set(key, entry);
  }

  // Reset counter if window expired
  if (entry.resetAt < now) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }

  // Check if blocked due to failures (exponential backoff)
  if (entry.failureCount >= maxFailures) {
    const backoffMs = baseBlockMs * Math.pow(2, entry.failureCount - maxFailures);
    const blockExpiresAt = entry.lastFailureAt + Math.min(backoffMs, 60 * 60 * 1000); // Cap at 1 hour

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

  // Check request count limit
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterMs: entry.resetAt - now,
      isBlocked: false,
    };
  }

  // Increment counter and allow
  entry.count++;
  return { allowed: true };
}

/**
 * Record a failed attempt (e.g., invalid token).
 * This increases the failure counter for exponential backoff.
 */
export function recordFailure(key: string): void {
  let entry = rateLimitStore.get(key);

  if (!entry) {
    entry = {
      count: 0,
      resetAt: Date.now() + DEFAULT_CONFIG.windowMs,
      failureCount: 0,
      lastFailureAt: 0,
    };
    rateLimitStore.set(key, entry);
  }

  entry.failureCount++;
  entry.lastFailureAt = Date.now();
}

/**
 * Reset failure count on successful action.
 */
export function resetFailures(key: string): void {
  const entry = rateLimitStore.get(key);
  if (entry) {
    entry.failureCount = 0;
    entry.lastFailureAt = 0;
  }
}
