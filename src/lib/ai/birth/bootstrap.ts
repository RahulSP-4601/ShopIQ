import prisma from "@/lib/prisma";
import { upsertBelief } from "../memory/beliefs";
import { createNote } from "../memory/notes";
import { snapshotMaturity } from "../memory/maturity";
import { getIndustryPack } from "./industry-packs";
import type { IndustryType } from "@prisma/client";

// -------------------------------------------------------
// Custom Error: Bootstrap Already Claimed
// -------------------------------------------------------

/**
 * Thrown when bootstrapBeliefs CAS claim fails (another process already set bootstrappedAt).
 * This is NOT a failure - it's normal concurrent behavior.
 * Callers should catch this and skip cleanup/reset, treating it as idempotent success.
 */
export class BootstrapAlreadyClaimedError extends Error {
  constructor(userId: string, bootstrappedAt: Date | null) {
    super(`Bootstrap already claimed for user ${userId} at ${bootstrappedAt?.toISOString() || "unknown"}`);
    this.name = "BootstrapAlreadyClaimedError";
  }
}

// -------------------------------------------------------
// Industry Display Names
// -------------------------------------------------------

const INDUSTRY_LABELS: Record<string, string> = {
  FASHION: "Fashion",
  ELECTRONICS: "Electronics",
  HOME_GARDEN: "Home & Garden",
  FOOD_BEVERAGE: "Food & Beverage",
  HEALTH_BEAUTY: "Health & Beauty",
  SPORTS_OUTDOOR: "Sports & Outdoor",
  TOYS_GAMES: "Toys & Games",
  BOOKS_MEDIA: "Books & Media",
  AUTOMOTIVE: "Automotive",
  JEWELRY: "Jewelry",
  HANDMADE_CRAFT: "Handmade & Craft",
  PET_SUPPLIES: "Pet Supplies",
  OTHER: "General Retail",
};

// -------------------------------------------------------
// Bootstrap Cleanup (for failed bootstrap retry)
// -------------------------------------------------------

/**
 * Clean up partial bootstrap data to allow clean retry after failure.
 *
 * WARNING: This performs a FULL RESET of user's AI state:
 * - Deletes ALL beliefs (not just bootstrap ones) because beliefs don't have a source field
 * - Deletes all system notes (bootstrap creates a system welcome note)
 * - Deletes all maturity snapshots (bootstrap creates initial snapshot)
 *
 * TODO: Add source/origin field to Belief model to enable selective deletion of only
 * bootstrap beliefs, preventing loss of user-learned beliefs during retry.
 *
 * Idempotent - safe to call even if no data exists.
 */
export async function cleanupBootstrapForUser(userId: string): Promise<void> {
  try {
    // Use transaction to ensure atomic deletion (all or nothing)
    await prisma.$transaction([
      // Delete all beliefs (FULL RESET - no source field to distinguish bootstrap beliefs)
      prisma.belief.deleteMany({ where: { userId } }),
      // Delete all notes with source="system" (bootstrap creates a system welcome note)
      prisma.note.deleteMany({ where: { userId, source: "system" } }),
      // Delete maturity snapshots (bootstrap creates initial snapshot)
      prisma.maturitySnapshot.deleteMany({ where: { userId } }),
    ]);
    console.log(`Bootstrap cleanup completed for user ${userId}`);
  } catch (error) {
    console.error(`Bootstrap cleanup error for user ${userId}:`, error);
    throw error;
  }
}

// -------------------------------------------------------
// Bootstrap Beliefs (Cold Start)
// -------------------------------------------------------

/**
 * Bootstrap initial beliefs for a user after their first marketplace sync.
 * Idempotent — safe to call multiple times (uses upsertBelief).
 *
 * Flow:
 * 1. Read BusinessProfile → get industry
 * 2. Load industry pack → create beliefs
 * 3. Analyze first-sync data → create data-derived beliefs
 * 4. Create welcome note
 * 5. Snapshot maturity (captures initial state)
 */
