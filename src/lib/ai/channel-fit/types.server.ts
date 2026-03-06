// src/lib/ai/channel-fit/types.server.ts
// Server-only types containing user_id / PII fields.
//
// NOTE: This module exports only TypeScript interfaces (type-level constructs).
// Type-only imports (`import type { ... }`) are erased at compile time and do
// NOT trigger the "server-only" poison pill. The actual `import "server-only"`
// guard lives in the runtime modules that perform DB queries (benchmarks.ts,
// signals.ts) so the guard protects value exports that could leak to client bundles.
//
// Exported interfaces (all types-only):
//   Raw DB shapes:  RawCrossTenantRow, RawRecentSalesRow, RawProductMarketplaceRow, RawWeeklyBreakdownRow
//   Processed:      CrossTenantRow, RecentSalesRow, ProductMarketplaceRow, WeeklyBreakdownRow
//   Internal:       InternalClusterBenchmark

import type { Prisma } from "@prisma/client";
import type { ClusterBenchmark } from "./types";

/** Internal extension with k-anonymity field — never expose outside server-side code. */
export interface InternalClusterBenchmark extends ClusterBenchmark {
  _sellerCount: number;
}

// -------------------------------------------------------
// Raw DB Query Row Types (actual Prisma $queryRaw return shapes)
// Prisma $queryRaw returns bigint for COUNT/SUM(int) and Decimal for
// SUM(numeric)/AVG. Use these at the $queryRaw call site; coerce to
// processed types (below) via Number() at the mapping boundary.
// -------------------------------------------------------

/**
 * @internal Server-only — contains user_id for cross-tenant dedup; never expose to client bundles.
 * Raw shape as returned by Prisma $queryRaw. Coerce via Number() at the mapping boundary.
 */
export interface RawCrossTenantRow {
  marketplace: string;
  user_id: string;
  product_title: string;
  revenue: Prisma.Decimal;
  units_sold: bigint;
  /** SQL AVG()/CASE can return null when all unitPrice values are null. */
  avg_price: Prisma.Decimal | null;
}

/**
 * @internal Server-only — contains user_id; never expose to client bundles.
 * Raw shape as returned by Prisma $queryRaw. Coerce units_sold via Number() at the mapping boundary.
 */
export interface RawRecentSalesRow {
  marketplace: string;
  user_id: string;
  product_title: string;
  units_sold: bigint;
}

/** @internal Server-only — raw SQL row shape from Prisma $queryRaw; never expose to client bundles. */
export interface RawProductMarketplaceRow {
  product_key: string;
  title: string;
  marketplace: string;
  revenue: Prisma.Decimal;
  units_sold: bigint;
  order_count: bigint;
  avg_unit_price: Prisma.Decimal | null;
  first_sale: Date;
  last_sale: Date;
  returned_orders: bigint;
}

/** @internal Server-only — raw SQL row shape from Prisma $queryRaw; never expose to client bundles. */
export interface RawWeeklyBreakdownRow {
  product_key: string;
  marketplace: string;
  week_start: Date;
  units: bigint;
}

// -------------------------------------------------------
// Processed Row Types (after Number() coercion at mapping boundary)
// All numeric fields are plain `number` for ergonomic downstream usage.
// -------------------------------------------------------

/**
 * @internal Server-only — contains user_id for cross-tenant dedup; never expose to client bundles.
 * Post-coercion shape: all numeric fields are `number` after Number() conversion.
 */
export interface CrossTenantRow {
  marketplace: string;
  user_id: string;
  product_title: string;
  revenue: number;
  units_sold: number;
  /** SQL AVG() can return null when all unitPrice values are null. Coerced to 0 at mapping boundary. */
  avg_price: number | null;
}

/**
 * @internal Server-only — contains user_id; never expose to client bundles.
 * Post-coercion shape: units_sold is `number` after Number() conversion.
 */
export interface RecentSalesRow {
  marketplace: string;
  user_id: string;
  product_title: string;
  units_sold: number;
}

/** @internal Server-only — processed row after Number() coercion; never expose to client bundles. */
export interface ProductMarketplaceRow {
  product_key: string;
  title: string;
  marketplace: string;
  revenue: number;
  units_sold: number;
  order_count: number;
  avg_unit_price: number | null;
  first_sale: Date;
  last_sale: Date;
  returned_orders: number;
}

/** @internal Server-only — processed row after Number() coercion; never expose to client bundles. */
export interface WeeklyBreakdownRow {
  product_key: string;
  marketplace: string;
  week_start: Date;
  units: number;
}
