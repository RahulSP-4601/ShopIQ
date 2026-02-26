// src/lib/ai/channel-fit/recommendations.ts
// 4 recommendation generators: EXPAND/CONNECT, RESTOCK, REPRICE, DEPRIORITIZE
// 3 client types handled:
//   1. <5 sellers in cluster → category-based EXPAND (marketplace priors)
//   2. 5+ sellers in cluster → benchmark-backed EXPAND (market demand data)
//   3. Dominant seller (user's revenue > rest of market) → market leader framing

import type {
  Recommendation,
  RawSignals,
  ChannelScore,
  MarketDemand,
  InventoryItem,
} from "./types";
import type { InternalClusterBenchmark } from "./types.server";
import { ACTIVE_MARKETPLACES } from "./types";
import { buildClusterKey, getExpansionBenchmarks } from "./benchmarks";
import {
  MARKETPLACE_PRIORS,
  getMarketplaceDisplayName,
} from "./priors";

/** Assumed fraction of total market demand a new seller captures (10%). */
const MARKET_CAPTURE_RATE = 0.1;
const MAX_UPLIFT_PERCENT = 200;

// -------------------------------------------------------
// Type 1: EXPAND — recommend marketplaces for expansion
// -------------------------------------------------------

/**
 * Generate EXPAND recommendations for a product.
 *
 * 3 tiers of reasoning:
 * - Tier 1 (benchmark + dominant): User dominates their current channels.
 *   Framing: "You lead the market — expand to replicate your success."
 * - Tier 2 (benchmark): Market demand data available from 5+ sellers.
 *   Framing: "~210 similar products sold on eBay last week."
 * - Tier 3 (priors): No benchmark data. Category-based matching.
 *   Framing: "eBay is a top marketplace for electronics and tech accessories."
 */
