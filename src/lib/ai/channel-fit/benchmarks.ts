// src/lib/ai/channel-fit/benchmarks.ts
// Cross-tenant anonymous benchmarks — the key differentiator

import "server-only";
import { createHmac } from "crypto";
import prisma from "@/lib/prisma";
import { buildCacheKey, getCached, setCache } from "@/lib/metrics/cache";
import type {
  InternalClusterBenchmark,
  CrossTenantRow,
  RecentSalesRow,
  RawCrossTenantRow,
  RawRecentSalesRow,
} from "./types.server";
import type { MarketDemand } from "./types";
import { MIN_SELLERS_FOR_BENCHMARK, BENCHMARK_TTL_MS } from "./types";

/**
 * One-way pseudonymisation for user IDs before caching.
 * Uses a keyed HMAC so the pseudonyms are non-reversible even if the
 * hash algorithm is known.
 *
 * PSEUDONYM_KEY MUST be set in production — the module will refuse to
 * start without it outside of development/test environments.
 *
 * Used so the in-process cache (see @/lib/metrics/cache — Map-backed,
 * NOT an external store like Redis) never holds real user IDs.
 */
let _pseudonymKey: string | null = null;

function getPseudonymKey(): string {
  if (_pseudonymKey) return _pseudonymKey;

  const key = process.env.PSEUDONYM_KEY;
  if (key) {
    if (key.length < 32) {
      const msg =
        `PSEUDONYM_KEY must be at least 32 characters (got ${key.length}). ` +
        "Set it to a random 32+ character secret.";
      console.error(msg);
      throw new Error(msg);
    }
    _pseudonymKey = key;
    return key;
  }

  // Non-production environments allowed to use a default key.
  // Add new env names here as your pipeline grows (e.g., "ci", "e2e").
  const NON_PRODUCTION_ENVS = new Set(["development", "test", "preview"]);
  const env = process.env.NODE_ENV;
  if (NON_PRODUCTION_ENVS.has(env || "")) {
    _pseudonymKey = "shopiq-dev-pseudonym-key-not-for-production";
    return _pseudonymKey;
  }

  // Fail fast in production — do not run with an insecure default key
  const msg =
    "FATAL: PSEUDONYM_KEY environment variable is required in production. " +
    "Set it to a random 32+ character secret.";
  console.error(msg);
  throw new Error(msg);
}

/** Per-query timeout for cross-tenant benchmark queries to prevent pool-wait hangs (milliseconds). */
const BENCHMARK_QUERY_TIMEOUT_MS = 30_000;
/** Transaction timeout slightly above statement_timeout to allow Postgres to abort cleanly. */
const BENCHMARK_TXN_TIMEOUT_MS = BENCHMARK_QUERY_TIMEOUT_MS + 5_000;

function pseudonymiseUserId(userId: string): string {
  return createHmac("sha256", getPseudonymKey())
    .update(userId)
    .digest("hex")
    .slice(0, 16);
}

// -------------------------------------------------------
// Title Normalization & Clustering
// -------------------------------------------------------

const STOP_WORDS = new Set([
  // prepositions / articles / connectors
  "of", "in", "on", "at", "to", "or", "an", "it", "is", "so",
  "no", "my", "up", "us", "do", "if", "as", "be", "by",
  // e-commerce filler
  "for",
  "with",
  "and",
  "the",
  "pack",
  "set",
  "pcs",
  "piece",
  "new",
  "best",
  "premium",
  "quality",
  "original",
  "genuine",
  "free",
  "shipping",
  "sale",
  "offer",
  "combo",
  "buy",
  "size",
  "color",
  "colour",
  "small",
  "medium",
  "large",
  "xl",
  "xxl",
  "xs",
  "red",
  "blue",
  "green",
  "black",
  "white",
  "pink",
  "yellow",
  "grey",
  "gray",
  "brown",
]);

