// src/lib/ai/channel-fit/signals.ts
// User's own DB queries + raw signal computation

import "server-only";
import prisma from "@/lib/prisma";
import type {
  RawSignals,
  InventoryItem,
  ConnectedMarketplace,
} from "./types";
import type {
  ProductMarketplaceRow,
  WeeklyBreakdownRow,
  RawProductMarketplaceRow,
  RawWeeklyBreakdownRow,
} from "./types.server";
import { STOCKOUT_TURNOVER } from "./types";

// Safety limit for per-user queries (products × marketplaces × weeks)
const MAX_AGGREGATE_ROWS = 10_000;
const MAX_WEEKLY_ROWS = 50_000;

// -------------------------------------------------------
// DB Queries (all 4 run in Promise.allSettled for partial failure resilience)
// -------------------------------------------------------

/**
 * Fetch all data needed for raw signal computation.
 * Runs 4 queries in parallel: product-marketplace aggregates, weekly breakdown,
 * inventory, and connected marketplaces.
 */
export async function fetchUserSignalData(
  userId: string,
  start: Date,
  end: Date
) {
  const [aggResult, weeklyResult, invResult, connResult] =
    await Promise.allSettled([
      fetchProductMarketplaceAggregates(userId, start, end),
      fetchWeeklyBreakdown(userId, start, end),
      fetchInventory(userId),
      fetchConnectedMarketplaces(userId),
    ]);

  // Log failures but continue with partial data.
  // Only log error name/code — raw reason may contain SQL, schema, or PII.
  const safeReason = (reason: unknown): string => {
    if (reason instanceof Error) return reason.name || "Error";
    return "Unknown";
  };
  if (aggResult.status === "rejected")
    console.error("Channel-fit: aggregates query failed:", safeReason(aggResult.reason));
  if (weeklyResult.status === "rejected")
    console.error("Channel-fit: weekly breakdown query failed:", safeReason(weeklyResult.reason));
  if (invResult.status === "rejected")
    console.error("Channel-fit: inventory query failed:", safeReason(invResult.reason));
  if (connResult.status === "rejected")
    console.error("Channel-fit: connections query failed:", safeReason(connResult.reason));

  return {
    aggregates: aggResult.status === "fulfilled" ? aggResult.value : [],
    weeklyBreakdown: weeklyResult.status === "fulfilled" ? weeklyResult.value : [],
    inventory: invResult.status === "fulfilled" ? invResult.value : [],
    connections: connResult.status === "fulfilled" ? connResult.value : [],
  };
}

