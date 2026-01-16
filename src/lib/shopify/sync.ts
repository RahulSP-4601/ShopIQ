import { Store, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ShopifyClient, ShopifyProduct, ShopifyCustomer, ShopifyOrder } from "./client";

export async function syncProducts(store: Store): Promise<number> {
  const client = new ShopifyClient(store);
  let pageInfo: string | undefined;
  let totalSynced = 0;

  // Create sync log
  const syncLog = await prisma.syncLog.create({
    data: {
      storeId: store.id,
      entity: "products",
      status: "in_progress",
    },
  });

  try {
    // Get total count
    const totalCount = await client.getProductsCount();
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { totalCount },
    });

    // Paginate through all products
    do {
      const { products, nextPageInfo } = await client.getProducts({
        limit: 250,
        page_info: pageInfo,
      });

      // Transform and upsert products
      for (const product of products) {
        await upsertProduct(store.id, product);
        totalSynced++;
      }

      // Update progress
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: { syncedCount: totalSynced },
      });

      pageInfo = nextPageInfo;
    } while (pageInfo);

    // Mark complete
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "completed", completedAt: new Date() },
    });

    // Update store product count
    await prisma.store.update({
      where: { id: store.id },
      data: { productsCount: totalSynced },
    });

    return totalSynced;
  } catch (error) {
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

export async function syncCustomers(store: Store): Promise<number> {
  const client = new ShopifyClient(store);
  let pageInfo: string | undefined;
  let totalSynced = 0;

  const syncLog = await prisma.syncLog.create({
    data: {
      storeId: store.id,
      entity: "customers",
      status: "in_progress",
    },
  });

  try {
    const totalCount = await client.getCustomersCount();
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { totalCount },
    });

    do {
      const { customers, nextPageInfo } = await client.getCustomers({
        limit: 250,
        page_info: pageInfo,
      });

      for (const customer of customers) {
        await upsertCustomer(store.id, customer);
        totalSynced++;
      }

      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: { syncedCount: totalSynced },
      });

      pageInfo = nextPageInfo;
    } while (pageInfo);

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "completed", completedAt: new Date() },
    });

    await prisma.store.update({
      where: { id: store.id },
      data: { customersCount: totalSynced },
    });

    return totalSynced;
  } catch (error) {
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

export async function syncOrders(store: Store, daysBack = 90): Promise<number> {
  const client = new ShopifyClient(store);
  let pageInfo: string | undefined;
  let totalSynced = 0;

  const createdAtMin = new Date();
  createdAtMin.setDate(createdAtMin.getDate() - daysBack);

  const syncLog = await prisma.syncLog.create({
    data: {
      storeId: store.id,
      entity: "orders",
      status: "in_progress",
    },
  });

  try {
    const totalCount = await client.getOrdersCount(createdAtMin);
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { totalCount },
    });

    do {
      const { orders, nextPageInfo } = await client.getOrders({
        limit: 250,
        page_info: pageInfo,
        created_at_min: createdAtMin,
      });

      for (const order of orders) {
        await upsertOrder(store.id, order);
        totalSynced++;
      }

      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: { syncedCount: totalSynced },
      });

      pageInfo = nextPageInfo;
    } while (pageInfo);

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "completed", completedAt: new Date() },
    });

    await prisma.store.update({
      where: { id: store.id },
      data: { ordersCount: totalSynced },
    });

    return totalSynced;
  } catch (error) {
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

export async function startFullSync(store: Store): Promise<void> {
  // Update store status
  await prisma.store.update({
    where: { id: store.id },
    data: { syncStatus: "SYNCING" },
  });

  try {
    // Sync in order: products, customers, then orders
    await syncProducts(store);
    await syncCustomers(store);
    await syncOrders(store);

    // Mark sync complete
    await prisma.store.update({
      where: { id: store.id },
      data: {
        syncStatus: "COMPLETED",
        lastSyncedAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.store.update({
      where: { id: store.id },
      data: { syncStatus: "FAILED" },
    });
    throw error;
  }
}

// Helper functions
async function upsertProduct(storeId: string, product: ShopifyProduct) {
  const firstVariant = product.variants[0];

  const productData: Prisma.ProductCreateInput = {
    store: { connect: { id: storeId } },
    shopifyId: String(product.id),
    title: product.title,
    handle: product.handle,
    productType: product.product_type || null,
    vendor: product.vendor || null,
    status: product.status,
    price: firstVariant ? new Prisma.Decimal(firstVariant.price) : null,
    compareAtPrice: firstVariant?.compare_at_price
      ? new Prisma.Decimal(firstVariant.compare_at_price)
      : null,
    totalInventory: product.variants.reduce(
      (sum, v) => sum + (v.inventory_quantity || 0),
      0
    ),
    imageUrl: product.images[0]?.src || null,
    shopifyCreatedAt: new Date(product.created_at),
    shopifyUpdatedAt: new Date(product.updated_at),
  };

  const dbProduct = await prisma.product.upsert({
    where: {
      storeId_shopifyId: {
        storeId,
        shopifyId: String(product.id),
      },
    },
    create: productData,
    update: {
      title: product.title,
      handle: product.handle,
      productType: product.product_type || null,
      vendor: product.vendor || null,
      status: product.status,
      price: firstVariant ? new Prisma.Decimal(firstVariant.price) : null,
      compareAtPrice: firstVariant?.compare_at_price
        ? new Prisma.Decimal(firstVariant.compare_at_price)
        : null,
      totalInventory: product.variants.reduce(
        (sum, v) => sum + (v.inventory_quantity || 0),
        0
      ),
      imageUrl: product.images[0]?.src || null,
      shopifyUpdatedAt: new Date(product.updated_at),
    },
  });

  // Upsert variants
  for (const variant of product.variants) {
    await prisma.productVariant.upsert({
      where: {
        productId_shopifyId: {
          productId: dbProduct.id,
          shopifyId: String(variant.id),
        },
      },
      create: {
        product: { connect: { id: dbProduct.id } },
        shopifyId: String(variant.id),
        title: variant.title,
        sku: variant.sku || null,
        price: new Prisma.Decimal(variant.price),
        compareAtPrice: variant.compare_at_price
          ? new Prisma.Decimal(variant.compare_at_price)
          : null,
        inventoryQuantity: variant.inventory_quantity || 0,
      },
      update: {
        title: variant.title,
        sku: variant.sku || null,
        price: new Prisma.Decimal(variant.price),
        compareAtPrice: variant.compare_at_price
          ? new Prisma.Decimal(variant.compare_at_price)
          : null,
        inventoryQuantity: variant.inventory_quantity || 0,
      },
    });
  }
}

async function upsertCustomer(storeId: string, customer: ShopifyCustomer) {
  await prisma.customer.upsert({
    where: {
      storeId_shopifyId: {
        storeId,
        shopifyId: String(customer.id),
      },
    },
    create: {
      store: { connect: { id: storeId } },
      shopifyId: String(customer.id),
      email: customer.email || null,
      firstName: customer.first_name || null,
      lastName: customer.last_name || null,
      phone: customer.phone || null,
      city: customer.default_address?.city || null,
      province: customer.default_address?.province || null,
      country: customer.default_address?.country || null,
      ordersCount: customer.orders_count,
      totalSpent: new Prisma.Decimal(customer.total_spent),
      acceptsMarketing: customer.accepts_marketing,
      tags: customer.tags || null,
      shopifyCreatedAt: new Date(customer.created_at),
    },
    update: {
      email: customer.email || null,
      firstName: customer.first_name || null,
      lastName: customer.last_name || null,
      phone: customer.phone || null,
      city: customer.default_address?.city || null,
      province: customer.default_address?.province || null,
      country: customer.default_address?.country || null,
      ordersCount: customer.orders_count,
      totalSpent: new Prisma.Decimal(customer.total_spent),
      acceptsMarketing: customer.accepts_marketing,
      tags: customer.tags || null,
    },
  });
}

async function upsertOrder(storeId: string, order: ShopifyOrder) {
  // Find customer if exists
  let customerId: string | null = null;
  if (order.customer?.id) {
    const customer = await prisma.customer.findUnique({
      where: {
        storeId_shopifyId: {
          storeId,
          shopifyId: String(order.customer.id),
        },
      },
    });
    customerId = customer?.id || null;
  }

  const dbOrder = await prisma.order.upsert({
    where: {
      storeId_shopifyId: {
        storeId,
        shopifyId: String(order.id),
      },
    },
    create: {
      store: { connect: { id: storeId } },
      shopifyId: String(order.id),
      orderNumber: order.order_number,
      name: order.name,
      totalPrice: new Prisma.Decimal(order.total_price),
      subtotalPrice: new Prisma.Decimal(order.subtotal_price),
      totalTax: new Prisma.Decimal(order.total_tax || "0"),
      totalDiscounts: new Prisma.Decimal(order.total_discounts || "0"),
      totalShipping: new Prisma.Decimal(
        order.total_shipping_price_set?.shop_money?.amount || "0"
      ),
      currency: order.currency,
      financialStatus: order.financial_status || null,
      fulfillmentStatus: order.fulfillment_status || null,
      customerId,
      customerEmail: order.customer?.email || null,
      sourceName: order.source_name || null,
      shippingCity: order.shipping_address?.city || null,
      shippingProvince: order.shipping_address?.province || null,
      shippingCountry: order.shipping_address?.country || null,
      shopifyCreatedAt: new Date(order.created_at),
      shopifyUpdatedAt: new Date(order.updated_at),
      cancelledAt: order.cancelled_at ? new Date(order.cancelled_at) : null,
    },
    update: {
      totalPrice: new Prisma.Decimal(order.total_price),
      subtotalPrice: new Prisma.Decimal(order.subtotal_price),
      totalTax: new Prisma.Decimal(order.total_tax || "0"),
      totalDiscounts: new Prisma.Decimal(order.total_discounts || "0"),
      financialStatus: order.financial_status || null,
      fulfillmentStatus: order.fulfillment_status || null,
      shopifyUpdatedAt: new Date(order.updated_at),
      cancelledAt: order.cancelled_at ? new Date(order.cancelled_at) : null,
    },
  });

  // Delete existing line items and recreate
  await prisma.lineItem.deleteMany({
    where: { orderId: dbOrder.id },
  });

  // Create line items
  for (const item of order.line_items) {
    // Find product and variant if they exist
    let productId: string | null = null;
    let variantId: string | null = null;

    if (item.product_id) {
      const product = await prisma.product.findUnique({
        where: {
          storeId_shopifyId: {
            storeId,
            shopifyId: String(item.product_id),
          },
        },
      });
      productId = product?.id || null;

      if (product && item.variant_id) {
        const variant = await prisma.productVariant.findUnique({
          where: {
            productId_shopifyId: {
              productId: product.id,
              shopifyId: String(item.variant_id),
            },
          },
        });
        variantId = variant?.id || null;
      }
    }

    await prisma.lineItem.create({
      data: {
        order: { connect: { id: dbOrder.id } },
        productId,
        variantId,
        shopifyProductId: item.product_id ? String(item.product_id) : null,
        shopifyVariantId: item.variant_id ? String(item.variant_id) : null,
        title: item.title,
        variantTitle: item.variant_title || null,
        sku: item.sku || null,
        quantity: item.quantity,
        price: new Prisma.Decimal(item.price),
        totalDiscount: new Prisma.Decimal(item.total_discount || "0"),
      },
    });
  }
}

export async function getSyncStatus(storeId: string) {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      syncStatus: true,
      lastSyncedAt: true,
      productsCount: true,
      customersCount: true,
      ordersCount: true,
    },
  });

  const syncLogs = await prisma.syncLog.findMany({
    where: { storeId },
    orderBy: { startedAt: "desc" },
    take: 3,
  });

  return {
    status: store?.syncStatus,
    lastSyncedAt: store?.lastSyncedAt,
    counts: {
      products: store?.productsCount || 0,
      customers: store?.customersCount || 0,
      orders: store?.ordersCount || 0,
    },
    progress: {
      products: syncLogs.find((l) => l.entity === "products"),
      customers: syncLogs.find((l) => l.entity === "customers"),
      orders: syncLogs.find((l) => l.entity === "orders"),
    },
  };
}
