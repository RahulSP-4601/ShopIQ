import { Redis } from "@upstash/redis";

let redis: Redis | null = null;
let initialized = false;

/**
 * Get a shared Upstash Redis client (REST-based, serverless-safe).
 * Returns null if UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * are not configured. Callers should fall back to in-memory alternatives.
 */
export function getRedisClient(): Redis | null {
  if (initialized) return redis;
  initialized = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[Redis] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not set. " +
          "Rate limiting will use in-memory fallback (not shared across serverless instances)."
      );
    }
    return null;
  }

  try {
    redis = new Redis({ url, token });
  } catch (error) {
    console.error("[Redis] Failed to create client:", error instanceof Error ? error.message : error);
    redis = null;
  }

  return redis;
}
