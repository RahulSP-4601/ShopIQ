import prisma from "@/lib/prisma";
import {
  getRevenueMetrics,
  getTopProducts,
  getTopCustomers,
  getDailyRevenue,
} from "@/lib/metrics/calculator";

export interface ReportData {
  type: string;
  title: string;
  generatedAt: string;
  currency?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  metrics: Record<string, unknown>;
}

export async function generateRevenueSummaryData(
  storeId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ReportData> {
  const now = new Date();
  const start = startDate || new Date(now.setDate(now.getDate() - 30));
  const end = endDate || new Date();

  const [revenueMetrics, dailyRevenue, store] = await Promise.all([
    getRevenueMetrics(storeId, start, end),
    getDailyRevenue(storeId, start, end),
    prisma.store.findUnique({
      where: { id: storeId },
      select: { currency: true },
    }),
  ]);

  // Calculate trends
  const midPoint = Math.floor(dailyRevenue.length / 2);
  const firstHalf = dailyRevenue.slice(0, midPoint);
  const secondHalf = dailyRevenue.slice(midPoint);

  const firstHalfRevenue = firstHalf.reduce((sum, d) => sum + d.revenue, 0);
  const secondHalfRevenue = secondHalf.reduce((sum, d) => sum + d.revenue, 0);
  const trend =
    firstHalfRevenue > 0
      ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100
      : 0;

  return {
    type: "REVENUE_SUMMARY",
    title: "Revenue Summary Report",
    generatedAt: new Date().toISOString(),
    currency: store?.currency || "USD",
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    metrics: {
      totalRevenue: revenueMetrics.totalRevenue,
      totalOrders: revenueMetrics.totalOrders,
      avgOrderValue: revenueMetrics.avgOrderValue,
      totalTax: revenueMetrics.totalTax,
      totalDiscounts: revenueMetrics.totalDiscounts,
      dailyRevenue,
      trend: {
        percentage: trend,
        direction: trend > 0 ? "up" : trend < 0 ? "down" : "flat",
      },
    },
  };
}

export async function generateProductAnalysisData(
  storeId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ReportData> {
  const now = new Date();
  const start = startDate || new Date(now.setDate(now.getDate() - 30));
  const end = endDate || new Date();

  const [topProducts, productStats, store] = await Promise.all([
    getTopProducts(storeId, 20, start, end),
    prisma.product.aggregate({
      where: { storeId },
      _count: true,
      _sum: { totalInventory: true },
      _avg: { price: true },
    }),
    prisma.store.findUnique({
      where: { id: storeId },
      select: { currency: true },
    }),
  ]);

  // Get low stock products
  const lowStockProducts = await prisma.product.findMany({
    where: {
      storeId,
      totalInventory: { lt: 10 },
      status: "active",
    },
    select: {
      id: true,
      title: true,
      totalInventory: true,
    },
    take: 10,
  });

  return {
    type: "PRODUCT_ANALYSIS",
    title: "Product Analysis Report",
    generatedAt: new Date().toISOString(),
    currency: store?.currency || "USD",
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    metrics: {
      totalProducts: productStats._count,
      totalInventory: productStats._sum.totalInventory || 0,
      avgPrice: Number(productStats._avg.price || 0),
      topProducts,
      lowStockProducts,
    },
  };
}

export async function generateCustomerInsightsData(
  storeId: string
): Promise<ReportData> {
  const [topCustomers, customerStats, store] = await Promise.all([
    getTopCustomers(storeId, 20),
    prisma.customer.aggregate({
      where: { storeId },
      _count: true,
      _sum: { totalSpent: true, ordersCount: true },
      _avg: { totalSpent: true, ordersCount: true },
    }),
    prisma.store.findUnique({
      where: { id: storeId },
      select: { currency: true },
    }),
  ]);

  // Get customer segments
  const [vipCustomers, regularCustomers, newCustomers] = await Promise.all([
    prisma.customer.count({
      where: { storeId, totalSpent: { gte: 500 } },
    }),
    prisma.customer.count({
      where: { storeId, ordersCount: { gte: 2 }, totalSpent: { lt: 500 } },
    }),
    prisma.customer.count({
      where: { storeId, ordersCount: { lt: 2 } },
    }),
  ]);

  // Geographic distribution
  const geoDistribution = await prisma.customer.groupBy({
    by: ["country"],
    where: { storeId, country: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { _all: "desc" } },
    take: 10,
  });

  return {
    type: "CUSTOMER_INSIGHTS",
    title: "Customer Insights Report",
    generatedAt: new Date().toISOString(),
    currency: store?.currency || "USD",
    metrics: {
      totalCustomers: customerStats._count,
      totalRevenue: Number(customerStats._sum.totalSpent || 0),
      avgCustomerValue: Number(customerStats._avg.totalSpent || 0),
      avgOrdersPerCustomer: Number(customerStats._avg.ordersCount || 0),
      topCustomers,
      segments: {
        vip: vipCustomers,
        regular: regularCustomers,
        new: newCustomers,
      },
      geoDistribution: geoDistribution.map((g) => ({
        country: g.country,
        count: g._count._all,
      })),
    },
  };
}

export async function generateFullAnalysisData(
  storeId: string
): Promise<ReportData> {
  const now = new Date();
  const last30Days = new Date(now);
  last30Days.setDate(last30Days.getDate() - 30);

  const [revenueSummary, productAnalysis, customerInsights, store] =
    await Promise.all([
      generateRevenueSummaryData(storeId, last30Days, now),
      generateProductAnalysisData(storeId, last30Days, now),
      generateCustomerInsightsData(storeId),
      prisma.store.findUnique({
        where: { id: storeId },
        select: {
          name: true,
          domain: true,
          currency: true,
          lastSyncedAt: true,
        },
      }),
    ]);

  return {
    type: "FULL_ANALYSIS",
    title: "Complete Store Analysis",
    generatedAt: new Date().toISOString(),
    currency: store?.currency || "USD",
    metrics: {
      store,
      revenue: revenueSummary.metrics,
      products: productAnalysis.metrics,
      customers: customerInsights.metrics,
    },
  };
}
