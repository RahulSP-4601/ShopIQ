/**
 * Square Sync Service
 *
 * Syncs orders and catalog items from Square to unified tables.
 * Square has webhooks for real-time updates, but this service
 * handles initial sync and periodic reconciliation.
 */

import prisma from "@/lib/prisma";
import { MarketplaceConnection, Prisma } from "@prisma/client";
import { SquareClient } from "@/lib/square/client";
import { getValidSquareToken } from "@/lib/square/token-refresh";
import { SyncResult, mapSquareOrderStatus, mapSquareCatalogStatus } from "./types";
import { sanitizeMarketplaceResponse } from "./sanitize";

// Helper to convert typed object to Prisma Json
function toJson<T>(data: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue;
}

// Maximum batch size for Square API calls
const BATCH_SIZE = 100;

/**
 * Split array into chunks of specified size
 */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Sync Square orders to UnifiedOrder table
 */
export async function syncSquareOrders(
  connection: MarketplaceConnection
): Promise<number> {
  if (!connection.accessToken) {
    throw new Error("Square connection missing access token");
  }

  // Get valid token (auto-refreshes if needed)
  const accessToken = await getValidSquareToken(connection.userId);
  const client = new SquareClient(accessToken, false);

  // Get locations and filter out any with null/undefined IDs
  const locations = await client.listLocations();
  const locationIds = locations
    .map((l) => l.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  const storeCurrency = locations[0]?.currency || "USD";

  if (locationIds.length === 0) {
    throw new Error("No Square locations found");
  }

  let synced = 0;
  let cursor: string | undefined;

  // Create sync log
  const syncLog = await prisma.unifiedSyncLog.create({
    data: {
      connectionId: connection.id,
      marketplace: "SQUARE",
      entity: "orders",
      status: "started",
      trigger: "cron",
    },
  });

  try {
    do {
      const result = await client.searchOrders({
        location_ids: locationIds,
        cursor,
        limit: 50,
        start_at: connection.lastSyncAt?.toISOString(),
      });

      // Guard against undefined orders array
      const orders = result.orders || [];
      for (const order of orders) {
        // Get customer info from fulfillment if available
        const fulfillment = order.fulfillments?.[0];
        const recipient =
          fulfillment?.pickup_details?.recipient ||
          fulfillment?.shipment_details?.recipient;

        const customerName = recipient?.display_name || null;
        const customerEmail = recipient?.email_address || null;

        // Calculate total in dollars (Square uses cents)
        const totalAmount = (order.total_money?.amount || 0) / 100;

        // Validate order.id before using it
        if (!order.id) {
          console.warn("Square sync: Order missing id, skipping");
          continue;
        }

        // Upsert order and replace items atomically in a single transaction
        const lineItems = order.line_items;
        await prisma.$transaction(async (tx) => {
          const unifiedOrder = await tx.unifiedOrder.upsert({
            where: {
              connectionId_externalOrderId: {
                connectionId: connection.id,
                externalOrderId: order.id,
              },
            },
            create: {
              userId: connection.userId,
              marketplace: "SQUARE",
              connectionId: connection.id,
              externalOrderId: order.id,
              status: mapSquareOrderStatus(order.state),
              currency: order.total_money?.currency || storeCurrency,
              totalAmount,
              itemCount: order.line_items?.length || 0,
              customerName,
              customerEmail,
              orderedAt: order.created_at && !isNaN(Date.parse(order.created_at)) ? new Date(order.created_at) : new Date(),
              fulfilledAt: order.closed_at ? new Date(order.closed_at) : null,
              rawData: toJson(sanitizeMarketplaceResponse(order)),
            },
            update: {
              status: mapSquareOrderStatus(order.state),
              totalAmount,
              itemCount: order.line_items?.length || 0,
              customerName,
              customerEmail,
              fulfilledAt: order.closed_at ? new Date(order.closed_at) : null,
              rawData: toJson(sanitizeMarketplaceResponse(order)),
              syncedAt: new Date(),
            },
          });

          await tx.unifiedOrderItem.deleteMany({
            where: { orderId: unifiedOrder.id },
          });

          if (lineItems && lineItems.length > 0) {
            await tx.unifiedOrderItem.createMany({
              data: lineItems.map((item) => {
                // Safe parseInt with fallback
                const quantity = parseInt(item.quantity, 10);
                const safeQuantity = Number.isNaN(quantity) || quantity <= 0 ? 1 : quantity;
                return {
                  orderId: unifiedOrder.id,
                  externalItemId: item.uid,
                  title: item.name,
                  sku: item.catalog_object_id || null,
                  quantity: safeQuantity,
                  unitPrice: (item.base_price_money?.amount || 0) / 100,
                  totalPrice: (item.total_money?.amount || 0) / 100,
                  currency: item.total_money?.currency || storeCurrency,
                };
              }),
            });
          }
        });

        synced++;
      }

      cursor = result.cursor;
    } while (cursor);

    // Update sync log
    await prisma.unifiedSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "completed",
        syncedCount: synced,
        completedAt: new Date(),
      },
    });

    return synced;
  } catch (error) {
    // Update sync log with error — wrap in its own try/catch
    // to prevent a DB error from swallowing the original error
    try {
      await prisma.unifiedSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        },
      });
    } catch (logUpdateError) {
      const logMsg = logUpdateError instanceof Error ? logUpdateError.message : "Unknown error";
      console.error(`Square order sync: Failed to update sync log ${syncLog.id}: ${logMsg}`);
    }
    throw error;
  }
}