/**
 * Extract significant keywords from a product title.
 * Allows 2-char tokens (e.g. "TV", "PC", "4K", "AC") that are
 * meaningful for product clustering — stop words catch common filler.
 */
export function normalizeTitle(title: string): string[] {
  return title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // strip punctuation, keep Unicode letters & numbers
    .split(/\s+/) // split on whitespace
    .filter((w) => w.length >= 2) // drop single-char tokens, keep meaningful 2-char (TV, PC, 4K)
    .filter((w) => !STOP_WORDS.has(w)) // drop filler
    .filter((w) => !/^\d+$/.test(w)); // drop pure numbers (but "4k" survives — it has a letter)
}

/**
 * Build a deterministic cluster key from a product title.
 * Deduplicates keywords, sorts alphabetically, and takes the first 4.
 */
export function buildClusterKey(title: string): string {
  const keywords = normalizeTitle(title);
  const sorted = [...new Set(keywords)].sort().slice(0, 4);
  return sorted.join(" ") || "_uncategorized";
}

// -------------------------------------------------------
// Cross-Tenant Aggregation
// -------------------------------------------------------

interface CachedBenchmarkData {
  fullPeriodRows: CrossTenantRow[];
  recentRows: RecentSalesRow[];
}

// Single-flight map: prevents duplicate DB queries when cache expires
// and multiple concurrent requests try to rebuild at the same time.
const inflightRequests = new Map<string, Promise<CachedBenchmarkData>>();

/**
 * Fetch cross-tenant benchmark data. Cached for 24h.
 * The heavy DB queries run at most once per 24h, then clustering
 * happens in-memory for each user's specific products.
 */
