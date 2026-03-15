// src/lib/ai/channel-fit/index.ts
// Main orchestrator for Channel-Product Fit analysis

import prisma from "@/lib/prisma";
import type {
  ChannelFitResult,
  ProductFitReport,
  Recommendation,
  ChannelScore,
  HealthLabel,
} from "./types";
import type { InternalClusterBenchmark } from "./types.server";
import {
  PHASE_2_MIN_USERS,
  MAX_PRODUCTS,
  DEFAULT_PRODUCTS_LIMIT,
} from "./types";
import {
  fetchUserSignalData,
  computeRawSignals,
  buildProductNameMap,
  getProductRevenueRanking,
} from "./signals";
import { buildClusterBenchmarks } from "./benchmarks";
import { computeChannelScores, computeOverallHealth } from "./scoring";
import {
  generateExpandRecommendations,
  generateRestockRecommendations,
  generateRepriceRecommendations,
  generateDeprioritizeRecommendations,
} from "./recommendations";

// -------------------------------------------------------
// Timeout Utility
// -------------------------------------------------------

/**
 * Race a promise against a timeout. Clears the timer on settle to avoid
 * leaked timers in long-lived processes.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`${label} timed out`)),
        ms
      );
    }),
  ]).then(
    (result) => { clearTimeout(timeoutId!); return result; },
    (err) => { clearTimeout(timeoutId!); throw err; }
  );
}

// -------------------------------------------------------
// User Count Cache (avoid querying on every call)
// -------------------------------------------------------

let cachedTotalUsersPromise: Promise<number> | null = null;
let cachedTotalUsersExpiresAt = 0;
const USER_COUNT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const USER_COUNT_TIMEOUT_MS = 5_000; // 5s — fail fast if DB pool is exhausted
const SIGNAL_DATA_TIMEOUT_MS = 30_000; // 30s — user signal queries are heavier than user count
const BENCHMARK_TIMEOUT_MS = 30_000; // 30s — cross-tenant benchmark queries can be heavy

async function getCachedTotalUsers(): Promise<number> {
  if (cachedTotalUsersPromise && Date.now() < cachedTotalUsersExpiresAt) {
    return cachedTotalUsersPromise;
  }
  // Set expiry immediately so concurrent callers share the same in-flight promise
  cachedTotalUsersExpiresAt = Date.now() + USER_COUNT_TTL_MS;
  // Capture local reference so the catch handler only resets its own promise,
  // not a newer one created by a concurrent request between creation and rejection.
  const thisPromise = withTimeout(
    prisma.user.count(),
    USER_COUNT_TIMEOUT_MS,
    "User count query"
  ).catch((err) => {
    if (cachedTotalUsersPromise === thisPromise) {
      cachedTotalUsersPromise = null;
      cachedTotalUsersExpiresAt = 0;
    }
    throw err;
  });
  cachedTotalUsersPromise = thisPromise;
  return thisPromise;
}

// -------------------------------------------------------
// Period Resolution (channel-fit specific)
// -------------------------------------------------------

const MAX_FILTER_LEN = 200;

function resolveChannelFitPeriod(period: string): {
  start: Date;
  end: Date;
  days: number;
  label: string;
} {
  const now = new Date();
  let days: number;
  let label: string;

  switch (period) {
    case "last_30_days":
      days = 30;
      label = "Last 30 days";
      break;
    case "last_60_days":
      days = 60;
      label = "Last 60 days";
      break;
    case "last_90_days":
      days = 90;
      label = "Last 90 days";
      break;
    default: {
      // Sanitize user-controlled value before logging to prevent log injection
      const sanitized = String(period).replace(/[\x00-\x1f\x7f]/g, "").slice(0, 50);
      console.warn(`Channel-fit: unrecognized period "${sanitized}", defaulting to last_90_days`);
      days = 90;
      label = "Last 90 days";
      break;
    }
  }

  // Use UTC boundaries so the period represents whole calendar days
  // and is timezone-robust (also makes cache keys deterministic).
  // Start: N days ago at 00:00 UTC
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - days);
  start.setUTCHours(0, 0, 0, 0);

  // End: yesterday at 23:59:59 UTC (excludes partial today so window = exactly `days` days)
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() - 1);
  end.setUTCHours(23, 59, 59, 999);

  return { start, end, days, label };
}

/**
 * Extract a safe, user-friendly error message from an unknown error.
 * Strips Prisma query details, stack traces, and other sensitive metadata.
 */
