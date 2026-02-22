import prisma from "@/lib/prisma";
import OpenAI from "openai";
import { UnifiedOrderStatus } from "@prisma/client";
import { getRevenueMetrics, getDailyRevenue } from "@/lib/metrics/calculator";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export interface MarketplaceBreakdown {
  marketplace: string;
  revenue: number;
  orders: number;
  aov: number;
}

export interface BiWeeklyMetrics {
  periodStart: string; // "YYYY-MM-DD"
  periodEnd: string; // "YYYY-MM-DD"
  revenue: { total: number; orders: number; aov: number };
  previousPeriod: { total: number; orders: number; aov: number };
  revenueChangePercent: number;
  marketplaceBreakdown: MarketplaceBreakdown[];
  winnerPlatform: { marketplace: string; revenue: number } | null;
  topProducts: Array<{
    title: string;
    revenue: number;
    unitsSold: number;
    marketplace: string;
  }>;
  dailyRevenue: Array<{ date: string; revenue: number; orders: number }>;
  lowStockProducts: Array<{
    title: string;
    inventory: number | null;
    sku: string | null;
    marketplace: string;
  }>;
  alertsSummary: {
    total: number;
    stockout: number;
    demandSurge: number;
    revenueAnomaly: number;
  };
  week1Revenue: number;
  week2Revenue: number;
}

// -------------------------------------------------------
// Aggregate Bi-Weekly Metrics
// -------------------------------------------------------

