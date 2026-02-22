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

export interface MonthlyMetrics {
  reportMonth: string; // "YYYY-MM"
  monthName: string; // "February 2026"
  revenue: { total: number; orders: number; aov: number };
  previousMonth: { total: number; orders: number; aov: number };
  revenueChangePercent: number;
  marketplaceBreakdown: MarketplaceBreakdown[];
  winnerPlatform: { marketplace: string; revenue: number } | null;
  topProducts: Array<{
    title: string;
    revenue: number;
    unitsSold: number;
    marketplace: string;
  }>;
  weeklyRevenue: Array<{
    weekLabel: string;
    revenue: number;
    orders: number;
  }>;
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
  totalActiveDays: number;
}

// -------------------------------------------------------
// Aggregate Monthly Metrics
// -------------------------------------------------------

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export async function aggregateMonthlyMetrics(
  userId: string,
  reportMonth: Date
): Promise<MonthlyMetrics> {
  // reportMonth = 1st of the target month at 00:00 UTC
  const monthStart = new Date(reportMonth);
  monthStart.setUTCHours(0, 0, 0, 0);

  // Last day of the month (inclusive)
  const monthEnd = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)
  );
  monthEnd.setUTCHours(23, 59, 59, 999);

  // Exclusive upper bound for groupBy
  const monthEndExclusive = new Date(monthEnd);
  monthEndExclusive.setUTCDate(monthEndExclusive.getUTCDate() + 1);
  monthEndExclusive.setUTCHours(0, 0, 0, 0);

  // Previous month
  const prevMonthStart = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() - 1, 1)
  );
  const prevMonthEnd = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), 0)
  );
  prevMonthEnd.setUTCHours(23, 59, 59, 999);

  const monthName = `${MONTH_NAMES[monthStart.getUTCMonth()]} ${monthStart.getUTCFullYear()}`;

  const [
    currentMetrics,
    previousMetrics,
    topItemsAgg,
    marketplaceGroups,
    dailyRevenue,
    lowStockProducts,
    alertGroups,
  ] = await Promise.all([
    getRevenueMetrics(userId, monthStart, monthEnd),
    getRevenueMetrics(userId, prevMonthStart, prevMonthEnd),
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
        AND o."orderedAt" >= ${monthStart}
        AND o."orderedAt" <= ${monthEnd}
        AND o."status" != 'CANCELLED'::"UnifiedOrderStatus"
      GROUP BY product_key, o."marketplace"
    `,
    prisma.unifiedOrder.groupBy({
      by: ["marketplace"],
      where: {
        userId,
        orderedAt: { gte: monthStart, lt: monthEndExclusive },
        status: { not: UnifiedOrderStatus.CANCELLED },
      },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    getDailyRevenue(userId, monthStart, monthEnd),
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
        createdAt: { gte: monthStart, lt: monthEndExclusive },
      },
      _count: { _all: true },
    }),
  ]);

  // Aggregate top 5 products across marketplaces
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

  // Per-marketplace breakdown
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

  const winnerPlatform =
    marketplaceBreakdown.length > 0 && marketplaceBreakdown[0].revenue > 0
      ? {
          marketplace: marketplaceBreakdown[0].marketplace,
          revenue: marketplaceBreakdown[0].revenue,
        }
      : null;

  // Revenue change vs previous month
  const revenueChangePercent =
    previousMetrics.totalRevenue > 0
      ? ((currentMetrics.totalRevenue - previousMetrics.totalRevenue) /
          previousMetrics.totalRevenue) *
        100
      : currentMetrics.totalRevenue > 0
        ? 100
        : 0;

  // Chunk daily revenue into weeks (Mon-Sun)
  const shortMonths = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const weeklyRevenue: Array<{
    weekLabel: string;
    revenue: number;
    orders: number;
  }> = [];
  let weekRevenue = 0;
  let weekOrders = 0;
  let weekStartDate: string | null = null;

  for (let i = 0; i < dailyRevenue.length; i++) {
    const d = dailyRevenue[i];
    const date = new Date(d.date + "T00:00:00Z");
    const dayOfWeek = date.getUTCDay(); // 0=Sun, 1=Mon, ...

    if (weekStartDate === null) {
      weekStartDate = d.date;
    }

    weekRevenue += d.revenue;
    weekOrders += d.orders;

    // End of week (Sunday) or last day of data
    const isEndOfWeek = dayOfWeek === 0;
    const isLastDay = i === dailyRevenue.length - 1;

    if (isEndOfWeek || isLastDay) {
      const startDate = new Date(weekStartDate + "T00:00:00Z");
      const label = `${shortMonths[startDate.getUTCMonth()]} ${startDate.getUTCDate()} - ${shortMonths[date.getUTCMonth()]} ${date.getUTCDate()}`;
      weeklyRevenue.push({
        weekLabel: label,
        revenue: weekRevenue,
        orders: weekOrders,
      });
      weekRevenue = 0;
      weekOrders = 0;
      weekStartDate = null;
    }
  }

  // Count active days
  let totalActiveDays = 0;
  for (const d of dailyRevenue) {
    if (d.orders > 0) totalActiveDays++;
  }

  // Alert counts
  const alertCounts: Record<string, number> = {};
  let totalAlerts = 0;
  for (const group of alertGroups) {
    alertCounts[group.type] = group._count._all;
    totalAlerts += group._count._all;
  }

  return {
    reportMonth: `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, "0")}`,
    monthName,
    revenue: {
      total: currentMetrics.totalRevenue,
      orders: currentMetrics.totalOrders,
      aov: currentMetrics.avgOrderValue,
    },
    previousMonth: {
      total: previousMetrics.totalRevenue,
      orders: previousMetrics.totalOrders,
      aov: previousMetrics.avgOrderValue,
    },
    revenueChangePercent: Math.round(revenueChangePercent * 10) / 10,
    marketplaceBreakdown,
    winnerPlatform,
    topProducts,
    weeklyRevenue,
    lowStockProducts,
    alertsSummary: {
      total: totalAlerts,
      stockout: alertCounts["stockout"] || 0,
      demandSurge: alertCounts["demand_surge"] || 0,
      revenueAnomaly: alertCounts["revenue_anomaly"] || 0,
    },
    totalActiveDays,
  };
}

// -------------------------------------------------------
// Generate Monthly Narrative via OpenAI
// -------------------------------------------------------

async function generateMonthlyNarrative(
  metrics: MonthlyMetrics,
  storeName: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Monthly briefing narrative generation failed: OPENAI_API_KEY is not configured"
    );
  }

  const openai = new OpenAI({ apiKey });

  const safe = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const daysInMonth = new Date(
    new Date(metrics.reportMonth + "-01").getUTCFullYear(),
    new Date(metrics.reportMonth + "-01").getUTCMonth() + 1,
    0
  ).getDate();

  const dataBlock = `