/**
 * Sync Square catalog to UnifiedProduct table
 */
export async function syncSquareProducts(
  connection: MarketplaceConnection
): Promise<number> {
  if (!connection.accessToken) {
    throw new Error("Square connection missing access token");
  }

  // Get valid token (auto-refreshes if needed)
  const accessToken = await getValidSquareToken(connection.userId);
  const client = new SquareClient(accessToken, false);

  // Get locations for inventory and currency, filter out null/undefined IDs
  const locations = await client.listLocations();
  const locationIds = locations
    .map((l) => l.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  const storeCurrency = locations[0]?.currency || "USD";

  let synced = 0;
  let cursor: string | undefined;

  // Accumulate image and inventory data across all pages
  const imageMap = new Map<string, { image_data?: { url?: string } }>();
  const inventoryMap = new Map<string, number>();

  // Create sync log
  const syncLog = await prisma.unifiedSyncLog.create({
    data: {
      connectionId: connection.id,
      marketplace: "SQUARE",
      entity: "products",
      status: "started",
      trigger: "cron",
    },
  });

  try {
    do {
      const result = await client.listCatalog({
        cursor,
        types: ["ITEM"],
      });

      // Guard against null/undefined objects array
      const objects = result.objects || [];

      // Collect image IDs for this page
      const pageImageIds: string[] = [];
      for (const obj of objects) {
        if (obj.item_data?.image_ids) {
          pageImageIds.push(...obj.item_data.image_ids);
        }
      }

      // Batch retrieve images in chunks of BATCH_SIZE
      if (pageImageIds.length > 0) {
        const imageChunks = chunk(pageImageIds, BATCH_SIZE);
        for (const imageChunk of imageChunks) {
          const images = await client.batchRetrieveCatalogObjects(imageChunk);
          for (const img of images) {
            imageMap.set(img.id, img);
          }
        }
      }

      // Collect variation IDs for this page, filtering out null/undefined IDs
      const pageVariationIds: string[] = [];
      for (const obj of objects) {
        if (obj.item_data?.variations) {
          for (const v of obj.item_data.variations) {
            if (v.id && typeof v.id === "string") {
              pageVariationIds.push(v.id);
            }
          }
        }
      }

      // Batch retrieve inventory counts in chunks of BATCH_SIZE
      if (pageVariationIds.length > 0 && locationIds.length > 0) {
        const variationChunks = chunk(pageVariationIds, BATCH_SIZE);
        for (const variationChunk of variationChunks) {
          const inventoryCounts = await client.batchRetrieveInventoryCounts(
            variationChunk,
            locationIds
          );
          // Accumulate inventory counts (same variation may appear across locations)
          for (const count of inventoryCounts) {
            if (!count.catalog_object_id) continue;
            const existingQty = inventoryMap.get(count.catalog_object_id) || 0;
            // Safe parseInt with fallback to 0 for invalid values
            const qty = parseInt(count.quantity, 10);
            const safeQty = Number.isNaN(qty) ? 0 : qty;
            inventoryMap.set(count.catalog_object_id, existingQty + safeQty);
          }
        }
      }

      for (const obj of objects) {
        if (obj.type !== "ITEM" || !obj.item_data) continue;

        // Validate obj.id before using it
        if (!obj.id) {
          console.warn("Square sync: Catalog object missing id, skipping");
          continue;
        }

        const item = obj.item_data;
        const firstVariation = item.variations?.[0]?.item_variation_data;
        const price = firstVariation?.price_money?.amount
          ? firstVariation.price_money.amount / 100
          : 0;

        // Get image URL
        const imageId = item.image_ids?.[0];
        const imageObj = imageId ? imageMap.get(imageId) : undefined;
        const imageUrl = imageObj?.image_data?.url || null;

        // Get inventory (sum across all variations and locations)
        let totalInventory = 0;
        if (item.variations) {
          for (const variation of item.variations) {
            if (variation.id) {
              totalInventory += inventoryMap.get(variation.id) || 0;
            }
          }
        }

        await prisma.unifiedProduct.upsert({
          where: {
            connectionId_externalId: {
              connectionId: connection.id,
              externalId: obj.id,
            },
          },
          create: {
            userId: connection.userId,
            marketplace: "SQUARE",
            connectionId: connection.id,
            externalId: obj.id,
            title: item.name,
            sku: firstVariation?.sku || null,
            category: item.category_id || null,
            price,
            currency: firstVariation?.price_money?.currency || storeCurrency,
            inventory: totalInventory,
            status: mapSquareCatalogStatus(obj.is_deleted, totalInventory),
            imageUrl,
            rawData: toJson(sanitizeMarketplaceResponse(obj)),
          },
          update: {
            title: item.name,
            sku: firstVariation?.sku || null,
            category: item.category_id || null,
            price,
            inventory: totalInventory,
            status: mapSquareCatalogStatus(obj.is_deleted, totalInventory),
            imageUrl,
            rawData: toJson(sanitizeMarketplaceResponse(obj)),
            syncedAt: new Date(),
          },
        });

        synced++;
      }

      cursor = result.cursor;
    } while (cursor);

    // Update sync log
    await prisma.unifiedSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "completed",
        syncedCount: synced,
        completedAt: new Date(),
      },
    });

    return synced;
  } catch (error) {
    // Update sync log with error — wrap in its own try/catch
    // to prevent a DB error from swallowing the original error
    try {
      await prisma.unifiedSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        },
      });
    } catch (logUpdateError) {
      const logMsg = logUpdateError instanceof Error ? logUpdateError.message : "Unknown error";
      console.error(`Square product sync: Failed to update sync log ${syncLog.id}: ${logMsg}`);
    }
    throw error;
  }
}