async function fetchCrossTenantData(
  periodStart: Date,
  periodEnd: Date
): Promise<CachedBenchmarkData> {
  // Check cache first — use full ISO timestamps so the key matches the exact
  // query window (callers snap start/end to UTC boundaries, keeping keys stable).
  const cacheKey = buildCacheKey("__benchmark__", "channel-fit", {
    start: periodStart.toISOString(),
    end: periodEnd.toISOString(),
  });

  const cached = getCached<CachedBenchmarkData>(cacheKey);
  if (cached) return cached;

  // Single-flight: if another request is already fetching this exact key,
  // await its result instead of firing duplicate DB queries
  const inflight = inflightRequests.get(cacheKey);
  if (inflight) return inflight;

  const promise = (async (): Promise<CachedBenchmarkData> => {
    try {
      // Query 1: Full period aggregates (all sellers, all marketplaces)
      // HAVING filters zero-quantity groups; LIMIT caps memory usage.
      const CROSS_TENANT_ROW_LIMIT = 100_000;
      // Use DB-side statement_timeout so Postgres aborts the query and releases
      // the connection instead of relying on a JS setTimeout (which leaks connections).
      const fullPeriodRows = await prisma.$transaction(async (tx) => {
        // $executeRawUnsafe is required here because SET LOCAL doesn't support
        // parameterised placeholders ($1) — Postgres requires a literal string.
        // The value is an internal numeric constant (BENCHMARK_QUERY_TIMEOUT_MS),
        // not user input, so there is no injection risk.
        await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = '${BENCHMARK_QUERY_TIMEOUT_MS}'`);
        return tx.$queryRaw<RawCrossTenantRow[]>`
        SELECT
          o."marketplace"::text AS marketplace,
          o."userId" AS user_id,
          COALESCE(oi."title", 'Unknown') AS product_title,
          SUM(COALESCE(CAST(oi."unitPrice" AS double precision), 0) * COALESCE(oi."quantity", 0)) AS revenue,
          SUM(COALESCE(oi."quantity", 0)) AS units_sold,
          CASE WHEN SUM(COALESCE(oi."quantity", 0)) > 0
            THEN SUM(COALESCE(CAST(oi."unitPrice" AS double precision), 0) * COALESCE(oi."quantity", 0)) / SUM(COALESCE(oi."quantity", 0))
            ELSE 0
          END AS avg_price
        FROM "UnifiedOrderItem" oi
        JOIN "UnifiedOrder" o ON oi."orderId" = o."id"
        WHERE o."orderedAt" >= ${periodStart}
          AND o."orderedAt" <= ${periodEnd}
          AND o."status" != 'CANCELLED'::"UnifiedOrderStatus"
        GROUP BY o."marketplace", o."userId", COALESCE(oi."title", 'Unknown')
        HAVING SUM(COALESCE(oi."quantity", 0)) > 0
        ORDER BY revenue DESC, units_sold DESC
        LIMIT ${CROSS_TENANT_ROW_LIMIT}
      `;
      }, { timeout: BENCHMARK_TXN_TIMEOUT_MS });

      if (fullPeriodRows.length >= CROSS_TENANT_ROW_LIMIT) {
        console.warn(
          `Channel-fit: fullPeriodRows hit ${CROSS_TENANT_ROW_LIMIT} row limit — benchmark accuracy may be reduced`
        );
      }

      // Query 2: Last 7 days relative to periodEnd (not "now")
      // so the recent window stays consistent with the analysis period.
      // Use UTC-safe operations to keep the 7-day window timezone-robust.
      // Clamp to periodStart so short analysis windows (e.g., 5 days)
      // don't reach outside the requested period.
      const sevenDaysAgo = new Date(periodEnd);
      sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
      sevenDaysAgo.setUTCHours(0, 0, 0, 0);
      if (sevenDaysAgo < periodStart) {
        sevenDaysAgo.setTime(periodStart.getTime());
      }

      const recentRows = await prisma.$transaction(async (tx) => {
        // $executeRawUnsafe: see comment above — SET LOCAL needs a literal string,
        // and the interpolated value is a trusted internal constant.
        await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = '${BENCHMARK_QUERY_TIMEOUT_MS}'`);
        return tx.$queryRaw<RawRecentSalesRow[]>`
        SELECT
          o."marketplace"::text AS marketplace,
          o."userId" AS user_id,
          COALESCE(oi."title", 'Unknown') AS product_title,
          SUM(COALESCE(oi."quantity", 0)) AS units_sold
        FROM "UnifiedOrderItem" oi
        JOIN "UnifiedOrder" o ON oi."orderId" = o."id"
        WHERE o."orderedAt" >= ${sevenDaysAgo}
          AND o."orderedAt" <= ${periodEnd}
          AND o."status" != 'CANCELLED'::"UnifiedOrderStatus"
        GROUP BY o."marketplace", o."userId", COALESCE(oi."title", 'Unknown')
        HAVING SUM(COALESCE(oi."quantity", 0)) > 0
        ORDER BY units_sold DESC
        LIMIT ${CROSS_TENANT_ROW_LIMIT}
      `;
      }, { timeout: BENCHMARK_TXN_TIMEOUT_MS });

      if (recentRows.length >= CROSS_TENANT_ROW_LIMIT) {
        console.warn(
          `Channel-fit: recentRows hit ${CROSS_TENANT_ROW_LIMIT} row limit — recent demand estimates may be incomplete`
        );
      }

      // Pseudonymise user_ids before caching so the in-process cache
      // never holds real user IDs (defense-in-depth for PII).
      const data: CachedBenchmarkData = {
        fullPeriodRows: fullPeriodRows.map((r) => ({
          ...r,
          user_id: pseudonymiseUserId(r.user_id),
          revenue: Number(r.revenue) || 0,
          units_sold: Number(r.units_sold) || 0,
          avg_price: Number(r.avg_price) || 0,
        })),
        recentRows: recentRows.map((r) => ({
          ...r,
          user_id: pseudonymiseUserId(r.user_id),
          units_sold: Number(r.units_sold) || 0,
        })),
      };

      setCache(cacheKey, data, BENCHMARK_TTL_MS);
      return data;
    } finally {
      inflightRequests.delete(cacheKey);
    }
  })();
  // Register in-flight immediately — must precede any microtask that could
  // resolve the promise and trigger the finally{} delete (guards against
  // sync-resolving mocks in tests).
  inflightRequests.set(cacheKey, promise);
  return promise;
}