export function generateExpandRecommendations(
  productKey: string,
  productName: string,
  sellingOnMarketplaces: string[],
  connectedMarketplaces: string[],
  bestChannelRevenuePerDay: number,
  benchmarks: Map<string, Map<string, InternalClusterBenchmark>> | null,
  userAvgPrice?: number,
  signalsByMarketplace?: Map<string, RawSignals>
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // ── Detect dominant seller ──
  // User is dominant when their revenue alone exceeds all other sellers combined.
  // Pick the marketplace where the user has the highest revenue dominance ratio
  // (not the first match) so the "market leader" framing uses the strongest channel.
  let isDominantSeller = false;
  let dominantMarketplace = "";

  if (benchmarks && signalsByMarketplace) {
    const clusterKey = buildClusterKey(productName);
    const clusterBenchmarks = benchmarks.get(clusterKey);

    if (clusterBenchmarks) {
      let bestDominanceRatio = 0;
      for (const [mp, signals] of signalsByMarketplace) {
        const benchmark = clusterBenchmarks.get(mp);
        // benchmark.totalRevenuePerDay excludes the requesting user (see buildClusterBenchmarks),
        // so this checks: user revenue > all other sellers' combined revenue
        if (
          benchmark &&
          benchmark.totalRevenuePerDay > 0 &&
          signals.revenueVelocity > benchmark.totalRevenuePerDay
        ) {
          const ratio = signals.revenueVelocity / benchmark.totalRevenuePerDay;
          if (ratio > bestDominanceRatio) {
            bestDominanceRatio = ratio;
            isDominantSeller = true;
            dominantMarketplace = mp;
          }
        }
      }
    }
  }

  const dominantDisplayName = dominantMarketplace
    ? getMarketplaceDisplayName(dominantMarketplace)
    : "";

  // ── Tier 2: Benchmark-backed EXPAND (5+ sellers in cluster) ──
  const expansionBenchmarks: Array<{
    marketplace: string;
    demand: MarketDemand;
    isConnected: boolean;
  }> = [];

  if (benchmarks) {
    const eb = getExpansionBenchmarks(
      productName,
      sellingOnMarketplaces,
      connectedMarketplaces,
      benchmarks
    );

    for (const expansion of eb) {
      expansionBenchmarks.push(expansion);
      const { marketplace, demand, isConnected } = expansion;
      const displayName = getMarketplaceDisplayName(marketplace);

      const estimatedMonthlyUplift = demand.revenuePerDay * 30 * MARKET_CAPTURE_RATE;
      const rawUpliftPercent =
        bestChannelRevenuePerDay > 0
          ? Math.round((estimatedMonthlyUplift / (bestChannelRevenuePerDay * 30)) * 100)
          : 0;
      const displayPercent = Math.min(rawUpliftPercent, MAX_UPLIFT_PERCENT);
      const percentSuffix = rawUpliftPercent > MAX_UPLIFT_PERCENT ? "+" : "";

      // Guard: when bestChannelRevenuePerDay is 0 (no revenue yet), any positive
      // demand would falsely trigger "high" — default to "medium" instead.
      const urgency =
        bestChannelRevenuePerDay > 0 && demand.revenuePerDay > bestChannelRevenuePerDay * 2
          ? "high"
          : "medium";

      // Use CONNECT when the marketplace isn't connected yet
      const type = isConnected ? "EXPAND" as const : "CONNECT" as const;

      // Per-marketplace dominant check: only apply market-leader framing
      // when this recommendation's marketplace matches the dominant one
      const isDominantForThisMp = isDominantSeller && marketplace === dominantMarketplace;

      let reasoning: string;
      if (isDominantForThisMp) {
        reasoning = `You lead the market for ${productName} on ${dominantDisplayName} — your sales outpace competitors. ${displayName} shows ~${Math.round(demand.recentUnitsSold)} similar products sold last week at avg ₹${formatNum(demand.avgPrice)}. Expanding here could replicate your success with an estimated +₹${formatNum(estimatedMonthlyUplift)}/month.`;
      } else {
        reasoning = `~${Math.round(demand.recentUnitsSold)} similar ${productName} sold on ${displayName} last week (₹${formatNum(demand.revenuePerDay)}/day market demand, avg price ₹${formatNum(demand.avgPrice)}). Estimated revenue uplift: +₹${formatNum(estimatedMonthlyUplift)}/month (~${displayPercent}%${percentSuffix} increase).`;
      }

      recommendations.push({
        type,
        productKey,
        productName,
        marketplace,
        reasoning,
        confidence: isDominantForThisMp ? 75 : 70,
        urgency,
        estimatedImpact: `+₹${formatNum(estimatedMonthlyUplift)}/month (~${displayPercent}%${percentSuffix} increase)`,
      });
    }
  }

  // ── Tier 3: Category-based EXPAND (priors fallback) ──
  const coveredMarketplaces = new Set([
    ...sellingOnMarketplaces,
    ...expansionBenchmarks.map((e) => e.marketplace),
  ]);

  const keywords = buildClusterKey(productName)
    .split(" ")
    .filter((w) => w !== "" && w !== "_uncategorized");

  if (keywords.length === 0) return recommendations;

  // Score each marketplace by keyword match strength
  const priorCandidates: Array<{
    marketplace: string;
    matchCount: number;
    prior: (typeof MARKETPLACE_PRIORS)[string];
  }> = [];

  for (const marketplace of ACTIVE_MARKETPLACES) {
    if (coveredMarketplaces.has(marketplace)) continue;

    const prior = MARKETPLACE_PRIORS[marketplace];
    if (!prior) continue;

    const matchCount = keywords.filter((kw) =>
      prior.strengths.some((s) => s.includes(kw))
    ).length;

    if (matchCount > 0) {
      priorCandidates.push({ marketplace, matchCount, prior });
    }
  }

  priorCandidates.sort((a, b) => b.matchCount - a.matchCount);

  for (const { marketplace, matchCount, prior } of priorCandidates.slice(0, 3)) {
    const displayName = prior.displayName;

    // Use CONNECT when the marketplace isn't connected yet
    const isConnected = connectedMarketplaces.includes(marketplace);
    const type = isConnected ? "EXPAND" as const : "CONNECT" as const;

    // Per-marketplace dominant check for Tier 3 priors
    const isDominantForThisPrior = isDominantSeller && marketplace === dominantMarketplace;

    let reasoning: string;

    if (isDominantForThisPrior) {
      // Dominant seller + priors
      reasoning = `You lead the market for ${productName} on ${dominantDisplayName}. ${displayName} is a strong marketplace for ${prior.bestFor} — expanding here could replicate your dominance.`;
    } else {
      // Standard priors reasoning — sound like a business analyst
      reasoning = `${displayName} is a top marketplace for ${prior.bestFor}.`;

      if (userAvgPrice && userAvgPrice > 0) {
        const [sweetLow, sweetHigh] = prior.priceRange.sweet;
        const inSweetSpot =
          userAvgPrice >= sweetLow * 0.7 && userAvgPrice <= sweetHigh * 1.3;
        if (inSweetSpot) {
          reasoning += ` Your price point (₹${formatNum(userAvgPrice)}) aligns with ${displayName}'s buyer expectations — strong competitive positioning.`;
        }
      }

      reasoning += ` ${productName} fits this marketplace's core product categories well.`;
    }

    const confidence = matchCount >= 3 ? 55 : matchCount >= 2 ? 50 : 45;

    recommendations.push({
      type,
      productKey,
      productName,
      marketplace,
      reasoning,
      confidence,
      urgency: "low",
    });
  }

  return recommendations;
}

