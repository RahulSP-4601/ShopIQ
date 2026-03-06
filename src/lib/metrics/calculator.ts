import prisma from "@/lib/prisma";
import { UnifiedOrderStatus, Prisma } from "@prisma/client";
import { getCached, setCache, buildCacheKey } from "./cache";

export interface RevenueMetrics {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
}

export interface ProductMetrics {
  productId: string;
  title: string;
  revenue: number;
  unitsSold: number;
  orderCount: number;
}

export interface CustomerMetrics {
  email: string;
  name: string;
  totalSpent: number;
  ordersCount: number;
}

export async function getRevenueMetrics(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<RevenueMetrics> {
  const cacheKey = buildCacheKey(userId, "revenue", {
    start: startDate?.toISOString(),
    end: endDate?.toISOString(),
  });
  const cached = getCached<RevenueMetrics>(cacheKey);
  if (cached) return cached;

  const where: Prisma.UnifiedOrderWhereInput = {
    userId,
    status: { not: UnifiedOrderStatus.CANCELLED },
  };

  if (startDate || endDate) {
    where.orderedAt = {};
    if (startDate) where.orderedAt.gte = startDate;
    if (endDate) where.orderedAt.lte = endDate;
  }

  const aggregation = await prisma.unifiedOrder.aggregate({
    where,
    _sum: { totalAmount: true },
    _count: { _all: true },
  });

  const totalRevenue = Number(aggregation._sum?.totalAmount || 0);
  const totalOrders = aggregation._count?._all ?? 0;

  const result: RevenueMetrics = {
    totalRevenue,
    totalOrders,
    avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
  };
  setCache(cacheKey, result);
  return result;
}

export async function getTopProducts(
  userId: string,
  limit = 10,
  startDate?: Date,
  endDate?: Date
): Promise<ProductMetrics[]> {
  const cacheKey = buildCacheKey(userId, "topProducts", {
    limit,
    start: startDate?.toISOString(),
    end: endDate?.toISOString(),
  });
  const cached = getCached<ProductMetrics[]>(cacheKey);
  if (cached) return cached;

  const orderWhere: Prisma.UnifiedOrderWhereInput = {
    userId,
    status: { not: UnifiedOrderStatus.CANCELLED },
  };

  if (startDate || endDate) {
    orderWhere.orderedAt = {};
    if (startDate) orderWhere.orderedAt.gte = startDate;
    if (endDate) orderWhere.orderedAt.lte = endDate;
  }

  const orders = await prisma.unifiedOrder.findMany({
    where: orderWhere,
    select: { id: true },
  });

  const orderIds = orders.map((o) => o.id);
  if (orderIds.length === 0) {
    setCache(cacheKey, []);
    return [];
  }

  const items = await prisma.unifiedOrderItem.findMany({
    where: { orderId: { in: orderIds } },
    select: {
      title: true,
      sku: true,
      unitPrice: true,
      quantity: true,
      orderId: true,
    },
  });

  // Aggregate by SKU (unique product identifier), falling back to title when SKU is absent
  const productAggregates = new Map<
    string,
    { title: string; revenue: number; unitsSold: number; orderIds: Set<string> }
  >();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    // When both sku and title are missing, use a unique key per line item to avoid merging unrelated items
    const key = item.sku || item.title || `_unknown_${item.orderId}_${i}`;
    const title = item.title || "Unknown product";
    const existing = productAggregates.get(key) || {
      title,
      revenue: 0,
      unitsSold: 0,
      orderIds: new Set<string>(),
    };
    existing.revenue += Number(item.unitPrice || 0) * (item.quantity ?? 0);
    existing.unitsSold += item.quantity ?? 0;
    existing.orderIds.add(item.orderId);
    productAggregates.set(key, existing);
  }

  const sortedProducts = Array.from(productAggregates.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, limit);

  const topProductsResult = sortedProducts.map(([key, aggregate]) => ({
    productId: key,
    title: aggregate.title,
    revenue: aggregate.revenue,
    unitsSold: aggregate.unitsSold,
    orderCount: aggregate.orderIds.size,
  }));
  setCache(cacheKey, topProductsResult);
  return topProductsResult;
}

export async function getTopCustomers(
  userId: string,
  limit = 10
): Promise<CustomerMetrics[]> {
  const cacheKey = buildCacheKey(userId, "topCustomers", { limit });
  const cached = getCached<CustomerMetrics[]>(cacheKey);
  if (cached) return cached;

  const orders = await prisma.unifiedOrder.findMany({
    where: {
      userId,
      customerEmail: { not: null },
      status: { not: UnifiedOrderStatus.CANCELLED },
    },
    select: {
      customerEmail: true,
      customerName: true,
      totalAmount: true,
    },
  });

  const customerMap = new Map<
    string,
    { name: string; totalSpent: number; ordersCount: number }
  >();

  for (const order of orders) {
    if (!order.customerEmail) continue;
    const existing = customerMap.get(order.customerEmail) || {
      name: order.customerName || "Unknown",
      totalSpent: 0,
      ordersCount: 0,
    };
    existing.totalSpent += Number(order.totalAmount || 0);
    existing.ordersCount += 1;
    if (order.customerName && existing.name === "Unknown") {
      existing.name = order.customerName;
    }
    customerMap.set(order.customerEmail, existing);
  }

  const topCustomersResult = Array.from(customerMap.entries())
    .sort((a, b) => b[1].totalSpent - a[1].totalSpent)
    .slice(0, limit)
    .map(([email, data]) => ({
      email,
      name: data.name,
      totalSpent: data.totalSpent,
      ordersCount: data.ordersCount,
    }));
  setCache(cacheKey, topCustomersResult);
  return topCustomersResult;
}

