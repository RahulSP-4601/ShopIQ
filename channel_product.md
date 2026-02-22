# Channel-Product Fit Recommendation Engine

## Context

ShopIQ connects to 9 marketplaces but has **no algorithm** that tells sellers "Product X fits Platform Y better than Z, here's why." No major competitor (ChannelAdvisor, Sellbrite, Linnworks) does this algorithmically — they leave it to seller intuition.

**Differentiator:** We have sales data from ALL sellers on the platform. When a user asks "Should I sell kurtis on Amazon?", we don't just look at their data — we anonymously aggregate how similar products perform across all sellers on each marketplace. Real benchmarks, not chatbot guesses.

**Access point:** AI chat only — Frax calls `get_channel_product_fit` tool when users ask about platform recommendations.

---

## Architecture

```
Layer 1: Raw Signal Computation (7 signals per product-marketplace from user's own data)
Layer 2: Cross-Tenant Benchmarks (anonymous aggregate from ALL sellers' similar products)
Layer 3: Normalization + Weighted Composite Score (0-100, 8 signals including benchmark)
Layer 4: Confidence Adjustment + Recommendation Generation (4 types)
```

**No schema changes.** Pure analytics on existing `UnifiedOrder` + `UnifiedOrderItem` + `UnifiedProduct` data. Cross-tenant queries use `$queryRaw` with GROUP BY (no userId filter) + k-anonymity (min 5 sellers).

---

## Files to Create/Modify

| Action | Path | Purpose |
|--------|------|---------|
| CREATE | `src/lib/ai/channel-fit/types.ts` | All interfaces and constants |
| CREATE | `src/lib/ai/channel-fit/signals.ts` | User's own DB queries + raw signal computation |
| CREATE | `src/lib/ai/channel-fit/benchmarks.ts` | Cross-tenant anonymous benchmarks + title normalization |
| CREATE | `src/lib/ai/channel-fit/scoring.ts` | Normalization, weighting, composite score, confidence |
| CREATE | `src/lib/ai/channel-fit/recommendations.ts` | 4 recommendation generators (EXPAND/RESTOCK/REPRICE/DEPRIORITIZE) |
| CREATE | `src/lib/ai/channel-fit/priors.ts` | Static marketplace priors (fee rates, strengths, sweet spots) |
| CREATE | `src/lib/ai/channel-fit/index.ts` | Main orchestrator: `analyzeChannelProductFit()` |
| MODIFY | `src/lib/ai/tools.ts` | Add `get_channel_product_fit` tool definition + executor |
| MODIFY | `src/lib/ai/prompts.ts` | Add channel-fit awareness to system prompt |

---

## Step 1: Types (`types.ts`)

```typescript
// 7 raw signals per product-marketplace pair (user's own data)
interface RawSignals {
  revenueVelocity: number;    // ₹/day
  unitVelocity: number;       // units/day
  avgUnitPrice: number;       // average selling price on this channel
  salesTrendSlope: number;    // units/day change per week (linear regression)
  salesTrendR2: number;       // fit quality of the trend (0-1)
  inventoryTurnover: number;  // (units sold per 30d) / current stock
  returnRate: number;         // returned orders / total orders
}

// Cross-tenant benchmark for a product cluster on a marketplace
// IMPORTANT: This data is INTERNAL ONLY for scoring. What the AI shows to
// the user is pure market demand — "X units sold on Y platform" — never
// seller counts, never "N sellers", never any hint this comes from our DB.
interface ClusterBenchmark {
  clusterKey: string;         // normalized title keywords (e.g., "cotton kurti women")
  marketplace: string;
  _sellerCount: number;       // INTERNAL: k-anonymity check only, NEVER exposed to user
  totalUnitsPerDay: number;   // total units sold/day across all sellers (market demand)
  totalRevenuePerDay: number; // total revenue/day across all sellers (market size)
  avgPrice: number;           // average selling price on this marketplace
  recentUnitsSold: number;    // units sold in last 7 days (for "X sold last week" language)
}

// Normalized to 0-1 scale
interface NormalizedSignals {
  revenueVelocity: number;
  unitVelocity: number;
  pricePosition: number;
  salesTrend: number;
  inventoryTurnover: number;
  returnRate: number;         // inverted: lower return = higher score
  platformBenchmark: number;  // NEW: how user performs vs cross-tenant benchmark
}

// Weights sum to 1.0 (8 signals now)
const DEFAULT_WEIGHTS = {
  revenueVelocity:   0.25,   // Does it make money here?
  unitVelocity:      0.10,   // Volume / demand signal
  pricePosition:     0.05,   // Pricing room
  salesTrend:        0.15,   // Growing or declining?
  inventoryTurnover: 0.10,   // Capital efficiency
  returnRate:        0.10,   // Hidden cost (inverted)
  platformBenchmark: 0.25,   // NEW: cross-seller validation — as important as revenue
};

interface ChannelScore {
  marketplace: string;
  fitScore: number;           // 0-100
  confidence: number;         // 0-100
  rank: number;               // 1 = best channel
  signals: RawSignals;
  // Market demand data (safe to show to user — no seller info)
  marketDemand?: {
    unitsPerDay: number;        // "~45 units/day sell on this platform"
    revenuePerDay: number;      // "₹22,500/day in market demand"
    avgPrice: number;           // "average price ₹499"
    recentUnitsSold: number;    // "312 units sold last week"
  };
  label: 'strong' | 'good' | 'moderate' | 'weak' | 'insufficient_data';
}

type RecommendationType = 'EXPAND' | 'RESTOCK' | 'REPRICE' | 'DEPRIORITIZE';

interface Recommendation {
  type: RecommendationType;
  productKey: string;
  productName: string;
  marketplace: string;
  reasoning: string;          // Human-readable, includes benchmark data when available
  confidence: number;
  urgency: 'high' | 'medium' | 'low';
  estimatedImpact?: string;   // e.g., "+₹15,000/month (~40% increase)"
  isConnected?: boolean;       // For EXPAND: true = "list now", false = "connect first"
}

interface ProductFitReport {
  productKey: string;
  productName: string;
  channelScores: ChannelScore[];
  recommendations: Recommendation[];
  overallHealth: 'strong' | 'moderate' | 'weak' | 'insufficient_data';
}

interface ChannelFitResult {
  period: string;
  lookbackDays: number;
  productsAnalyzed: number;
  products: ProductFitReport[];
  topRecommendations: Recommendation[]; // Top 5 across all products
}
```