// -------------------------------------------------------
// Type 2: RESTOCK — "Increase inventory on Channel Y"
// -------------------------------------------------------

/**
 * Generate RESTOCK recommendations for a product.
 * Trigger: High unit velocity + low stock (< 14 days remaining).
 * Works in both Phase 1 and Phase 2.
 */
export function generateRestockRecommendations(
  productKey: string,
  productName: string,
  signalsByMarketplace: Map<string, RawSignals>,
  inventory: InventoryItem[],
  benchmarks: Map<string, Map<string, InternalClusterBenchmark>> | null
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const [marketplace, signals] of signalsByMarketplace) {
    if (signals.unitVelocity <= 0) continue;

    // Only match on SKU — title matching is too fragile and can cross-match
    // unrelated products with similar names.
    const invItem = inventory.find(
      (item) =>
        item.sku != null &&
        item.sku.toLowerCase() === productKey.toLowerCase() &&
        item.marketplace === marketplace
    );

    // Skip products without inventory tracking — no record means untracked, not zero stock
    if (!invItem) continue;

    const currentStock = invItem.inventory ?? 0;
    if (currentStock < 0) continue;

    // unitVelocity > 0 guaranteed by the `continue` guard above
    const daysRemaining = currentStock / signals.unitVelocity;

    if (daysRemaining >= 14) continue;

    const suggestedRestock = Math.ceil(Math.max(0, signals.unitVelocity * 30 - currentStock));
    const displayName = getMarketplaceDisplayName(marketplace);

    const isStockOut = currentStock === 0;
    // Human-facing display: stock-out gets special text; otherwise at least 1 day
    const displayDays = isStockOut ? 0 : Math.max(1, Math.ceil(daysRemaining));
    // Impact calculation: use real daysRemaining for revenue math (fractional days are valid);
    // display uses displayDays (Math.max(1, ...)) for human-readable text
    const impactDays = daysRemaining;

    let benchmarkNote = "";
    if (benchmarks) {
      const clusterKey = buildClusterKey(productName);
      const benchmark = benchmarks.get(clusterKey)?.get(marketplace);
      if (
        benchmark &&
        benchmark.totalUnitsPerDay > signals.unitVelocity * 2
      ) {
        benchmarkNote = ` Market demand for similar products is ${formatNum(benchmark.totalUnitsPerDay)} units/day — consider stocking for growth.`;
      }
    }

    const urgency: "high" | "medium" = daysRemaining < 7 ? "high" : "medium";

    const stockStatus = isStockOut
      ? `0 units in stock (stock depleted)`
      : `${formatNum(currentStock)} units in stock (~${displayDays} days remaining)`;

    recommendations.push({
      type: "RESTOCK",
      productKey,
      productName,
      marketplace,
      reasoning: `${productName} on ${displayName} is selling ~${formatNum(signals.unitVelocity)} units/day but only ${stockStatus}. Suggested restock: ${formatNum(suggestedRestock)} units (30-day supply).${benchmarkNote}`,
      confidence: 85,
      urgency,
      estimatedImpact: isStockOut
        ? `~₹${formatNum(signals.revenueVelocity)}/day in lost sales — restock immediately`
        : urgency === "high"
          ? `~₹${formatNum(signals.revenueVelocity * impactDays)} projected before stock-out in ${displayDays} days — restock to protect ongoing sales`
          : `~${displayDays} days of stock remaining at current velocity — plan restock to avoid disruption`,
    });
  }

  return recommendations;
}

// -------------------------------------------------------
// Type 3: REPRICE — "Adjust pricing on Channel Z"
// -------------------------------------------------------

/**
 * Generate REPRICE recommendations for a product.
 * Compares pricing across user's own channels AND market benchmarks.
 * Phase 1: cross-channel only. Phase 2: adds market price comparison.
 */
