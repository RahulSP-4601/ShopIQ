import crypto from "crypto";
import prisma from "@/lib/prisma";
import { UnifiedOrderStatus } from "@prisma/client";
import { createAlert, type AlertSeverity } from "./manager";

/**
 * Hash userId for safe logging — deterministic, collision-resistant, non-reversible.
 * Returns a truncated SHA-256 hex string (first 12 chars).
 */
function hashUserIdForLog(userId: string): string {
  return crypto.createHash("sha256").update(userId).digest("hex").slice(0, 12);
}

/**
 * Throws if the abort signal has been triggered.
 * Used between sequential async operations to bail out early on timeout.
 */
function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error("Detection aborted");
  }
}

// -------------------------------------------------------
// Constants
// -------------------------------------------------------

const STOCKOUT_THRESHOLD_DAYS = 8; // Alert if inventory covers < 8 days at current velocity
const DEMAND_SURGE_MULTIPLIER = 2.0; // Alert if 7d velocity > 2x the 30d baseline
const REVENUE_ANOMALY_SIGMA = 2.0; // Alert if today's revenue > 2 standard deviations from weekday mean
const RETURN_RATE_THRESHOLD = 0.10; // Alert if return rate > 10% for a product
const MIN_ITEMS_FOR_RETURN_ANALYSIS = 5; // Need at least 5 order items per product to be meaningful
const MIN_ELAPSED_HOURS = 1; // Minimum elapsed hours before normalizing revenue (prevents extreme amplification)

// -------------------------------------------------------
// 1. Stockout Risk Detection
// -------------------------------------------------------

