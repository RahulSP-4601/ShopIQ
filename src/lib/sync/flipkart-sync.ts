import { MarketplaceConnection } from "@prisma/client";
import prisma from "@/lib/prisma";
import { FlipkartClient } from "@/lib/flipkart/client";
import { getValidFlipkartToken } from "@/lib/flipkart/token-refresh";
import { mapFlipkartOrderStatus, SyncResult } from "./types";

// Maximum pages to fetch to prevent infinite loops
const MAX_PAGES = 100;

export async function syncFlipkartOrders(
  connection: MarketplaceConnection,
  trigger: "cron" | "manual" | "webhook" = "cron"
): Promise<number> {
  const accessToken = await getValidFlipkartToken(connection.userId);
  const client = new FlipkartClient(accessToken, false);
  let synced = 0;

  const syncLog = await prisma.unifiedSyncLog.create({
    data: {
      connectionId: connection.id,
      marketplace: "FLIPKART",
      entity: "orders",
      status: "started",
      trigger,
    },
  });

  try {
    const result = await client.getShipments({
      createdAfter: connection.lastSyncAt?.toISOString(),
    });

    const shipments = result?.shipments ?? [];
    for (const shipment of shipments) {
      // Skip shipments with missing or invalid orderDate to avoid epoch-dated records
      const orderDateStr = shipment.orderDate;
      if (!orderDateStr) {
        console.error(
          `Flipkart sync: Missing orderDate for shipment ${shipment.orderId} [connectionId=${connection.id}], skipping`
        );
        continue;
      }
      const orderedAt = new Date(orderDateStr);
      if (isNaN(orderedAt.getTime())) {
        console.error(
          `Flipkart sync: Invalid orderDate "${orderDateStr}" for shipment ${shipment.orderId} [connectionId=${connection.id}], skipping`
        );
        continue;
      }

      // Calculate total from order items (guard against undefined orderItems)
      const orderItems = shipment.orderItems ?? [];
      const totalAmount = orderItems.reduce(
        (sum, item) => sum + (item.priceComponents?.sellingPrice ?? 0),
        0
      );

      // Upsert order and replace items atomically in a single transaction
      await prisma.$transaction(async (tx) => {
        const unifiedOrder = await tx.unifiedOrder.upsert({
          where: {
            connectionId_externalOrderId: {
              connectionId: connection.id,
              externalOrderId: shipment.orderId,
            },
          },
          create: {
            userId: connection.userId,
            marketplace: "FLIPKART",
            connectionId: connection.id,
            externalOrderId: shipment.orderId,
            status: mapFlipkartOrderStatus(shipment.status ?? "PENDING"),
            currency: "INR",
            totalAmount,
            itemCount: orderItems.length,
            orderedAt,
          },
          update: {
            status: mapFlipkartOrderStatus(shipment.status ?? "PENDING"),
            totalAmount,
            itemCount: orderItems.length,
            syncedAt: new Date(),
          },
        });

        await tx.unifiedOrderItem.deleteMany({
          where: { orderId: unifiedOrder.id },
        });

        if (orderItems.length > 0) {
          await tx.unifiedOrderItem.createMany({
            data: orderItems.map((item) => {
              // Ensure quantity is positive, default to 1 if invalid
              if (item.quantity <= 0) {
                console.warn(
                  `Flipkart sync: Invalid quantity ${item.quantity} for item ${item.orderItemId} in shipment ${shipment.orderId} [connectionId=${connection.id}], defaulting to 1`
                );
              }
              const safeQuantity = item.quantity > 0 ? item.quantity : 1;
              const sellingPrice = item.priceComponents?.sellingPrice ?? 0;
              const unitPrice = Math.round((sellingPrice / safeQuantity) * 100) / 100;
              return {
                orderId: unifiedOrder.id,
                externalItemId: item.orderItemId,
                title: item.sku, // Flipkart uses SKU as primary identifier
                sku: item.sku,
                quantity: safeQuantity,
                unitPrice,
                totalPrice: sellingPrice,
                currency: "INR",
              };
            }),
          });
        }
      });

      synced++;
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
      console.error(`Flipkart order sync: Failed to update sync log ${syncLog.id}: ${logMsg}`);
    }
    throw error;
  }
}

