import {
  getRevenueMetrics,
  getTopProducts,
  getTopCustomers,
  getDailyRevenue,
} from "@/lib/metrics/calculator";
import prisma from "@/lib/prisma";
import { UnifiedOrderStatus } from "@prisma/client";

export interface ReportData {
  type: string;
  title: string;
  generatedAt: string;
  dateRange?: {
    start: string;
    end: string;
  };
  metrics: Record<string, unknown>;
}

export async function generateRevenueSummaryData(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ReportData> {
  const now = new Date();
  const start = startDate || new Date(now.setDate(now.getDate() - 30));
  const end = endDate || new Date();

  const [revenueMetrics, dailyRevenue] = await Promise.all([
    getRevenueMetrics(userId, start, end),
    getDailyRevenue(userId, start, end),
  ]);

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
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    metrics: {
      totalRevenue: revenueMetrics.totalRevenue,
      totalOrders: revenueMetrics.totalOrders,
      avgOrderValue: revenueMetrics.avgOrderValue,
      dailyRevenue,
      trend: {
        percentage: trend,
        direction: trend > 0 ? "up" : trend < 0 ? "down" : "flat",
      },
    },
  };
}

export async function generateProductAnalysisData(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ReportData> {
  const now = new Date();
  const start = startDate || new Date(now.setDate(now.getDate() - 30));
  const end = endDate || new Date();

  const [topProducts, productStats] = await Promise.all([
    getTopProducts(userId, 20, start, end),
    prisma.unifiedProduct.aggregate({
      where: { userId },
      _count: true,
      _sum: { inventory: true },
      _avg: { price: true },
    }),
  ]);

  const lowStockProducts = await prisma.unifiedProduct.findMany({
    where: {
      userId,
      inventory: { lt: 10 },
      status: "ACTIVE",
    },
    select: {
      id: true,
      title: true,
      inventory: true,
    },
    take: 10,
  });

  return {
    type: "PRODUCT_ANALYSIS",
    title: "Product Analysis Report",
    generatedAt: new Date().toISOString(),
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    metrics: {
      totalProducts: productStats._count,
      totalInventory: productStats._sum.inventory || 0,
      avgPrice: Number(productStats._avg.price || 0),
      topProducts,
      lowStockProducts,
    },
  };
}

export async function generateCustomerInsightsData(
  userId: string
): Promise<ReportData> {
  const topCustomers = await getTopCustomers(userId, 20);

  const orderStats = await prisma.unifiedOrder.aggregate({
    where: { userId, status: { not: UnifiedOrderStatus.CANCELLED } },
    _count: true,
    _sum: { totalAmount: true },
  });

  const uniqueCustomers = await prisma.unifiedOrder.findMany({
    where: { userId, customerEmail: { not: null }, status: { not: UnifiedOrderStatus.CANCELLED } },
    select: { customerEmail: true },
    distinct: ["customerEmail"],
  });

  const totalCustomers = uniqueCustomers.length;
  const totalRevenue = Number(orderStats._sum.totalAmount || 0);
  const avgCustomerValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  return {
    type: "CUSTOMER_INSIGHTS",
    title: "Customer Insights Report",
    generatedAt: new Date().toISOString(),
    metrics: {
      totalCustomers,
      totalRevenue,
      avgCustomerValue,
      topCustomers,
    },
  };
}

export async function generateFullAnalysisData(
  userId: string
): Promise<ReportData> {
  const now = new Date();
  const last30Days = new Date(now);
  last30Days.setDate(last30Days.getDate() - 30);

  const [revenueSummary, productAnalysis, customerInsights, connections] =
    await Promise.all([
      generateRevenueSummaryData(userId, last30Days, now),
      generateProductAnalysisData(userId, last30Days, now),
      generateCustomerInsightsData(userId),
      prisma.marketplaceConnection.findMany({
        where: { userId, status: "CONNECTED" },
        select: { marketplace: true, externalName: true, lastSyncAt: true },
      }),
    ]);

  return {
    type: "FULL_ANALYSIS",
    title: "Complete Marketplace Analysis",
    generatedAt: new Date().toISOString(),
    metrics: {
      connectedMarketplaces: connections.map((c) => c.marketplace),
      revenue: revenueSummary.metrics,
      products: productAnalysis.metrics,
      customers: customerInsights.metrics,
    },
  };
}
