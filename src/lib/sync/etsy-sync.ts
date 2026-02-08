import { MarketplaceConnection } from "@prisma/client";
import prisma from "@/lib/prisma";
import { EtsyClient } from "@/lib/etsy/client";
import { getValidEtsyToken } from "@/lib/etsy/token-refresh";
import { mapEtsyOrderStatus, mapEtsyProductStatus, SyncResult } from "./types";

/**
 * Parse and validate the Etsy user ID from connection.externalId
 */
function parseEtsyUserId(externalId: string | null, context: string): number {
  if (!externalId) {
    throw new Error(`${context}: connection.externalId is missing`);
  }

  // Strict numeric check: entire string must be digits (no partial parses like "123abc")
  if (!/^\d+$/.test(externalId)) {
    throw new Error(
      `${context}: Invalid Etsy externalId "${externalId}" - must be a numeric string`
    );
  }

  const parsed = Number(externalId);

  // Guard against IDs that exceed Number.MAX_SAFE_INTEGER (precision loss)
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(
      `${context}: Etsy externalId "${externalId}" exceeds safe integer range`
    );
  }

  return parsed;
}

export async function syncEtsyOrders(
  connection: MarketplaceConnection
): Promise<number> {
  let synced = 0;
  let offset = 0;
  const limit = 100;

  const syncLog = await prisma.unifiedSyncLog.create({
    data: {
      connectionId: connection.id,
      marketplace: "ETSY",
      entity: "orders",
      status: "started",
      trigger: "cron",
    },
  });

  try {
    const accessToken = await getValidEtsyToken(connection.userId);
    const client = new EtsyClient(accessToken, false);

    // Validate and parse user ID
    const userId = parseEtsyUserId(connection.externalId, "syncEtsyOrders");
    const shop = await client.getShop(userId);
    if (!shop) {
      throw new Error(`Etsy shop not found for userId=${userId}`);
    }
    const lastSyncTimestamp = connection.lastSyncAt
      ? Math.floor(connection.lastSyncAt.getTime() / 1000)
      : 0;

    let hasMore = true;
    while (hasMore) {
      const result = await client.getReceipts(shop.shopId, { limit, offset, defaultCurrency: shop.currencyCode });

      // Track if we should stop pagination early
      let foundOlderReceipt = false;

      for (const receipt of result.results) {
        // Delta filter: prefer updateTimestamp for catching receipt updates,
        // fall back to createTimestamp if updateTimestamp is not available
        const receiptTimestamp = receipt.updateTimestamp ?? receipt.createTimestamp;

        // If we encounter a receipt older than lastSyncAt,
        // skip it and signal to stop pagination (assuming newest-first order)
        if (lastSyncTimestamp > 0 && receiptTimestamp < lastSyncTimestamp) {
          foundOlderReceipt = true;
          continue;
        }

        // Guard against division by zero
        const divisor = receipt.grandtotal.divisor || 1;
        const totalAmount = receipt.grandtotal.amount / divisor;

        // Upsert order and replace items atomically in a single transaction
        await prisma.$transaction(async (tx) => {
          const unifiedOrder = await tx.unifiedOrder.upsert({
            where: {
              connectionId_externalOrderId: {
                connectionId: connection.id,
                externalOrderId: String(receipt.receiptId),
              },
            },
            create: {
              userId: connection.userId,
              marketplace: "ETSY",
              connectionId: connection.id,
              externalOrderId: String(receipt.receiptId),
              status: mapEtsyOrderStatus(receipt.status),
              currency: receipt.grandtotal.currency_code,
              totalAmount,
              itemCount: receipt.transactions?.length ?? 0,
              customerEmail: receipt.buyerEmail || null,
              orderedAt: new Date(receipt.createTimestamp * 1000),
            },
            update: {
              status: mapEtsyOrderStatus(receipt.status),
              totalAmount,
              itemCount: receipt.transactions?.length ?? 0,
              syncedAt: new Date(),
            },
          });

          if (receipt.transactions?.length) {
            await tx.unifiedOrderItem.deleteMany({
              where: { orderId: unifiedOrder.id },
            });

            await tx.unifiedOrderItem.createMany({
              data: receipt.transactions.map((txn) => {
                // Guard against division by zero
                const txnDivisor = txn.price.divisor || 1;
                const unitPrice = txn.price.amount / txnDivisor;
                // Use safe quantity for both stored value and calculation to keep data consistent
                const safeQuantity = txn.quantity > 0 ? txn.quantity : 1;
                if (txn.quantity <= 0) {
                  console.warn(
                    `Etsy sync: Transaction ${txn.transactionId} has invalid quantity ${txn.quantity} in receipt ${receipt.receiptId}, using 1`
                  );
                }
                return {
                  orderId: unifiedOrder.id,
                  externalItemId: String(txn.transactionId),
                  title: txn.title,
                  sku: txn.sku || null,
                  quantity: safeQuantity,
                  unitPrice,
                  totalPrice: unitPrice * safeQuantity,
                  currency: txn.price.currency_code,
                };
              }),
            });
          }
        });

        synced++;
      }

      // Stop pagination early if we found older receipts (API returns newest-first)
      if (foundOlderReceipt) {
        hasMore = false;
      } else {
        offset += limit;
        hasMore = result.results.length === limit;
      }
    }

    await prisma.unifiedSyncLog.update({
      where: { id: syncLog.id },
      data: { status: "completed", syncedCount: synced, completedAt: new Date() },
    });

    return synced;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    try {
      await prisma.unifiedSyncLog.update({
        where: { id: syncLog.id },
        data: { status: "failed", errorMessage: message, completedAt: new Date() },
      });
    } catch (logUpdateError) {
      const logMsg = logUpdateError instanceof Error ? logUpdateError.message : "Unknown error";
      console.error(`Etsy syncOrders: Failed to update sync log ${syncLog.id}: ${logMsg}`);
    }
    throw error;
  }
}

