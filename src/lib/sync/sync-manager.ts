import { MarketplaceConnection } from "@prisma/client";
import prisma from "@/lib/prisma";
import { syncShopify } from "./shopify-sync";
import { syncEbay } from "./ebay-sync";
import { syncEtsy } from "./etsy-sync";
import { syncFlipkart } from "./flipkart-sync";
import { syncBigCommerce } from "./bigcommerce-sync";
import { syncSquare } from "./square-sync";
import { syncSnapDeal } from "./snapdeal-sync";
import { syncPrestaShop } from "./prestashop-sync";
import { SyncResult } from "./types";
import { bootstrapBeliefs, cleanupBootstrapForUser, BootstrapAlreadyClaimedError } from "../ai/birth/bootstrap";

/**
 * Sync a single marketplace connection to unified tables.
 */
export async function syncConnection(
  connection: MarketplaceConnection
): Promise<SyncResult> {
  switch (connection.marketplace) {
    case "SHOPIFY":
      return syncShopify(connection);
    case "EBAY":
      return syncEbay(connection);
    case "ETSY":
      return syncEtsy(connection);
    case "FLIPKART":
      return syncFlipkart(connection);
    case "BIGCOMMERCE":
      return syncBigCommerce(connection);
    case "SQUARE":
      return syncSquare(connection);
    case "SNAPDEAL":
      return syncSnapDeal(connection);
    case "PRESTASHOP":
      return syncPrestaShop(connection);
    default:
      return {
        ordersSynced: 0,
        productsSynced: 0,
        errors: [`Unsupported marketplace: ${connection.marketplace}`],
      };
  }
}

/**
 * Sync all connected marketplaces for a single user.
 * Errors are isolated per-connection — one failure doesn't block others.
 */