export async function detectStockoutRisk(userId: string, signal?: AbortSignal): Promise<number> {
  let alertsCreated = 0;

  // Get active products with inventory tracking (capped for safety)
  throwIfAborted(signal);
  const products = await prisma.unifiedProduct.findMany({
    where: {
      userId,
      status: "ACTIVE",
      inventory: { gt: 0 },
    },
    select: {
      id: true,
      title: true,
      sku: true,
      inventory: true,
    },
    take: 5000,
  });

  if (products.length === 0) return 0;

  // Calculate daily velocity from last 30 days of order items
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  throwIfAborted(signal);
  const orders = await prisma.unifiedOrder.findMany({
    where: {
      userId,
      orderedAt: { gte: thirtyDaysAgo },
      status: { not: UnifiedOrderStatus.CANCELLED },
    },
    select: { id: true, orderedAt: true },
    take: 10000,
  });

  const orderIds = orders.map((o) => o.id);
  if (orderIds.length === 0) return 0;

  // Derive actual time span from order data instead of fixed 30 days
  let earliestOrderDate = Infinity;
  let latestOrderDate = -Infinity;
  for (const o of orders) {
    const t = o.orderedAt.getTime();
    if (t < earliestOrderDate) earliestOrderDate = t;
    if (t > latestOrderDate) latestOrderDate = t;
  }
  const computedSpanDays = (latestOrderDate - earliestOrderDate) / (1000 * 60 * 60 * 24);
  const actualSpanDays = Math.min(30, Math.max(1, computedSpanDays)); // Cap at 30 days max, prevent zero/negative spans

  const ORDER_ITEM_LIMIT = 50000;
  throwIfAborted(signal);
  const items = await prisma.unifiedOrderItem.findMany({
    where: { orderId: { in: orderIds } },
    select: {
      productId: true,
      sku: true,
      title: true,
      quantity: true,
    },
    take: ORDER_ITEM_LIMIT,
  });

  if (items.length === ORDER_ITEM_LIMIT) {
    console.warn(
      `Stockout detection: order items query hit ${ORDER_ITEM_LIMIT} limit for userId=${hashUserIdForLog(userId)} ` +
      `(${orderIds.length} orders) — velocity calculations may undercount`
    );
  }

  // Build canonical key map with union-find to prevent double-counting when items use different identifiers
  // (e.g., one item has productId, another has only sku for the same product)
  const canonicalKeyMap = new Map<string, string>();
  const velocityMap = new Map<string, number>();

  // Union-find helper: find root with path compression
  function find(id: string): string {
    if (!canonicalKeyMap.has(id)) {
      canonicalKeyMap.set(id, id); // Make id its own root
      return id;
    }
    const parent = canonicalKeyMap.get(id)!;
    if (parent === id) return id; // Already root
    // Path compression: point directly to root
    const root = find(parent);
    canonicalKeyMap.set(id, root);
    return root;
  }

  // Union-find helper: union two components
  function union(id1: string, id2: string): string {
    const root1 = find(id1);
    const root2 = find(id2);
    if (root1 === root2) return root1;
    // Always point root2 to root1 for consistency
    canonicalKeyMap.set(root2, root1);
    return root1;
  }

  for (const item of items) {
    // Only union productId and sku to avoid merging distinct products with same title
    const structuredIds = [item.productId, item.sku].filter(
      (id): id is string => id != null && id !== ""
    );

    let canonicalKey: string;
    if (structuredIds.length > 0) {
      // Union productId and sku only
      canonicalKey = structuredIds[0];
      for (let i = 1; i < structuredIds.length; i++) {
        canonicalKey = union(canonicalKey, structuredIds[i]);
      }
    } else if (item.title && item.title !== "") {
      // Fallback to title only when both productId and sku are missing
      canonicalKey = item.title;
    } else {
      continue; // No identifiers available
    }

    // Find final root (in case union changed it)
    const root = find(canonicalKey);

    // Aggregate using canonical root key
    velocityMap.set(root, (velocityMap.get(root) || 0) + (item.quantity ?? 0));
  }

  // Check each product by resolving to canonical key via alias map
  for (const product of products) {
    const ids = [product.id, product.sku, product.title].filter(
      (id): id is string => id != null && id !== ""
    );

    // Resolve to canonical root using union-find and look up total sold
    let totalSold = 0;
    for (const id of ids) {
      if (canonicalKeyMap.has(id)) {
        // Use find() to get the true union-find root, not just the immediate parent
        const root = find(id);
        totalSold = velocityMap.get(root) ?? 0;
        break;
      }
    }
    const dailyVelocity = totalSold / actualSpanDays;
    if (dailyVelocity <= 0) continue;

    const daysOfStock = (product.inventory ?? 0) / dailyVelocity;

    if (daysOfStock < STOCKOUT_THRESHOLD_DAYS) {
      let severity: AlertSeverity = "medium";
      if (daysOfStock < 2) severity = "critical";
      else if (daysOfStock < 4) severity = "high";

      const created = await createAlert({
        userId,
        type: "stockout",
        severity,
        title: `Low stock: ${product.title}`,
        body: `${product.title} has ~${Math.round(daysOfStock)} days of stock remaining at current sales velocity (${dailyVelocity.toFixed(1)} units/day). Current inventory: ${product.inventory} units.`,
        metadata: {
          productId: product.id,
          sku: product.sku,
          inventory: product.inventory,
          dailyVelocity: Math.round(dailyVelocity * 10) / 10,
          daysRemaining: Math.round(daysOfStock * 10) / 10,
        },
      });

      if (created) alertsCreated++;
    }
  }

  return alertsCreated;
}

// -------------------------------------------------------
// 2. Demand Surge Detection
// -------------------------------------------------------