export function generateRepriceRecommendations(
  productKey: string,
  productName: string,
  signalsByMarketplace: Map<string, RawSignals>,
  benchmarks: Map<string, Map<string, InternalClusterBenchmark>> | null
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const marketplaces = [...signalsByMarketplace.keys()];

  // ── Cross-channel price comparison (needs 2+ priced channels) ──
  const prices = marketplaces.map((mp) => ({
    marketplace: mp,
    price: signalsByMarketplace.get(mp)!.avgUnitPrice,
    velocity: signalsByMarketplace.get(mp)!.unitVelocity,
  }));

  // Exclude zero-price entries (free samples, bundles) from average calculation
  // to avoid dragging down the cross-channel average and creating false REPRICE triggers
  const pricedItems = prices.filter((p) => p.price > 0);

  if (pricedItems.length >= 2) {
    const avgPrice =
      pricedItems.reduce((s, p) => s + p.price, 0) / pricedItems.length;
    // Exclude zero-velocity channels (listed but not selling) so they don't
    // drag down the average and create overly lenient REPRICE thresholds
    const sellingItems = pricedItems.filter((p) => p.velocity > 0);
    const avgVel = avgVelocity(sellingItems);

    // Skip cross-channel REPRICE when no channel has positive velocity —
    // price divergence is meaningless without sales activity as baseline
    if (sellingItems.length > 0) {
      for (const item of prices) {
        if (item.price <= 0 || avgPrice <= 0) continue;

        const priceDelta = item.price - avgPrice;
        const priceDeltaPct = (priceDelta / avgPrice) * 100;
        const displayName = getMarketplaceDisplayName(item.marketplace);

        if (Math.abs(priceDeltaPct) > 15) {
          // Skip REPRICE when premium pricing with strong sales — no action needed
          if (priceDelta > 0 && item.velocity >= avgVel) continue;

          const direction = priceDelta > 0 ? "above" : "below";
          const action =
            priceDelta > 0 && item.velocity < avgVel
              ? "Consider reducing to match other channels and boost volume."
              : priceDelta < 0 && item.velocity > avgVel
                ? "Room to increase — you're selling fast at a lower price."
                : `Review pricing alignment across channels.`;

          recommendations.push({
            type: "REPRICE",
            productKey,
            productName,
            marketplace: item.marketplace,
            reasoning: `${productName} is priced at ₹${formatNum(item.price)} on ${displayName} — ${Math.abs(Math.round(priceDeltaPct))}% ${direction} your cross-channel average of ₹${formatNum(avgPrice)}. ${action}`,
            confidence: 65,
            urgency: Math.abs(priceDeltaPct) > 25 ? "high" : "medium",
            estimatedImpact: estimatePriceImpact(
              item.price,
              avgPrice,
              item.velocity
            ),
          });
        }
      }
    }
  }

  // Track marketplaces already recommended to avoid duplicate REPRICE entries
  const repricedMarketplaces = new Set(recommendations.map((r) => r.marketplace));

  // Market price comparison (Phase 2 only — when benchmarks exist)
  if (benchmarks) {
    const clusterKey = buildClusterKey(productName);
    const clusterBenchmarks = benchmarks.get(clusterKey);

    if (clusterBenchmarks) {
      for (const [marketplace, signals] of signalsByMarketplace) {
        if (repricedMarketplaces.has(marketplace)) continue;
        const benchmark = clusterBenchmarks.get(marketplace);
        if (!benchmark || benchmark.avgPrice <= 0) continue;

        const userPrice = signals.avgUnitPrice;
        if (userPrice <= 0) continue;

        const marketDelta =
          ((userPrice - benchmark.avgPrice) / benchmark.avgPrice) * 100;
        const displayName = getMarketplaceDisplayName(marketplace);

        // Overpriced + slow: velocity < 1 unit/day → suggest lowering
        // Underpriced + any sales: velocity > 0 → suggest raising
        if (marketDelta > 20 && signals.unitVelocity < 1) {
          recommendations.push({
            type: "REPRICE",
            productKey,
            productName,
            marketplace,
            reasoning: `${productName} at ₹${formatNum(userPrice)} on ${displayName} is above the market average of ₹${formatNum(benchmark.avgPrice)}. Adjusting closer to market pricing could improve sales velocity.`,
            confidence: 70,
            urgency: "medium",
            estimatedImpact: estimatePriceImpact(
              userPrice,
              benchmark.avgPrice,
              signals.unitVelocity
            ),
          });
        } else if (marketDelta < -20 && signals.unitVelocity > 0) {
          recommendations.push({
            type: "REPRICE",
            productKey,
            productName,
            marketplace,
            reasoning: `${productName} at ₹${formatNum(userPrice)} on ${displayName} is below the market average of ₹${formatNum(benchmark.avgPrice)}. With your strong sales velocity, there's room to increase pricing.`,
            confidence: 70,
            urgency: "medium",
            estimatedImpact: estimatePriceImpact(
              userPrice,
              benchmark.avgPrice,
              signals.unitVelocity
            ),
          });
        }
      }
    }
  }

  return recommendations;
}