/**
 * Build cluster benchmarks from raw cross-tenant data.
 * Excludes the requesting user's data and enforces k-anonymity.
 *
 * Returns Map<clusterKey, Map<marketplace, InternalClusterBenchmark>>
 */
export async function buildClusterBenchmarks(
  periodStart: Date,
  periodEnd: Date,
  excludeUserId: string
): Promise<Map<string, Map<string, InternalClusterBenchmark>>> {
  if (periodEnd.getTime() < periodStart.getTime()) {
    throw new Error(
      `buildClusterBenchmarks: periodEnd must be >= periodStart (got ${periodStart.toISOString()} to ${periodEnd.toISOString()})`
    );
  }

  const { fullPeriodRows, recentRows } = await fetchCrossTenantData(
    periodStart,
    periodEnd
  );

  const periodDays = Math.max(
    1,
    (periodEnd.getTime() - periodStart.getTime()) / 86_400_000
  );

  // Cached rows have pseudonymised user_ids — hash excludeUserId to match
  const excludeHash = pseudonymiseUserId(excludeUserId);

  // Group full-period rows by (clusterKey, marketplace)
  // Track distinct sellers per group and accumulate totals (excluding requesting user)
  const groups = new Map<
    string,
    {
      clusterKey: string;
      marketplace: string;
      /** Only other sellers — used for k-anonymity gate. */
      contributingSellers: Set<string>;
      totalRevenue: number;
      totalUnits: number;
      priceSum: number;
      priceCount: number;
    }
  >();

  for (const row of fullPeriodRows) {
    const clusterKey = buildClusterKey(row.product_title);
    // Skip uncategorizable products — they'd form a meaningless catch-all cluster
    if (clusterKey === "_uncategorized") continue;
    const groupKey = `${clusterKey}::${row.marketplace}`;

    let group = groups.get(groupKey);
    if (!group) {
      group = {
        clusterKey,
        marketplace: row.marketplace,
        contributingSellers: new Set(),
        totalRevenue: 0,
        totalUnits: 0,
        priceSum: 0,
        priceCount: 0,
      };
      groups.set(groupKey, group);
    }

    // Only include OTHER sellers' data in the totals and k-anonymity set
    if (row.user_id !== excludeHash) {
      group.contributingSellers.add(row.user_id);
      group.totalRevenue += row.revenue;
      group.totalUnits += row.units_sold;
      group.priceSum += (row.avg_price ?? 0) * row.units_sold;
      group.priceCount += row.units_sold;
    }
  }

  // Group recent rows by (clusterKey, marketplace) for recentUnitsSold
  // Exclude requesting user's sales for consistent "other sellers" demand
  const recentMap = new Map<string, number>();
  for (const row of recentRows) {
    if (row.user_id === excludeHash) continue;
    const clusterKey = buildClusterKey(row.product_title);
    if (clusterKey === "_uncategorized") continue;
    const key = `${clusterKey}::${row.marketplace}`;
    recentMap.set(key, (recentMap.get(key) || 0) + row.units_sold);
  }

  // Build InternalClusterBenchmark objects, filtering by k-anonymity
  const result = new Map<string, Map<string, InternalClusterBenchmark>>();

  for (const [groupKey, group] of groups) {
    // k-anonymity gate: need at least MIN_SELLERS_FOR_BENCHMARK distinct *other* sellers
    if (group.contributingSellers.size < MIN_SELLERS_FOR_BENCHMARK) continue;

    // Skip if no demand (all data was from the requesting user)
    if (group.totalUnits <= 0) continue;

    const benchmark: InternalClusterBenchmark = {
      clusterKey: group.clusterKey,
      marketplace: group.marketplace,
      _sellerCount: group.contributingSellers.size,
      totalUnitsPerDay: group.totalUnits / periodDays,
      totalRevenuePerDay: group.totalRevenue / periodDays,
      avgPrice:
        group.priceCount > 0 ? group.priceSum / group.priceCount : 0,
      recentUnitsSold: recentMap.get(groupKey) || 0,
    };

    let clusterMap = result.get(group.clusterKey);
    if (!clusterMap) {
      clusterMap = new Map();
      result.set(group.clusterKey, clusterMap);
    }
    clusterMap.set(group.marketplace, benchmark);
  }

  return result;
}