export async function detectDemandSurge(userId: string, signal?: AbortSignal): Promise<number> {
  let alertsCreated = 0;

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get order items for the last 30 days, split into 7d and 30d windows
  throwIfAborted(signal);
  const orders = await prisma.unifiedOrder.findMany({
    where: {
      userId,
      orderedAt: { gte: thirtyDaysAgo },
      status: { not: UnifiedOrderStatus.CANCELLED },
    },
    select: { id: true, orderedAt: true },
    take: 10000,
  });

  if (orders.length === 0) return 0;

  const recent7dOrderIds = orders
    .filter((o) => o.orderedAt >= sevenDaysAgo)
    .map((o) => o.id);
  const all30dOrderIds = orders.map((o) => o.id);

  if (recent7dOrderIds.length === 0 || all30dOrderIds.length === 0) return 0;

  const DEMAND_ITEM_LIMIT = 50000;
  throwIfAborted(signal);
  const [recentItems, allItems] = await Promise.all([
    prisma.unifiedOrderItem.findMany({
      where: { orderId: { in: recent7dOrderIds } },
      select: { productId: true, sku: true, title: true, quantity: true },
      take: DEMAND_ITEM_LIMIT,
    }),
    prisma.unifiedOrderItem.findMany({
      where: { orderId: { in: all30dOrderIds } },
      select: { productId: true, sku: true, title: true, quantity: true },
      take: DEMAND_ITEM_LIMIT,
    }),
  ]);

  if (recentItems.length === DEMAND_ITEM_LIMIT || allItems.length === DEMAND_ITEM_LIMIT) {
    console.warn(
      `Demand surge detection: order items query hit ${DEMAND_ITEM_LIMIT} limit for userId=${hashUserIdForLog(userId)} — ` +
      `surge calculations may be inaccurate`
    );
  }

  // Aggregate 7d and 30d velocities by product, and build display name lookup
  const recentVelocity = new Map<string, number>();
  const productDisplayNames = new Map<string, string>();
  for (const item of recentItems) {
    // Use logical OR so empty strings fall through to next candidate
    const key = item.productId || item.sku || item.title;
    // Skip if key is null, undefined, or empty string to prevent collisions
    if (key == null || key === "") continue;
    recentVelocity.set(
      key,
      (recentVelocity.get(key) || 0) + (item.quantity ?? 0)
    );
    // Prefer human-readable title over UUID keys
    if (item.title && item.title !== "" && !productDisplayNames.has(key)) {
      productDisplayNames.set(key, item.title);
    }
  }

  const baselineVelocity = new Map<string, number>();
  for (const item of allItems) {
    // Use logical OR so empty strings fall through to next candidate
    const key = item.productId || item.sku || item.title;
    // Skip if key is null, undefined, or empty string to prevent collisions
    if (key == null || key === "") continue;
    baselineVelocity.set(
      key,
      (baselineVelocity.get(key) || 0) + (item.quantity ?? 0)
    );
    if (item.title && item.title !== "" && !productDisplayNames.has(key)) {
      productDisplayNames.set(key, item.title);
    }
  }

  // Compute actual baseline span from order timestamps (instead of hardcoded 23)
  const baselineOrders = orders.filter((o) => o.orderedAt < sevenDaysAgo);
  let baselineDays = 23; // default fallback
  if (baselineOrders.length > 0) {
    let earliestBaseline = Infinity;
    let latestBaseline = -Infinity;
    for (const o of baselineOrders) {
      const t = o.orderedAt.getTime();
      if (t < earliestBaseline) earliestBaseline = t;
      if (t > latestBaseline) latestBaseline = t;
    }
    const computedBaselineSpan = (latestBaseline - earliestBaseline) / (1000 * 60 * 60 * 24);
    // Cap at 23-day maximum window (the intended baseline period minus the 7-day
    // recent window) while preventing zero/negative spans
    baselineDays = Math.min(23, Math.max(1, computedBaselineSpan));
  }

  // Check for surges
  for (const [productKey, recentQty] of recentVelocity) {
    const totalQty30d = baselineVelocity.get(productKey) || 0;
    if (totalQty30d === 0) continue;

    // Exclude recent 7 days from baseline to avoid self-dilution
    const baselineQty = totalQty30d - recentQty;
    const recentDaily = recentQty / 7;
    const baselineDaily = baselineQty / baselineDays;

    if (baselineDaily <= 0) continue;

    const ratio = recentDaily / baselineDaily;
    if (ratio >= DEMAND_SURGE_MULTIPLIER) {
      const severity: AlertSeverity = ratio >= 3.0 ? "high" : "medium";
      const displayName = productDisplayNames.get(productKey) || productKey;

      const created = await createAlert({
        userId,
        type: "demand_surge",
        severity,
        title: `Demand surge: ${displayName}`,
        body: `${displayName} is selling ${ratio.toFixed(1)}x faster in the last 7 days compared to the 30-day baseline (${recentDaily.toFixed(1)} vs ${baselineDaily.toFixed(1)} units/day).`,
        metadata: {
          productKey,
          recentDailyVelocity: Math.round(recentDaily * 10) / 10,
          baselineDailyVelocity: Math.round(baselineDaily * 10) / 10,
          surgeRatio: Math.round(ratio * 10) / 10,
        },
      });

      if (created) alertsCreated++;
    }
  }

  return alertsCreated;
}

