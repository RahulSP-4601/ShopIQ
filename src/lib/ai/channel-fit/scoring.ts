// src/lib/ai/channel-fit/scoring.ts
// Normalization, weighting, composite score, confidence, and labels

import type {
  RawSignals,
  NormalizedSignals,
  ChannelScore,
  MarketDemand,
  HealthLabel,
} from "./types";
import type { InternalClusterBenchmark } from "./types.server";
import { DEFAULT_WEIGHTS, STOCKOUT_TURNOVER } from "./types";
import { computePlatformBenchmark } from "./benchmarks";
import { buildClusterKey } from "./benchmarks";

// Validate DEFAULT_WEIGHTS at module load: sum must be 1.0, each weight finite and non-negative.
// Dev: throw to fail fast. Production: warn without crashing.
(() => {
  const entries = Object.entries(DEFAULT_WEIGHTS);
  const sum = entries.reduce((s, [, w]) => s + w, 0);
  const invalid = entries.filter(([, w]) => !Number.isFinite(w) || w < 0);
  const isBad = invalid.length > 0 || Math.abs(sum - 1.0) > 0.001;

  if (!isBad) return;

  const msg = `DEFAULT_WEIGHTS misconfigured: sum=${sum}${invalid.length ? `, invalid=[${invalid.map(([k]) => k).join(",")}]` : ""}`;
  const nodeEnv = typeof process !== "undefined" ? process.env?.NODE_ENV : undefined;
  if (nodeEnv !== "production") {
    throw new Error(msg);
  }
  console.warn(`Channel-fit: ${msg}. Scoring may be inaccurate.`);
})();

// -------------------------------------------------------
// Min-Max Normalization
// -------------------------------------------------------

function normalize(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) return 0.5;
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

function normalizeInverse(
  value: number,
  min: number,
  max: number
): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) return 0.5;
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, 1 - (value - min) / (max - min)));
}

/** Defensive copy of RawSignals for external consumption.
 * Prevents future internal-only fields from accidentally leaking into tool responses. */
function sanitizeSignals(raw: RawSignals): RawSignals {
  return {
    revenueVelocity: raw.revenueVelocity,
    unitVelocity: raw.unitVelocity,
    avgUnitPrice: raw.avgUnitPrice,
    salesTrendSlope: raw.salesTrendSlope,
    salesTrendR2: raw.salesTrendR2,
    inventoryTurnover: raw.inventoryTurnover,
    returnRate: raw.returnRate,
  };
}

// -------------------------------------------------------
// Composite Scoring
// -------------------------------------------------------

/**
 * Compute channel scores for a single product across all its marketplaces.
 * Normalization is done per-product across its channels (relative comparison).
 */