/**
 * Main sync function for Square
 */
export async function syncSquare(
  connection: MarketplaceConnection
): Promise<SyncResult> {
  // Capture sync start time BEFORE fetching data — use this for lastSyncAt
  // so records created during the sync run aren't missed on the next cycle
  const syncStart = new Date();

  const errors: string[] = [];
  let ordersSynced = 0;
  let productsSynced = 0;
  let ordersSucceeded = false;
  let productsSucceeded = false;

  try {
    ordersSynced = await syncSquareOrders(connection);
    ordersSucceeded = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    errors.push(`Orders: ${message}`);
    console.error("Square orders sync error:", error);
  }

  try {
    productsSynced = await syncSquareProducts(connection);
    productsSucceeded = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    errors.push(`Products: ${message}`);
    console.error("Square products sync error:", error);
  }

  // Only update lastSyncAt when BOTH syncs succeed to avoid advancing
  // the sync window past records that failed to sync
  if (ordersSucceeded && productsSucceeded) {
    try {
      await prisma.marketplaceConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: syncStart },
      });
    } catch (updateError) {
      const msg = updateError instanceof Error ? updateError.message : "Unknown error";
      console.error(`Failed to update lastSyncAt for Square connection ${connection.id}: ${msg}`);
      errors.push(`lastSyncAt update: ${msg}`);
    }
  }

  return { ordersSynced, productsSynced, errors };
}
