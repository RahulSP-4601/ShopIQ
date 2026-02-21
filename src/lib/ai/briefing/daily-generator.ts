import prisma from "@/lib/prisma";
import OpenAI from "openai";
import { UnifiedOrderStatus } from "@prisma/client";
import {
  getRevenueMetrics,
  getTopProducts,
} from "@/lib/metrics/calculator";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export interface MarketplaceBreakdown {
  marketplace: string;
  revenue: number;
  orders: number;
  aov: number;
}

export interface DailyMetrics {
  reportDate: string; // "YYYY-MM-DD"
  revenue: { total: number; orders: number; aov: number };
  previousDay: { total: number; orders: number; aov: number };
  revenueChangePercent: number;
  marketplaceBreakdown: MarketplaceBreakdown[];
  winnerPlatform: { marketplace: string; revenue: number } | null;
  topProducts: Array<{
    title: string;
    revenue: number;
    unitsSold: number;
  }>;
  lowStockProducts: Array<{
    title: string;
    inventory: number | null;
    sku: string | null;
  }>;
  alertsSummary: {
    total: number;
    stockout: number;
    demandSurge: number;
    revenueAnomaly: number;
  };
}

// -------------------------------------------------------
// Aggregate Daily Metrics
// -------------------------------------------------------

export async function aggregateDailyMetrics(
  userId: string,
  reportDate: Date
): Promise<DailyMetrics> {
  const dayStart = new Date(reportDate);
  dayStart.setUTCHours(0, 0, 0, 0);

  // Exclusive upper bound for groupBy (uses lt)
  const dayEndExclusive = new Date(dayStart);
  dayEndExclusive.setUTCDate(dayEndExclusive.getUTCDate() + 1);

  // Inclusive upper bound for getRevenueMetrics/getTopProducts (uses lte)
  const dayEndInclusive = new Date(dayStart);
  dayEndInclusive.setUTCHours(23, 59, 59, 999);

  // Previous day range
  const previousDayStart = new Date(dayStart);
  previousDayStart.setUTCDate(previousDayStart.getUTCDate() - 1);
  const previousDayEndInclusive = new Date(previousDayStart);
  previousDayEndInclusive.setUTCHours(23, 59, 59, 999);

  const [
    currentMetrics,
    previousMetrics,
    topProducts,
    marketplaceGroups,
    lowStockProducts,
    alertGroups,
  ] = await Promise.all([
    getRevenueMetrics(userId, dayStart, dayEndInclusive),
    getRevenueMetrics(userId, previousDayStart, previousDayEndInclusive),
    getTopProducts(userId, 3, dayStart, dayEndInclusive),
    prisma.unifiedOrder.groupBy({
      by: ["marketplace"],
      where: {
        userId,
        orderedAt: { gte: dayStart, lt: dayEndExclusive },
        status: { not: UnifiedOrderStatus.CANCELLED },
      },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.unifiedProduct.findMany({
      where: { userId, status: "ACTIVE", inventory: { lt: 10 } },
      select: { title: true, inventory: true, sku: true },
      orderBy: { inventory: "asc" },
      take: 5,
    }),
    prisma.alert.groupBy({
      by: ["type"],
      where: {
        userId,
        createdAt: { gte: dayStart, lt: dayEndExclusive },
      },
      _count: { _all: true },
    }),
  ]);

  // Build per-marketplace breakdown, sorted by revenue descending
  const marketplaceBreakdown: MarketplaceBreakdown[] = marketplaceGroups
    .map((g) => {
      const revenue = Number(g._sum.totalAmount || 0);
      const orders = g._count._all;
      return {
        marketplace: g.marketplace,
        revenue,
        orders,
        aov: orders > 0 ? revenue / orders : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // Winner = highest-revenue marketplace (null if no sales)
  const winnerPlatform =
    marketplaceBreakdown.length > 0 && marketplaceBreakdown[0].revenue > 0
      ? {
          marketplace: marketplaceBreakdown[0].marketplace,
          revenue: marketplaceBreakdown[0].revenue,
        }
      : null;

  // Day-over-day revenue change
  const revenueChangePercent =
    previousMetrics.totalRevenue > 0
      ? ((currentMetrics.totalRevenue - previousMetrics.totalRevenue) /
          previousMetrics.totalRevenue) *
        100
      : currentMetrics.totalRevenue > 0
        ? 100
        : 0;

  // Aggregate alert counts by type
  const alertCounts: Record<string, number> = {};
  let totalAlerts = 0;
  for (const group of alertGroups) {
    alertCounts[group.type] = group._count._all;
    totalAlerts += group._count._all;
  }

  return {
    reportDate: dayStart.toISOString().split("T")[0],
    revenue: {
      total: currentMetrics.totalRevenue,
      orders: currentMetrics.totalOrders,
      aov: currentMetrics.avgOrderValue,
    },
    previousDay: {
      total: previousMetrics.totalRevenue,
      orders: previousMetrics.totalOrders,
      aov: previousMetrics.avgOrderValue,
    },
    revenueChangePercent: Math.round(revenueChangePercent * 10) / 10,
    marketplaceBreakdown,
    winnerPlatform,
    topProducts: topProducts.map((p) => ({
      title: p.title,
      revenue: p.revenue,
      unitsSold: p.unitsSold,
    })),
    lowStockProducts,
    alertsSummary: {
      total: totalAlerts,
      stockout: alertCounts["stockout"] || 0,
      demandSurge: alertCounts["demand_surge"] || 0,
      revenueAnomaly: alertCounts["revenue_anomaly"] || 0,
    },
  };
}

// -------------------------------------------------------
// Generate Daily Narrative via OpenAI
// -------------------------------------------------------

async function generateDailyNarrative(
  metrics: DailyMetrics,
  storeName: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Daily briefing narrative generation failed: OPENAI_API_KEY is not configured"
    );
  }

  const openai = new OpenAI({ apiKey });

  const safe = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const dataBlock = `
Store: ${storeName}
Report Date: ${metrics.reportDate}

Yesterday's Revenue: $${safe(metrics.revenue.total).toFixed(2)} (${safe(metrics.revenue.orders)} orders, AOV: $${safe(metrics.revenue.aov).toFixed(2)})
Previous Day: $${safe(metrics.previousDay.total).toFixed(2)} (${safe(metrics.previousDay.orders)} orders)
Day-over-Day Change: ${metrics.revenueChangePercent > 0 ? "+" : ""}${safe(metrics.revenueChangePercent)}%

Per-Marketplace Breakdown:
${metrics.marketplaceBreakdown.length > 0 ? metrics.marketplaceBreakdown.map((m) => `- ${m.marketplace}: $${safe(m.revenue).toFixed(2)} (${safe(m.orders)} orders, AOV: $${safe(m.aov).toFixed(2)})`).join("\n") : "No marketplace data."}

Winner Platform: ${metrics.winnerPlatform ? `${metrics.winnerPlatform.marketplace} with $${safe(metrics.winnerPlatform.revenue).toFixed(2)}` : "No sales yesterday"}

Top 3 Products:
${metrics.topProducts.length > 0 ? metrics.topProducts.map((p, i) => `${i + 1}. ${p.title}: $${safe(p.revenue).toFixed(2)} (${safe(p.unitsSold)} units)`).join("\n") : "No product sales."}

Low Stock Alert:
${metrics.lowStockProducts.length > 0 ? metrics.lowStockProducts.map((p) => `- ${p.title}: ${safe(p.inventory)} units remaining`).join("\n") : "No low-stock products."}

Alerts Yesterday: ${safe(metrics.alertsSummary.total)} total (${safe(metrics.alertsSummary.stockout)} stockout, ${safe(metrics.alertsSummary.demandSurge)} demand surge, ${safe(metrics.alertsSummary.revenueAnomaly)} revenue anomaly)
`;

  const NARRATIVE_TIMEOUT_MS = 30_000;

  try {
    const response = await openai.chat.completions.create(
      {
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are Frax, the AI assistant for Frame. Write a punchy daily morning briefing for an e-commerce seller. Rules:
- EXACTLY 3 sentences. No more, no less.
- Sentence 1: Yesterday's headline number and how it compares to the day before (up/down/flat).
- Sentence 2: Call out the winning marketplace platform and what drove it (or the top product if single marketplace).
- Sentence 3: ONE specific, highest-impact action for today — be concrete (e.g., "Restock X before it sells out" or "Run a flash sale on Y to clear slow inventory").
- Use **bold** for key numbers and platform names.
- Tone: confident, concise, like a smart co-founder texting you over morning coffee.
- Never use bullet points, headers, or lists. Just 3 flowing sentences.
- If there were zero sales, acknowledge it matter-of-factly and suggest an action to change that.`,
          },
          {
            role: "user",
            content: `Generate the daily morning briefing for this data:\n\n${dataBlock}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      },
      { timeout: NARRATIVE_TIMEOUT_MS }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error(
        "Daily briefing narrative generation returned empty content"
      );
    }
    return content;
  } catch (error) {
    const isTimeout =
      error instanceof OpenAI.APIConnectionTimeoutError ||
      (error instanceof Error && error.name === "AbortError");

    if (isTimeout) {
      console.error(
        `Daily briefing narrative generation timed out after ${NARRATIVE_TIMEOUT_MS}ms`
      );
      throw new Error("Daily briefing narrative generation timed out");
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
      "Daily briefing narrative generation failed:",
      sanitizedError
    );
    throw error;
  }
}

// -------------------------------------------------------
// Generate & Save Daily Briefing
// -------------------------------------------------------

// Distributed lock via DB — uses DailyBriefing's @@unique([userId, reportDate])
// constraint. The first instance to create the placeholder row wins; others get P2002.
const LOCK_PLACEHOLDER_NARRATIVE = "__GENERATING__";
const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes — stale locks are reclaimed

async function acquireDailyGenerationLock(
  userId: string,
  reportDate: Date
): Promise<{ acquired: boolean; briefingId?: string }> {
  try {
    const placeholder = await prisma.dailyBriefing.create({
      data: {
        userId,
        reportDate,
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
      // Check if it's a stale lock and reclaim it
      const existing = await prisma.dailyBriefing.findUnique({
        where: { userId_reportDate: { userId, reportDate } },
      });
      if (
        existing &&
        existing.narrative === LOCK_PLACEHOLDER_NARRATIVE &&
        Date.now() - existing.createdAt.getTime() > LOCK_TTL_MS
      ) {
        const reclaimed = await prisma.dailyBriefing.updateMany({
          where: {
            id: existing.id,
            narrative: LOCK_PLACEHOLDER_NARRATIVE,
            createdAt: existing.createdAt, // CAS guard
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

async function releaseDailyGenerationLock(
  briefingId: string
): Promise<void> {
  try {
    await prisma.dailyBriefing.deleteMany({
      where: { id: briefingId, narrative: LOCK_PLACEHOLDER_NARRATIVE },
    });
  } catch (err) {
    console.error("Failed to release daily generation lock:", err);
  }
}

export async function generateDailyBriefing(
  userId: string
): Promise<{ briefingId: string; metricsData: DailyMetrics } | null> {
  // Determine yesterday midnight UTC
  const now = new Date();
  const reportDate = new Date(now);
  reportDate.setUTCDate(reportDate.getUTCDate() - 1);
  reportDate.setUTCHours(0, 0, 0, 0);

  // Check if briefing already exists (and is complete)
  const existing = await prisma.dailyBriefing.findUnique({
    where: { userId_reportDate: { userId, reportDate } },
  });

  if (existing && existing.narrative !== LOCK_PLACEHOLDER_NARRATIVE) {
    return null; // Already generated
  }

  // Acquire distributed lock
  const lock = await acquireDailyGenerationLock(userId, reportDate);
  if (!lock.acquired || !lock.briefingId) {
    return null;
  }

  try {
    // Get store name for the narrative
    const connection = await prisma.marketplaceConnection.findFirst({
      where: { userId, status: "CONNECTED" },
      select: { externalName: true },
    });
    const storeName = connection?.externalName || "Your Store";

    // Aggregate metrics for yesterday
    const metrics = await aggregateDailyMetrics(userId, reportDate);

    // Generate narrative
    const narrative = await generateDailyNarrative(metrics, storeName);

    // Finalize the briefing record (replace placeholder with actual data).
    // updateMany with narrative guard detects lost lock.
    const finalized = await prisma.dailyBriefing.updateMany({
      where: {
        id: lock.briefingId,
        narrative: LOCK_PLACEHOLDER_NARRATIVE,
      },
      data: {
        metricsData: JSON.parse(JSON.stringify(metrics)),
        narrative,
      },
    });

    if (finalized.count === 0) {
      console.warn(
        `Daily briefing lock lost for user ${userId} — another instance finalized or reclaimed`
      );
      return null;
    }

    return { briefingId: lock.briefingId, metricsData: metrics };
  } catch (error) {
    await releaseDailyGenerationLock(lock.briefingId);
    throw error;
  }
}
