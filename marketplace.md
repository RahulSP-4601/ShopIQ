# Marketplace Data Sync & Analysis Architecture

## Overview

Frame is a chat-based analytics platform. Users connect multiple marketplace accounts (Shopify, eBay, Etsy, Flipkart, BigCommerce, Square, Snapdeal) and ask questions in natural language. The AI fetches, combines, and analyzes data across all connected marketplaces to provide unified insights.

---

## Active Marketplaces (7 Fully Integrated)

| Marketplace | Auth Method | Data Sync | Token Refresh |
|-------------|------------|-----------|---------------|
| Shopify | OAuth 2.0 | Webhooks + Polling | N/A (long-lived) |
| eBay | OAuth 2.0 | Polling (15 min) | Auto (~2hr tokens) |
| Etsy | OAuth 2.0 + PKCE | Polling (15 min) | Auto (~1hr, both tokens rotate) |
| Flipkart | OAuth 2.0 | Polling (15 min) | Auto (client credentials) |
| BigCommerce | OAuth 2.0 | Webhooks + Polling | N/A (permanent tokens) |
| Square | OAuth 2.0 + PKCE | Webhooks + Polling | Auto (30-day tokens) |
| Snapdeal | Redirect-based Auth | Polling (15 min) | N/A (non-expiring seller token) |

## Coming Soon

| Marketplace | Status |
|-------------|--------|
| Amazon Seller Central | Planned |
| PrestaShop | Planned |

## Future Target Integrations

Below are the future target integrations we are working to partner with:

- Meesho
- Myntra
- Nykaa
- JioMart
- IndiaMart
- Udaan
- Ajio

---

## Data Flow

```
Marketplace APIs (Shopify, eBay, Etsy, Flipkart, BigCommerce, Square, Snapdeal)
        │
        ▼
  Background Sync (Cron Job)
  - Runs on server, independent of user sessions
  - Uses stored OAuth tokens (encrypted in DB)
  - Works even when user is logged out
        │
        ▼
  Normalized Database Tables
  (Unified schema: orders, products, customers)
        │
        ▼
  AI Chat Layer
  - User asks a question
  - AI queries local DB (fast, sub-second)
  - Generates cross-marketplace analysis
  - Returns insights to user
```

---

## Sync Strategy: Daily Background + On-Demand Refresh

### Background Sync (Cron Job)
- Runs every 15 minutes via Vercel Cron
- Loops through all users with CONNECTED marketplace connections
- For each connection, fetches new/updated data since `lastSyncAt`
- Stores normalized data in unified tables
- Updates `lastSyncAt` on MarketplaceConnection

### On-Demand Refresh (Chat-Triggered)
- When user asks a question, AI checks `lastSyncAt` for relevant marketplaces
- If data is stale (e.g., older than 6 hours), triggers a quick sync for that user only
- Fetches only delta (new data since last sync) to keep it fast
- Then queries the local DB to answer the question

### Why Not Fetch Live on Every Chat Message?
- Aggregating thousands of orders across 3-5 marketplaces takes 10-15+ seconds per API
- API rate limits would be hit quickly with multiple users
- Historical comparisons ("this month vs last month") require stored data
- Cross-marketplace joins need data in a common format

---

## Sync Frequency Options

| Frequency | Use Case | API Cost | Notes |
|-----------|----------|----------|-------|
| Every 15 min | Real-time dashboards | High, may hit rate limits | Overkill for most users |
| Every 1-2 hours | Active sellers needing near-real-time | Moderate | Good for premium tier |
| Every 6-12 hours | Standard analytics | Low | Sufficient for most users |
| Daily + on-demand | Trend analysis + fresh data when needed | Most efficient | **Recommended starting point** |

---

## Normalized Data Model (Unified Schema)

All marketplace data gets normalized into common tables so the AI can query across marketplaces uniformly.