// -------------------------------------------------------
// Benchmark Signal Computation
// -------------------------------------------------------

/**
 * Compute platform benchmark signal (0-1) comparing user's unit velocity
 * against OTHER sellers' combined unit velocity (currency-agnostic).
 * benchmark.totalUnitsPerDay excludes the requesting user's data
 * (see buildClusterBenchmarks), so userShare = user / competitors.
 * Uses units (not revenue) to avoid mixed-currency aggregation issues.
 */
export function computePlatformBenchmark(
  userUnitsPerDay: number,
  benchmark: InternalClusterBenchmark | undefined
): number | null {
  if (
    !benchmark ||
    benchmark._sellerCount < MIN_SELLERS_FOR_BENCHMARK
  ) {
    return null; // no usable benchmark data — caller decides fallback
  }

  // Negative units (shouldn't happen but guard defensively)
  if (userUnitsPerDay < 0) return 0.2;

  const marketUnits = benchmark.totalUnitsPerDay;

  if (marketUnits <= 0) return 0.3; // marketplace exists but no real demand

  // User units vs other sellers' combined units (ratio, not market share —
  // denominator excludes the requesting user, so userShare > 1 is possible)
  const userShare = userUnitsPerDay / marketUnits;

  if (userShare >= 0.5) return 1.0; // user dominates this market
  if (userShare >= 0.2) return 0.85; // significant player
  if (userShare >= 0.05) return 0.7; // meaningful presence
  if (userUnitsPerDay > 0) return 0.5; // present but small

  // User has 0 units but market demand exists
  // Score by market size (encourages expansion to big markets)
  return Math.min(0.4, 0.1 + Math.log10(marketUnits + 1) / 10);
}

// -------------------------------------------------------
// Expansion Benchmarks
// -------------------------------------------------------

/**
 * Find marketplaces where the user is NOT selling a product but
 * similar products have real demand. Used for EXPAND recommendations.
 */
export function getExpansionBenchmarks(
  productTitle: string,
  sellingOnMarketplaces: string[],
  connectedMarketplaces: string[],
  allBenchmarks: Map<string, Map<string, InternalClusterBenchmark>>
): Array<{
  marketplace: string;
  demand: MarketDemand;
  isConnected: boolean;
}> {
  const clusterKey = buildClusterKey(productTitle);
  const clusterBenchmarks = allBenchmarks.get(clusterKey);
  if (!clusterBenchmarks) return [];

  return [...clusterBenchmarks.entries()]
    .filter(([mp]) => !sellingOnMarketplaces.includes(mp)) // not already selling
    .filter(
      ([, b]) =>
        b._sellerCount >= MIN_SELLERS_FOR_BENCHMARK &&
        b.totalUnitsPerDay > 0
    )
    .map(([marketplace, benchmark]) => ({
      marketplace,
      demand: {
        unitsPerDay: benchmark.totalUnitsPerDay,
        revenuePerDay: benchmark.totalRevenuePerDay,
        avgPrice: benchmark.avgPrice,
        recentUnitsSold: benchmark.recentUnitsSold,
      },
      isConnected: connectedMarketplaces.includes(marketplace),
    }))
    // Sort by units/day (currency-agnostic) — revenue/day is mixed-currency
    // across sellers and unsuitable for cross-marketplace ranking.
    .sort((a, b) => b.demand.unitsPerDay - a.demand.unitsPerDay);
}
