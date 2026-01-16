"use client";

import { Report } from "@prisma/client";

interface ReportViewProps {
  report: Report;
}

interface ReportContent {
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

export function ReportView({ report }: ReportViewProps) {
  const content = report.content as ReportContent;
  const metrics = content?.metrics || {};

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: content?.currency || "USD",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{report.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Generated on {formatDate(report.createdAt.toString())}
              {content?.dateRange && (
                <>
                  {" "}
                  &middot; Data from {formatDate(content.dateRange.start)} to{" "}
                  {formatDate(content.dateRange.end)}
                </>
              )}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              report.status === "COMPLETED"
                ? "bg-emerald-50 text-emerald-700"
                : report.status === "GENERATING"
                ? "bg-yellow-50 text-yellow-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {report.status}
          </span>
        </div>
      </div>

      {/* AI Summary */}
      {report.summary && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <svg
              className="h-5 w-5 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            AI Analysis
          </h2>
          <div className="prose prose-slate max-w-none">
            <div className="whitespace-pre-wrap text-slate-600">
              {report.summary}
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {report.type === "REVENUE_SUMMARY" && (
        <RevenueMetrics metrics={metrics} formatCurrency={formatCurrency} />
      )}

      {report.type === "PRODUCT_ANALYSIS" && (
        <ProductMetrics metrics={metrics} formatCurrency={formatCurrency} />
      )}

      {report.type === "CUSTOMER_INSIGHTS" && (
        <CustomerMetrics metrics={metrics} formatCurrency={formatCurrency} />
      )}

      {report.type === "FULL_ANALYSIS" && (
        <>
          <RevenueMetrics
            metrics={(metrics.revenue as Record<string, unknown>) || {}}
            formatCurrency={formatCurrency}
          />
          <ProductMetrics
            metrics={(metrics.products as Record<string, unknown>) || {}}
            formatCurrency={formatCurrency}
          />
          <CustomerMetrics
            metrics={(metrics.customers as Record<string, unknown>) || {}}
            formatCurrency={formatCurrency}
          />
        </>
      )}
    </div>
  );
}

function RevenueMetrics({
  metrics,
  formatCurrency,
}: {
  metrics: Record<string, unknown>;
  formatCurrency: (n: number) => string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Revenue Overview</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Revenue"
          value={formatCurrency(Number(metrics.totalRevenue) || 0)}
          color="emerald"
        />
        <MetricCard
          label="Total Orders"
          value={String(metrics.totalOrders || 0)}
          color="blue"
        />
        <MetricCard
          label="Avg Order Value"
          value={formatCurrency(Number(metrics.avgOrderValue) || 0)}
          color="purple"
        />
        <MetricCard
          label="Total Discounts"
          value={formatCurrency(Number(metrics.totalDiscounts) || 0)}
          color="orange"
        />
      </div>
    </div>
  );
}

function ProductMetrics({
  metrics,
  formatCurrency,
}: {
  metrics: Record<string, unknown>;
  formatCurrency: (n: number) => string;
}) {
  const topProducts = (metrics.topProducts as Array<{
    title: string;
    revenue: number;
    unitsSold: number;
  }>) || [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Product Performance</h2>
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <MetricCard
          label="Total Products"
          value={String(metrics.totalProducts || 0)}
          color="blue"
        />
        <MetricCard
          label="Total Inventory"
          value={String(metrics.totalInventory || 0)}
          color="purple"
        />
        <MetricCard
          label="Avg Price"
          value={formatCurrency(Number(metrics.avgPrice) || 0)}
          color="emerald"
        />
      </div>

      {topProducts.length > 0 && (
        <>
          <h3 className="mb-3 text-sm font-medium text-slate-700">Top Products</h3>
          <div className="space-y-2">
            {topProducts.slice(0, 5).map((product, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-medium text-emerald-700">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {product.title}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">
                    {formatCurrency(product.revenue)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {product.unitsSold} sold
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CustomerMetrics({
  metrics,
  formatCurrency,
}: {
  metrics: Record<string, unknown>;
  formatCurrency: (n: number) => string;
}) {
  const topCustomers = (metrics.topCustomers as Array<{
    name: string;
    totalSpent: number;
    ordersCount: number;
  }>) || [];

  const segments = (metrics.segments as {
    vip: number;
    regular: number;
    new: number;
  }) || { vip: 0, regular: 0, new: 0 };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Customer Insights</h2>
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <MetricCard
          label="Total Customers"
          value={String(metrics.totalCustomers || 0)}
          color="blue"
        />
        <MetricCard
          label="VIP Customers"
          value={String(segments.vip)}
          color="purple"
        />
        <MetricCard
          label="Regular"
          value={String(segments.regular)}
          color="emerald"
        />
        <MetricCard
          label="New"
          value={String(segments.new)}
          color="orange"
        />
      </div>

      {topCustomers.length > 0 && (
        <>
          <h3 className="mb-3 text-sm font-medium text-slate-700">Top Customers</h3>
          <div className="space-y-2">
            {topCustomers.slice(0, 5).map((customer, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {customer.name}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">
                    {formatCurrency(customer.totalSpent)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {customer.ordersCount} orders
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "emerald" | "blue" | "purple" | "orange";
}) {
  const colorClasses = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
    orange: "bg-orange-50 text-orange-700",
  };

  return (
    <div className={`rounded-xl p-4 ${colorClasses[color]}`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
