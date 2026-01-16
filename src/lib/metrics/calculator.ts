import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface RevenueMetrics {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  totalTax: number;
  totalDiscounts: number;
}

export interface ProductMetrics {
  productId: string;
  title: string;
  revenue: number;
  unitsSold: number;
  orderCount: number;
}

export interface CustomerMetrics {
  customerId: string;
  email: string | null;
  name: string;
  totalSpent: number;
  ordersCount: number;
}

export async function getRevenueMetrics(
  storeId: string,
  startDate?: Date,
  endDate?: Date
): Promise<RevenueMetrics> {
  const where: Prisma.OrderWhereInput = {
    storeId,
    financialStatus: { not: "refunded" },
    cancelledAt: null,
  };

  if (startDate || endDate) {
    where.shopifyCreatedAt = {};
    if (startDate) where.shopifyCreatedAt.gte = startDate;
    if (endDate) where.shopifyCreatedAt.lte = endDate;
  }

  const result = await prisma.order.aggregate({
    where,
    _sum: {
      totalPrice: true,
      totalTax: true,
      totalDiscounts: true,
    },
    _count: true,
  });

  const totalRevenue = Number(result._sum.totalPrice || 0);
  const totalOrders = result._count;

  return {
    totalRevenue,
    totalOrders,
    avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    totalTax: Number(result._sum.totalTax || 0),
    totalDiscounts: Number(result._sum.totalDiscounts || 0),
  };
}

export async function getTopProducts(
  storeId: string,
  limit = 10,
  startDate?: Date,
  endDate?: Date
): Promise<ProductMetrics[]> {
  const orderWhere: Prisma.OrderWhereInput = {
    storeId,
    financialStatus: { not: "refunded" },
    cancelledAt: null,
  };

  if (startDate || endDate) {
    orderWhere.shopifyCreatedAt = {};
    if (startDate) orderWhere.shopifyCreatedAt.gte = startDate;
    if (endDate) orderWhere.shopifyCreatedAt.lte = endDate;
  }

  // Get order IDs in range
  const orders = await prisma.order.findMany({
    where: orderWhere,
    select: { id: true },
  });

  const orderIds = orders.map((o) => o.id);

  if (orderIds.length === 0) {
    return [];
  }

  // Group line items by product
  const lineItems = await prisma.lineItem.groupBy({
    by: ["productId"],
    where: {
      orderId: { in: orderIds },
      productId: { not: null },
    },
    _sum: {
      price: true,
      quantity: true,
    },
    _count: {
      orderId: true,
    },
    orderBy: {
      _sum: {
        price: "desc",
      },
    },
    take: limit,
  });

  // Get product details
  const productIds = lineItems
    .map((li) => li.productId)
    .filter((id): id is string => id !== null);

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  return lineItems.map((li) => {
    const product = productMap.get(li.productId!);
    return {
      productId: li.productId!,
      title: product?.title || "Unknown Product",
      revenue: Number(li._sum.price || 0),
      unitsSold: li._sum.quantity || 0,
      orderCount: li._count.orderId,
    };
  });
}

export async function getTopCustomers(
  storeId: string,
  limit = 10
): Promise<CustomerMetrics[]> {
  const customers = await prisma.customer.findMany({
    where: { storeId },
    orderBy: { totalSpent: "desc" },
    take: limit,
  });

  return customers.map((c) => ({
    customerId: c.id,
    email: c.email,
    name: [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown",
    totalSpent: Number(c.totalSpent),
    ordersCount: c.ordersCount,
  }));
}

export async function getDailyRevenue(
  storeId: string,
  days = 30
): Promise<{ date: string; revenue: number; orders: number }[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: {
      storeId,
      shopifyCreatedAt: { gte: startDate },
      financialStatus: { not: "refunded" },
      cancelledAt: null,
    },
    select: {
      shopifyCreatedAt: true,
      totalPrice: true,
    },
  });

  // Group by date
  const dailyMap = new Map<string, { revenue: number; orders: number }>();

  for (const order of orders) {
    const date = order.shopifyCreatedAt.toISOString().split("T")[0];
    const existing = dailyMap.get(date) || { revenue: 0, orders: 0 };
    dailyMap.set(date, {
      revenue: existing.revenue + Number(order.totalPrice),
      orders: existing.orders + 1,
    });
  }

  // Fill in missing dates
  const result: { date: string; revenue: number; orders: number }[] = [];
  const currentDate = new Date(startDate);
  const today = new Date();

  while (currentDate <= today) {
    const dateStr = currentDate.toISOString().split("T")[0];
    result.push({
      date: dateStr,
      ...(dailyMap.get(dateStr) || { revenue: 0, orders: 0 }),
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
}

export async function getStoreContext(storeId: string): Promise<string> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store) throw new Error("Store not found");

  // Get various metrics
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
  ] = await Promise.all([
    getRevenueMetrics(storeId, lastWeekStart, now),
    getRevenueMetrics(storeId, previousWeekStart, lastWeekStart),
    getRevenueMetrics(storeId, last30DaysStart, now),
    getTopProducts(storeId, 5, last30DaysStart, now),
    getTopCustomers(storeId, 5),
    getDailyRevenue(storeId, 14),
  ]);

  return `
Store: ${store.name} (${store.domain})
Currency: ${store.currency}

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

=== STORE TOTALS ===
Total Products: ${store.productsCount}
Total Customers: ${store.customersCount}
Total Orders (synced): ${store.ordersCount}
Last Synced: ${store.lastSyncedAt?.toISOString() || "Never"}
`;
}