export async function syncEtsyProducts(
  connection: MarketplaceConnection
): Promise<number> {
  let synced = 0;
  let offset = 0;
  const limit = 100;

  const syncLog = await prisma.unifiedSyncLog.create({
    data: {
      connectionId: connection.id,
      marketplace: "ETSY",
      entity: "products",
      status: "started",
      trigger: "cron",
    },
  });

  try {
    const accessToken = await getValidEtsyToken(connection.userId);
    const client = new EtsyClient(accessToken, false);

    // Validate and parse user ID
    const userId = parseEtsyUserId(connection.externalId, "syncEtsyProducts");
    const shop = await client.getShop(userId);
    if (!shop) {
      throw new Error(`Etsy shop not found for userId=${userId}`);
    }
    let hasMore = true;
    while (hasMore) {
      const result = await client.getListings(shop.shopId, { limit, offset, defaultCurrency: shop.currencyCode });

      for (const listing of result.results) {
        // Guard against division by zero
        const priceDivisor = listing.price.divisor || 1;
        const price = listing.price.amount / priceDivisor;

        await prisma.unifiedProduct.upsert({
          where: {
            connectionId_externalId: {
              connectionId: connection.id,
              externalId: String(listing.listingId),
            },
          },
          create: {
            userId: connection.userId,
            marketplace: "ETSY",
            connectionId: connection.id,
            externalId: String(listing.listingId),
            title: listing.title,
            price,
            currency: listing.price.currency_code,
            inventory: listing.quantity,
            status: mapEtsyProductStatus(listing.state),
          },
          update: {
            title: listing.title,
            price,
            inventory: listing.quantity,
            status: mapEtsyProductStatus(listing.state),
            syncedAt: new Date(),
          },
        });

        synced++;
      }

      offset += limit;
      hasMore = result.results.length === limit;
    }

    await prisma.unifiedSyncLog.update({
      where: { id: syncLog.id },
      data: { status: "completed", syncedCount: synced, completedAt: new Date() },
    });

    return synced;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    try {
      await prisma.unifiedSyncLog.update({
        where: { id: syncLog.id },
        data: { status: "failed", errorMessage: message, completedAt: new Date() },
      });
    } catch (logUpdateError) {
      const logMsg = logUpdateError instanceof Error ? logUpdateError.message : "Unknown error";
      console.error(`Etsy syncProducts: Failed to update sync log ${syncLog.id}: ${logMsg}`);
    }
    throw error;
  }
}

export async function syncEtsy(
  connection: MarketplaceConnection
): Promise<SyncResult> {
  const errors: string[] = [];
  let ordersSynced = 0;
  let productsSynced = 0;
  let ordersSucceeded = false;
  let productsSucceeded = false;

  try {
    ordersSynced = await syncEtsyOrders(connection);
    ordersSucceeded = true;
  } catch (error) {
    errors.push(`Orders: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  try {
    productsSynced = await syncEtsyProducts(connection);
    productsSucceeded = true;
  } catch (error) {
    errors.push(`Products: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  // Only update lastSyncAt when both syncs succeed to avoid skipping
  // partially-failed records on subsequent syncs
  if (ordersSucceeded && productsSucceeded) {
    await prisma.marketplaceConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });
  }

  return { ordersSynced, productsSynced, errors };
}