function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Strip Prisma-specific details (query text, connection strings, etc.)
    const msg = error.message || "Unknown error";
    // Only keep the first line — subsequent lines often contain SQL or stack
    return msg.split("\n")[0].slice(0, 200);
  }
  return "Unknown error";
}

// -------------------------------------------------------
// Main Orchestrator
// -------------------------------------------------------

export async function analyzeChannelProductFit(
  userId: string,
  options: {
    productFilter?: string;
    period?: string;
    limit?: number;
  }
): Promise<ChannelFitResult> {
  // 0. Validate userId — fail fast before any DB queries
  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    throw new Error("analyzeChannelProductFit: userId must be a non-empty string");
  }
  // Normalize: trim whitespace to prevent DB misses from padded inputs
  userId = userId.trim();

  // 1. Resolve period
  const { start, end, days, label } = resolveChannelFitPeriod(
    options.period || "last_90_days"
  );

  const rawLimit = Number(options.limit);
  const limit = Math.max(1, Math.min(MAX_PRODUCTS, Math.trunc(
    Number.isFinite(rawLimit) ? rawLimit : DEFAULT_PRODUCTS_LIMIT
  )));

  // 2. Determine phase: < 100 users → Phase 1 (priors EXPAND + RESTOCK + REPRICE); 100+ → Phase 2 (full engine)
  let isPhase2 = false;
  try {
    const totalUsers = await getCachedTotalUsers();
    isPhase2 = totalUsers >= PHASE_2_MIN_USERS;
  } catch (error) {
    // User count failure is non-fatal — degrade to Phase 1
    console.error("Channel-fit: failed to fetch user count, defaulting to Phase 1:", sanitizeErrorMessage(error));
  }

  // 3. Fetch user's raw data (4 parallel queries)
  let aggregates, weeklyBreakdown, inventory, connections;
  try {
    ({ aggregates, weeklyBreakdown, inventory, connections } =
      await withTimeout(
        fetchUserSignalData(userId, start, end),
        SIGNAL_DATA_TIMEOUT_MS,
        "User signal data fetch"
      ));
  } catch (error) {
    console.error("Channel-fit: failed to fetch user signal data:", sanitizeErrorMessage(error));
    return {
      period: label,
      lookbackDays: days,
      productsAnalyzed: 0,
      products: [],
      topRecommendations: [],
    };
  }

  // Early exit: no sales data
  if (aggregates.length === 0) {
    return {
      period: label,
      lookbackDays: days,
      productsAnalyzed: 0,
      products: [],
      topRecommendations: [],
    };
  }

  // 4. Fetch cross-tenant benchmarks (only in Phase 2)
  let benchmarks: Map<string, Map<string, InternalClusterBenchmark>> | null =
    null;
  if (isPhase2) {
    try {
      benchmarks = await withTimeout(
        buildClusterBenchmarks(start, end, userId),
        BENCHMARK_TIMEOUT_MS,
        "Benchmark build"
      );
    } catch (error) {
      // Benchmark failure is non-fatal — degrade to Phase 1 behavior
      console.error("Channel-fit: benchmark fetch failed:", sanitizeErrorMessage(error));
      benchmarks = null;
      isPhase2 = false;
    }
  }

  // 5. Compute raw signals
  const rawSignals = computeRawSignals(
    aggregates,
    weeklyBreakdown,
    inventory,
    days
  );

  // 6. Filter products
  const productNameMap = buildProductNameMap(aggregates);
  const revenueRanking = getProductRevenueRanking(aggregates);

  // Trim and bound filter early so whitespace-only strings fall through to top-N
  const filter = options.productFilter
    ? options.productFilter.trim().slice(0, MAX_FILTER_LEN).toLowerCase()
    : "";

  let productKeys: string[];

  if (filter.length > 0) {
    // Fuzzy match by title or SKU (case-insensitive), sorted by revenue
    const matchedKeys = [...productNameMap.entries()]
      .filter(
        ([key, name]) =>
          key.toLowerCase().includes(filter) ||
          name.toLowerCase().includes(filter)
      )
      .sort((a, b) => (revenueRanking.get(b[0]) || 0) - (revenueRanking.get(a[0]) || 0))
      .map(([key]) => key);

    productKeys = matchedKeys.slice(0, limit);

    // If no match, return empty
    if (productKeys.length === 0) {
      return {
        period: label,
        lookbackDays: days,
        productsAnalyzed: 0,
        products: [],
        topRecommendations: [],
      };
    }
  } else {
    // Top N by revenue
    const allKeys = [...revenueRanking.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => key);

    productKeys = allKeys.slice(0, limit);
  }

  // 7. Build order count and days-of-data maps from aggregates
  const orderCountMap = new Map<string, Map<string, number>>();
  const daysOfDataMap = new Map<string, Map<string, { firstMs: number; lastMs: number }>>();

  for (const row of aggregates) {
    // Lowercase to match normalized keys from computeRawSignals/buildProductNameMap
    const key = row.product_key.toLowerCase();

    // Order count
    let ocMap = orderCountMap.get(key);
    if (!ocMap) {
      ocMap = new Map();
      orderCountMap.set(key, ocMap);
    }
    ocMap.set(row.marketplace, row.order_count);

    // Days of data: accumulate min(first_sale) and max(last_sale) per
    // (product_key, marketplace) so multiple rows (if any) merge correctly.
    // SQL GROUP BY guarantees unique rows, but this is defensive.
    if (row.first_sale && row.last_sale) {
      const firstMs = row.first_sale.getTime();
      const lastMs = row.last_sale.getTime();
      if (!isNaN(firstMs) && !isNaN(lastMs)) {
        let ddMap = daysOfDataMap.get(key);
        if (!ddMap) {
          ddMap = new Map();
          daysOfDataMap.set(key, ddMap);
        }
        const existing = ddMap.get(row.marketplace);
        if (existing) {
          existing.firstMs = Math.min(existing.firstMs, firstMs);
          existing.lastMs = Math.max(existing.lastMs, lastMs);
        } else {
          ddMap.set(row.marketplace, { firstMs, lastMs });
        }
      }
    }
  }

  // Resolve accumulated date ranges to days-of-data values
  const resolvedDaysOfData = new Map<string, Map<string, number>>();
  for (const [key, ddMap] of daysOfDataMap) {
    const resolved = new Map<string, number>();
    for (const [mp, { firstMs, lastMs }] of ddMap) {
      const msActive = lastMs - firstMs;
      if (msActive >= 0) {
        resolved.set(mp, Math.max(1, msActive / 86_400_000));
      }
    }
    resolvedDaysOfData.set(key, resolved);
  }

  // 8. Connected marketplace list (deduplicated — user may have multiple connections per marketplace)
  const connectedMarketplaces = [...new Set(connections.map((c) => c.marketplace))];

  // 9. Process each product
  const products: ProductFitReport[] = [];
  const allRecommendations: Recommendation[] = [];

  for (const productKey of productKeys) {
    const productName = productNameMap.get(productKey) || productKey;
    const signalsByMp = rawSignals.get(productKey);

    if (!signalsByMp || signalsByMp.size === 0) continue;

    // Channel scores (only in Phase 2)
    let channelScores: ChannelScore[] = [];
    if (isPhase2) {
      channelScores = computeChannelScores(
        productName,
        signalsByMp,
        orderCountMap.get(productKey) || new Map(),
        resolvedDaysOfData.get(productKey) || new Map(),
        benchmarks,
        days
      );
    }

    // Recommendations
    const recommendations: Recommendation[] = [];

    // RESTOCK — always active (Phase 1 + Phase 2)
    recommendations.push(
      ...generateRestockRecommendations(
        productKey,
        productName,
        signalsByMp,
        inventory,
        benchmarks
      )
    );

    // REPRICE — always active (Phase 1: cross-channel only; Phase 2: + market pricing)
    recommendations.push(
      ...generateRepriceRecommendations(
        productKey,
        productName,
        signalsByMp,
        benchmarks
      )
    );

    // EXPAND — always active (Phase 1: category-based priors; Phase 2: benchmarks + priors)
    const sellingOnMarketplaces = [...signalsByMp.keys()];

    const bestChannelRevenuePerDay = Math.max(
      ...sellingOnMarketplaces.map(
        (mp) => signalsByMp.get(mp)?.revenueVelocity || 0
      )
    );

    // User's average price across channels (for priors sweet-spot matching)
    const allPrices = sellingOnMarketplaces
      .map((mp) => signalsByMp.get(mp)?.avgUnitPrice || 0)
      .filter((p) => p > 0);
    const userAvgPrice =
      allPrices.length > 0
        ? allPrices.reduce((s, p) => s + p, 0) / allPrices.length
        : 0;

    recommendations.push(
      ...generateExpandRecommendations(
        productKey,
        productName,
        sellingOnMarketplaces,
        connectedMarketplaces,
        bestChannelRevenuePerDay,
        benchmarks,
        userAvgPrice,
        signalsByMp
      )
    );

    // DEPRIORITIZE — Phase 2 only (needs channel scores)
    if (isPhase2) {
      recommendations.push(
        ...generateDeprioritizeRecommendations(
          productKey,
          productName,
          channelScores,
          signalsByMp,
          benchmarks
        )
      );
    }

    // In Phase 2, derive from channel scores. In Phase 1, derive from signals.
    let overallHealth: HealthLabel;
    if (isPhase2) {
      overallHealth = computeOverallHealth(channelScores);
    } else {
      // Phase 1: estimate health from the product's own performance signals
      const hasRevenue = sellingOnMarketplaces.some(
        (mp) => (signalsByMp.get(mp)?.revenueVelocity || 0) > 0
      );
      const multiChannelRevenue = sellingOnMarketplaces.filter(
        (mp) => (signalsByMp.get(mp)?.revenueVelocity || 0) > 0
      ).length >= 2;
      const hasPositiveTrend = sellingOnMarketplaces.some(
        (mp) => (signalsByMp.get(mp)?.salesTrendSlope || 0) > 0
      );
      if (hasRevenue && hasPositiveTrend && multiChannelRevenue) {
        overallHealth = "strong";
      } else if (hasRevenue && (hasPositiveTrend || multiChannelRevenue)) {
        overallHealth = "good";
      } else if (hasRevenue) {
        overallHealth = "moderate";
      } else {
        overallHealth = "weak";
      }
    }

    products.push({
      productKey,
      productName,
      channelScores,
      recommendations,
      overallHealth,
    });

    allRecommendations.push(...recommendations);
  }

  // 10. Top 5 recommendations (sorted by urgency then confidence)
  const urgencyOrder: Record<string, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  const topRecommendations = allRecommendations
    .sort((a, b) => {
      const urgencyDiff =
        (urgencyOrder[b.urgency] || 0) - (urgencyOrder[a.urgency] || 0);
      if (urgencyDiff !== 0) return urgencyDiff;
      return b.confidence - a.confidence;
    })
    .slice(0, 5);

  return {
    period: label,
    lookbackDays: days,
    productsAnalyzed: products.length,
    products,
    topRecommendations,
  };
}