export function computeChannelScores(
  productName: string,
  signalsByMarketplace: Map<string, RawSignals>,
  orderCountByMarketplace: Map<string, number>,
  daysOfDataByMarketplace: Map<string, number>,
  benchmarks: Map<string, Map<string, InternalClusterBenchmark>> | null,
  lookbackDays: number
): ChannelScore[] {
  const marketplaces = [...signalsByMarketplace.keys()];
  if (marketplaces.length === 0) return [];

  // Collect all signal values for normalization ranges
  const allSignals = marketplaces.map((mp) => signalsByMarketplace.get(mp)!);

  const minMax = {
    revenueVelocity: getMinMax(allSignals.map((s) => s.revenueVelocity)),
    unitVelocity: getMinMax(allSignals.map((s) => s.unitVelocity)),
    avgUnitPrice: getMinMax(allSignals.map((s) => s.avgUnitPrice)),
    salesTrendSlope: getMinMax(allSignals.map((s) => s.salesTrendSlope)),
    inventoryTurnover: (() => {
      const mm = getMinMax(
        allSignals
          .map((s) => s.inventoryTurnover)
          .filter((v): v is number => v !== null && Number.isFinite(v) && v !== STOCKOUT_TURNOVER)
      );
      // When all finite values are 0 (no demand + no stock), bump max so 0
      // normalizes lower than null's neutral 0.5
      if (mm.min === 0 && mm.max === 0) mm.max = 1;
      return mm;
    })(),
    returnRate: getMinMax(allSignals.map((s) => s.returnRate)),
  };

  // Compute benchmark signal for each marketplace
  const clusterKey = buildClusterKey(productName);
  const clusterBenchmarks = benchmarks?.get(clusterKey);

  const scores: ChannelScore[] = [];

  for (const marketplace of marketplaces) {
    const signals = signalsByMarketplace.get(marketplace)!;
    const benchmark = clusterBenchmarks?.get(marketplace);

    // Determine benchmark reliability BEFORE building normalized signals
    const hasBenchmark =
      !!benchmark &&
      benchmark._sellerCount >= 5 &&
      benchmark.totalUnitsPerDay > 0;

    // Compute benchmark score with proper type narrowing (hasBenchmark alone
    // doesn't narrow `benchmark` from `InternalClusterBenchmark | undefined`)
    const rawBenchmarkScore = hasBenchmark && benchmark
      ? computePlatformBenchmark(signals.unitVelocity, benchmark)
      : null;
    // Guard against NaN propagation from unexpected inputs
    const benchmarkScore = rawBenchmarkScore !== null && Number.isFinite(rawBenchmarkScore)
      ? rawBenchmarkScore
      : null;

    // Normalize each signal (0-1)
    const normalized: NormalizedSignals = {
      revenueVelocity: normalize(
        signals.revenueVelocity,
        minMax.revenueVelocity.min,
        minMax.revenueVelocity.max
      ),
      unitVelocity: normalize(
        signals.unitVelocity,
        minMax.unitVelocity.min,
        minMax.unitVelocity.max
      ),
      // Higher avgUnitPrice → higher pricePosition → higher fitScore.
      // Rationale: within a product's channels, a marketplace achieving a higher
      // price suggests premium positioning and stronger buyer willingness-to-pay.
      // If lower price should indicate better fit (e.g. volume plays), swap to
      // normalizeInverse(signals.avgUnitPrice, ...).
      pricePosition: normalize(
        signals.avgUnitPrice,
        minMax.avgUnitPrice.min,
        minMax.avgUnitPrice.max
      ),
      salesTrend: normalize(
        signals.salesTrendSlope,
        minMax.salesTrendSlope.min,
        minMax.salesTrendSlope.max
      ),
      // null = untracked (neutral 0.5); STOCKOUT_TURNOVER = active stockout with demand (max 1.0);
      // finite values normalized within the product's cross-channel range
      inventoryTurnover: signals.inventoryTurnover === null
        ? 0.5
        : signals.inventoryTurnover === STOCKOUT_TURNOVER
          ? 1.0
          : normalize(
              signals.inventoryTurnover,
              minMax.inventoryTurnover.min,
              minMax.inventoryTurnover.max
            ),
      returnRate: normalizeInverse(
        signals.returnRate,
        minMax.returnRate.min,
        minMax.returnRate.max
      ),
      // Only meaningful when benchmarkScore is available; otherwise weight is
      // redistributed to core signals (see rawScore below).
      platformBenchmark: benchmarkScore !== null
        ? Math.max(0, Math.min(1, benchmarkScore))
        : 0,
    };

    // Weighted composite score (0-1 → 0-100)
    // Core signals (always available)
    const coreScore =
      normalized.revenueVelocity * DEFAULT_WEIGHTS.revenueVelocity +
      normalized.unitVelocity * DEFAULT_WEIGHTS.unitVelocity +
      normalized.pricePosition * DEFAULT_WEIGHTS.pricePosition +
      normalized.salesTrend * DEFAULT_WEIGHTS.salesTrend +
      normalized.inventoryTurnover * DEFAULT_WEIGHTS.inventoryTurnover +
      normalized.returnRate * DEFAULT_WEIGHTS.returnRate;

    // When benchmark is available, include it at full weight.
    // When unavailable, redistribute its weight proportionally across core signals
    // so non-benchmarked products span the full 0-100 fitScore range instead of
    // being compressed to ~13-88 by a fixed 0.5 neutral value.
    const coreWeightDenom = 1 - DEFAULT_WEIGHTS.platformBenchmark;
    const rawScore = benchmarkScore !== null
      ? coreScore + normalized.platformBenchmark * DEFAULT_WEIGHTS.platformBenchmark
      : coreWeightDenom >= 0.001
        ? coreScore / coreWeightDenom
        : coreScore;

    const fitScore = Math.max(0, Math.min(100, Math.round(rawScore * 100)));

    // Confidence scoring
    const orderCount = orderCountByMarketplace.get(marketplace) || 0;
    const daysOfData = daysOfDataByMarketplace.get(marketplace) || 0;

    // Signal completeness: count how many signals have meaningful data
    // Revenue/unit/price: > 0 means real sales data exists
    // salesTrendR2 > 0: regression had enough weekly data points (3+ weeks)
    // inventoryTurnover > 0: stock tracking is active
    // returnRate: always present when orders exist (0 = no returns, still valid)
    const presentSignals = [
      signals.revenueVelocity > 0,
      signals.unitVelocity > 0,
      signals.avgUnitPrice > 0,
      signals.salesTrendR2 > 0,
      signals.inventoryTurnover !== null && signals.inventoryTurnover > 0,
      orderCount > 0, // returnRate only meaningful when orders exist
    ];
    const signalCompleteness =
      presentSignals.filter(Boolean).length / presentSignals.length;

    const confidence = computeConfidence(
      orderCount,
      daysOfData,
      signalCompleteness,
      hasBenchmark,
      lookbackDays
    );

    const label = scoreLabel(fitScore, confidence);

    // Build market demand data if benchmark exists (safe to expose)
    let marketDemand: MarketDemand | undefined;
    if (hasBenchmark && benchmark) {
      marketDemand = {
        unitsPerDay: benchmark.totalUnitsPerDay,
        revenuePerDay: benchmark.totalRevenuePerDay,
        avgPrice: benchmark.avgPrice,
        recentUnitsSold: benchmark.recentUnitsSold,
      };
    }

    scores.push({
      marketplace,
      fitScore,
      confidence,
      rank: 0, // set after sorting
      signals: sanitizeSignals(signals),
      marketDemand,
      label,
    });
  }

  // Rank by fitScore descending; break ties by marketplace name for deterministic ordering
  // Unicode code-point comparison for deterministic ordering across environments
  scores.sort((a, b) => b.fitScore - a.fitScore || (a.marketplace < b.marketplace ? -1 : a.marketplace > b.marketplace ? 1 : 0));
  scores.forEach((s, i) => {
    s.rank = i + 1;
  });

  // Single-channel products: min-max normalization yields 0.5 for signals that are
  // normalized across channels (revenue, units, price, trend, returnRate) since
  // there's only one data point. platformBenchmark (from cluster benchmarks) CAN
  // vary even for a single marketplace, but the overall fitScore is still less
  // discriminating. Apply explicit -15 confidence penalty to reflect this.
  if (marketplaces.length === 1) {
    for (const score of scores) {
      score.confidence = Math.max(0, score.confidence - 15);
      score.label = scoreLabel(score.fitScore, score.confidence);
    }
  }

  return scores;
}