export async function syncFlipkartProducts(
  connection: MarketplaceConnection,
  trigger: "cron" | "manual" | "webhook" = "cron"
): Promise<number> {
  const accessToken = await getValidFlipkartToken(connection.userId);
  const client = new FlipkartClient(accessToken, false);
  let synced = 0;
  let nextUrl: string | undefined;
  let pageCount = 0;

  // Track seen URLs to detect cycles
  const seenUrls = new Set<string>();

  const syncLog = await prisma.unifiedSyncLog.create({
    data: {
      connectionId: connection.id,
      marketplace: "FLIPKART",
      entity: "products",
      status: "started",
      trigger,
    },
  });

  try {
    do {
      // Safeguard: enforce maximum page limit
      if (pageCount >= MAX_PAGES) {
        console.warn(
          `Flipkart product sync: Reached max page limit (${MAX_PAGES}), stopping pagination`
        );
        break;
      }

      // Safeguard: detect URL cycles
      if (nextUrl && seenUrls.has(nextUrl)) {
        console.warn(
          `Flipkart product sync: Detected URL cycle, stopping pagination`
        );
        break;
      }
      if (nextUrl) {
        seenUrls.add(nextUrl);
      }

      const result = await client.getListings(nextUrl);

      const listings = result?.listings ?? [];
      for (const listing of listings) {
        // Determine product status based on stock level
        const stock = listing.stock ?? 0;
        const productStatus = stock > 0 ? "ACTIVE" : "OUT_OF_STOCK";

        await prisma.unifiedProduct.upsert({
          where: {
            connectionId_externalId: {
              connectionId: connection.id,
              externalId: listing.skuId,
            },
          },
          create: {
            userId: connection.userId,
            marketplace: "FLIPKART",
            connectionId: connection.id,
            externalId: listing.skuId,
            title: listing.title,
            sku: listing.skuId,
            price: listing.sellingPrice ?? listing.mrp ?? 0,
            currency: "INR",
            inventory: stock,
            status: productStatus,
          },
          update: {
            title: listing.title,
            price: listing.sellingPrice ?? listing.mrp ?? 0,
            inventory: stock,
            status: productStatus,
            syncedAt: new Date(),
          },
        });

        synced++;
      }

      nextUrl = result?.nextUrl;
      pageCount++;
    } while (nextUrl);

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
      console.error(`Flipkart product sync: Failed to update sync log ${syncLog.id}: ${logMsg}`);
    }
    throw error;
  }
}

export async function syncFlipkart(
  connection: MarketplaceConnection,
  trigger: "cron" | "manual" | "webhook" = "cron"
): Promise<SyncResult> {
  const errors: string[] = [];
  let ordersSynced = 0;
  let productsSynced = 0;
  let ordersSucceeded = false;
  let productsSucceeded = false;

  try {
    ordersSynced = await syncFlipkartOrders(connection, trigger);
    ordersSucceeded = true;
  } catch (error) {
    errors.push(`Orders: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  try {
    productsSynced = await syncFlipkartProducts(connection, trigger);
    productsSucceeded = true;
  } catch (error) {
    errors.push(`Products: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  // Only update lastSyncAt if at least one sync succeeded
  if (ordersSucceeded || productsSucceeded) {
    try {
      await prisma.marketplaceConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: new Date() },
      });
    } catch (updateError) {
      const msg = updateError instanceof Error ? updateError.message : "Unknown error";
      console.error(`Failed to update lastSyncAt for Flipkart connection ${connection.id}: ${msg}`);
      errors.push(`lastSyncAt update: ${msg}`);
    }
  }

  return { ordersSynced, productsSynced, errors };
}