---

## Step 2: Signals (`signals.ts`) — User's Own Data

### 2.1 — Per-product per-marketplace aggregate query

Single `$queryRaw` (OOM-safe, same pattern as briefing generators):

```sql
SELECT
  COALESCE(oi."sku", oi."title", '_unknown') AS product_key,
  MAX(COALESCE(oi."title", 'Unknown product')) AS title,
  o."marketplace"::text AS marketplace,
  SUM(COALESCE(CAST(oi."unitPrice" AS double precision), 0) * COALESCE(oi."quantity", 0)) AS revenue,
  SUM(COALESCE(oi."quantity", 0))::int AS units_sold,
  COUNT(DISTINCT o."id")::int AS order_count,
  AVG(COALESCE(CAST(oi."unitPrice" AS double precision), 0)) AS avg_unit_price,
  MIN(o."orderedAt") AS first_sale,
  MAX(o."orderedAt") AS last_sale,
  COUNT(DISTINCT CASE WHEN o."status" = 'RETURNED' THEN o."id" END)::int AS returned_orders
FROM "UnifiedOrderItem" oi
JOIN "UnifiedOrder" o ON oi."orderId" = o."id"
WHERE o."userId" = $1
  AND o."orderedAt" >= $2
  AND o."orderedAt" <= $3
  AND o."status" != 'CANCELLED'::"UnifiedOrderStatus"
GROUP BY product_key, o."marketplace"
```

### 2.2 — Weekly breakdown for sales trend (linear regression)

```sql
SELECT
  COALESCE(oi."sku", oi."title", '_unknown') AS product_key,
  o."marketplace"::text AS marketplace,
  DATE_TRUNC('week', o."orderedAt") AS week_start,
  SUM(COALESCE(oi."quantity", 0))::int AS units
FROM "UnifiedOrderItem" oi
JOIN "UnifiedOrder" o ON oi."orderId" = o."id"
WHERE o."userId" = $1
  AND o."orderedAt" >= $2
  AND o."orderedAt" <= $3
  AND o."status" != 'CANCELLED'::"UnifiedOrderStatus"
GROUP BY product_key, o."marketplace", week_start
ORDER BY product_key, o."marketplace", week_start
```

### 2.3 — Current inventory + connected marketplaces (2 Prisma queries)

```typescript
// Inventory
prisma.unifiedProduct.findMany({
  where: { userId, status: "ACTIVE" },
  select: { sku: true, title: true, marketplace: true, inventory: true, price: true },
});

// Connected marketplaces (for expansion recommendations)
prisma.marketplaceConnection.findMany({
  where: { userId, status: "CONNECTED" },
  select: { marketplace: true },
});
```

All 4 queries run in `Promise.all`.

### 2.4 — `computeRawSignals()`

Produces `Map<productKey, Map<marketplace, RawSignals>>`:
- `revenueVelocity = revenue / daysActive` (daysActive = Math.max(1, (lastSale - firstSale) / 86400000))
- `unitVelocity = unitsSold / daysActive`
- `avgUnitPrice` from query
- `salesTrendSlope` + `salesTrendR2` = linear regression on weekly units (min 3 weeks required)
- `inventoryTurnover = (unitsSold / lookbackDays * 30) / currentStock` (30-day normalized)
- `returnRate = returnedOrders / totalOrders`

### 2.5 — `computeSalesTrend()` — Least-squares linear regression

```typescript
function computeSalesTrend(weeklyUnits: { weekStart: Date; units: number }[]): {
  slope: number;   // units change per week
  rSquared: number;
}
```

Standard least-squares on week index vs units. < 3 weeks → `{ slope: 0, rSquared: 0 }`.

---

## Step 3: Cross-Tenant Benchmarks (`benchmarks.ts`) — The Key Differentiator

### 3.1 — Title Normalization