// -------------------------------------------------------
// 3. Revenue Anomaly Detection
// -------------------------------------------------------

export async function detectRevenueAnomaly(userId: string, signal?: AbortSignal): Promise<number> {
  let alertsCreated = 0;

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Get today's revenue
  throwIfAborted(signal);
  const todayOrders = await prisma.unifiedOrder.aggregate({
    where: {
      userId,
      orderedAt: { gte: todayStart, lte: now },
      status: { not: UnifiedOrderStatus.CANCELLED },
    },
    _sum: { totalAmount: true },
    _count: { _all: true },
  });

  const todayRevenue = Number(todayOrders._sum.totalAmount || 0);

  // Not enough data if no orders today (anomaly detection needs a signal)
  if (todayOrders._count._all === 0) return 0;

  // Normalize partial-day revenue to full-day equivalent for fair comparison against baselines
  // Use MIN_ELAPSED_HOURS threshold to prevent extreme amplification from early-morning data
  const hoursElapsedToday = Math.max(1e-6, (now.getTime() - todayStart.getTime()) / (1000 * 60 * 60));
  const effectiveElapsedHours = Math.max(hoursElapsedToday, MIN_ELAPSED_HOURS);
  const normalizedTodayRevenue = todayRevenue * (24 / effectiveElapsedHours);

  // Get same-weekday historical data (last 8 weeks) — single query instead of 8
  const dayOfWeek = now.getDay();
  const eightWeeksAgo = new Date(now);
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 8 * 7);
  eightWeeksAgo.setHours(0, 0, 0, 0);

  throwIfAborted(signal);
  const historicalOrders = await prisma.unifiedOrder.findMany({
    where: {
      userId,
      orderedAt: { gte: eightWeeksAgo, lt: todayStart },
      status: { not: UnifiedOrderStatus.CANCELLED },
    },
    select: { orderedAt: true, totalAmount: true },
    take: 10000,
  });

  // Bucket orders by same-weekday into weekly revenue totals
  const weeklyBuckets = new Map<number, number>(); // weekIndex -> revenue
  for (const order of historicalOrders) {
    if (order.orderedAt.getDay() !== dayOfWeek) continue;
    // Calculate which week this falls in (1-8 weeks ago)
    const daysDiff = Math.floor((todayStart.getTime() - order.orderedAt.getTime()) / (1000 * 60 * 60 * 24));
    const weekIndex = Math.ceil(daysDiff / 7);
    if (weekIndex < 1 || weekIndex > 8) continue;
    weeklyBuckets.set(weekIndex, (weeklyBuckets.get(weekIndex) || 0) + Number(order.totalAmount || 0));
  }

  const historicalRevenues: number[] = [];
  for (let w = 1; w <= 8; w++) {
    if (weeklyBuckets.has(w)) {
      historicalRevenues.push(weeklyBuckets.get(w)!);
    }
  }

  // Need at least 4 data points for meaningful statistics
  if (historicalRevenues.length < 4) return 0;

  const n = historicalRevenues.length;
  const mean = historicalRevenues.reduce((s, v) => s + v, 0) / n;
  const variance =
    historicalRevenues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // Guard against NaN propagation from bad data
  if (!isFinite(mean) || !isFinite(stdDev)) return 0;

  // Avoid false positives when relative variability is too low (flat revenue)
  if (mean <= 0 || stdDev <= 0) return 0;
  const cv = stdDev / mean;
  if (cv < 0.05) return 0;

  const zScore = (normalizedTodayRevenue - mean) / stdDev;

  // Guard against NaN zScore
  if (!isFinite(zScore)) return 0;

  // Alert on both positive and negative anomalies
  if (Math.abs(zScore) >= REVENUE_ANOMALY_SIGMA) {
    const isPositive = zScore > 0;
    const severity: AlertSeverity = Math.abs(zScore) >= 3.0 ? "high" : "medium";

    const created = await createAlert({
      userId,
      type: "revenue_anomaly",
      severity,
      title: isPositive ? "Revenue spike detected" : "Revenue drop detected",
      body: `Today's revenue ($${todayRevenue.toFixed(2)} actual, $${normalizedTodayRevenue.toFixed(2)} normalized for ${effectiveElapsedHours.toFixed(1)}h elapsed) is ${Math.abs(zScore).toFixed(1)} standard deviations ${isPositive ? "above" : "below"} the same-weekday average ($${mean.toFixed(2)} +/- $${stdDev.toFixed(2)}).`,
      metadata: {
        todayRevenue: Math.round(todayRevenue * 100) / 100,
        normalizedTodayRevenue: Math.round(normalizedTodayRevenue * 100) / 100,
        hoursElapsed: Math.round(effectiveElapsedHours * 10) / 10,
        weekdayMean: Math.round(mean * 100) / 100,
        weekdayStdDev: Math.round(stdDev * 100) / 100,
        zScore: Math.round(zScore * 100) / 100,
        direction: isPositive ? "positive" : "negative",
        historicalWeeks: n,
      },
    });

    if (created) alertsCreated++;
  }

  return alertsCreated;
}