export async function syncAllForUser(
  userId: string
): Promise<Map<string, SyncResult>> {
  const connections = await prisma.marketplaceConnection.findMany({
    where: { userId, status: "CONNECTED" },
  });

  const results = new Map<string, SyncResult>();

  // Use connection.id as the Map key to avoid collisions
  // when a user has multiple connections to the same marketplace
  for (const connection of connections) {
    try {
      const result = await syncConnection(connection);
      results.set(connection.id, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(
        `Sync failed for ${connection.marketplace} (connection ${connection.id}, user ${userId}):`,
        message
      );
      results.set(connection.id, {
        ordersSynced: 0,
        productsSynced: 0,
        errors: [message],
      });
    }
  }

  return results;
}

/**
 * Sync all connected marketplaces across all users.
 * Processes a batch of connections sorted by oldest lastSyncAttemptAt first,
 * so failing connections are naturally backed off and don't monopolize the batch.
 * Designed for Vercel Cron — processes up to BATCH_SIZE connections per invocation.
 */
const BATCH_SIZE = 5;

export async function syncAllConnections(): Promise<void> {
  // Track which userIds have already been bootstrapped this run to avoid duplicates
  // (same user may have multiple connections with null lastSyncAt)
  const bootstrappedUserIds = new Set<string>();

  const connections = await prisma.marketplaceConnection.findMany({
    where: {
      status: "CONNECTED",
      marketplace: {
        in: [
          "SHOPIFY",
          "EBAY",
          "ETSY",
          "FLIPKART",
          "BIGCOMMERCE",
          "SQUARE",
          "SNAPDEAL",
          "PRESTASHOP",
        ],
      },
    },
    orderBy: { lastSyncAttemptAt: "asc" },
    take: BATCH_SIZE,
  });

  for (const connection of connections) {
    const attemptTimestamp = new Date();

    // Atomically claim this connection using conditional update (compare-and-set)
    // to prevent TOCTOU races where concurrent cron invocations sync the same connection.
    // Only proceeds if lastSyncAttemptAt hasn't changed since our read.
    let claimed: boolean;
    try {
      // Build where clause explicitly: when lastSyncAttemptAt is null,
      // Prisma generates IS NULL (SQL NULLs don't compare equal with =)
      const claimResult = await prisma.marketplaceConnection.updateMany({
        where: {
          id: connection.id,
          lastSyncAttemptAt: connection.lastSyncAttemptAt === null
            ? null
            : connection.lastSyncAttemptAt,
        },
        data: { lastSyncAttemptAt: attemptTimestamp },
      });
      claimed = claimResult.count === 1;
    } catch (updateError) {
      const updateMsg = updateError instanceof Error ? updateError.message : "Unknown error";
      console.error(
        `Failed to claim ${connection.marketplace} (${connection.id}): ${updateMsg}`
      );
      continue;
    }

    // Another instance already claimed this connection — skip
    if (!claimed) {
      console.log(
        `Skipping ${connection.marketplace} (${connection.id}): already claimed by another instance`
      );
      continue;
    }

    try {
      const result = await syncConnection(connection);
      console.log(
        `Synced ${connection.marketplace} for user ${connection.userId}: ` +
          `${result.ordersSynced} orders, ${result.productsSynced} products` +
          (result.errors.length > 0 ? `, errors: ${result.errors.join("; ")}` : "")
      );

      // Update lastSyncAt on success and bootstrap if user hasn't been bootstrapped yet
      // Check user's bootstrappedAt status instead of connection's lastSyncAt to support retry after bootstrap failure
      // Note: This is a non-transactional check — bootstrapBeliefs uses its own CAS on User.bootstrappedAt for safety
      let shouldAttemptBootstrap = false;
      if (!bootstrappedUserIds.has(connection.userId)) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: connection.userId },
            select: { bootstrappedAt: true },
          });
          shouldAttemptBootstrap = user !== null && user.bootstrappedAt === null;
        } catch (lookupErr) {
          // Don't let a failed bootstrap-status lookup prevent lastSyncAt update
          console.warn(
            `Bootstrap status lookup failed for user ${connection.userId}, skipping bootstrap:`,
            lookupErr instanceof Error ? lookupErr.message : String(lookupErr)
          );
          shouldAttemptBootstrap = false;
        }
      }

      if (shouldAttemptBootstrap) {
        // BOOTSTRAPPING CRASH-SAFETY NOTE:
        // bootstrapBeliefs atomically claims via CAS on User.bootstrappedAt.
        // We update lastSyncAt only after bootstrap succeeds to prevent marking
        // sync as successful when bootstrap actually failed.
        // NOTE: These operations are NOT wrapped in a single transaction because
        // bootstrapBeliefs uses the global prisma client and cannot participate
        // in a passed transaction context. Each operation has its own atomicity:
        // - bootstrapBeliefs: uses CAS on User.bootstrappedAt
        // - lastSyncAt update: single atomic write
        // A crash between them will leave bootstrap complete but lastSyncAt unset,
        // which is safe (next sync will skip bootstrap and just update lastSyncAt).

        // First connection for this user in this batch - attempt bootstrap
        bootstrappedUserIds.add(connection.userId);

        // Try bootstrap first (separate error handling from lastSyncAt update)
        try {
          // bootstrapBeliefs handles its own CAS on User.bootstrappedAt
          await bootstrapBeliefs(connection.userId);
        } catch (err) {
          // Distinguish CAS rejection (already claimed) from actual bootstrap errors
          if (err instanceof BootstrapAlreadyClaimedError) {
            // CAS rejection: another process already bootstrapped this user
            // No partial state to clean up, treat as idempotent success and proceed to update lastSyncAt
            console.log(`Bootstrap already completed for user ${connection.userId} by another process, skipping to lastSyncAt update`);
            // Fall through to lastSyncAt update (no continue here)
          } else {
            // Actual bootstrap error: clean up partial data and reset for retry
            console.error(
              `Bootstrap beliefs error for user ${connection.userId}:`,
              err
            );
            // Clean up partial bootstrap data before resetting bootstrappedAt to allow clean retry
            // FAIL-CLOSED: Only reset bootstrappedAt if cleanup succeeds to prevent partial data with null bootstrappedAt
            let cleanupSucceeded = false;
            let cleanupErrorMsg: string | undefined;
            try {
              await cleanupBootstrapForUser(connection.userId);
              cleanupSucceeded = true;
            } catch (cleanupErr) {
              cleanupErrorMsg = cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr);
            }

            if (!cleanupSucceeded) {
              // Cleanup failed - do NOT reset bootstrappedAt to fail closed
              // User remains in bootstrapped state with partial data, requires manual investigation
              console.error(
                `[CRITICAL] Bootstrap cleanup failed - not resetting bootstrappedAt to prevent partial data`,
                {
                  severity: "CRITICAL",
                  userId: connection.userId,
                  connectionId: connection.id,
                  marketplace: connection.marketplace,
                  originalBootstrapError: err instanceof Error ? err.message : String(err),
                  cleanupError: cleanupErrorMsg,
                  timestamp: new Date().toISOString(),
                  remediation: `Manual investigation required: 1) Inspect partial bootstrap data for user ${connection.userId}, 2) Clean up manually if needed, 3) Reset bootstrappedAt to NULL if safe to retry`,
                  actionRequired: "MANUAL_INVESTIGATION_REQUIRED",
                }
              );
              // Leave bootstrappedAt set and userId in bootstrappedUserIds to prevent retry with partial data
            } else {
              // Cleanup succeeded — reset bootstrappedAt so failed attempts can be retried on next run
              try {
                await prisma.user.updateMany({
                  where: { id: connection.userId, bootstrappedAt: { not: null } },
                  data: { bootstrappedAt: null },
                });
                // Remove from in-memory set so subsequent connections in this batch can retry
                bootstrappedUserIds.delete(connection.userId);
              } catch (resetErr) {
                // CRITICAL: Failed to reset bootstrappedAt after bootstrap failure - user is stuck
                // in "bootstrapped" state without actual bootstrap data, requires manual intervention
                const resetErrorMessage = resetErr instanceof Error ? resetErr.message : String(resetErr);
                console.error(
                  `[CRITICAL] Failed to reset bootstrappedAt after bootstrap failure - manual intervention required`,
                  {
                    severity: "CRITICAL",
                    userId: connection.userId,
                    connectionId: connection.id,
                    marketplace: connection.marketplace,
                    originalBootstrapError: err instanceof Error ? err.message : String(err),
                    resetError: resetErrorMessage,
                    timestamp: new Date().toISOString(),
                    remediation: `Manually run: UPDATE "User" SET "bootstrappedAt" = NULL WHERE id = $1 (parameterized query with userId=${connection.userId})`,
                    actionRequired: "MANUAL_INVESTIGATION_REQUIRED",
                  }
                );
              }
            }
            // Skip lastSyncAt update on bootstrap failure
            continue;
          }
          // If we reach here, CAS rejection occurred - fall through to lastSyncAt update
        }

        // Update lastSyncAt only after bootstrap completes successfully
        // Separate try-catch so bootstrap success isn't rolled back if lastSyncAt update fails
        try {
          await prisma.marketplaceConnection.update({
            where: { id: connection.id },
            data: { lastSyncAt: attemptTimestamp },
          });
        } catch (updateError) {
          const updateMsg = updateError instanceof Error ? updateError.message : "Unknown error";
          console.error(
            `Failed to update lastSyncAt for ${connection.marketplace} (${connection.id}) after successful bootstrap: ${updateMsg}`
          );
        }
      } else {
        // Not first sync, just update lastSyncAt
        try {
          await prisma.marketplaceConnection.update({
            where: { id: connection.id },
            data: { lastSyncAt: attemptTimestamp },
          });
        } catch (updateError) {
          const updateMsg = updateError instanceof Error ? updateError.message : "Unknown error";
          console.error(
            `Failed to update lastSyncAt for ${connection.marketplace} (${connection.id}): ${updateMsg}`
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(
        `Sync failed for ${connection.marketplace} (user ${connection.userId}):`,
        message
      );
      // lastSyncAttemptAt already set before sync — no duplicate update needed
    }
  }
}
