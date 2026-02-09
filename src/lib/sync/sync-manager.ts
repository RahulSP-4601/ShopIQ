import { MarketplaceConnection } from "@prisma/client";
import prisma from "@/lib/prisma";
import { syncShopify } from "./shopify-sync";
import { syncEbay } from "./ebay-sync";
import { syncEtsy } from "./etsy-sync";
import { syncFlipkart } from "./flipkart-sync";
import { syncBigCommerce } from "./bigcommerce-sync";
import { syncSquare } from "./square-sync";
import { syncSnapDeal } from "./snapdeal-sync";
import { SyncResult } from "./types";

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

      // Update lastSyncAt on success (lastSyncAttemptAt already set above)
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