// -------------------------------------------------------
// Type 4: DEPRIORITIZE — "Reduce focus on Channel W"
// -------------------------------------------------------

/**
 * Generate DEPRIORITIZE recommendations for a product.
 * Only in Phase 2 (100+ users). Requires 2+ channels.
 */
export function generateDeprioritizeRecommendations(
  productKey: string,
  productName: string,
  channelScores: ChannelScore[],
  signalsByMarketplace: Map<string, RawSignals>,
  benchmarks: Map<string, Map<string, InternalClusterBenchmark>> | null
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (channelScores.length < 2) return [];

  const bestFitScore = Math.max(...channelScores.map((cs) => cs.fitScore));

  for (const score of channelScores) {
    const signals = signalsByMarketplace.get(score.marketplace);
    if (!signals) continue;

    const isWeakChannel = score.fitScore < bestFitScore * 0.4;
    const isDeclining = signals.salesTrendSlope < 0;

    if (!isWeakChannel || !isDeclining) continue;

    const displayName = getMarketplaceDisplayName(score.marketplace);
    const bestChannel = channelScores.reduce((best, cs) =>
      cs.fitScore > best.fitScore ? cs : best
    );
    const bestDisplayName = getMarketplaceDisplayName(
      bestChannel.marketplace
    );

    let optimizeNote = "";
    if (benchmarks) {
      const clusterKey = buildClusterKey(productName);
      const benchmark = benchmarks
        .get(clusterKey)
        ?.get(score.marketplace);
      if (
        benchmark &&
        benchmark.totalUnitsPerDay > signals.unitVelocity * 3
      ) {
        optimizeNote = ` However, market demand on ${displayName} is strong — consider optimizing your listing before reducing focus.`;
      }
    }

    recommendations.push({
      type: "DEPRIORITIZE",
      productKey,
      productName,
      marketplace: score.marketplace,
      reasoning: `${productName} on ${displayName} scores ${score.fitScore}/100 vs ${bestChannel.fitScore}/100 on ${bestDisplayName}. Sales are declining — focusing inventory and effort on stronger channels would be more effective.${optimizeNote}`,
      confidence: score.confidence,
      urgency: "low",
    });
  }

  return recommendations;
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function formatNum(value: number): string {
  if (!Number.isFinite(value)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`formatNum received non-finite value: ${value}`);
    }
    return "N/A";
  }
  if (value === 0) return "0";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 10_000_000) {
    return `${sign}${(abs / 10_000_000).toFixed(1)}Cr`;
  }
  if (abs >= 100_000) {
    return `${sign}${(abs / 100_000).toFixed(1)}L`;
  }
  if (abs >= 1000) {
    // ICU-free Indian digit grouping: thousands, then two-digit groups
    const whole = Math.round(abs).toString();
    const lastThree = whole.slice(-3);
    const rest = whole.slice(0, -3);
    const grouped =
      rest.length > 0
        ? rest.replace(/\B(?=(\d{2})+$)/g, ",") + "," + lastThree
        : lastThree;
    return `${sign}${grouped}`;
  }
  return `${sign}${abs.toFixed(abs < 10 ? 1 : 0)}`;
}

function avgVelocity(
  prices: Array<{ velocity: number }>
): number {
  if (prices.length === 0) return 0;
  return (
    prices.reduce((s, p) => s + p.velocity, 0) / prices.length
  );
}

function estimatePriceImpact(
  currentPrice: number,
  targetPrice: number,
  velocity: number
): string | undefined {
  if (currentPrice <= 0 || targetPrice <= 0 || velocity <= 0)
    return undefined;

  const priceDiff = targetPrice - currentPrice;
  const volumeChange = velocity * (priceDiff / currentPrice) * -0.5;
  const newVelocity = Math.max(0, velocity + volumeChange);
  const revenueChange = (targetPrice * newVelocity - currentPrice * velocity) * 30;

  if (Math.abs(revenueChange) < 100) return undefined;

  const sign = revenueChange >= 0 ? "+" : "-";
  return `${sign}₹${formatNum(Math.abs(revenueChange))}/month`;
}
