// src/lib/ai/channel-fit/types.ts
// All interfaces and constants for the Channel-Product Fit engine
//
// NOTE: Server-only types (InternalClusterBenchmark, CrossTenantRow, RecentSalesRow,
// ProductMarketplaceRow, WeeklyBreakdownRow) live in ./types.server.ts to prevent
// accidental client-side imports.

// -------------------------------------------------------
// Raw Signals (per product-marketplace pair, user's own data)
// -------------------------------------------------------

export interface RawSignals {
  revenueVelocity: number; // seller's currency per day (not normalized — varies by store)
  unitVelocity: number; // units/day
  avgUnitPrice: number; // average selling price on this channel
  salesTrendSlope: number; // units change per week (linear regression)
  salesTrendR2: number; // fit quality of the trend; R² ∈ (−∞, 1] theoretically, clamped to [0, 1] at computation
  inventoryTurnover: number | null; // (units sold per 30d) / current stock; null = untracked; STOCKOUT_TURNOVER = stockout with demand; 0 = no demand
  returnRate: number; // returned orders / total orders
}

// -------------------------------------------------------
// Cross-Tenant Benchmark
// -------------------------------------------------------

export interface ClusterBenchmark {
  clusterKey: string;
  marketplace: string;
  /** Currency-agnostic: units sold per day across all contributing sellers. */
  totalUnitsPerDay: number;
  /**
   * Revenue per day summed across contributing sellers.
   * WARNING: Mixed-currency — values are in each seller's store currency without
   * normalization. Use totalUnitsPerDay (currency-agnostic) for scoring / comparisons.
   * Revenue fields are retained for same-currency display contexts only.
   */
  totalRevenuePerDay: number;
  /**
   * Average unit price across contributing sellers.
   * WARNING: Mixed-currency — like totalRevenuePerDay, not normalized across sellers.
   * Use for same-currency display contexts only; do not use for cross-tenant scoring.
   */
  avgPrice: number;
  recentUnitsSold: number; // units sold in last 7 days
}

export interface MarketDemand {
  unitsPerDay: number;
  /**
   * Revenue per day for similar products on this marketplace.
   * WARNING: Mixed-currency — not normalized across sellers. Suitable for
   * display when the user's currency matches the marketplace's primary currency.
   * For cross-marketplace comparisons, prefer unitsPerDay.
   */
  revenuePerDay: number;
  /**
   * Average unit price across contributing sellers on this marketplace.
   * WARNING: Mixed-currency — sellers on the same marketplace may use different
   * store currencies (e.g., USD and EUR sellers both on eBay). Not normalized.
   * Use for display in same-currency contexts only; do not use for scoring.
   */
  avgPrice: number;
  /** Units sold in last 7 days across contributing sellers. */
  recentUnitsSold: number;
}

// -------------------------------------------------------
// Normalized Signals & Weights
// -------------------------------------------------------

export interface NormalizedSignals {
  revenueVelocity: number;
  unitVelocity: number;
  pricePosition: number;
  salesTrend: number;
  inventoryTurnover: number; // null raw → 0.5 (neutral); non-null normalised 0-1 via min-max
  returnRate: number; // inverted: lower return = higher score
  platformBenchmark: number;
}

export const DEFAULT_WEIGHTS = {
  revenueVelocity: 0.25,
  unitVelocity: 0.1,
  pricePosition: 0.05,
  salesTrend: 0.15,
  inventoryTurnover: 0.1,
  returnRate: 0.1,
  platformBenchmark: 0.25,
} as const satisfies Readonly<Record<keyof NormalizedSignals, number>>;

// -------------------------------------------------------
// Channel Score & Recommendations
// -------------------------------------------------------

export type HealthLabel = "strong" | "good" | "moderate" | "weak" | "insufficient_data";

export interface ChannelScore {
  marketplace: string;
  fitScore: number; // 0-100
  confidence: number; // 0-100
  rank: number; // 1 = best channel
  signals: RawSignals;
  marketDemand?: MarketDemand;
  label: HealthLabel;
}

