import prisma from "@/lib/prisma";
import OpenAI from "openai";
import {
  getRevenueMetrics,
  getTopProducts,
  getDailyRevenue,
} from "@/lib/metrics/calculator";
import {
  calculateAiMaturity,
  snapshotMaturity,
} from "@/lib/ai/memory/maturity";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export interface WeeklyMetrics {
  revenue: { total: number; orders: number; aov: number };
  previousWeek: { total: number; orders: number; aov: number };
  revenueChangePercent: number;
  topProducts: Array<{
    title: string;
    revenue: number;
    unitsSold: number;
  }>;
  dailyRevenue: Array<{ date: string; revenue: number; orders: number }>;
  lowStockProducts: Array<{
    title: string;
    inventory: number | null;
    sku: string | null;
  }>;
  alertsSummary: { total: number; stockout: number; demandSurge: number; revenueAnomaly: number };
}

// -------------------------------------------------------
// Aggregate Weekly Metrics
// -------------------------------------------------------

export async function aggregateWeeklyMetrics(
  userId: string,
  weekStart: Date
): Promise<WeeklyMetrics> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const previousWeekStart = new Date(weekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);

  const [
    currentMetrics,
    previousMetrics,
    topProducts,
    dailyRevenue,
    lowStockProducts,
    pendingAlerts,
  ] = await Promise.all([
    getRevenueMetrics(userId, weekStart, weekEnd),
    getRevenueMetrics(userId, previousWeekStart, weekStart),
    getTopProducts(userId, 5, weekStart, weekEnd),
    getDailyRevenue(userId, weekStart, weekEnd),
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
        createdAt: { gte: weekStart, lt: weekEnd },
      },
      _count: { _all: true },
    }),
  ]);

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
  for (const group of pendingAlerts) {
    alertCounts[group.type] = group._count._all;
    totalAlerts += group._count._all;
  }

  return {
    revenue: {
      total: currentMetrics.totalRevenue,
      orders: currentMetrics.totalOrders,
      aov: currentMetrics.avgOrderValue,
    },
    previousWeek: {
      total: previousMetrics.totalRevenue,
      orders: previousMetrics.totalOrders,
      aov: previousMetrics.avgOrderValue,
    },
    revenueChangePercent: Math.round(revenueChangePercent * 10) / 10,
    topProducts: topProducts.map((p) => ({
      title: p.title,
      revenue: p.revenue,
      unitsSold: p.unitsSold,
    })),
    dailyRevenue,
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
// Generate Narrative via OpenAI
// -------------------------------------------------------

async function generateNarrative(
  metrics: WeeklyMetrics,
  storeName: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Briefing narrative generation failed: OPENAI_API_KEY is not configured");
  }

  const openai = new OpenAI({ apiKey });

  const safe = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const dataBlock = `
Store: ${storeName}

Revenue: $${safe(metrics.revenue.total).toFixed(2)} (${safe(metrics.revenue.orders)} orders, AOV: $${safe(metrics.revenue.aov).toFixed(2)})
Previous Week: $${safe(metrics.previousWeek.total).toFixed(2)} (${safe(metrics.previousWeek.orders)} orders)
Week-over-Week Change: ${metrics.revenueChangePercent > 0 ? "+" : ""}${safe(metrics.revenueChangePercent)}%

Top Products:
${metrics.topProducts.map((p, i) => `${i + 1}. ${p.title}: $${safe(p.revenue).toFixed(2)} (${safe(p.unitsSold)} units)`).join("\n")}

Low Stock Alert:
${metrics.lowStockProducts.length > 0 ? metrics.lowStockProducts.map((p) => `- ${p.title}: ${safe(p.inventory)} units remaining`).join("\n") : "No low-stock products."}

Alerts This Week: ${safe(metrics.alertsSummary.total)} total (${safe(metrics.alertsSummary.stockout)} stockout, ${safe(metrics.alertsSummary.demandSurge)} demand surge, ${safe(metrics.alertsSummary.revenueAnomaly)} revenue anomaly)

Daily Breakdown:
${metrics.dailyRevenue.map((d) => `${d.date}: $${safe(d.revenue).toFixed(2)} (${safe(d.orders)} orders)`).join("\n")}
`;

  const NARRATIVE_TIMEOUT_MS = 30_000; // 30 second timeout for narrative generation

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are Frax, the AI business analyst for Frame. Write a concise weekly briefing email narrative (200-300 words). Be direct, data-driven, and actionable. Use **bold** for key numbers. Include: executive summary, highlights, concerns, and 2-3 recommended actions.`,
        },
        {
          role: "user",
          content: `Generate the weekly briefing narrative for this data:\n\n${dataBlock}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }, { timeout: NARRATIVE_TIMEOUT_MS });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Briefing narrative generation returned empty content");
    }
    return content;
  } catch (error) {
    // Detect timeout (OpenAI SDK APIConnectionTimeoutError or AbortError)
    const isTimeout =
      (error instanceof OpenAI.APIConnectionTimeoutError) ||
      (error instanceof Error && error.name === "AbortError");

    if (isTimeout) {
      console.error(`Briefing narrative generation timed out after ${NARRATIVE_TIMEOUT_MS}ms`);
      throw new Error("Briefing narrative generation timed out");
    }

    // Sanitize error before logging to avoid exposing sensitive data (API keys, tokens, etc.)
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorName = error instanceof Error ? error.name : "Error";
    const errorCode = (error as any)?.code;
    const httpStatus = (error as any)?.response?.status;

    const sanitizedError = {
      name: errorName,
      message: errorMessage,
      ...(errorCode ? { code: errorCode } : {}),
      ...(httpStatus ? { httpStatus } : {}),
    };

    console.error("Briefing narrative generation failed:", sanitizedError);
    throw error;
  }
}

