// -------------------------------------------------------
// Simple In-Memory TTL Cache for Metrics
// -------------------------------------------------------

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
const MAX_CACHE_SIZE = 500;
let lastCleanup = Date.now();

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt < now) {
      cache.delete(key);
    }
  }

  enforceMaxCacheSize();
}

/**
 * Evict oldest entries if cache exceeds MAX_CACHE_SIZE.
 * Called from both cleanupExpired() and setCache() to ensure the size
 * limit is enforced even when the cleanup interval hasn't elapsed.
 */
function enforceMaxCacheSize() {
  if (cache.size <= MAX_CACHE_SIZE) return;
  const entries = [...cache.entries()].sort(
    (a, b) => a[1].expiresAt - b[1].expiresAt
  );
  const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE);
  for (const [key] of toRemove) {
    cache.delete(key);
  }
}

/**
 * Get a cached value by key. Returns null if expired or missing.
 */
export function getCached<T>(key: string): T | null {
  cleanupExpired();
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

/**
 * Store a value in cache with TTL.
 */
export function setCache<T>(key: string, data: T, ttlMs = DEFAULT_TTL): void {
  const validatedTtl = (Number.isFinite(ttlMs) && ttlMs > 0) ? ttlMs : DEFAULT_TTL;
  cleanupExpired();
  cache.set(key, { data, expiresAt: Date.now() + validatedTtl });
  enforceMaxCacheSize();
}

/**
 * Recursively sort object keys for deterministic JSON stringification.
 * Uses an ancestors Set for true cycle detection (only objects on the current
 * recursion path) and a WeakMap cache to memoize already-sorted shared refs.
 */
function sortKeys(
  value: unknown,
  ancestors: Set<object> = new Set(),
  memo: WeakMap<object, unknown> = new WeakMap()
): unknown {
  if (value === null || typeof value !== "object") return value;

  const obj = value as object;

  // True cycle: this object is an ancestor on the current path
  if (ancestors.has(obj)) return "[Circular]";

  // Shared reference (not a cycle): return memoized result
  if (memo.has(obj)) return memo.get(obj);

  ancestors.add(obj);

  let result: unknown;
  if (Array.isArray(value)) {
    result = value.map((v) => sortKeys(v, ancestors, memo));
  } else {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key], ancestors, memo);
    }
    result = sorted;
  }

  ancestors.delete(obj);
  memo.set(obj, result);
  return result;
}

/**
 * Build a deterministic cache key from userId, metric name, and optional params.
 */
export function buildCacheKey(
  userId: string,
  metric: string,
  params?: Record<string, unknown>
): string {
  const trimmedUserId = userId?.trim();
  const trimmedMetric = metric?.trim();
  if (!trimmedUserId || !trimmedMetric) {
    throw new Error("buildCacheKey requires non-empty userId and metric");
  }
  // Encode userId and metric to prevent delimiter collisions
  // (e.g., userId "a:b" + metric "c" vs userId "a" + metric "b:c")
  const encodedUserId = encodeURIComponent(trimmedUserId);
  const encodedMetric = encodeURIComponent(trimmedMetric);
  // Treat empty objects ({}) the same as undefined to prevent cache misses
  const hasParams = params && Object.keys(params).length > 0;
  const paramStr = hasParams
    ? ":" + JSON.stringify(sortKeys(params))
    : "";
  return `${encodedUserId}:${encodedMetric}${paramStr}`;
}