async function fetchProductMarketplaceAggregates(
  userId: string,
  start: Date,
  end: Date
): Promise<ProductMarketplaceRow[]> {
  const rows = await prisma.$queryRaw<RawProductMarketplaceRow[]>`
    SELECT
      LOWER(COALESCE(oi."sku", oi."title", '_unknown')) AS product_key,
      MAX(COALESCE(oi."title", 'Unknown product')) AS title,
      o."marketplace"::text AS marketplace,
      SUM(CASE WHEN o."status" != 'RETURNED'::"UnifiedOrderStatus"
        THEN COALESCE(CAST(oi."unitPrice" AS numeric), 0) * COALESCE(oi."quantity", 0)
        ELSE 0 END) AS revenue,
      SUM(CASE WHEN o."status" != 'RETURNED'::"UnifiedOrderStatus"
        THEN COALESCE(oi."quantity", 0) ELSE 0 END)::bigint AS units_sold,
      COUNT(DISTINCT CASE WHEN o."status" != 'RETURNED'::"UnifiedOrderStatus" THEN o."id" END)::bigint AS order_count,
      CASE WHEN SUM(CASE WHEN o."status" != 'RETURNED'::"UnifiedOrderStatus"
        THEN COALESCE(oi."quantity", 0) ELSE 0 END) > 0
        THEN SUM(CASE WHEN o."status" != 'RETURNED'::"UnifiedOrderStatus"
          THEN COALESCE(CAST(oi."unitPrice" AS numeric), 0) * COALESCE(oi."quantity", 0)
          ELSE 0 END)
          / SUM(CASE WHEN o."status" != 'RETURNED'::"UnifiedOrderStatus"
            THEN COALESCE(oi."quantity", 0) ELSE 0 END)
        ELSE 0 END AS avg_unit_price,
      MIN(o."orderedAt") AS first_sale,
      MAX(o."orderedAt") AS last_sale,
      COUNT(DISTINCT CASE WHEN o."status" = 'RETURNED' THEN o."id" END)::bigint AS returned_orders
    FROM "UnifiedOrderItem" oi
    JOIN "UnifiedOrder" o ON oi."orderId" = o."id"
    WHERE o."userId" = ${userId}
      AND o."orderedAt" >= ${start}
      AND o."orderedAt" <= ${end}
      AND o."status" != 'CANCELLED'::"UnifiedOrderStatus"
      AND (oi."sku" IS NOT NULL OR oi."title" IS NOT NULL)
    GROUP BY product_key, o."marketplace"
    ORDER BY revenue DESC, units_sold DESC
    LIMIT ${MAX_AGGREGATE_ROWS}
  `;

  if (rows.length >= MAX_AGGREGATE_ROWS) {
    console.warn(
      `Channel-fit: aggregates hit ${MAX_AGGREGATE_ROWS} row limit — results may be incomplete`
    );
  }

  return rows.map((r) => ({
    ...r,
    revenue: Number(r.revenue) || 0,
    units_sold: Number(r.units_sold) || 0,
    order_count: Number(r.order_count) || 0,
    avg_unit_price: Number(r.avg_unit_price) || 0,
    returned_orders: Number(r.returned_orders) || 0,
    first_sale: r.first_sale instanceof Date ? r.first_sale : (r.first_sale != null ? new Date(r.first_sale) : start),
    last_sale: r.last_sale instanceof Date ? r.last_sale : (r.last_sale != null ? new Date(r.last_sale) : end),
  }));
}

async function fetchWeeklyBreakdown(
  userId: string,
  start: Date,
  end: Date
): Promise<WeeklyBreakdownRow[]> {
  const rows = await prisma.$queryRaw<RawWeeklyBreakdownRow[]>`
    SELECT
      LOWER(COALESCE(oi."sku", oi."title", '_unknown')) AS product_key,
      o."marketplace"::text AS marketplace,
      DATE_TRUNC('week', o."orderedAt") AS week_start,
      SUM(COALESCE(oi."quantity", 0))::bigint AS units
    FROM "UnifiedOrderItem" oi
    JOIN "UnifiedOrder" o ON oi."orderId" = o."id"
    WHERE o."userId" = ${userId}
      AND o."orderedAt" >= ${start}
      AND o."orderedAt" <= ${end}
      AND o."status" NOT IN ('CANCELLED'::"UnifiedOrderStatus", 'RETURNED'::"UnifiedOrderStatus")
      AND (oi."sku" IS NOT NULL OR oi."title" IS NOT NULL)
    GROUP BY product_key, o."marketplace", week_start
    ORDER BY product_key, o."marketplace", week_start DESC
    LIMIT ${MAX_WEEKLY_ROWS}
  `;

  if (rows.length >= MAX_WEEKLY_ROWS) {
    console.warn(
      `Channel-fit: weekly breakdown hit ${MAX_WEEKLY_ROWS} row limit — trend data may be incomplete`
    );
  }

  const mapped = rows.map((r) => ({
    ...r,
    week_start: r.week_start instanceof Date
      ? r.week_start
      : r.week_start != null
        ? new Date(r.week_start)
        : null,
    units: Number(r.units) || 0,
  }));
  const valid = mapped.filter(
    (r): r is WeeklyBreakdownRow =>
      r.week_start instanceof Date && !isNaN(r.week_start.getTime())
  );
  const dropped = mapped.length - valid.length;
  if (dropped > 0) {
    console.warn(
      `Channel-fit: dropped ${dropped} weekly breakdown row(s) with invalid week_start`
    );
  }
  return valid;
}

const MAX_INVENTORY_ROWS = 10_000;