// -------------------------------------------------------
// 4. Return Pattern Detection
// -------------------------------------------------------

export async function detectReturnPatterns(userId: string, signal?: AbortSignal): Promise<number> {
  let alertsCreated = 0;

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Fetch all orders in the window (including returned ones)
  throwIfAborted(signal);
  const orders = await prisma.unifiedOrder.findMany({
    where: {
      userId,
      orderedAt: { gte: ninetyDaysAgo },
      status: { in: [UnifiedOrderStatus.DELIVERED, UnifiedOrderStatus.RETURNED] },
    },
    select: { id: true, status: true },
    take: 10000,
  });

  if (orders.length === 0) return 0;

  const allOrderIds = orders.map((o) => o.id);
  const returnedOrderIds = new Set(
    orders.filter((o) => o.status === UnifiedOrderStatus.RETURNED).map((o) => o.id)
  );

  // Get order items to aggregate by product
  const RETURN_ITEM_LIMIT = 50000;
  throwIfAborted(signal);
  const items = await prisma.unifiedOrderItem.findMany({
    where: { orderId: { in: allOrderIds } },
    select: {
      productId: true,
      sku: true,
      title: true,
      quantity: true,
      orderId: true,
    },
    take: RETURN_ITEM_LIMIT,
  });

  if (items.length === RETURN_ITEM_LIMIT) {
    console.warn(
      `Return pattern detection: order items query hit ${RETURN_ITEM_LIMIT} limit for userId=${hashUserIdForLog(userId)} — ` +
      `return rate calculations may be inaccurate`
    );
  }

  // Aggregate total items and returned items per product
  const productStats = new Map<
    string,
    { title: string; totalItems: number; returnedItems: number; totalUnits: number; returnedUnits: number }
  >();

  for (const item of items) {
    // Use logical OR so empty strings fall through to next candidate
    const key = item.productId || item.sku || item.title;
    // Skip if key is null, undefined, or empty string to prevent collisions
    if (key == null || key === "") continue;

    const existing = productStats.get(key) || {
      title: (item.title && item.title !== "") ? item.title : key,
      totalItems: 0,
      returnedItems: 0,
      totalUnits: 0,
      returnedUnits: 0,
    };

    const qty = item.quantity ?? 0;
    existing.totalItems += 1;
    existing.totalUnits += qty;

    // NOTE: This uses order-level return attribution — all items in a RETURNED order
    // are counted as returned. This is a simplification that may inflate return counts
    // for marketplaces with partial/item-level returns. If item-level return status
    // becomes available (e.g., UnifiedOrderItem.isReturned), switch to that instead.
    if (returnedOrderIds.has(item.orderId)) {
      existing.returnedItems += 1;
      existing.returnedUnits += qty;
    }

    productStats.set(key, existing);
  }

  // Check each product for high return rates
  for (const [productKey, stats] of productStats) {
    if (stats.totalItems < MIN_ITEMS_FOR_RETURN_ANALYSIS) continue;

    const returnRate = stats.returnedItems / stats.totalItems;
    if (returnRate < RETURN_RATE_THRESHOLD) continue;

    const severity: AlertSeverity =
      returnRate >= 0.25 ? "high" : returnRate >= 0.15 ? "medium" : "low";

    const created = await createAlert({
      userId,
      type: "return_pattern",
      severity,
      title: `High returns: ${stats.title}`,
      body: `${stats.title} has a ${(returnRate * 100).toFixed(1)}% return rate over the last 90 days (${stats.returnedItems} returned items out of ${stats.totalItems} total items). Review product listing, sizing, or quality.`,
      metadata: {
        productKey,
        returnRate: Math.round(returnRate * 1000) / 1000,
        totalItems: stats.totalItems,
        returnedItems: stats.returnedItems,
        totalUnits: stats.totalUnits,
        returnedUnits: stats.returnedUnits,
      },
    });

    if (created) alertsCreated++;
  }

  return alertsCreated;
}