export async function getDailyRevenue(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ date: string; revenue: number; orders: number }[]> {
  // Resolve the effective date range first (compute defaults before building cache key)
  // to ensure the cache key always reflects the actual query range.
  // Clone incoming dates to prevent mutating caller's Date objects.
  const resolvedEndDate = endDate ? new Date(endDate.getTime()) : new Date();
  const resolvedStartDate = startDate
    ? new Date(startDate.getTime())
    : new Date(new Date().setDate(new Date().getDate() - 30));
  resolvedStartDate.setHours(0, 0, 0, 0);
  resolvedEndDate.setHours(23, 59, 59, 999);

  const cacheKey = buildCacheKey(userId, "dailyRevenue", {
    start: resolvedStartDate.toISOString(),
    end: resolvedEndDate.toISOString(),
  });
  const cached = getCached<{ date: string; revenue: number; orders: number }[]>(cacheKey);
  if (cached) return cached;

  const orders = await prisma.unifiedOrder.findMany({
    where: {
      userId,
      orderedAt: { gte: resolvedStartDate, lte: resolvedEndDate },
      status: { not: UnifiedOrderStatus.CANCELLED },
    },
    select: {
      orderedAt: true,
      totalAmount: true,
    },
  });

  const dailyMap = new Map<string, { revenue: number; orders: number }>();

  for (const order of orders) {
    const date = order.orderedAt.toISOString().split("T")[0];
    const existing = dailyMap.get(date) || { revenue: 0, orders: 0 };
    dailyMap.set(date, {
      revenue: existing.revenue + Number(order.totalAmount || 0),
      orders: existing.orders + 1,
    });
  }

  const dailyResult: { date: string; revenue: number; orders: number }[] = [];
  const currentDate = new Date(resolvedStartDate);

  while (currentDate <= resolvedEndDate) {
    const dateStr = currentDate.toISOString().split("T")[0];
    dailyResult.push({
      date: dateStr,
      ...(dailyMap.get(dateStr) || { revenue: 0, orders: 0 }),
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  setCache(cacheKey, dailyResult);
  return dailyResult;
}

export async function getStoreContext(userId: string): Promise<string> {
  const connections = await prisma.marketplaceConnection.findMany({
    where: { userId, status: "CONNECTED" },
    select: { marketplace: true, externalName: true, lastSyncAt: true },
  });

  if (connections.length === 0) {
    return "No connected marketplaces. Please connect at least one marketplace to start analytics.";
  }

  const marketplaceNames = connections
    .map((c) => `${c.marketplace}${c.externalName ? ` (${c.externalName})` : ""}`)
    .join(", ");

  const now = new Date();
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const previousWeekStart = new Date(lastWeekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const last30DaysStart = new Date(now);
  last30DaysStart.setDate(last30DaysStart.getDate() - 30);

  const [
    revenueLastWeek,
    revenuePreviousWeek,
    revenueLast30Days,
    topProducts,
    topCustomers,
    dailyRevenue,
    productCount,
    orderCount,
  ] = await Promise.all([
    getRevenueMetrics(userId, lastWeekStart, now),
    getRevenueMetrics(userId, previousWeekStart, lastWeekStart),
    getRevenueMetrics(userId, last30DaysStart, now),
    getTopProducts(userId, 5, last30DaysStart, now),
    getTopCustomers(userId, 5),
    getDailyRevenue(userId, new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), now),
    prisma.unifiedProduct.count({ where: { userId } }),
    prisma.unifiedOrder.count({ where: { userId, status: { not: UnifiedOrderStatus.CANCELLED } } }),
  ]);

  const lastSync = connections
    .filter((c) => c.lastSyncAt)
    .sort((a, b) => (b.lastSyncAt!.getTime() - a.lastSyncAt!.getTime()))
    [0]?.lastSyncAt;

  return `
Connected Marketplaces: ${marketplaceNames}

=== LAST 7 DAYS ===
Revenue: $${revenueLastWeek.totalRevenue.toFixed(2)}
Orders: ${revenueLastWeek.totalOrders}
Avg Order Value: $${revenueLastWeek.avgOrderValue.toFixed(2)}

=== PREVIOUS 7 DAYS (comparison) ===
Revenue: $${revenuePreviousWeek.totalRevenue.toFixed(2)}
Orders: ${revenuePreviousWeek.totalOrders}
Week-over-week change: ${(
    ((revenueLastWeek.totalRevenue - revenuePreviousWeek.totalRevenue) /
      (revenuePreviousWeek.totalRevenue || 1)) *
    100
  ).toFixed(1)}%

=== LAST 30 DAYS ===
Revenue: $${revenueLast30Days.totalRevenue.toFixed(2)}
Orders: ${revenueLast30Days.totalOrders}
Avg Order Value: $${revenueLast30Days.avgOrderValue.toFixed(2)}

=== TOP 5 PRODUCTS (Last 30 Days) ===
${topProducts
  .map(
    (p, i) =>
      `${i + 1}. ${p.title}: $${p.revenue.toFixed(2)} (${p.unitsSold} sold)`
  )
  .join("\n")}

=== TOP 5 CUSTOMERS (All Time) ===
${topCustomers
  .map(
    (c, i) =>
      `${i + 1}. ${c.name}: $${c.totalSpent.toFixed(2)} (${c.ordersCount} orders)`
  )
  .join("\n")}

=== DAILY REVENUE (Last 14 Days) ===
${dailyRevenue.map((d) => `${d.date}: $${d.revenue.toFixed(2)} (${d.orders} orders)`).join("\n")}

=== TOTALS ===
Total Products: ${productCount}
Total Orders: ${orderCount}
Last Synced: ${lastSync?.toISOString() || "Never"}
`;
}
