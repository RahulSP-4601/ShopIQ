// src/lib/ai/tools.ts
import { ChatCompletionTool } from "openai/resources/chat/completions";
import {
  getRevenueMetrics,
  getTopProducts,
  getTopCustomers,
  getDailyRevenue,
} from "@/lib/metrics/calculator";
import prisma from "@/lib/prisma";
import { UnifiedOrderStatus, MarketplaceType, Prisma } from "@prisma/client";

// -------------------------------------------------------
// Tool Definitions (sent to OpenAI)
// -------------------------------------------------------

export const FRAME_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_revenue_metrics",
      description:
        "Get revenue, order count, and average order value for a time period. Use this when the user asks about revenue, sales, income, or order values.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: [
              "today",
              "yesterday",
              "last_7_days",
              "last_30_days",
              "last_90_days",
              "this_month",
              "last_month",
            ],
            description: "The time period to analyze",
          },
        },
        required: ["period"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_top_products",
      description:
        "Get the best-selling products ranked by revenue. Use this when the user asks about product performance, bestsellers, or top sellers.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of products to return (default 5, max 20)",
          },
          period: {
            type: "string",
            enum: [
              "last_7_days",
              "last_30_days",
              "last_90_days",
              "this_month",
              "last_month",
            ],
            description: "The time period (default last_30_days)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_top_customers",
      description:
        "Get the highest-spending customers ranked by total spend. Use this when the user asks about customer rankings, VIPs, or repeat buyers.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of customers to return (default 5, max 20)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_daily_revenue",
      description:
        "Get day-by-day revenue breakdown. Use this when the user asks about daily trends, sales patterns, or wants a timeline of revenue.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["last_7_days", "last_14_days", "last_30_days"],
            description: "The time period (default last_14_days)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_store_overview",
      description:
        "Get a high-level overview of the store: connected marketplaces, total products, total orders, and last sync time. Use this when the user asks general questions about their store status.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_low_stock_products",
      description:
        "Get products with inventory below a threshold. Use this when the user asks about stock levels, out-of-stock items, or inventory alerts.",
      parameters: {
        type: "object",
        properties: {
          threshold: {
            type: "number",
            description:
              "Inventory threshold to flag as low stock (default 10)",
          },
          limit: {
            type: "number",
            description: "Number of products to return (default 10, max 20)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_channel_comparison",
      description:
        "Compare revenue, order count, and average order value across connected marketplaces. Use this when the user asks about marketplace comparison, channel performance, or which platform sells the most.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: [
              "last_7_days",
              "last_30_days",
              "last_90_days",
              "this_month",
              "last_month",
            ],
            description: "The time period (default last_30_days)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_periods",
      description:
        "Compare two time periods side by side to see growth or decline. Use this when the user asks about week-over-week, month-over-month changes, or period comparisons.",
      parameters: {
        type: "object",
        properties: {
          current_period: {
            type: "string",
            enum: [
              "last_7_days",
              "last_30_days",
              "this_month",
              "last_month",
            ],
            description: "The current/recent period to analyze",
          },
          previous_period: {
            type: "string",
            enum: [
              "previous_7_days",
              "previous_30_days",
              "previous_month",
            ],
            description:
              "The previous period to compare against (automatically matches the current period length)",
          },
        },
        required: ["current_period"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product_profitability",
      description:
        "Get product-level revenue breakdown showing revenue per unit, total revenue, and sales velocity. Use this when the user asks about product profitability, revenue per product, margins, or which products earn the most per unit.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of products to return (default 10, max 20)",
          },
          period: {
            type: "string",
            enum: [
              "last_7_days",
              "last_30_days",
              "last_90_days",
              "this_month",
              "last_month",
            ],
            description: "The time period (default last_30_days)",
          },
          sort_by: {
            type: "string",
            enum: ["revenue", "units_sold", "revenue_per_unit"],
            description:
              "Sort products by total revenue, units sold, or revenue per unit (default revenue)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_demand_forecast",
      description:
        "Get a simple demand trend analysis based on historical order data. Shows weekly order/revenue trends and growth direction. Use this when the user asks about demand trends, forecasting, growth trajectory, or future projections.",
      parameters: {
        type: "object",
        properties: {
          weeks: {
            type: "number",
            description:
              "Number of weeks of history to analyze (default 8, max 12)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_status_breakdown",
      description:
        "Get a breakdown of orders by fulfillment status (pending, paid, shipped, delivered, cancelled, refunded). Use this when the user asks about order fulfillment, pending orders, cancellation rates, or delivery status.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: [
              "last_7_days",
              "last_30_days",
              "last_90_days",
              "this_month",
              "last_month",
            ],
            description: "The time period (default last_30_days)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_geographic_insights",
      description:
        "Analyze sales by geographic region (country, state, or city). Use this when the user asks about regional performance, geographic distribution, shipping zones, or location-based sales patterns.",
      parameters: {
        type: "object",
        properties: {
          granularity: {
            type: "string",
            enum: ["country", "state", "city"],
            description:
              "Level of geographic detail (default state)",
          },
          period: {
            type: "string",
            enum: [
              "last_7_days",
              "last_30_days",
              "last_90_days",
              "this_month",
              "last_month",
            ],
            description: "The time period (default last_30_days)",
          },
          limit: {
            type: "number",
            description:
              "Number of top regions to return (default 10, max 20)",
          },
        },
      },
    },
  },
  // -------------------------------------------------------
  // Note Management Tools (Working Memory)
  // -------------------------------------------------------
  {
    type: "function",
    function: {
      name: "create_note",
      description:
        "Create a note to remember something for later. Use this when you want to follow up on something the user mentioned, track an ongoing issue, or remind yourself about a task.",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description:
              "What to remember (be specific and actionable)",
          },
          ttl_hours: {
            type: "number",
            description:
              "How long to keep this note active in hours (default 24, max 168 = 1 week)",
          },
          priority: {
            type: "number",
            description:
              "Importance from 0.0 to 1.0 (default 0.5)",
          },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_notes",
      description:
        "Retrieve all active notes. Use this when you want to check what you've noted down previously about this business.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "dismiss_note",
      description:
        "Dismiss a note that is no longer relevant. Use this when a noted issue has been resolved or is no longer applicable.",
      parameters: {
        type: "object",
        properties: {
          note_id: {
            type: "string",
            description: "The ID of the note to dismiss",
          },
        },
        required: ["note_id"],
      },
    },
  },
];

// -------------------------------------------------------
// Period Helper
// -------------------------------------------------------

function resolvePeriod(period?: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  let start: Date;
  let endNormalized = false; // Only normalize end-of-day in branches that set a fixed past end

  switch (period) {
    case "today":
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      // end stays at "now" — don't clamp to 23:59:59
      break;
    case "yesterday": {
      start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      endNormalized = true;
      break;
    }
    case "last_7_days":
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case "last_14_days":
      start = new Date(now);
      start.setDate(start.getDate() - 14);
      start.setHours(0, 0, 0, 0);
      break;
    case "last_30_days":
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case "last_90_days":
      start = new Date(now);
      start.setDate(start.getDate() - 90);
      start.setHours(0, 0, 0, 0);
      break;
    case "this_month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last_month":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end.setDate(0); // last day of previous month
      end.setHours(23, 59, 59, 999);
      endNormalized = true;
      break;
    case "previous_7_days":
      start = new Date(now);
      start.setDate(start.getDate() - 14);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 7);
      end.setHours(23, 59, 59, 999);
      endNormalized = true;
      break;
    case "previous_30_days":
      start = new Date(now);
      start.setDate(start.getDate() - 60);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 30);
      end.setHours(23, 59, 59, 999);
      endNormalized = true;
      break;
    case "previous_month": {
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      start = prevMonthStart;
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);
      prevMonthEnd.setHours(23, 59, 59, 999);
      end.setTime(prevMonthEnd.getTime());
      endNormalized = true;
      break;
    }
    default:
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
  }

  // Only past-bounded periods get end-of-day normalization.
  // "today", "last_N_days", "this_month", and default keep end = now.
  void endNormalized;

  return { start, end };
}