async function fetchInventory(userId: string): Promise<InventoryItem[]> {
  const products = await prisma.unifiedProduct.findMany({
    where: { userId, status: "ACTIVE" },
    select: {
      sku: true,
      title: true,
      marketplace: true,
      inventory: true,
      price: true,
    },
    orderBy: { updatedAt: "desc" },
    take: MAX_INVENTORY_ROWS,
  });

  if (products.length >= MAX_INVENTORY_ROWS) {
    console.warn(
      `Channel-fit: inventory hit ${MAX_INVENTORY_ROWS} row limit — some products may be missing from stock checks`
    );
  }

  return products.map((p) => ({
    sku: p.sku,
    title: p.title,
    marketplace: p.marketplace,
    inventory: p.inventory,
    price: Number(p.price) || 0,
  }));
}

async function fetchConnectedMarketplaces(
  userId: string
): Promise<ConnectedMarketplace[]> {
  const connections = await prisma.marketplaceConnection.findMany({
    where: { userId, status: "CONNECTED" },
    select: { marketplace: true },
  });

  return connections.map((c) => ({ marketplace: c.marketplace }));
}

// -------------------------------------------------------
// Raw Signal Computation
// -------------------------------------------------------

/**
 * Compute raw signals for each product-marketplace pair.
 * Returns Map<productKey, Map<marketplace, RawSignals>>
 */
export function computeRawSignals(
  aggregates: ProductMarketplaceRow[],
  weeklyBreakdown: WeeklyBreakdownRow[],
  inventory: InventoryItem[],
  lookbackDays: number
): Map<string, Map<string, RawSignals>> {
  // Build inventory lookup: matches product_key format (COALESCE(sku, title, '_unknown'))
  const inventoryMap = new Map<string, number>();
  // Only keep the first (most recent) entry per key — fetchInventory orders by updatedAt desc
  for (const item of inventory) {
    const identifier = (item.sku ?? item.title ?? "_unknown").toLowerCase();
    const key = `${identifier}::${item.marketplace.toLowerCase()}`;
    if (!inventoryMap.has(key)) {
      inventoryMap.set(key, item.inventory);
    }
  }

  // Build weekly data lookup: productKey::marketplace → weekly units array
  // Keys are lowercased to match inventoryMap normalization
  const weeklyMap = new Map<
    string,
    Array<{ weekStart: Date; units: number }>
  >();
  for (const row of weeklyBreakdown) {
    const key = `${row.product_key.toLowerCase()}::${row.marketplace.toLowerCase()}`;
    let arr = weeklyMap.get(key);
    if (!arr) {
      arr = [];
      weeklyMap.set(key, arr);
    }
    arr.push({ weekStart: row.week_start, units: row.units });
  }

  const result = new Map<string, Map<string, RawSignals>>();

  for (const row of aggregates) {
    const { marketplace } = row;
    // Normalize product_key to lowercase so case-variants from SQL GROUP BY
    // merge into the same result entry (matches inventoryMap/weeklyMap keying)
    const normalizedKey = row.product_key.toLowerCase();

    // Days active for this product on this channel
    const msActive =
      row.last_sale.getTime() - row.first_sale.getTime();
    // Velocity uses daysActive (first→last sale span) so products that
    // started selling mid-period aren't diluted by the full lookback window.
    // When msActive === 0 (single sale), use lookbackDays to avoid overstating velocity.
    // Floor to 1 day minimum so sub-day spans don't inflate velocity.
    const daysActive = Math.max(1, msActive > 0
      ? msActive / 86_400_000
      : lookbackDays);

    // Revenue and unit velocity (per active day, not per lookback day)
    const revenueVelocity = row.revenue / daysActive;
    const unitVelocity = row.units_sold / daysActive;

    // Sales trend (linear regression on weekly units)
    const weeklyKey = `${normalizedKey}::${marketplace.toLowerCase()}`;
    const weeklyData = weeklyMap.get(weeklyKey) || [];
    const trend = computeSalesTrend(weeklyData);

    // Inventory turnover uses full lookback window (not daysActive) because
    // it measures stock depletion rate relative to the entire analysis period.
    // null = inventory not tracked (missing from catalog); 0 = tracked but out of stock.
    const inventoryKey = `${normalizedKey}::${marketplace.toLowerCase()}`;
    const currentStock = inventoryMap.has(inventoryKey)
      ? inventoryMap.get(inventoryKey)!
      : null;
    const safeLookbackDays = lookbackDays > 0 ? lookbackDays : 1;
    const unitsPer30d = (row.units_sold / safeLookbackDays) * 30;
    // null = untracked (missing from catalog); STOCKOUT_TURNOVER = active stockout with demand;
    // 0 = tracked but no stock and no demand; finite positive = measured turnover ratio
    const inventoryTurnover: number | null =
      currentStock === null
        ? null
        : currentStock > 0
          ? unitsPer30d / currentStock
          : unitsPer30d > 0
            ? STOCKOUT_TURNOVER
            : 0;

    // Return rate: order_count excludes returns; add them back for the total
    const totalOrders = row.order_count + row.returned_orders;
    const returnRate = totalOrders > 0 ? row.returned_orders / totalOrders : 0;

    const signals: RawSignals = {
      revenueVelocity,
      unitVelocity,
      avgUnitPrice: row.avg_unit_price ?? 0,
      salesTrendSlope: trend.slope,
      salesTrendR2: trend.rSquared,
      inventoryTurnover,
      returnRate,
    };

    let productMap = result.get(normalizedKey);
    if (!productMap) {
      productMap = new Map();
      result.set(normalizedKey, productMap);
    }
    productMap.set(marketplace.toLowerCase(), signals);
  }

  return result;
}