Store: ${storeName}
Month: ${metrics.monthName}

Monthly Revenue: ₹${safe(metrics.revenue.total).toFixed(2)} (${safe(metrics.revenue.orders)} orders, AOV: ₹${safe(metrics.revenue.aov).toFixed(2)})
Previous Month: ₹${safe(metrics.previousMonth.total).toFixed(2)} (${safe(metrics.previousMonth.orders)} orders, AOV: ₹${safe(metrics.previousMonth.aov).toFixed(2)})
Month-over-Month Change: ${metrics.revenueChangePercent > 0 ? "+" : ""}${safe(metrics.revenueChangePercent)}%
Active Days: ${safe(metrics.totalActiveDays)}/${daysInMonth}

Per-Marketplace Breakdown:
${metrics.marketplaceBreakdown.length > 0 ? metrics.marketplaceBreakdown.map((m) => `- ${m.marketplace}: ₹${safe(m.revenue).toFixed(2)} (${safe(m.orders)} orders, AOV: ₹${safe(m.aov).toFixed(2)})`).join("\n") : "No marketplace data."}

Winner Platform: ${metrics.winnerPlatform ? `${metrics.winnerPlatform.marketplace} with ₹${safe(metrics.winnerPlatform.revenue).toFixed(2)}` : "No sales this month"}

Weekly Revenue Trend:
${metrics.weeklyRevenue.map((w) => `- ${w.weekLabel}: ₹${safe(w.revenue).toFixed(2)} (${safe(w.orders)} orders)`).join("\n")}

Top 5 Products:
${metrics.topProducts.length > 0 ? metrics.topProducts.map((p, i) => `${i + 1}. ${p.title} [${p.marketplace}]: ₹${safe(p.revenue).toFixed(2)} (${safe(p.unitsSold)} units)`).join("\n") : "No product sales."}

Low Stock Alert:
${metrics.lowStockProducts.length > 0 ? metrics.lowStockProducts.map((p) => `- ${p.title} [${p.marketplace}]: ${safe(p.inventory)} units remaining`).join("\n") : "No low-stock products."}