export async function bootstrapBeliefs(userId: string): Promise<void> {
  // Declared outside try so it's accessible in catch for CAS-safe rollback
  let claimedAt: Date | null = null;
  try {
    // Atomic idempotency guard: attempt to claim bootstrap work using CAS on User.bootstrappedAt
    // Only the first concurrent call will succeed; others will see count=0 and skip
    // This makes bootstrapBeliefs independently idempotent regardless of caller's transaction
    claimedAt = new Date();
    const claimResult = await prisma.user.updateMany({
      where: { id: userId, bootstrappedAt: null },
      data: { bootstrappedAt: claimedAt },
    });

    if (claimResult.count === 0) {
      // Disambiguate: updateMany with count=0 means either bootstrappedAt was not null (already bootstrapped)
      // or userId doesn't exist. Check which case to provide accurate logging.
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { bootstrappedAt: true },
      });

      if (!user) {
        console.log(`Bootstrap skipped for user ${userId}: user not found`);
        return;
      } else {
        // CAS rejection: another process already claimed bootstrap
        // Throw distinct error so caller can skip cleanup (no partial state to clean)
        console.log(`Bootstrap skipped for user ${userId}: already bootstrapped at ${user.bootstrappedAt?.toISOString()}`);
        throw new BootstrapAlreadyClaimedError(userId, user.bootstrappedAt);
      }
    }

    // 1. Read BusinessProfile
    const profile = await prisma.businessProfile.findUnique({
      where: { userId },
    });

    // Determine industry (fall back to OTHER if no profile)
    const industry: IndustryType = profile?.industry ?? "OTHER";
    const pack = getIndustryPack(industry);

    // 2. Seed industry pack beliefs (idempotent)
    for (const belief of pack.beliefs) {
      await upsertBelief(userId, belief.statement, belief.contextKey, {
        strength: belief.strength,
      });
    }

    // 3. Analyze first-sync data for data-derived beliefs
    await createDataDerivedBeliefs(userId, profile);

    // 4. Create welcome note
    const industryLabel = INDUSTRY_LABELS[industry] || "General Retail";
    await createNote(
      userId,
      `I've learned about your ${industryLabel} business and set up initial knowledge. ` +
        `As we work together, I'll refine my understanding based on your actual data and feedback. ` +
        `Try asking me about your revenue, top products, or inventory status!`,
      48, // TTL: 48 hours
      0.7, // High priority so it surfaces in first chat
      "system"
    );

    // 5. Snapshot initial maturity state
    await snapshotMaturity(userId);
  } catch (error) {
    // CAS rejection means another process already owns bootstrap — re-throw immediately
    // without resetting bootstrappedAt (that would clear the other process's claim)
    if (error instanceof BootstrapAlreadyClaimedError) {
      throw error;
    }

    console.error("Bootstrap beliefs error:", error);
    // Reset bootstrappedAt to allow retry using CAS — only clear the exact claim THIS process set
    // to avoid accidentally clearing a later process's successful claim
    if (claimedAt) {
      try {
        await prisma.user.updateMany({
          where: { id: userId, bootstrappedAt: claimedAt },
          data: { bootstrappedAt: null },
        });
        console.log(`Reset bootstrappedAt for user ${userId} after bootstrap failure`);
      } catch (resetError) {
        console.error(`Failed to reset bootstrappedAt for user ${userId}:`, resetError);
      }
    }
    // Re-throw to signal failure to caller
    throw error;
  }
}

// -------------------------------------------------------
// Currency Conversion (Exchange Rates)
// -------------------------------------------------------

// Module-scoped timestamp to rate-limit stale FX rate warnings (max once per 24h)
let lastStaleFxWarnTs = 0;

/**
 * Get currency multipliers for AOV thresholds.
 * Returns conversion factors relative to USD baseline (high_aov > $5000, low_aov < $500).
 *
 * TODO: Replace hardcoded rates with live API or periodic background job.
 * Current rates are approximate and will become stale over time.
 * Consider fetching from:
 * - External API (e.g., exchangerate-api.com, openexchangerates.org)
 * - Cached DB table updated by cron (with last_updated timestamp)
 * - Environment variables for manual refresh
 *
 * @returns Record of currency codes to USD conversion multipliers
 */