// -------------------------------------------------------
// Confidence Scoring
// -------------------------------------------------------

function computeConfidence(
  orderCount: number,
  daysOfData: number,
  signalCompleteness: number,
  hasBenchmark: boolean,
  lookbackDays: number
): number {
  // Order confidence: log scale, 50 orders = full confidence
  // Clamp to prevent NaN from Math.log10 on negative values
  const safeOrderCount = Math.max(0, orderCount);
  const orderConf = Math.min(
    1,
    Math.log10(safeOrderCount + 1) / Math.log10(51)
  );

  // Time confidence: full lookback window = full confidence
  // Guard against non-positive lookbackDays (negative or zero)
  const safeLookback = Math.max(1, lookbackDays);
  const timeConf = Math.min(1, Math.max(0, daysOfData / safeLookback));

  // Geometric mean of core confidence factors
  const baseRaw = Math.pow(
    orderConf * timeConf * signalCompleteness,
    1 / 3
  );

  // Benchmark availability as an additive bonus (not inside geometric mean
  // where it gets clamped when other factors are already high)
  const raw = baseRaw + (hasBenchmark ? 0.15 : 0);

  return Math.round(Math.min(1, raw) * 100);
}

// -------------------------------------------------------
// Score Labels
// -------------------------------------------------------

function scoreLabel(
  score: number,
  confidence: number
): HealthLabel {
  if (confidence < 40) return "insufficient_data";
  if (score >= 75) return "strong";
  if (score >= 55) return "good";
  if (score >= 35) return "moderate";
  return "weak";
}

/**
 * Determine overall health of a product across all its channels.
 */
export function computeOverallHealth(
  scores: ChannelScore[]
): HealthLabel {
  if (scores.length === 0) return "insufficient_data";

  const validScores = scores.filter(
    (s) => s.label !== "insufficient_data"
  );
  if (validScores.length === 0) return "insufficient_data";

  // Confidence-weighted average so low-confidence channels don't skew results
  const totalWeight = validScores.reduce((sum, s) => sum + s.confidence, 0);
  const avgScore = totalWeight > 0
    ? validScores.reduce((sum, s) => sum + s.fitScore * s.confidence, 0) / totalWeight
    : validScores.reduce((sum, s) => sum + s.fitScore, 0) / validScores.length;

  if (avgScore >= 75) return "strong";
  if (avgScore >= 55) return "good";
  if (avgScore >= 35) return "moderate";
  return "weak";
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function getMinMax(values: number[]): { min: number; max: number } {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return { min: 0, max: 0 };
  return {
    min: Math.min(...finite),
    max: Math.max(...finite),
  };
}