Alerts This Month: ${safe(metrics.alertsSummary.total)} total (${safe(metrics.alertsSummary.stockout)} stockout, ${safe(metrics.alertsSummary.demandSurge)} demand surge, ${safe(metrics.alertsSummary.revenueAnomaly)} revenue anomaly)
`;

  const NARRATIVE_TIMEOUT_MS = 30_000;

  try {
    const response = await openai.chat.completions.create(
      {
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are Frax, the AI analyst for Frame. Write a strategic monthly review for an e-commerce seller. Rules:
- Write 200-300 words in flowing paragraphs. No bullet points, no headers, no lists.
- Paragraph 1: Month headline — total revenue, comparison with previous month, whether business is growing/declining/flat.
- Paragraph 2: Marketplace deep dive — which platform drove the most growth, which declined, and any market share shifts worth noting.
- Paragraph 3: Product performance — best sellers, what's rising vs plateauing, any seasonal patterns emerging.
- Paragraph 4: 2-3 specific, data-backed strategic recommendations for next month. Be concrete ("Allocate more inventory to Shopify" not "Consider expanding").
- Use **bold** for key numbers, platform names, and product names. Always use ₹ for currency (INR), never $.
- Tone: strategic advisor giving a monthly boardroom brief. Confident, insightful, no fluff.
- If there were zero sales, be direct about it and provide a concrete recovery plan.`,
          },
          {
            role: "user",
            content: `Generate the monthly review for this data:\n\n${dataBlock}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      },
      { timeout: NARRATIVE_TIMEOUT_MS }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error(
        "Monthly briefing narrative generation returned empty content"
      );
    }
    return content;
  } catch (error) {
    const isTimeout =
      error instanceof OpenAI.APIConnectionTimeoutError ||
      (error instanceof Error && error.name === "AbortError");

    if (isTimeout) {
      console.error(
        `Monthly briefing narrative generation timed out after ${NARRATIVE_TIMEOUT_MS}ms`
      );
      throw new Error("Monthly briefing narrative generation timed out");
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
      "Monthly briefing narrative generation failed:",
      sanitizedError
    );
    throw error;
  }
}

// -------------------------------------------------------
// Generate & Save Monthly Briefing
// -------------------------------------------------------

const LOCK_PLACEHOLDER_NARRATIVE = "__GENERATING__";
const LOCK_TTL_MS = 5 * 60 * 1000;

async function acquireMonthlyGenerationLock(
  userId: string,
  reportMonth: Date
): Promise<{ acquired: boolean; briefingId?: string }> {
  try {
    const placeholder = await prisma.monthlyBriefing.create({
      data: {
        userId,
        reportMonth,
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
      const existing = await prisma.monthlyBriefing.findFirst({
        where: { userId, reportMonth },
      });
      if (
        existing &&
        existing.narrative === LOCK_PLACEHOLDER_NARRATIVE &&
        Date.now() - existing.createdAt.getTime() > LOCK_TTL_MS
      ) {
        const reclaimed = await prisma.monthlyBriefing.updateMany({
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

async function releaseMonthlyGenerationLock(
  briefingId: string
): Promise<void> {
  try {
    await prisma.monthlyBriefing.deleteMany({
      where: { id: briefingId, narrative: LOCK_PLACEHOLDER_NARRATIVE },
    });
  } catch (err) {
    console.error("Failed to release monthly generation lock:", err);
  }
}

export async function generateMonthlyBriefing(
  userId: string,
  reportMonth: Date
): Promise<{ briefingId: string; metricsData: MonthlyMetrics } | null> {
  // Check if briefing already exists (and is complete)
  const existing = await prisma.monthlyBriefing.findFirst({
    where: { userId, reportMonth },
  });

  if (existing && existing.narrative !== LOCK_PLACEHOLDER_NARRATIVE) {
    return null; // Already generated
  }

  // Acquire distributed lock
  const lock = await acquireMonthlyGenerationLock(userId, reportMonth);
  if (!lock.acquired || !lock.briefingId) {
    return null;
  }

  try {
    const connection = await prisma.marketplaceConnection.findFirst({
      where: { userId, status: "CONNECTED" },
      select: { externalName: true },
    });
    const storeName = connection?.externalName || "Your Store";

    const metrics = await aggregateMonthlyMetrics(userId, reportMonth);

    const narrative = await generateMonthlyNarrative(metrics, storeName);

    const finalized = await prisma.monthlyBriefing.updateMany({
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
        `Monthly briefing lock lost for user ${userId} — another instance finalized or reclaimed`
      );
      return null;
    }

    return { briefingId: lock.briefingId, metricsData: metrics };
  } catch (error) {
    await releaseMonthlyGenerationLock(lock.briefingId);
    throw error;
  }
}