### UnifiedOrder
```
id              String    @id
userId          String    (FK to User)
marketplace     MarketplaceType (SHOPIFY, EBAY, ETSY, FLIPKART, BIGCOMMERCE, SQUARE, SNAPDEAL)
connectionId    String    (FK to MarketplaceConnection)
externalOrderId String    (original order ID from marketplace)
status          String    (PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED, RETURNED)
currency        String    (USD, INR, EUR, etc.)
totalAmount     Decimal   (order total in original currency)
totalAmountUSD  Decimal?  (converted to USD for cross-marketplace comparison)
itemCount       Int
customerName    String?
customerEmail   String?
orderedAt       DateTime  (when the order was placed)
fulfilledAt     DateTime? (when it was shipped/delivered)
syncedAt        DateTime  (when this record was last updated from API)
createdAt       DateTime
updatedAt       DateTime

@@unique([connectionId, externalOrderId])
@@index([userId, marketplace])
@@index([userId, orderedAt])
```

### UnifiedProduct
```
id              String    @id
userId          String    (FK to User)
marketplace     MarketplaceType
connectionId    String    (FK to MarketplaceConnection)
externalId      String    (product ID from marketplace)
title           String
sku             String?
category        String?
price           Decimal
currency        String
inventory       Int       (current stock level)
status          String    (ACTIVE, INACTIVE, OUT_OF_STOCK)
imageUrl        String?
syncedAt        DateTime
createdAt       DateTime
updatedAt       DateTime

@@unique([connectionId, externalId])
@@index([userId, marketplace])
@@index([userId, sku])
```

### UnifiedOrderItem
```
id              String    @id
orderId         String    (FK to UnifiedOrder)
productId       String?   (FK to UnifiedProduct, if matched)
externalItemId  String
title           String
sku             String?
quantity        Int
unitPrice       Decimal
totalPrice      Decimal
currency        String

@@index([orderId])
@@index([productId])
```

---

## Marketplace-Specific Data Mapping

### Shopify → Unified
| Shopify Field | Unified Field |
|---------------|---------------|
| order.id | externalOrderId |
| order.total_price | totalAmount |
| order.currency | currency |
| order.created_at | orderedAt |
| order.fulfillment_status | status (mapped) |
| line_item.title | UnifiedOrderItem.title |
| line_item.quantity | UnifiedOrderItem.quantity |
| line_item.price | UnifiedOrderItem.unitPrice |
| product.id | UnifiedProduct.externalId |
| product.title | UnifiedProduct.title |
| variant.sku | UnifiedProduct.sku |
| variant.price | UnifiedProduct.price |
| variant.inventory_quantity | UnifiedProduct.inventory |

### eBay → Unified
| eBay Field | Unified Field |
|------------|---------------|
| order.orderId | externalOrderId |
| order.pricingSummary.total.value | totalAmount |
| order.pricingSummary.total.currency | currency |
| order.creationDate | orderedAt |
| order.orderFulfillmentStatus | status (mapped) |
| lineItem.title | UnifiedOrderItem.title |
| lineItem.sku | UnifiedOrderItem.sku |
| lineItem.quantity | UnifiedOrderItem.quantity |
| lineItem.lineItemCost.value | UnifiedOrderItem.unitPrice |
| inventoryItem.sku | UnifiedProduct.externalId |
| inventoryItem.product.title | UnifiedProduct.title |
| inventoryItem.availability.shipToLocationAvailability.quantity | UnifiedProduct.inventory |

### Etsy → Unified
| Etsy Field | Unified Field |
|------------|---------------|
| receipt.receiptId | externalOrderId |
| receipt.grandtotal.amount / grandtotal.divisor | totalAmount |
| receipt.grandtotal.currency_code | currency |
| receipt.createTimestamp (unix → Date) | orderedAt |
| receipt.status | status (mapped) |
| transaction.title | UnifiedOrderItem.title |
| transaction.sku | UnifiedOrderItem.sku |
| transaction.quantity | UnifiedOrderItem.quantity |
| transaction.price.amount / price.divisor | UnifiedOrderItem.unitPrice |
| listing.listingId | UnifiedProduct.externalId |
| listing.title | UnifiedProduct.title |
| listing.price.amount / price.divisor | UnifiedProduct.price |
| listing.quantity | UnifiedProduct.inventory |
| listing.state | UnifiedProduct.status (mapped) |