export type RecommendationType =
  | "EXPAND"
  | "CONNECT"
  | "RESTOCK"
  | "REPRICE"
  | "DEPRIORITIZE";

export interface Recommendation {
  type: RecommendationType;
  productKey: string;
  productName: string;
  marketplace: string;
  reasoning: string;
  confidence: number; // 0-100
  urgency: "high" | "medium" | "low";
  estimatedImpact?: string;
}

export interface ProductFitReport {
  productKey: string;
  productName: string;
  channelScores: ChannelScore[];
  recommendations: Recommendation[];
  overallHealth: HealthLabel;
}

export interface ChannelFitResult {
  /**
   * Human-readable period label, e.g. "Last 30 days", "Last 60 days", "Last 90 days".
   * Not an ISO date — used for display in reports and AI tool responses.
   */
  period: string;
  lookbackDays: number;
  /** Count of products with signal data in the response. Equals `products.length`; retained as a top-level scalar for AI tool consumers. */
  productsAnalyzed: number;
  /** Product fit reports, truncated to the limit requested (default DEFAULT_PRODUCTS_LIMIT, max MAX_PRODUCTS). Only includes products with sufficient signal data. */
  products: ProductFitReport[];
  topRecommendations: Recommendation[];
}

// NOTE: ProductMarketplaceRow and WeeklyBreakdownRow live in ./types.server.ts
// (server-only — they represent raw SQL query shapes that shouldn't leak to client bundles).

// -------------------------------------------------------
// Marketplace Priors
// -------------------------------------------------------

export interface MarketplacePrior {
  displayName: string;
  strengths: string[];
  /**
   * Estimated total fee rate per transaction (platform + payment processing combined).
   * Expressed as a decimal fraction between 0 and 1, e.g. 0.15 for 15%.
   */
  avgFeeRate: number;
  bestFor: string;
  /** ISO 4217 currency code for priceRange values. Only set for region-locked marketplaces (e.g., Flipkart = INR). When undefined, values are calibrated for {@link DEFAULT_CURRENCY} (Indian market focus) but the marketplace supports multiple currencies. */
  currency?: string;
  /** Sweet-spot price range in whole currency units. Currency is {@link DEFAULT_CURRENCY} unless `currency` specifies otherwise. Not paise/cents. */
  priceRange: { sweet: [number, number] };
}

// -------------------------------------------------------
// Inventory + Connection Types
// -------------------------------------------------------

export interface InventoryItem {
  sku: string | null;
  title: string;
  marketplace: string;
  inventory: number;
  /** Unit price in the seller's store currency (not normalized across sellers). */
  price: number;
}

export interface ConnectedMarketplace {
  marketplace: string;
}

// -------------------------------------------------------
// Constants
// -------------------------------------------------------

/** Default currency for priceRange and display values (ISO 4217). */
export const DEFAULT_CURRENCY = "INR" as const;
/**
 * Sentinel value for inventoryTurnover when a tracked product is out of stock
 * but has active demand. Uses a large finite value instead of Infinity because
 * JSON.stringify(Infinity) produces null, losing the stockout signal.
 */
export const STOCKOUT_TURNOVER = 1e9;
export const MIN_SELLERS_FOR_BENCHMARK = 5;
export const BENCHMARK_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
/**
 * Minimum total users on the platform to enable Phase 2 (full benchmark engine).
 * Below this threshold, the channel-fit engine runs in Phase 1 mode: priors-based
 * EXPAND + RESTOCK + REPRICE only, no cross-tenant benchmarks or DEPRIORITIZE.
 * Set to 100 to ensure sufficient cross-tenant data for meaningful cluster benchmarks.
 */
export const PHASE_2_MIN_USERS = 100;
export const MAX_PRODUCTS = 20;
export const DEFAULT_PRODUCTS_LIMIT = 10;

export const ACTIVE_MARKETPLACES = [
  "SHOPIFY",
  "EBAY",
  "ETSY",
  "FLIPKART",
  "WOOCOMMERCE",
  "BIGCOMMERCE",
  "WIX",
  "SQUARE",
  "MAGENTO",
] as const;

export type ActiveMarketplace = (typeof ACTIVE_MARKETPLACES)[number];