// -------------------------------------------------------
// Run All Detections for a User
// -------------------------------------------------------

export async function runAllDetections(userId: string, signal?: AbortSignal): Promise<{
  stockout: number;
  demandSurge: number;
  revenueAnomaly: number;
  returnPattern: number;
  total: number;
}> {
  throwIfAborted(signal);
  const userHash = hashUserIdForLog(userId);
  const [stockout, demandSurge, revenueAnomaly, returnPattern] = await Promise.all([
    detectStockoutRisk(userId, signal).catch((err) => {
      if (signal?.aborted) throw err; // Re-throw abort errors, don't swallow
      console.error(`Stockout detection failed for user[${userHash}]:`, err);
      return 0;
    }),
    detectDemandSurge(userId, signal).catch((err) => {
      if (signal?.aborted) throw err;
      console.error(`Demand surge detection failed for user[${userHash}]:`, err);
      return 0;
    }),
    detectRevenueAnomaly(userId, signal).catch((err) => {
      if (signal?.aborted) throw err;
      console.error(`Revenue anomaly detection failed for user[${userHash}]:`, err);
      return 0;
    }),
    detectReturnPatterns(userId, signal).catch((err) => {
      if (signal?.aborted) throw err;
      console.error(`Return pattern detection failed for user[${userHash}]:`, err);
      return 0;
    }),
  ]);

  return {
    stockout,
    demandSurge,
    revenueAnomaly,
    returnPattern,
    total: stockout + demandSurge + revenueAnomaly + returnPattern,
  };
}