// -------------------------------------------------------
// Tool Executor
// -------------------------------------------------------

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string
): Promise<string> {
  try {
    switch (toolName) {
      case "get_revenue_metrics": {
        const { start, end } = resolvePeriod(args.period as string);
        const metrics = await getRevenueMetrics(userId, start, end);
        return JSON.stringify({
          period: args.period,
          totalRevenue: metrics.totalRevenue,
          totalOrders: metrics.totalOrders,
          avgOrderValue: metrics.avgOrderValue,
        });
      }

      case "get_top_products": {
        const limit = Math.min(Number(args.limit) || 5, 20);
        const { start, end } = resolvePeriod(
          (args.period as string) || "last_30_days"
        );
        const products = await getTopProducts(userId, limit, start, end);
        return JSON.stringify({
          period: args.period || "last_30_days",
          products,
        });
      }

      case "get_top_customers": {
        const limit = Math.min(Number(args.limit) || 5, 20);
        const customers = await getTopCustomers(userId, limit);
        return JSON.stringify({ customers });
      }

      case "get_daily_revenue": {
        const { start, end } = resolvePeriod(
          (args.period as string) || "last_14_days"
        );
        const daily = await getDailyRevenue(userId, start, end);
        return JSON.stringify({
          period: args.period || "last_14_days",
          daily,
        });
      }

      case "get_store_overview": {
        const [connections, productCount, orderCount] = await Promise.all([
          prisma.marketplaceConnection.findMany({
            where: { userId, status: "CONNECTED" },
            select: {
              marketplace: true,
              externalName: true,
              lastSyncAt: true,
            },
          }),
          prisma.unifiedProduct.count({ where: { userId } }),
          prisma.unifiedOrder.count({
            where: {
              userId,
              status: { not: UnifiedOrderStatus.CANCELLED },
            },
          }),
        ]);

        const lastSync = connections
          .filter((c) => c.lastSyncAt)
          .sort(
            (a, b) =>
              (b.lastSyncAt?.getTime() || 0) - (a.lastSyncAt?.getTime() || 0)
          )[0]?.lastSyncAt;

        return JSON.stringify({
          connectedMarketplaces: connections.map(
            (c) =>
              `${c.marketplace}${c.externalName ? ` (${c.externalName})` : ""}`
          ),
          totalProducts: productCount,
          totalOrders: orderCount,
          lastSyncAt: lastSync?.toISOString() || null,
        });
      }

      case "get_low_stock_products": {
        const threshold = Number(args.threshold ?? 10);
        const limit = Math.min(Number(args.limit) || 10, 20);
        const products = await prisma.unifiedProduct.findMany({
          where: {
            userId,
            inventory: { lte: threshold },
            status: "ACTIVE",
          },
          select: {
            id: true,
            title: true,
            inventory: true,
            sku: true,
          },
          take: limit,
          orderBy: { inventory: "asc" },
        });
        return JSON.stringify({ threshold, products });
      }

      case "get_channel_comparison": {
        const { start, end } = resolvePeriod(
          (args.period as string) || "last_30_days"
        );
        const orders = await prisma.unifiedOrder.findMany({
          where: {
            userId,
            orderedAt: { gte: start, lte: end },
            status: { not: UnifiedOrderStatus.CANCELLED },
          },
          select: {
            marketplace: true,
            totalAmount: true,
          },
        });

        const channelMap = new Map<
          MarketplaceType,
          { revenue: number; orders: number }
        >();

        for (const order of orders) {
          const existing = channelMap.get(order.marketplace) || {
            revenue: 0,
            orders: 0,
          };
          existing.revenue += Number(order.totalAmount || 0);
          existing.orders += 1;
          channelMap.set(order.marketplace, existing);
        }

        const channels = Array.from(channelMap.entries())
          .map(([marketplace, data]) => ({
            marketplace,
            revenue: Math.round(data.revenue * 100) / 100,
            orders: data.orders,
            avgOrderValue:
              data.orders > 0
                ? Math.round((data.revenue / data.orders) * 100) / 100
                : 0,
          }))
          .sort((a, b) => b.revenue - a.revenue);

        return JSON.stringify({
          period: args.period || "last_30_days",
          channels,
          totalRevenue: Math.round(
            channels.reduce((s, c) => s + c.revenue, 0) * 100
          ) / 100,
          totalOrders: channels.reduce((s, c) => s + c.orders, 0),
        });
      }

      case "compare_periods": {
        const currentPeriod =
          (args.current_period as string) || "last_7_days";
        const { start: currentStart, end: currentEnd } =
          resolvePeriod(currentPeriod);

        // Use explicit previous_period if provided, otherwise auto-calculate
        let previousStart: Date;
        let previousEnd: Date;
        if (args.previous_period) {
          const resolved = resolvePeriod(args.previous_period as string);
          previousStart = resolved.start;
          previousEnd = resolved.end;
        } else {
          const periodLengthMs =
            currentEnd.getTime() - currentStart.getTime();
          previousEnd = new Date(currentStart.getTime() - 1);
          previousStart = new Date(
            previousEnd.getTime() - periodLengthMs
          );
        }

        const [currentMetrics, previousMetrics] = await Promise.all([
          getRevenueMetrics(userId, currentStart, currentEnd),
          getRevenueMetrics(userId, previousStart, previousEnd),
        ]);

        const revenueChange =
          previousMetrics.totalRevenue > 0
            ? ((currentMetrics.totalRevenue - previousMetrics.totalRevenue) /
                previousMetrics.totalRevenue) *
              100
            : currentMetrics.totalRevenue > 0
              ? 100
              : 0;

        const ordersChange =
          previousMetrics.totalOrders > 0
            ? ((currentMetrics.totalOrders - previousMetrics.totalOrders) /
                previousMetrics.totalOrders) *
              100
            : currentMetrics.totalOrders > 0
              ? 100
              : 0;

        const aovChange =
          previousMetrics.avgOrderValue > 0
            ? ((currentMetrics.avgOrderValue -
                previousMetrics.avgOrderValue) /
                previousMetrics.avgOrderValue) *
              100
            : currentMetrics.avgOrderValue > 0
              ? 100
              : 0;

        return JSON.stringify({
          currentPeriod: {
            label: currentPeriod,
            start: currentStart.toISOString().split("T")[0],
            end: currentEnd.toISOString().split("T")[0],
            revenue: currentMetrics.totalRevenue,
            orders: currentMetrics.totalOrders,
            avgOrderValue: currentMetrics.avgOrderValue,
          },
          previousPeriod: {
            start: previousStart.toISOString().split("T")[0],
            end: previousEnd.toISOString().split("T")[0],
            revenue: previousMetrics.totalRevenue,
            orders: previousMetrics.totalOrders,
            avgOrderValue: previousMetrics.avgOrderValue,
          },
          changes: {
            revenueChangePercent: Math.round(revenueChange * 10) / 10,
            ordersChangePercent: Math.round(ordersChange * 10) / 10,
            aovChangePercent: Math.round(aovChange * 10) / 10,
          },
        });
      }

      case "get_product_profitability": {
        const limit = Math.min(Number(args.limit) || 10, 20);
        const sortBy = (args.sort_by as string) || "revenue";
        const { start, end } = resolvePeriod(
          (args.period as string) || "last_30_days"
        );

        // Cap orders query to prevent huge IN clauses in subsequent item lookup
        const ORDER_QUERY_LIMIT = 10000;
        const orders = await prisma.unifiedOrder.findMany({
          where: {
            userId,
            orderedAt: { gte: start, lte: end },
            status: { not: UnifiedOrderStatus.CANCELLED },
          },
          select: { id: true },
          take: ORDER_QUERY_LIMIT,
        });

        const orderIds = orders.map((o) => o.id);
        const isResultsTruncated = orders.length === ORDER_QUERY_LIMIT;

        if (orderIds.length === 0) {
          return JSON.stringify({
            period: args.period || "last_30_days",
            products: [],
            note: "No orders found in this period.",
          });
        }

        const items = await prisma.unifiedOrderItem.findMany({
          where: { orderId: { in: orderIds } },
          select: {
            title: true,
            sku: true,
            unitPrice: true,
            quantity: true,
            totalPrice: true,
            orderId: true,
          },
        });

        const productMap = new Map<
          string,
          {
            title: string;
            revenue: number;
            unitsSold: number;
            orderIds: Set<string>;
          }
        >();

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const key =
            item.sku || item.title || `_unknown_${item.orderId}_${i}`;
          const existing = productMap.get(key) || {
            title: item.title || "Unknown product",
            revenue: 0,
            unitsSold: 0,
            orderIds: new Set<string>(),
          };
          existing.revenue += Number(item.totalPrice || 0);
          existing.unitsSold += item.quantity ?? 0;
          existing.orderIds.add(item.orderId);
          productMap.set(key, existing);
        }

        const products = Array.from(productMap.entries())
          .map(([sku, data]) => ({
            sku,
            title: data.title,
            revenue: Math.round(data.revenue * 100) / 100,
            unitsSold: data.unitsSold,
            revenuePerUnit:
              data.unitsSold > 0
                ? Math.round((data.revenue / data.unitsSold) * 100) / 100
                : 0,
            orderCount: data.orderIds.size,
          }))
          .sort((a, b) => {
            if (sortBy === "units_sold") return b.unitsSold - a.unitsSold;
            if (sortBy === "revenue_per_unit")
              return b.revenuePerUnit - a.revenuePerUnit;
            return b.revenue - a.revenue;
          })
          .slice(0, limit);

        return JSON.stringify({
          period: args.period || "last_30_days",
          sortedBy: sortBy,
          products,
          note: "Revenue-based analysis. Cost/COGS data is not available — profitability reflects gross revenue, not net margin.",
          ...(isResultsTruncated
            ? { queryNote: `Results based on first ${ORDER_QUERY_LIMIT} orders. High-volume stores may see incomplete product coverage.` }
            : {}),
        });
      }

      case "get_demand_forecast": {
        const weeksCount = Math.min(Number(args.weeks) || 8, 12);
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - weeksCount * 7);
        start.setHours(0, 0, 0, 0);

        const orders = await prisma.unifiedOrder.findMany({
          where: {
            userId,
            orderedAt: { gte: start, lte: now },
            status: { not: UnifiedOrderStatus.CANCELLED },
          },
          select: {
            orderedAt: true,
            totalAmount: true,
          },
          orderBy: { orderedAt: "asc" },
        });

        // Group by ISO week
        const weeklyData: {
          weekStart: string;
          revenue: number;
          orders: number;
        }[] = [];

        for (let w = 0; w < weeksCount; w++) {
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - (weeksCount - w) * 7);
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);

          let revenue = 0;
          let orderCount = 0;
          for (const order of orders) {
            if (
              order.orderedAt >= weekStart &&
              order.orderedAt < weekEnd
            ) {
              revenue += Number(order.totalAmount || 0);
              orderCount++;
            }
          }

          weeklyData.push({
            weekStart: weekStart.toISOString().split("T")[0],
            revenue: Math.round(revenue * 100) / 100,
            orders: orderCount,
          });
        }

        // Calculate trend (simple linear regression on weekly revenue)
        const n = weeklyData.length;
        let sumX = 0,
          sumY = 0,
          sumXY = 0,
          sumX2 = 0;
        for (let i = 0; i < n; i++) {
          sumX += i;
          sumY += weeklyData[i].revenue;
          sumXY += i * weeklyData[i].revenue;
          sumX2 += i * i;
        }
        const denom = n * sumX2 - sumX * sumX;
        const slope =
          n > 1 && denom !== 0
            ? (n * sumXY - sumX * sumY) / denom
            : 0;
        const avgRevenue = sumY / (n || 1);
        const growthRate =
          avgRevenue > 0 ? (slope / avgRevenue) * 100 : 0;

        // Project next week
        const intercept = (sumY - slope * sumX) / (n || 1);
        const projectedNextWeek = Math.max(
          0,
          Math.round((intercept + slope * n) * 100) / 100
        );

        let trend: "growing" | "declining" | "stable";
        if (growthRate > 5) trend = "growing";
        else if (growthRate < -5) trend = "declining";
        else trend = "stable";

        return JSON.stringify({
          weeksAnalyzed: weeksCount,
          weeklyData,
          trend,
          weeklyGrowthRatePercent: Math.round(growthRate * 10) / 10,
          projectedNextWeekRevenue: projectedNextWeek,
          note: "Projection is a simple linear trend estimate. Actual results may vary based on seasonality and marketing activity.",
        });
      }

      case "get_order_status_breakdown": {
        const { start, end } = resolvePeriod(
          (args.period as string) || "last_30_days"
        );

        const orders = await prisma.unifiedOrder.groupBy({
          by: ["status"],
          where: {
            userId,
            orderedAt: { gte: start, lte: end },
          },
          _count: { _all: true },
          _sum: { totalAmount: true },
        });

        const totalOrders = orders.reduce(
          (s, o) => s + o._count._all,
          0
        );

        const breakdown = orders
          .map((o) => ({
            status: o.status,
            count: o._count._all,
            revenue: Math.round(Number(o._sum.totalAmount || 0) * 100) / 100,
            percentage:
              totalOrders > 0
                ? Math.round((o._count._all / totalOrders) * 1000) / 10
                : 0,
          }))
          .sort((a, b) => b.count - a.count);

        return JSON.stringify({
          period: args.period || "last_30_days",
          totalOrders,
          breakdown,
        });
      }

      case "get_geographic_insights": {
        const granularity = (args.granularity as string) || "state";
        const limit = Math.min(Number(args.limit) || 10, 20);
        const { start, end } = resolvePeriod(
          (args.period as string) || "last_30_days"
        );

        // Query orders that have rawData (only BigCommerce + Square currently store it)
        const geoOrders = await prisma.unifiedOrder.findMany({
          where: {
            userId,
            orderedAt: { gte: start, lte: end },
            status: { not: UnifiedOrderStatus.CANCELLED },
            rawData: { not: Prisma.DbNull },
          },
          select: {
            marketplace: true,
            totalAmount: true,
            rawData: true,
          },
          take: 5000,
        });

        // Count total orders to show coverage
        const totalOrderCount = await prisma.unifiedOrder.count({
          where: {
            userId,
            orderedAt: { gte: start, lte: end },
            status: { not: UnifiedOrderStatus.CANCELLED },
          },
        });

        if (geoOrders.length === 0) {
          return JSON.stringify({
            period: args.period || "last_30_days",
            granularity,
            regions: [],
            coverage: { totalOrders: totalOrderCount, ordersWithGeoData: 0 },
            note: "No geographic data available. Geographic insights require BigCommerce or Square connections which store shipping address data.",
          });
        }

        // Extract geographic data from rawData based on marketplace
        const regionMap = new Map<string, { revenue: number; orders: number }>();

        for (const order of geoOrders) {
          const raw = order.rawData as Record<string, unknown> | null;
          if (!raw) continue;

          let regionKey = "";

          if (order.marketplace === "BIGCOMMERCE") {
            const billing = raw.billing_address as Record<string, unknown> | undefined;
            if (billing) {
              if (granularity === "country") {
                regionKey = String(billing.country || billing.country_iso2 || "");
              } else if (granularity === "city") {
                const city = String(billing.city || "");
                const state = String(billing.state || "");
                regionKey = city && state ? `${city}, ${state}` : city;
              } else {
                const state = String(billing.state || "");
                const country = String(billing.country_iso2 || billing.country || "");
                regionKey = state && country ? `${state}, ${country}` : state;
              }
            }
          } else if (order.marketplace === "SQUARE") {
            const fulfillments = raw.fulfillments as Array<Record<string, unknown>> | undefined;
            const shipment = fulfillments?.[0]?.shipment_details as Record<string, unknown> | undefined;
            const recipient = shipment?.recipient as Record<string, unknown> | undefined;
            const address = recipient?.address as Record<string, unknown> | undefined;

            if (address) {
              if (granularity === "country") {
                regionKey = String(address.country || "");
              } else if (granularity === "city") {
                const city = String(address.locality || "");
                const state = String(address.administrative_district_level_1 || "");
                regionKey = city && state ? `${city}, ${state}` : city;
              } else {
                const state = String(address.administrative_district_level_1 || "");
                const country = String(address.country || "");
                regionKey = state && country ? `${state}, ${country}` : state;
              }
            }
          }

          if (!regionKey) continue;

          const existing = regionMap.get(regionKey) || { revenue: 0, orders: 0 };
          existing.revenue += Number(order.totalAmount || 0);
          existing.orders += 1;
          regionMap.set(regionKey, existing);
        }

        const regions = Array.from(regionMap.entries())
          .map(([region, data]) => ({
            region,
            revenue: Math.round(data.revenue * 100) / 100,
            orders: data.orders,
            avgOrderValue: data.orders > 0
              ? Math.round((data.revenue / data.orders) * 100) / 100
              : 0,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, limit);

        // Compute coverage from full regionMap (before slicing to top N)
        let ordersWithGeo = 0;
        for (const [, data] of regionMap) {
          ordersWithGeo += data.orders;
        }

        return JSON.stringify({
          period: args.period || "last_30_days",
          granularity,
          regions,
          coverage: {
            totalOrders: totalOrderCount,
            ordersWithGeoData: ordersWithGeo,
            coveragePercent: totalOrderCount > 0
              ? Math.round((ordersWithGeo / totalOrderCount) * 1000) / 10
              : 0,
          },
          ...(ordersWithGeo < totalOrderCount
            ? { note: `Geographic data available for ${ordersWithGeo}/${totalOrderCount} orders. Only BigCommerce and Square connections provide shipping address data.` }
            : {}),
          ...(geoOrders.length >= 5000
            ? { queryNote: "Results capped at 5000 orders. Coverage numbers may be approximate for very high-volume stores." }
            : {}),
        });
      }

      // -------------------------------------------------------
      // Note Management Tools
      // -------------------------------------------------------

      case "create_note": {
        const content = String(args.content || "");
        if (!content) {
          return JSON.stringify({ error: "Content is required" });
        }
        const ttlHours = Math.min(
          Math.max(Number(args.ttl_hours) || 24, 1),
          168
        );
        const rawPriority = args.priority == null ? 0.5 : Number(args.priority);
        const priority = Math.min(
          Math.max(isNaN(rawPriority) ? 0.5 : rawPriority, 0),
          1
        );

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + ttlHours);

        const note = await prisma.note.create({
          data: {
            userId,
            content,
            basePriority: priority,
            ttlHours,
            expiresAt,
            source: "ai",
          },
        });

        return JSON.stringify({
          success: true,
          noteId: note.id,
          expiresAt: note.expiresAt.toISOString(),
        });
      }

      case "get_my_notes": {
        const notes = await prisma.note.findMany({
          where: {
            userId,
            status: "ACTIVE",
            expiresAt: { gt: new Date() },
          },
          orderBy: { basePriority: "desc" },
          take: 10,
        });

        return JSON.stringify({
          notes: notes.map((n: { id: string; content: string; basePriority: number; expiresAt: Date; createdAt: Date }) => ({
            id: n.id,
            content: n.content,
            priority: n.basePriority,
            hoursRemaining: Math.max(
              0,
              Math.round(
                (n.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)
              )
            ),
            createdAt: n.createdAt.toISOString(),
          })),
        });
      }

      case "dismiss_note": {
        const noteId = String(args.note_id || "");
        if (!noteId) {
          return JSON.stringify({ error: "note_id is required" });
        }
        const updated = await prisma.note.updateMany({
          where: { id: noteId, userId, status: "ACTIVE" },
          data: { status: "DISMISSED" },
        });

        return JSON.stringify({
          success: updated.count > 0,
          message:
            updated.count > 0
              ? "Note dismissed"
              : "Note not found or already dismissed",
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (error) {
    console.error(`Tool execution error [${toolName}]:`, error);
    return JSON.stringify({
      error: "Tool execution failed",
    });
  }
}