### Flipkart → Unified
| Flipkart Field | Unified Field |
|----------------|---------------|
| shipment.orderId | externalOrderId |
| orderItem.priceComponents.sellingPrice | totalAmount |
| "INR" (always) | currency |
| shipment.orderDate | orderedAt |
| shipment.status | status (mapped) |
| orderItem.sku | UnifiedOrderItem.sku |
| orderItem.quantity | UnifiedOrderItem.quantity |
| listing.skuId | UnifiedProduct.sku |
| listing.title | UnifiedProduct.title |

### BigCommerce → Unified
| BigCommerce Field | Unified Field |
|-------------------|---------------|
| order.id | externalOrderId |
| order.total_inc_tax | totalAmount |
| order.currency_code | currency |
| order.date_created | orderedAt |
| order.status_id | status (mapped) |
| order_product.name | UnifiedOrderItem.title |
| order_product.sku | UnifiedOrderItem.sku |
| order_product.quantity | UnifiedOrderItem.quantity |
| order_product.price_inc_tax | UnifiedOrderItem.unitPrice |
| product.id | UnifiedProduct.externalId |
| product.name | UnifiedProduct.title |
| product.sku | UnifiedProduct.sku |
| product.price | UnifiedProduct.price |
| product.inventory_level | UnifiedProduct.inventory |

### Square → Unified
| Square Field | Unified Field |
|--------------|---------------|
| order.id | externalOrderId |
| order.total_money.amount / 100 | totalAmount |
| order.total_money.currency | currency |
| order.created_at | orderedAt |
| order.state | status (mapped) |
| line_item.name | UnifiedOrderItem.title |
| line_item.catalog_object_id | UnifiedOrderItem.sku |
| line_item.quantity | UnifiedOrderItem.quantity |
| line_item.base_price_money.amount / 100 | UnifiedOrderItem.unitPrice |
| catalog_object.id | UnifiedProduct.externalId |
| catalog_object.item_data.name | UnifiedProduct.title |
| item_variation_data.sku | UnifiedProduct.sku |
| item_variation_data.price_money.amount / 100 | UnifiedProduct.price |
| inventory_count.quantity | UnifiedProduct.inventory |

### Snapdeal → Unified
| Snapdeal Field | Unified Field |
|----------------|---------------|
| order.subOrderId (or orderId) | externalOrderId |
| order.price + order.shippingCharge | totalAmount |
| order.currency (default "INR") | currency |
| order.createdDate | orderedAt |
| order.status | status (mapped) |
| order.productTitle | UnifiedOrderItem.title |
| order.sku | UnifiedOrderItem.sku |
| order.quantity | UnifiedOrderItem.quantity |
| order.price | UnifiedOrderItem.unitPrice |
| product.supc | UnifiedProduct.externalId |
| product.title | UnifiedProduct.title |
| product.sku | UnifiedProduct.sku |
| product.sellingPrice | UnifiedProduct.price |
| product.inventory | UnifiedProduct.inventory |
| product.imageUrl | UnifiedProduct.imageUrl |

### Status Mapping
| Marketplace Status | Unified Status |
|-------------------|----------------|
| Shopify: unfulfilled | PENDING |
| Shopify: fulfilled | DELIVERED |
| Shopify: cancelled | CANCELLED |
| Flipkart: APPROVED | CONFIRMED |
| Flipkart: PACKED | CONFIRMED |
| Flipkart: SHIPPED | SHIPPED |
| Flipkart: DELIVERED | DELIVERED |
| Flipkart: CANCELLED | CANCELLED |
| Flipkart: RETURN_REQUESTED | RETURNED |
| Etsy: open | PENDING |
| Etsy: paid | CONFIRMED |
| Etsy: completed | DELIVERED |
| Etsy: canceled | CANCELLED |
| eBay: NOT_STARTED | PENDING |
| eBay: IN_PROGRESS | SHIPPED |
| eBay: FULFILLED | DELIVERED |
| eBay: CANCELLED | CANCELLED |
| eBay: RETURNED | RETURNED |
| BigCommerce: 2 (Shipped) | SHIPPED |
| BigCommerce: 10 (Completed) | DELIVERED |
| BigCommerce: 5 (Cancelled) | CANCELLED |
| BigCommerce: 4 (Refunded) | RETURNED |
| Square: OPEN | PENDING |
| Square: COMPLETED | DELIVERED |
| Square: CANCELED | CANCELLED |
| Snapdeal: PFF / PRNT | PENDING |
| Snapdeal: APPROVED / PACKED | CONFIRMED |
| Snapdeal: SHIPPED / IN_TRANSIT | SHIPPED |
| Snapdeal: DELIVERED | DELIVERED |
| Snapdeal: CANCELLED | CANCELLED |
| Snapdeal: RETURNED | RETURNED |