Since `category` is null for most marketplaces (eBay, Etsy, Flipkart don't sync it), we use product **titles** to cluster similar products across sellers.

```typescript
// STOP_WORDS: common e-commerce filler that doesn't identify the product
const STOP_WORDS = new Set([
  'for', 'with', 'and', 'the', 'pack', 'set', 'pcs', 'piece',
  'new', 'best', 'premium', 'quality', 'original', 'genuine',
  'free', 'shipping', 'sale', 'offer', 'combo', 'buy',
  'size', 'color', 'colour', // modifiers, not product identity
  'small', 'medium', 'large', 'xl', 'xxl', 'xs',
  'red', 'blue', 'green', 'black', 'white', 'pink', 'yellow', 'grey', 'gray', 'brown',
]);

function normalizeTitle(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')     // strip punctuation
    .split(/\s+/)                       // split on whitespace
    .filter(w => w.length > 2)          // drop tiny tokens
    .filter(w => !STOP_WORDS.has(w))    // drop filler
    .filter(w => !/^\d+$/.test(w));     // drop pure numbers (sizes, quantities)
}

function buildClusterKey(title: string): string {
  const keywords = normalizeTitle(title);
  // Take up to 4 most significant keywords (sorted alphabetically for determinism)
  const sorted = [...new Set(keywords)].sort().slice(0, 4);
  return sorted.join(' ') || '_uncategorized';
}
```

Example: `"Blue Cotton Kurti for Women Size L"` → keywords: `['cotton', 'kurti', 'women']` → cluster: `"cotton kurti women"`

This means sellers with "Women's Cotton Kurti Printed" and "Cotton Kurti for Women - Casual" end up in the same cluster.

### 3.2 — Cross-Tenant Aggregation Query

Keyword matching in SQL is fragile. Instead, fetch all product-marketplace aggregates in one query (grouped by marketplace + title), then cluster by title keywords in JS:

**Query 1 — Full period aggregates (last 90 days):**
```sql
SELECT
  o."marketplace"::text AS marketplace,
  o."userId" AS user_id,
  COALESCE(oi."title", 'Unknown') AS product_title,
  SUM(COALESCE(CAST(oi."unitPrice" AS double precision), 0) * COALESCE(oi."quantity", 0)) AS revenue,
  SUM(COALESCE(oi."quantity", 0))::int AS units_sold,
  AVG(COALESCE(CAST(oi."unitPrice" AS double precision), 0)) AS avg_price,
  MIN(o."orderedAt") AS first_sale,
  MAX(o."orderedAt") AS last_sale
FROM "UnifiedOrderItem" oi
JOIN "UnifiedOrder" o ON oi."orderId" = o."id"
WHERE o."orderedAt" >= $1
  AND o."orderedAt" <= $2
  AND o."status" != 'CANCELLED'::"UnifiedOrderStatus"
GROUP BY o."marketplace", o."userId", oi."title"
```

**Query 2 — Last 7 days only (for "X units sold last week" language):**
```sql
SELECT
  o."marketplace"::text AS marketplace,
  COALESCE(oi."title", 'Unknown') AS product_title,
  SUM(COALESCE(oi."quantity", 0))::int AS units_sold
FROM "UnifiedOrderItem" oi
JOIN "UnifiedOrder" o ON oi."orderId" = o."id"
WHERE o."orderedAt" >= NOW() - INTERVAL '7 days'
  AND o."status" != 'CANCELLED'::"UnifiedOrderStatus"
GROUP BY o."marketplace", oi."title"
```

Both queries run in parallel. `userId` is used ONLY for counting distinct sellers (k-anonymity) and excluding the requesting user — never stored in output.

Then in JS:
1. For each row, compute `buildClusterKey(product_title)`
2. Group rows by `(clusterKey, marketplace)`
3. Within each group:
   - Count distinct `userId` values → `_sellerCount` (internal only)
   - Sum total units and revenue across ALL sellers → market demand
   - Compute average price → market pricing
   - **Exclude the requesting user's userId** from the totals
4. Merge Query 2 (last 7 days) for `recentUnitsSold` per cluster per marketplace
5. **Filter out groups with < 5 distinct sellers** (k-anonymity gate)
6. Build `ClusterBenchmark` objects with market demand fields only

### 3.3 — Privacy Safeguards

- **k-anonymity (k=5)**: Benchmarks with < 5 distinct sellers are discarded entirely
- **No seller info in output**: `_sellerCount` is prefixed with `_` and NEVER included in the AI tool response. The AI never sees how many sellers — only market demand totals
- **No per-seller breakdowns**: Only aggregate totals (total units, total revenue, avg price)
- **Requesting user excluded**: Their own data is subtracted from the benchmark so they're comparing against the market, not themselves
- **Language rules for Frax**: Never say "N sellers", "other sellers", "on our platform". Always say "X units sold", "₹Y/day market demand", "average price ₹Z"

### 3.4 — Caching (24h TTL)

Benchmarks don't change minute-to-minute. Use the existing cache from `src/lib/metrics/cache.ts`:

```typescript
import { buildCacheKey, getCached, setCache } from "@/lib/metrics/cache";

const BENCHMARK_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getBenchmarkCacheKey(clusterKey: string, periodDays: number): string {
  // Use a synthetic "benchmark" userId to avoid collisions with per-user cache
  return buildCacheKey("__benchmark__", "channel-fit", { cluster: clusterKey, days: periodDays });
}
```

**Optimization**: Cache the entire cross-tenant raw query result (before clustering) under a single key. Then cluster filtering happens in-memory for each user's specific products. This means the heavy DB query runs at most once per 24h.

### 3.5 — `computePlatformBenchmarkSignal()`

Compares the user's revenue/day to the total market demand for similar products on that marketplace. Higher market demand = stronger signal to be on that platform.

```typescript
function computePlatformBenchmark(
  userRevenuePerDay: number,
  benchmark: ClusterBenchmark | undefined
): number {
  if (!benchmark || benchmark._sellerCount < 5) return 0.5; // neutral when no data

  // Score based on: does this marketplace have real demand for this product type?
  // Use total market revenue as the demand signal
  const marketRevenue = benchmark.totalRevenuePerDay;

  if (marketRevenue <= 0) return 0.3; // marketplace exists but no real demand

  // User's share of market demand: higher share = they're already capturing it
  // Lower share = room to grow OR market is big and they should be there
  const userShare = userRevenuePerDay / marketRevenue;

  if (userShare >= 0.5) return 1.0;   // user dominates this market — strong fit
  if (userShare >= 0.2) return 0.85;  // significant player
  if (userShare >= 0.05) return 0.7;  // meaningful presence
  if (userRevenuePerDay > 0) return 0.5; // present but small — room to grow

  // User has 0 revenue on this marketplace but market demand exists
  // Score by how large the demand is (encourages expansion to big markets)
  return Math.min(0.4, 0.1 + Math.log10(marketRevenue + 1) / 10);
}
```

This gives a 0-1 signal used internally for scoring. The user never sees these numbers — Frax translates them into market demand language.

### 3.6 — Benchmark for EXPAND Recommendations (Key Use Case)

When a user's product is not listed on marketplace X, but similar products sell well there:

```typescript
function getExpansionBenchmarks(
  productTitle: string,
  sellingOnMarketplaces: string[],     // marketplaces where user HAS sales
  connectedMarketplaces: string[],     // marketplaces where user is connected
  allBenchmarks: Map<string, Map<string, ClusterBenchmark>>
): { marketplace: string; demand: MarketDemand; isConnected: boolean }[] {
  const clusterKey = buildClusterKey(productTitle);
  const clusterBenchmarks = allBenchmarks.get(clusterKey);
  if (!clusterBenchmarks) return [];

  return [...clusterBenchmarks.entries()]
    .filter(([mp]) => !sellingOnMarketplaces.includes(mp))    // not already selling
    .filter(([, b]) => b._sellerCount >= 5 && b.totalUnitsPerDay > 0) // k-anonymity gate
    .map(([marketplace, benchmark]) => ({
      marketplace,
      demand: {                                              // SAFE to expose — pure market data
        unitsPerDay: benchmark.totalUnitsPerDay,
        revenuePerDay: benchmark.totalRevenuePerDay,
        avgPrice: benchmark.avgPrice,
        recentUnitsSold: benchmark.recentUnitsSold,
      },
      isConnected: connectedMarketplaces.includes(marketplace),
    }))
    .sort((a, b) => b.demand.revenuePerDay - a.demand.revenuePerDay);
}
```

**Reasoning templates — MARKET DEMAND language, never seller info:**
- **Connected**: `"~{recentUnits} similar {product} sold on {marketplace} last week (₹{revenuePerDay}/day market demand). You're connected — list now. Estimated uplift: +₹{impact}/month (~{pct}% increase)."`
- **Not connected**: `"~{recentUnits} similar {product} sold on {marketplace} last week at avg ₹{avgPrice}. Connect {marketplace} from Settings → Marketplaces. Estimated uplift: +₹{impact}/month (~{pct}% increase)."`

**What we NEVER say:**
- "31 sellers list this product" — exposes internal data
- "across N sellers on our platform" — reveals ShopIQ internals
- "other sellers average ₹X" — implies we're watching competitors

**What we DO say:**
- "~210 JBL speakers sold on Amazon last week" — pure market demand
- "₹520/day market demand for similar speakers on eBay" — market size
- "Average price for similar products on Flipkart: ₹1,499" — pricing context

---

## Step 4: Scoring (`scoring.ts`)

### 4.1 — Min-max normalization (per-product across its channels)

```typescript
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

function normalizeInverse(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return 1 - (value - min) / (max - min);
}
```

### 4.2 — Composite score (8 signals)

```typescript
const DEFAULT_WEIGHTS = {
  revenueVelocity:   0.25,
  unitVelocity:      0.10,
  pricePosition:     0.05,
  salesTrend:        0.15,
  inventoryTurnover: 0.10,
  returnRate:        0.10,
  platformBenchmark: 0.25,   // Cross-tenant validation
} as const;
// Sum = 1.0
```

Weight rationale:
- **Revenue velocity (0.25)**: Top-line money — still #1 concern
- **Platform benchmark (0.25)**: Equal weight — "do similar products actually sell well here?" is the enterprise-grade signal
- **Sales trend (0.15)**: Forward-looking: growing or declining?
- **Unit velocity (0.10)**: Volume / demand
- **Inventory turnover (0.10)**: Capital efficiency
- **Return rate (0.10)**: Hidden cost (inverted)
- **Price position (0.05)**: Context only — seller controls pricing

### 4.3 — Confidence scoring

```typescript
function computeConfidence(
  orderCount: number,
  daysOfData: number,
  signalCompleteness: number, // 0-1
  hasBenchmark: boolean
): number {
  const orderConf = Math.min(1, Math.log10(orderCount + 1) / Math.log10(51));
  const timeConf = Math.min(1, daysOfData / 90);
  // Benchmark availability boosts confidence (but doesn't replace own data)
  const benchmarkBonus = hasBenchmark ? 0.15 : 0;
  const raw = Math.pow(orderConf * timeConf * signalCompleteness, 1/3);
  return Math.round(Math.min(1, raw + benchmarkBonus) * 100);
}
```

Confidence thresholds: **70-100** = firm, **40-69** = "early data suggests", **0-39** = suppress recommendations.

### 4.4 — Score labels

```typescript
function scoreLabel(score: number, confidence: number): string {
  if (confidence < 40) return 'insufficient_data';
  if (score >= 75) return 'strong';
  if (score >= 55) return 'good';
  if (score >= 35) return 'moderate';
  return 'weak';
}
```

---

## Step 5: Recommendations (`recommendations.ts`)

### Type 1: EXPAND — "List/connect this product on Channel X"

**Now backed by cross-tenant data. Recommends ALL marketplaces where similar products perform well — connected or not.**

1. Get ALL 9 supported marketplaces (not just connected ones)
2. Split into 3 buckets:
   - **Already selling** — skip for EXPAND
   - **Connected but not listing** → "List now" recommendation
   - **Not connected** → "Connect + list" recommendation with setup nudge
3. Check benchmark: does this product type have real market demand on that marketplace?
4. If benchmark exists (passes k-anonymity gate, totalUnitsPerDay > 0): **data-backed recommendation**
   - Connected: `"~{recentUnits} similar {product} sold on {marketplace} last week. You're connected — list now. Estimated uplift: +₹{impact}/month (~{pct}% increase)."`
   - Not connected: `"~{recentUnits} similar {product} sold on {marketplace} last week at avg ₹{avgPrice}. Connect {marketplace} from Settings → Marketplaces. Estimated uplift: +₹{impact}/month (~{pct}% increase)."`
5. If no benchmark: fall back to marketplace priors (static knowledge from priors.ts)
6. **Estimated uplift**: Based on user's current best-channel performance × market demand ratio, estimate monthly revenue uplift as both ₹ and percentage
7. Urgency: high if market demand > 2x user's current best channel revenue, medium otherwise

### Type 2: RESTOCK — "Increase inventory on Channel Y"

**Trigger**: High unit velocity + low stock (< 14 days remaining).

- `daysRemaining = currentStock / unitVelocity`
- `suggestedRestock = unitVelocity * 30` (30-day supply)
- Enhanced with benchmark: if benchmark shows higher velocity, suggest larger restock
- Urgency: critical < 7d, warning < 14d

### Type 3: REPRICE — "Adjust pricing on Channel Z"

**Now market-aware:**

1. Cross-channel comparison (same as before): price delta across user's own channels
2. **NEW — Market price comparison**: compare user's price to the market average price for similar products on the same marketplace
   - If user's price is >20% above market avg and velocity is low → "Your price is ₹X — similar products on {marketplace} average ₹Y. Consider adjusting."
   - If user's price is >20% below market avg and velocity is high → "You're priced at ₹X — market average is ₹Y. Room to increase without losing demand."
3. Estimated impact uses conservative 10% price → 5% volume elasticity
4. **Never say** "other sellers price at" — say "market average price" or "similar products typically priced at"

### Type 4: DEPRIORITIZE — "Reduce focus on Channel W"

**Now cross-tenant aware:**

1. Product on 2+ channels (never deprioritize only channel)
2. Fit score < 40% of product's average across channels
3. Sales trend slope <= 0
4. **NEW**: If benchmark shows the marketplace is strong for similar products but user underperforms → suggest optimizing before deprioritizing

---

## Step 6: Marketplace Priors (`priors.ts`)

Static knowledge per marketplace — fallback when cross-tenant data is insufficient:

```typescript
const MARKETPLACE_PRIORS: Record<string, MarketplacePrior> = {
  SHOPIFY: {
    displayName: 'Shopify',
    strengths: ['branded', 'DTC', 'high-margin', 'niche'],
    avgFeeRate: 0.029,
    bestFor: 'Brand-controlled experience, repeat customers',
    priceRange: { sweet: [500, 10000] },
  },
  EBAY: {
    displayName: 'eBay',
    strengths: ['electronics', 'collectibles', 'value', 'used'],
    avgFeeRate: 0.129,
    bestFor: 'Price-sensitive buyers, niche/used items',
    priceRange: { sweet: [200, 5000] },
  },
  ETSY: {
    displayName: 'Etsy',
    strengths: ['handmade', 'vintage', 'craft', 'unique'],
    avgFeeRate: 0.065,
    bestFor: 'Handmade, vintage, and creative goods',
    priceRange: { sweet: [300, 8000] },
  },
  FLIPKART: {
    displayName: 'Flipkart',
    strengths: ['electronics', 'fashion', 'mass-market', 'value'],
    avgFeeRate: 0.10,
    bestFor: 'Indian mass market, competitive pricing',
    priceRange: { sweet: [200, 5000] },
  },
  WOOCOMMERCE: {
    displayName: 'WooCommerce',
    strengths: ['custom', 'DTC', 'flexible', 'self-hosted'],
    avgFeeRate: 0.0,
    bestFor: 'Full control, custom storefronts',
    priceRange: { sweet: [500, 15000] },
  },
  BIGCOMMERCE: {
    displayName: 'BigCommerce',
    strengths: ['B2B', 'wholesale', 'scalable', 'multi-channel'],
    avgFeeRate: 0.0,
    bestFor: 'B2B wholesale, high-volume sellers',
    priceRange: { sweet: [1000, 20000] },
  },
  WIX: {
    displayName: 'Wix',
    strengths: ['small-business', 'simple', 'local'],
    avgFeeRate: 0.0,
    bestFor: 'Small businesses, simple online presence',
    priceRange: { sweet: [200, 5000] },
  },
  SQUARE: {
    displayName: 'Square',
    strengths: ['POS', 'local', 'omnichannel', 'services'],
    avgFeeRate: 0.029,
    bestFor: 'Omnichannel (online + in-store), service businesses',
    priceRange: { sweet: [100, 5000] },
  },
  MAGENTO: {
    displayName: 'Magento',
    strengths: ['enterprise', 'custom', 'high-volume', 'B2B'],
    avgFeeRate: 0.0,
    bestFor: 'Enterprise e-commerce, complex catalogs',
    priceRange: { sweet: [1000, 50000] },
  },
};
```

---

## Step 7: Orchestrator (`index.ts`)

```typescript
export async function analyzeChannelProductFit(
  userId: string,
  options: {
    productFilter?: string;
    period?: string;           // 'last_30_days' | 'last_60_days' | 'last_90_days'
    limit?: number;            // max products (default 10, max 20)
  }
): Promise<ChannelFitResult>
```

Flow:
1. **Resolve period** — reuse `resolvePeriod()` from `src/lib/ai/tools.ts`
2. **Fetch user's raw data** — 4 parallel queries from `signals.ts`
3. **Fetch cross-tenant benchmarks** — from `benchmarks.ts` (cached 24h)
4. **Filter products** — if `productFilter`, fuzzy-match title/SKU. Otherwise top N by revenue
5. **Compute raw signals** — per product per marketplace
6. **Match benchmarks** — `buildClusterKey()` for each product, find matching cluster benchmarks, exclude user's own data
7. **Normalize + score** — 8 signals → composite 0-100 score per channel
8. **Rank channels** — per product
9. **Generate recommendations** — 4 types, benchmark-enhanced
10. **Aggregate top 5** — sorted by urgency x confidence
11. **Return structured result**

---

## Step 8: AI Tool Integration (`tools.ts`)

### Tool definition — add to `FRAME_TOOLS`:

```typescript
{
  type: "function",
  function: {
    name: "get_channel_product_fit",
    description:
      "Analyze how well products perform across different marketplaces using the seller's own data AND anonymous cross-platform benchmarks from other sellers. Returns fit scores (0-100), confidence levels, and actionable recommendations: expand to new channels, restock, reprice, or deprioritize. Use when users ask about which marketplace to sell on, platform recommendations, channel fit, product-marketplace strategy, or cross-channel optimization.",
    parameters: {
      type: "object",
      properties: {
        product_name: {
          type: "string",
          description:
            "Optional: specific product name or SKU to analyze. If omitted, analyzes top products by revenue.",
        },
        period: {
          type: "string",
          enum: ["last_30_days", "last_60_days", "last_90_days"],
          description: "Lookback period for analysis (default last_90_days)",
        },
        limit: {
          type: "number",
          description:
            "Number of products to analyze when no specific product given (default 10, max 20)",
        },
      },
    },
  },
}
```

### Tool executor — add case in `executeTool()`:

```typescript
case "get_channel_product_fit": {
  const result = await analyzeChannelProductFit(userId, {
    productFilter: args.product_name as string | undefined,
    period: (args.period as string) || "last_90_days",
    limit: Math.min(Number(args.limit) || 10, 20),
  });
  return JSON.stringify(result);
}
```

---

## Step 9: System Prompt Update (`prompts.ts`)

Add to `FRAME_SYSTEM_PROMPT`:

```
# CHANNEL-PRODUCT FIT ANALYSIS
When users ask about which marketplace to sell products on, use get_channel_product_fit. This tool returns:
- **Fit scores** (0-100) per product per marketplace, with confidence levels
- **Market demand data**: how many units of similar products sell on each marketplace, at what price
- **Recommendations**: EXPAND (list on new channel), RESTOCK (low stock), REPRICE (misalignment), DEPRIORITIZE (underperforming)

When presenting fit analysis:
- Lead with the top recommendation and its reasoning
- Use MARKET DEMAND language: "~210 similar speakers sold on Amazon last week", "₹22,500/day market demand on eBay"
- Use tables for score comparisons — include ALL marketplaces where demand data exists, even if not connected
- For not-connected marketplaces with strong demand: show in table, mark "Not connected", tell user to connect from Settings → Marketplaces
- Show estimated revenue uplift as both absolute (₹/month) and percentage increase
- Always explain WHY a score is high/low (which signals drove it)
- Qualify by confidence: high (70+) = firm, medium (40-69) = "early data suggests", low (<40) = skip
- Never show raw signal numbers — translate: "sells 3.2 units/day" not "unitVelocity: 3.2"

CRITICAL — NEVER say any of these:
- "N sellers list/sell this" — no seller counts ever
- "other sellers on our platform" — no internal info
- "across N sellers" — no seller references
- "top sellers do ₹X" — no seller performance comparisons

ALWAYS use market demand framing:
- "~X units sold on {marketplace} last week"
- "₹Y/day market demand for similar products on {marketplace}"
- "Market average price: ₹Z on {marketplace}"
- "This product type moves fast on {marketplace}"
```

---

## Reused Utilities

| Utility | Location | Used For |
|---------|----------|----------|
| `resolvePeriod()` | `src/lib/ai/tools.ts:377` | Date range computation |
| `buildCacheKey` / `getCached` / `setCache` | `src/lib/metrics/cache.ts` | 24h cache for cross-tenant benchmarks |
| `prisma.$queryRaw` pattern | Briefing generators | OOM-safe DB aggregation |
| `maybeCreateMicroBelief` | `src/lib/ai/birth/micro-birth.ts` | Auto-triggers for new tool calls |

---

## Cold-Start Phase — How Recommendations Work Before 100 Clients

### Two Phases

The channel-product fit engine operates in **two distinct phases** based on total platform user count:

| Phase | Condition | Active Recommendations | EXPAND + Benchmarks |
|---|---|---|---|
| **Phase 1: Early** | **< 100 total clients** on ShopIQ | **RESTOCK + REPRICE only** (user's own data) | Disabled entirely |
| **Phase 2: Full** | **100+ total clients** on ShopIQ | All 4 types: EXPAND, RESTOCK, REPRICE, DEPRIORITIZE | Enabled (per-cluster, when 5+ sellers in a product cluster) |

**Why 100?** With fewer than 100 clients, there's not enough cross-tenant data for meaningful benchmarks, and priors-only EXPAND recommendations are just generic advice the seller already knows. Rather than showing low-confidence guesses, we wait until the platform has enough sellers for real data to emerge.

### Phase 1: < 100 Clients — RESTOCK + REPRICE Only

During Phase 1, the `get_channel_product_fit` tool only generates two recommendation types, both powered entirely by the **user's own sales data**:

#### RESTOCK — "Your stock is running low"

Fully powered by user's own data — no benchmarks needed. If their stock is low and velocity is high, we recommend restocking.

- `daysRemaining = currentStock / unitVelocity`
- Triggers when < 14 days of stock remaining
- Urgency: critical < 7 days, warning < 14 days

#### REPRICE — "Your pricing is misaligned across your own channels"

Cross-channel price comparison using the user's own channels only. If the same product is priced differently across their connected marketplaces, we flag it.

- Market price comparison (vs other sellers) — **not available**, skipped entirely
- Only compares the user's own prices across their connected marketplaces

#### What's Disabled in Phase 1

- **EXPAND** — No "where else to sell" recommendations. Without benchmarks, this would just be generic category advice ("eBay is good for electronics") which adds no value.
- **DEPRIORITIZE** — Requires enough data context to confidently tell a seller to reduce focus on a channel. Too risky with limited data.
- **Cross-tenant benchmarks** — Not queried at all. No benchmark DB queries, no clustering, no k-anonymity checks.
- **Fit scores / channel scoring** — Not computed. No 0-100 scores shown.

#### Example Frax Response — Phase 1 (< 100 clients)

User asks "Where else can I sell my JBL speaker?"

```
I can help you optimize your current channels based on your sales data!

Your JBL Bluetooth Speaker on Shopify
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Selling ~2 units/day at ₹2,500 with a steady upward trend over the last 6 weeks.

⚠️ Restock alert
Only 45 units in stock (~6 days remaining at current velocity).
Suggested restock: 240 units (30-day supply).

💰 Pricing note
Your JBL Speaker is priced at ₹2,500 on Shopify but ₹2,200 on eBay —
a ₹300 gap. Consider aligning pricing or keeping the difference intentional
based on each channel's fee structure.

Channel expansion recommendations will become available as our platform
grows and we can provide data-backed marketplace suggestions.
```

**What the user gets:** Actionable, data-backed alerts about their own inventory and pricing. No guesswork, no generic advice.

**What the user doesn't get:** Any EXPAND suggestions. No "try Flipkart" — because without real demand data, that's just a guess.

### Phase 2: 100+ Clients — Full Engine Activates

Once ShopIQ reaches 100 total clients, the full engine turns on:

- **EXPAND** recommendations activate — backed by cross-tenant benchmarks where 5+ sellers exist in a product cluster, falls back to marketplace priors where they don't
- **DEPRIORITIZE** recommendations activate — enough data context to confidently suggest reducing focus
- **REPRICE** gains market pricing — "similar products on Flipkart average ₹2,299" (when benchmarks available)
- **Cross-tenant benchmark queries** start running (cached 24h)
- **Fit scores** (0-100) computed per product per marketplace

The transition from Phase 1 → Phase 2 is a **single check**: total user count >= 100. Within Phase 2, individual product clusters still need 5+ sellers to generate benchmark data — clusters without enough sellers fall back to marketplace priors for EXPAND reasoning.

#### Example Frax Response — Phase 2 (100+ clients, benchmarks active)

Same user, same question: "Where else can I sell my JBL speaker?"

```
Your JBL Bluetooth Speaker on Shopify
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fit score: 72/100 (good) | Confidence: 82%
Selling ~2 units/day at ₹2,500 with a steady upward trend.

Where else to sell — backed by market demand data
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| Marketplace | Fit Score | Market Demand     | Avg Price | Status        |
|------------|-----------|-------------------|-----------|---------------|
| Flipkart   | 85/100    | ~210 sold/week    | ₹2,299    | Not connected |
| eBay       | 71/100    | ~95 sold/week     | ₹2,150    | Not connected |
| Square     | 48/100    | ~12 sold/week     | ₹2,800    | Connected     |

🔥 Top recommendation: List on Flipkart
~210 similar Bluetooth speakers sold on Flipkart last week with ₹4,800/day
market demand. Average price ₹2,299 — your ₹2,500 pricing is competitive.
Connect Flipkart from Settings → Marketplaces.
Estimated uplift: +₹45,000/month (~30% increase).
```

### Implementation Notes

- **Phase check**: `analyzeChannelProductFit()` first queries total user count (`prisma.user.count()`). If < 100, skip EXPAND/DEPRIORITIZE/benchmarks entirely — only run RESTOCK + REPRICE logic on user's own data.
- No feature flags — the threshold (100) is a constant in `index.ts`
- As the platform grows past 100 clients, EXPAND/benchmarks silently activate for all users on their next query
- Within Phase 2, individual clusters still need 5+ sellers for benchmark data — the 100-client gate just controls whether the engine attempts benchmarks at all

---

## Dominant Seller Edge Case — Top Seller Gets Diluted EXPAND

### The Problem

The spec requires **excluding the requesting user's own data** from cross-tenant benchmarks (so they compare against the market, not themselves). This creates a problem for dominant sellers.

**Example**: 8 sellers sell JBL speakers on Flipkart. The top seller accounts for 168 of 210 weekly units (80%).

| Who asks | Benchmark they see | What Frax says |
|---|---|---|
| Normal seller (2 units/week) | ~208 sold/week (all others including top seller) | "~208 similar speakers sold on Flipkart last week" — impressive |
| **Top seller (168 units/week)** | **~42 sold/week** (only the other 7 sellers) | "~42 similar speakers sold on Flipkart last week" — underwhelming |

The top seller — who contributes the most to the platform's data — gets the **least impressive EXPAND recommendations**. A marketplace that looks hot for everyone else looks lukewarm for them.

### How Each Recommendation Type Affects the Top Seller

| Recommendation | Impact | Why |
|---|---|---|
| **EXPAND** | **Diluted** — demand numbers shrink after excluding their data | They ARE the market on that cluster. Removing them deflates the numbers. |
| **RESTOCK** | **Strong** — high velocity = frequent stock alerts | Purely own data. Top seller sells fast, stock burns fast. Works perfectly. |
| **REPRICE** | **Strong** — spots underpricing vs market average | If they sell high volume at lower price than market avg, system flags margin opportunity: "You're at ₹2,500 — market avg ₹2,800. Room to increase." |
| **DEPRIORITIZE** | **Strong** — multi-channel comparison reveals weak spots | Even top sellers have channels where they underperform relative to their own average. |

### Example Frax Response — Top Seller Asks "Where else to sell my JBL speaker?"

```
Your JBL Bluetooth Speaker on Shopify
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fit score: 91/100 (strong) | Confidence: 88%
Selling ~24 units/day at ₹2,500 — you're a top performer on this channel.

Where else to sell
━━━━━━━━━━━━━━━━━━
| Marketplace | Fit Score | Market Demand    | Avg Price | Status        |
|------------|-----------|------------------|-----------|---------------|
| Flipkart   | 62/100    | ~42 sold/week    | ₹2,450    | Not connected |
| eBay       | 55/100    | ~18 sold/week    | ₹2,150    | Not connected |

Flipkart shows ~42 similar speakers sold last week with market demand of
₹1,470/day. Average price ₹2,450. Connect Flipkart from Settings →
Marketplaces to start listing.
Estimated uplift: +₹12,000/month (~8% increase).

💰 Pricing opportunity
Your JBL Speaker is priced at ₹2,500 — similar products on Shopify
average ₹2,800. At your volume (~24 units/day), even a ₹100 increase
could add ~₹72,000/month.
```

**Key differences from a normal seller's response:**
- Market demand numbers are much smaller (~42 vs ~210) because their own 168 units are excluded
- Estimated uplift is modest (~8% vs ~30%) because the benchmark is deflated
- But REPRICE becomes very valuable — at high volume, small price changes = big revenue impact
- The system naturally pivots to recommending pricing optimization over channel expansion

### Why This Is Correct Behavior

- **Mathematically honest**: The top seller shouldn't be told "the market is hot" when they ARE the market
- **Still useful**: RESTOCK and REPRICE are highly valuable at their volume — a ₹100 price increase at 24 units/day = ₹72,000/month
- **No fix needed**: This is the correct outcome. The system naturally gives the top seller different but equally actionable advice — optimize what you have (pricing, stock) rather than chase smaller markets

---

## Verification

1. **Type check**: `npx tsc --noEmit`
2. **Build**: `npx next build`
3. **Manual test via chat**: Ask Frax:
   - "Which marketplace should I sell my products on?"
   - "How does my kurti do on different platforms?"
   - "Should I expand to Amazon?"
4. **Edge cases**:
   - User with 1 marketplace → scores + EXPAND recommendations (benchmark-backed if available)
   - User with 0 orders → empty result with clear message
   - Product cluster with < 5 sellers → benchmark excluded, falls back to priors
   - Product on all connected channels → rank channels, DEPRIORITIZE weakest, no EXPAND
   - New platform user (no sales data) → benchmark-only recommendations with lower confidence