function getCurrencyMultipliers(): Record<string, number> {
  // Static fallback rates (updated: 2026-02-13, approximate)
  // IMMEDIATE PATCH: Updated rates to current values, but still requires live fetching for production
  const LAST_UPDATED = "2026-02-13";
  const STALENESS_THRESHOLD_DAYS = 90;

  // Emit warning if rates are stale (rate-limited to once per 24 hours)
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(LAST_UPDATED).getTime()) / (1000 * 60 * 60 * 24)
  );
  const shouldWarn =
    daysSinceUpdate > STALENESS_THRESHOLD_DAYS &&
    Date.now() - lastStaleFxWarnTs > 24 * 60 * 60 * 1000;

  if (shouldWarn) {
    console.warn(
      `[STALE_FX_RATES] Currency rates are ${daysSinceUpdate} days old (last updated: ${LAST_UPDATED}). ` +
      `AOV thresholds may be inaccurate. Implement live rate fetching or update static rates.`
    );
    lastStaleFxWarnTs = Date.now();
  }

  return {
    USD: 1.0,
    EUR: 0.93, // Updated from 0.92
    GBP: 0.80, // Updated from 0.79
    INR: 84.5, // Updated from 83.0
    JPY: 150.0, // Updated from 148.0
    AUD: 1.54, // Updated from 1.52
    CAD: 1.38, // Updated from 1.36
    // Add more as needed
  };
}

// -------------------------------------------------------
// Data-Derived Beliefs (from first sync data)
// -------------------------------------------------------

async function createDataDerivedBeliefs(
  userId: string,
  profile: Awaited<ReturnType<typeof prisma.businessProfile.findUnique>>
): Promise<void> {
  const [productCount, orderCount, connectionCount, lowStockCount, avgOrderResult] =
    await Promise.all([
      prisma.unifiedProduct.count({ where: { userId } }),
      prisma.unifiedOrder.count({ where: { userId } }),
      prisma.marketplaceConnection.count({
        where: { userId, status: "CONNECTED" },
      }),
      prisma.unifiedProduct.count({
        where: { userId, inventory: { lt: 10 } },
      }),
      prisma.unifiedOrder.aggregate({
        where: { userId },
        _avg: { totalAmount: true },
      }),
    ]);

  // Large catalog
  if (productCount > 50) {
    await upsertBelief(userId, "large_catalog", "*", { strength: 0.55 });
  }

  // Established seller (has order history)
  if (orderCount > 100) {
    await upsertBelief(userId, "established_seller", "*", { strength: 0.55 });
  }

  // Multi-channel seller
  if (connectionCount > 1) {
    await upsertBelief(userId, "multi_channel_seller", "*", { strength: 0.55 });
  }

  // Inventory management needed
  if (lowStockCount > 0) {
    await upsertBelief(userId, "inventory_management_needed", "*", {
      strength: 0.60,
    });
  }

  // AOV-based belief with currency-aware thresholds
  // Distinguish null/undefined (no data) from legitimate 0 average
  if (avgOrderResult._avg?.totalAmount != null) {
    const avgOrderValue = Number(avgOrderResult._avg.totalAmount);

    // Get user's currency from profile or most recent order
    let currency = profile?.currency;
    if (!currency) {
      // Fallback: detect from latest order if profile has no currency set
      const latestOrder = await prisma.unifiedOrder.findFirst({
        where: { userId },
        select: { currency: true },
        orderBy: { createdAt: "desc" },
      });
      currency = latestOrder?.currency || "USD";
    }

    // Get currency multipliers (with fallback to static rates)
    const currencyMultipliers = getCurrencyMultipliers();
    const multiplier = currencyMultipliers[currency];
    if (!multiplier) {
      console.warn(
        `Bootstrap beliefs: Currency multiplier not found for ${currency}, ` +
        `falling back to 1.0 (USD baseline). Add this currency to getCurrencyMultipliers() for accurate AOV thresholds.`
      );
    }
    const highAovThreshold = 5000 * (multiplier || 1.0);
    const lowAovThreshold = 500 * (multiplier || 1.0);

    if (avgOrderValue > highAovThreshold) {
      await upsertBelief(userId, "high_aov_business", "*", { strength: 0.55 });
    } else if (avgOrderValue < lowAovThreshold) {
      // Only set high_volume_low_aov if both AOV is low AND order volume is high
      const minHighVolumeOrders = 100; // Threshold for "high volume"
      if (orderCount >= minHighVolumeOrders) {
        await upsertBelief(userId, "high_volume_low_aov", "*", { strength: 0.55 });
      }
    }
  }
}