---

## Sync Implementation

### Sync Services (per marketplace)

Each marketplace has a sync service that:
- Accepts a MarketplaceConnection record
- Fetches data since `lastSyncAt` (delta sync)
- Transforms marketplace-specific data into unified format
- Upserts into unified tables
- Updates `lastSyncAt`

```
src/lib/sync/
  shopify-sync.ts      — Shopify → UnifiedOrder/Product
  ebay-sync.ts         — eBay → UnifiedOrder/Product
  etsy-sync.ts         — Etsy → UnifiedOrder/Product
  flipkart-sync.ts     — Flipkart → UnifiedOrder/Product
  bigcommerce-sync.ts  — BigCommerce → UnifiedOrder/Product
  square-sync.ts       — Square → UnifiedOrder/Product
  snapdeal-sync.ts     — Snapdeal → UnifiedOrder/Product
  sync-manager.ts      — Orchestrates sync for all 7 connections
```

### Cron Job

```
src/app/api/cron/sync/route.ts
```
- Protected endpoint (verify cron secret header)
- Fetches all CONNECTED marketplace connections
- Batch processing (5 connections per invocation) for Vercel timeout safety
- Calls appropriate sync service for each connection
- Handles errors per-connection (one failure doesn't block others)
- Logs sync results to UnifiedSyncLog

### On-Demand Sync (Chat-Triggered)

```
src/lib/sync/on-demand.ts
```
- Called before AI processes a chat message
- Checks `lastSyncAt` for user's connected marketplaces
- If stale (> threshold), runs delta sync for that user
- Returns quickly if data is fresh
- Has a lock mechanism to prevent concurrent syncs for same user

### Currency Conversion

For cross-marketplace comparison, all amounts need a common currency:
- Store original amount + currency
- Convert to USD (or user's preferred currency) using exchange rates
- Use a daily exchange rate API (e.g., exchangerate-api.com)
- Store converted amount in `totalAmountUSD` field

---

## Example Chat Queries & How AI Would Answer

### "What were my total sales last month?"
1. Query `UnifiedOrder` WHERE userId = X AND orderedAt >= lastMonthStart AND orderedAt < thisMonthStart
2. SUM(totalAmountUSD) grouped by marketplace
3. Return: "Your total sales last month were $45,230 — Shopify: $32,100, Flipkart: ₹8,50,000 ($10,130), Snapdeal: $3,000"

### "Which product sells best on Flipkart vs Shopify?"
1. Query `UnifiedOrderItem` joined with `UnifiedProduct` grouped by product + marketplace
2. Compare quantities and revenue per product across marketplaces
3. Return ranked comparison

### "Show me my return rate by marketplace"
1. Query `UnifiedOrder` WHERE status = RETURNED grouped by marketplace
2. Calculate return rate = returned orders / total orders per marketplace
3. Return comparison chart data

---

## Implementation Priority

1. **Phase 1 (Done)**: OAuth integrations (Shopify, Flipkart, eBay, Etsy)
2. **Phase 2 (Done)**: Unified data model (Prisma schema for UnifiedOrder, UnifiedProduct, UnifiedOrderItem)
3. **Phase 3 (Done)**: Sync services for Shopify, Flipkart, eBay, and Etsy
4. **Phase 4 (Done)**: Cron job + on-demand sync infrastructure
5. **Phase 5 (Done)**: Connect AI chat layer to query unified data
6. **Phase 6 (Done)**: Add OAuth + sync for BigCommerce, Square, Snapdeal
7. **Phase 7 (In Progress)**: Currency conversion, advanced analytics, historical trend tracking
8. **Phase 8 (Planned)**: Amazon Seller Central integration
9. **Phase 9 (Planned)**: PrestaShop integration
10. **Phase 10 (Future)**: Meesho, Myntra, Nykaa, JioMart, IndiaMart, Udaan, Ajio