export async function aggregateBiWeeklyMetrics(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<BiWeeklyMetrics> {
  const startInclusive = new Date(periodStart);
  startInclusive.setUTCHours(0, 0, 0, 0);

  const endInclusive = new Date(periodEnd);
  endInclusive.setUTCHours(23, 59, 59, 999);

  // Exclusive upper bound for groupBy (uses lt)
  const endExclusive = new Date(endInclusive);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  endExclusive.setUTCHours(0, 0, 0, 0);

  // Previous 2-week period
  const prevStart = new Date(startInclusive);
  prevStart.setUTCDate(prevStart.getUTCDate() - 14);
  const prevEnd = new Date(startInclusive);
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
  prevEnd.setUTCHours(23, 59, 59, 999);

  const [
    currentMetrics,
    previousMetrics,
    topItemsAgg,
    marketplaceGroups,
    dailyRevenue,
    lowStockProducts,
    alertGroups,
  ] = await Promise.all([
    getRevenueMetrics(userId, startInclusive, endInclusive),
    getRevenueMetrics(userId, prevStart, prevEnd),
    // DB-level aggregation for top products — avoids OOM on high-volume stores
    prisma.$queryRaw<
      Array<{
        product_key: string;
        title: string;
        marketplace: string;
        revenue: number;
        units_sold: number;
      }>
    >`
      SELECT
        COALESCE(oi."sku", oi."title", '_unknown') AS product_key,
        MAX(COALESCE(oi."title", 'Unknown product')) AS title,
        o."marketplace"::text AS marketplace,
        SUM(COALESCE(CAST(oi."unitPrice" AS double precision), 0)
            * COALESCE(oi."quantity", 0)) AS revenue,
        SUM(COALESCE(oi."quantity", 0))::int AS units_sold
      FROM "UnifiedOrderItem" oi
      JOIN "UnifiedOrder" o ON oi."orderId" = o."id"
      WHERE o."userId" = ${userId}
        AND o."orderedAt" >= ${startInclusive}
        AND o."orderedAt" <= ${endInclusive}
        AND o."status" != 'CANCELLED'::"UnifiedOrderStatus"
      GROUP BY product_key, o."marketplace"
    `,
    prisma.unifiedOrder.groupBy({
      by: ["marketplace"],
      where: {
        userId,
        orderedAt: { gte: startInclusive, lt: endExclusive },
        status: { not: UnifiedOrderStatus.CANCELLED },
      },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    getDailyRevenue(userId, startInclusive, endInclusive),
    prisma.unifiedProduct.findMany({
      where: { userId, status: "ACTIVE", inventory: { lt: 10 } },
      select: { title: true, inventory: true, sku: true, marketplace: true },
      orderBy: { inventory: "asc" },
      take: 5,
    }),
    prisma.alert.groupBy({
      by: ["type"],
      where: {
        userId,
        createdAt: { gte: startInclusive, lt: endExclusive },
      },
      _count: { _all: true },
    }),
  ]);

  // Aggregate DB-level results across marketplaces to find top 5 products
  const productAgg = new Map<
    string,
    {
      title: string;
      revenue: number;
      unitsSold: number;
      marketplaces: Map<string, number>;
    }
  >();
  for (const row of topItemsAgg) {
    const existing = productAgg.get(row.product_key) || {
      title: row.title,
      revenue: 0,
      unitsSold: 0,
      marketplaces: new Map<string, number>(),
    };
    const rowRevenue = Number(row.revenue) || 0;
    existing.revenue += rowRevenue;
    existing.unitsSold += Number(row.units_sold) || 0;
    existing.marketplaces.set(
      row.marketplace,
      (existing.marketplaces.get(row.marketplace) || 0) + rowRevenue
    );
    productAgg.set(row.product_key, existing);
  }

  const topProducts = Array.from(productAgg.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((p) => {
      let bestMp = "";
      let bestRev = -1;
      for (const [mp, rev] of p.marketplaces) {
        if (rev > bestRev) {
          bestMp = mp;
          bestRev = rev;
        }
      }
      return {
        title: p.title,
        revenue: p.revenue,
        unitsSold: p.unitsSold,
        marketplace: bestMp,
      };
    });

  // Per-marketplace breakdown sorted by revenue descending
  const marketplaceBreakdown: MarketplaceBreakdown[] = marketplaceGroups
    .map((g: (typeof marketplaceGroups)[number]) => {
      const revenue = Number(g._sum.totalAmount || 0);
      const orders = g._count._all;
      return {
        marketplace: g.marketplace,
        revenue,
        orders,
        aov: orders > 0 ? revenue / orders : 0,
      };
    })
    .sort(
      (a: MarketplaceBreakdown, b: MarketplaceBreakdown) =>
        b.revenue - a.revenue
    );

  // Winner = highest-revenue marketplace
  const winnerPlatform =
    marketplaceBreakdown.length > 0 && marketplaceBreakdown[0].revenue > 0
      ? {
          marketplace: marketplaceBreakdown[0].marketplace,
          revenue: marketplaceBreakdown[0].revenue,
        }
      : null;

  // Revenue change vs previous 2 weeks
  const revenueChangePercent =
    previousMetrics.totalRevenue > 0
      ? ((currentMetrics.totalRevenue - previousMetrics.totalRevenue) /
          previousMetrics.totalRevenue) *
        100
      : currentMetrics.totalRevenue > 0
        ? 100
        : 0;

  // Week-over-week split: sum first 7 days vs last 7 days
  const midpoint = new Date(startInclusive);
  midpoint.setUTCDate(midpoint.getUTCDate() + 7);
  const midpointStr = midpoint.toISOString().split("T")[0];

  let week1Revenue = 0;
  let week2Revenue = 0;
  for (const d of dailyRevenue) {
    if (d.date < midpointStr) {
      week1Revenue += d.revenue;
    } else {
      week2Revenue += d.revenue;
    }
  }

  // Aggregate alert counts by type
  const alertCounts: Record<string, number> = {};
  let totalAlerts = 0;
  for (const group of alertGroups) {
    alertCounts[group.type] = group._count._all;
    totalAlerts += group._count._all;
  }

  return {
    periodStart: startInclusive.toISOString().split("T")[0],
    periodEnd: periodEnd.toISOString().split("T")[0],
    revenue: {
      total: currentMetrics.totalRevenue,
      orders: currentMetrics.totalOrders,
      aov: currentMetrics.avgOrderValue,
    },
    previousPeriod: {
      total: previousMetrics.totalRevenue,
      orders: previousMetrics.totalOrders,
      aov: previousMetrics.avgOrderValue,
    },
    revenueChangePercent: Math.round(revenueChangePercent * 10) / 10,
    marketplaceBreakdown,
    winnerPlatform,
    topProducts,
    dailyRevenue,
    lowStockProducts,
    alertsSummary: {
      total: totalAlerts,
      stockout: alertCounts["stockout"] || 0,
      demandSurge: alertCounts["demand_surge"] || 0,
      revenueAnomaly: alertCounts["revenue_anomaly"] || 0,
    },
    week1Revenue,
    week2Revenue,
  };
}

// -------------------------------------------------------
// Generate Bi-Weekly Narrative via OpenAI
// -------------------------------------------------------

async function generateBiWeeklyNarrative(
  metrics: BiWeeklyMetrics,
  storeName: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Bi-weekly briefing narrative generation failed: OPENAI_API_KEY is not configured"
    );
  }

  const openai = new OpenAI({ apiKey });

  const safe = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const dataBlock = `
Store: ${storeName}
Period: ${metrics.periodStart} to ${metrics.periodEnd}

2-Week Revenue: ₹${safe(metrics.revenue.total).toFixed(2)} (${safe(metrics.revenue.orders)} orders, AOV: ₹${safe(metrics.revenue.aov).toFixed(2)})
Previous 2 Weeks: ₹${safe(metrics.previousPeriod.total).toFixed(2)} (${safe(metrics.previousPeriod.orders)} orders)
Period-over-Period Change: ${metrics.revenueChangePercent > 0 ? "+" : ""}${safe(metrics.revenueChangePercent)}%

Week 1 Revenue: ₹${safe(metrics.week1Revenue).toFixed(2)}
Week 2 Revenue: ₹${safe(metrics.week2Revenue).toFixed(2)}

Per-Marketplace Breakdown:
${metrics.marketplaceBreakdown.length > 0 ? metrics.marketplaceBreakdown.map((m) => `- ${m.marketplace}: ₹${safe(m.revenue).toFixed(2)} (${safe(m.orders)} orders, AOV: ₹${safe(m.aov).toFixed(2)})`).join("\n") : "No marketplace data."}

Winner Platform: ${metrics.winnerPlatform ? `${metrics.winnerPlatform.marketplace} with ₹${safe(metrics.winnerPlatform.revenue).toFixed(2)}` : "No sales in this period"}

Top 5 Products:
${metrics.topProducts.length > 0 ? metrics.topProducts.map((p, i) => `${i + 1}. ${p.title} [${p.marketplace}]: ₹${safe(p.revenue).toFixed(2)} (${safe(p.unitsSold)} units)`).join("\n") : "No product sales."}

Low Stock Alert:
${metrics.lowStockProducts.length > 0 ? metrics.lowStockProducts.map((p) => `- ${p.title} [${p.marketplace}]: ${safe(p.inventory)} units remaining`).join("\n") : "No low-stock products."}

Alerts (2 weeks): ${safe(metrics.alertsSummary.total)} total (${safe(metrics.alertsSummary.stockout)} stockout, ${safe(metrics.alertsSummary.demandSurge)} demand surge, ${safe(metrics.alertsSummary.revenueAnomaly)} revenue anomaly)
`;

  const NARRATIVE_TIMEOUT_MS = 30_000;

  try {
    const response = await openai.chat.completions.create(
      {
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are Frax, the AI analyst for Frame. Write a punchy bi-weekly trend analysis for an e-commerce seller. Rules:
- EXACTLY 5-7 sentences. No more, no less.
- Sentence 1: 2-week revenue headline and how it compares to the previous 2 weeks (up/down/flat).
- Sentence 2: Which week was stronger (week 1 vs week 2) and what drove the difference.
- Sentence 3: Marketplace dynamics — which platform is gaining share, which is declining.
- Sentence 4: Product trend — what's hot and what's slowing down over the 2 weeks.
- Sentence 5-6: 1-2 specific, data-backed tactical recommendations.
- Sentence 7 (optional): Stock or alert situation, only if urgent. Skip if nothing notable.
- Use **bold** for key numbers and platform names. Always use ₹ for currency (INR), never $.
- Tone: analytical, trend-focused, like a strategist reviewing 2 weeks of data.
- Never use bullet points, headers, or lists. Just flowing sentences.
- If there were zero sales, acknowledge it and suggest concrete actions to change that.`,
          },
          {
            role: "user",
            content: `Generate the bi-weekly trend analysis for this data:\n\n${dataBlock}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 600,
      },
      { timeout: NARRATIVE_TIMEOUT_MS }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error(
        "Bi-weekly briefing narrative generation returned empty content"
      );
    }
    return content;
  } catch (error) {
    const isTimeout =
      error instanceof OpenAI.APIConnectionTimeoutError ||
      (error instanceof Error && error.name === "AbortError");

    if (isTimeout) {
      console.error(
        `Bi-weekly briefing narrative generation timed out after ${NARRATIVE_TIMEOUT_MS}ms`
      );
      throw new Error("Bi-weekly briefing narrative generation timed out");
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorName = error instanceof Error ? error.name : "Error";
    const errorCode = (error as Record<string, unknown>)?.code;
    const httpStatus = (
      error as Record<string, Record<string, unknown>>
    )?.response?.status;

    const sanitizedError = {
      name: errorName,
      message: errorMessage,
      ...(errorCode ? { code: errorCode } : {}),
      ...(httpStatus ? { httpStatus } : {}),
    };

    console.error(
      "Bi-weekly briefing narrative generation failed:",
      sanitizedError
    );
    throw error;
  }
}

// -------------------------------------------------------
// Generate & Save Bi-Weekly Briefing
// -------------------------------------------------------

const LOCK_PLACEHOLDER_NARRATIVE = "__GENERATING__";
const LOCK_TTL_MS = 5 * 60 * 1000;

async function acquireBiWeeklyGenerationLock(
  userId: string,
  periodStart: Date
): Promise<{ acquired: boolean; briefingId?: string }> {
  try {
    const placeholder = await prisma.biWeeklyBriefing.create({
      data: {
        userId,
        periodStart,
        periodEnd: periodStart, // Will be updated on finalization
        metricsData: {},
        narrative: LOCK_PLACEHOLDER_NARRATIVE,
      },
    });
    return { acquired: true, briefingId: placeholder.id };
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      const existing = await prisma.biWeeklyBriefing.findFirst({
        where: { userId, periodStart },
      });
      if (
        existing &&
        existing.narrative === LOCK_PLACEHOLDER_NARRATIVE &&
        Date.now() - existing.createdAt.getTime() > LOCK_TTL_MS
      ) {
        const reclaimed = await prisma.biWeeklyBriefing.updateMany({
          where: {
            id: existing.id,
            narrative: LOCK_PLACEHOLDER_NARRATIVE,
            createdAt: existing.createdAt,
          },
          data: { createdAt: new Date() },
        });
        if (reclaimed.count === 0) return { acquired: false };
        return { acquired: true, briefingId: existing.id };
      }
      return { acquired: false };
    }
    throw error;
  }
}

async function releaseBiWeeklyGenerationLock(
  briefingId: string
): Promise<void> {
  try {
    await prisma.biWeeklyBriefing.deleteMany({
      where: { id: briefingId, narrative: LOCK_PLACEHOLDER_NARRATIVE },
    });
  } catch (err) {
    console.error("Failed to release bi-weekly generation lock:", err);
  }
}

export async function generateBiWeeklyBriefing(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{ briefingId: string; metricsData: BiWeeklyMetrics } | null> {
  // Check if briefing already exists (and is complete)
  const existing = await prisma.biWeeklyBriefing.findFirst({
    where: { userId, periodStart },
  });

  if (existing && existing.narrative !== LOCK_PLACEHOLDER_NARRATIVE) {
    return null; // Already generated
  }

  // Acquire distributed lock
  const lock = await acquireBiWeeklyGenerationLock(userId, periodStart);
  if (!lock.acquired || !lock.briefingId) {
    return null;
  }

  try {
    const connection = await prisma.marketplaceConnection.findFirst({
      where: { userId, status: "CONNECTED" },
      select: { externalName: true },
    });
    const storeName = connection?.externalName || "Your Store";

    const metrics = await aggregateBiWeeklyMetrics(
      userId,
      periodStart,
      periodEnd
    );

    const narrative = await generateBiWeeklyNarrative(metrics, storeName);

    const finalized = await prisma.biWeeklyBriefing.updateMany({
      where: {
        id: lock.briefingId,
        narrative: LOCK_PLACEHOLDER_NARRATIVE,
      },
      data: {
        periodEnd,
        metricsData: JSON.parse(JSON.stringify(metrics)),
        narrative,
      },
    });

    if (finalized.count === 0) {
      console.warn(
        `Bi-weekly briefing lock lost for user ${userId} — another instance finalized or reclaimed`
      );
      return null;
    }

    return { briefingId: lock.briefingId, metricsData: metrics };
  } catch (error) {
    await releaseBiWeeklyGenerationLock(lock.briefingId);
    throw error;
  }
}