// -------------------------------------------------------
// Generate & Save Weekly Briefing
// -------------------------------------------------------

// Distributed lock via DB — uses WeeklyBriefing's @@unique([userId, weekStart])
// constraint. The first instance to create the placeholder row wins; others get P2002.
const LOCK_PLACEHOLDER_NARRATIVE = "__GENERATING__";
const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes — stale locks are reclaimed

async function acquireGenerationLock(
  userId: string,
  weekStart: Date
): Promise<{ acquired: boolean; briefingId?: string }> {
  try {
    const placeholder = await prisma.weeklyBriefing.create({
      data: {
        userId,
        weekStart,
        metricsData: {},
        narrative: LOCK_PLACEHOLDER_NARRATIVE,
        maturity: {},
      },
    });
    return { acquired: true, briefingId: placeholder.id };
  } catch (error: unknown) {
    // P2002 = unique constraint violation — another instance already holds the lock or completed
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      // Check if it's a stale lock (placeholder older than TTL) and reclaim it
      const existing = await prisma.weeklyBriefing.findUnique({
        where: { userId_weekStart: { userId, weekStart } },
      });
      if (
        existing &&
        existing.narrative === LOCK_PLACEHOLDER_NARRATIVE &&
        Date.now() - existing.createdAt.getTime() > LOCK_TTL_MS
      ) {
        // Reclaim stale lock atomically — only if it's still the same placeholder
        const reclaimed = await prisma.weeklyBriefing.updateMany({
          where: {
            id: existing.id,
            narrative: LOCK_PLACEHOLDER_NARRATIVE,
            createdAt: existing.createdAt, // CAS guard: another instance may have reclaimed first
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

async function releaseGenerationLock(briefingId: string): Promise<void> {
  // Atomically delete the placeholder only if it still holds the lock marker.
  // Using deleteMany with compound where avoids the TOCTOU race of findUnique+delete
  // (another instance could finalize the briefing between the two calls).
  try {
    await prisma.weeklyBriefing.deleteMany({
      where: { id: briefingId, narrative: LOCK_PLACEHOLDER_NARRATIVE },
    });
  } catch (err) {
    console.error("Failed to release generation lock:", err);
  }
}

export async function generateWeeklyBriefing(
  userId: string
): Promise<{ briefingId: string; metricsData: WeeklyMetrics } | null> {
  // Determine the current week start (Monday 00:00 UTC)
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceMonday);
  weekStart.setUTCHours(0, 0, 0, 0);

  // Check if briefing already exists (and is complete) for this week
  const existing = await prisma.weeklyBriefing.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
  });

  if (existing && existing.narrative !== LOCK_PLACEHOLDER_NARRATIVE) {
    return null; // Already generated
  }

  // Acquire distributed lock via DB unique constraint
  const lock = await acquireGenerationLock(userId, weekStart);
  if (!lock.acquired || !lock.briefingId) {
    return null; // Another instance is generating or already completed
  }

  try {
    // Get store name for the narrative
    const connection = await prisma.marketplaceConnection.findFirst({
      where: { userId, status: "CONNECTED" },
      select: { externalName: true },
    });
    const storeName = connection?.externalName || "Your Store";

    // Aggregate metrics for the previous full week
    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    const metrics = await aggregateWeeklyMetrics(userId, previousWeekStart);

    // Generate narrative
    const narrative = await generateNarrative(metrics, storeName);

    // Calculate and snapshot maturity
    const maturity = await calculateAiMaturity(userId);
    await snapshotMaturity(userId).catch((err) =>
      console.error("Maturity snapshot failed:", err)
    );

    // Finalize the briefing record (replace placeholder with actual data).
    // Use updateMany with narrative guard to detect lost lock — if another instance
    // reclaimed the lock after LOCK_TTL_MS expired, this update will match 0 rows.
    const finalized = await prisma.weeklyBriefing.updateMany({
      where: {
        id: lock.briefingId,
        narrative: LOCK_PLACEHOLDER_NARRATIVE,
      },
      data: {
        metricsData: JSON.parse(JSON.stringify(metrics)),
        narrative,
        maturity: JSON.parse(JSON.stringify(maturity)),
      },
    });

    if (finalized.count === 0) {
      console.warn(`Briefing lock lost for user ${userId} — another instance finalized or reclaimed the briefing`);
      return null;
    }

    return { briefingId: lock.briefingId, metricsData: metrics };
  } catch (error) {
    // Release the lock (delete placeholder) so next cron run can retry
    await releaseGenerationLock(lock.briefingId);
    throw error;
  }
}