// -------------------------------------------------------
// Sales Trend — Least-squares linear regression
// -------------------------------------------------------

/**
 * Linear regression on weekly units to detect growth/decline trends.
 * Returns slope (units change per week) and R² (fit quality 0-1).
 * Uses elapsed week offsets from the first data point so gaps between
 * weeks are reflected in the regression (not collapsed by sequential index).
 * Requires at least 3 weeks of data; returns neutral values otherwise.
 */
export function computeSalesTrend(
  weeklyUnits: Array<{ weekStart: Date; units: number }>
): { slope: number; rSquared: number } {
  if (weeklyUnits.length < 3) {
    return { slope: 0, rSquared: 0 };
  }

  // Sort by week start
  const sorted = [...weeklyUnits].sort(
    (a, b) => a.weekStart.getTime() - b.weekStart.getTime()
  );

  const MS_PER_WEEK = 7 * 24 * 3600 * 1000;
  const originMs = sorted[0].weekStart.getTime();

  const n = sorted.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  // Pre-compute week offsets so they're reusable in the R² pass
  const weekOffsets: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const x = Math.round((sorted[i].weekStart.getTime() - originMs) / MS_PER_WEEK);
    weekOffsets[i] = x;
    const y = sorted[i].units;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, rSquared: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;

  // R² calculation
  const meanX = sumX / n;
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const y = sorted[i].units;
    const yPred = meanY + slope * (weekOffsets[i] - meanX);
    ssTot += (y - meanY) ** 2;
    ssRes += (y - yPred) ** 2;
  }

  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return { slope, rSquared };
}

/**
 * Build product_key → product title map from aggregates.
 * Keys are lowercased to merge case-variants from SQL GROUP BY.
 * Prefers the title from the highest-revenue row for each product_key
 * to ensure deterministic selection regardless of SQL row ordering.
 */
export function buildProductNameMap(
  aggregates: ProductMarketplaceRow[]
): Map<string, string> {
  const nameMap = new Map<string, string>();
  const revenueMap = new Map<string, number>();
  for (const row of aggregates) {
    const key = row.product_key.toLowerCase();
    const currentRev = revenueMap.get(key) ?? -1;
    if (row.revenue > currentRev) {
      nameMap.set(key, row.title);
      revenueMap.set(key, row.revenue);
    }
  }
  return nameMap;
}

/**
 * Get total revenue per product across all marketplaces (for ranking/filtering).
 */
export function getProductRevenueRanking(
  aggregates: ProductMarketplaceRow[]
): Map<string, number> {
  const revenueMap = new Map<string, number>();
  for (const row of aggregates) {
    const key = row.product_key.toLowerCase();
    revenueMap.set(key, (revenueMap.get(key) || 0) + row.revenue);
  }
  return revenueMap;
}
