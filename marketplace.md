# Marketplace Data Sync & Analysis Architecture

## Overview

ShopIQ is a chat-based analytics platform. Users connect multiple marketplace accounts (Shopify, Flipkart, Amazon, etc.) and ask questions in natural language. The AI fetches, combines, and analyzes data across all connected marketplaces to provide unified insights.

---

## Data Flow

```
Marketplace APIs (Shopify, Flipkart, Amazon, etc.)
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
- Runs once or twice daily (e.g., 2 AM and 2 PM in user's timezone)
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
marketplace     MarketplaceType (SHOPIFY, FLIPKART, AMAZON, etc.)
connectionId    String    (FK to MarketplaceConnection)
externalOrderId String    (original order ID from marketplace)
status          String    (PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED, RETURNED)
currency        String    (USD, INR, EUR, etc.)
totalAmount     Decimal   (order total in original currency)
totalAmountUSD  Decimal   (converted to USD for cross-marketplace comparison)
itemCount       Int
customerName    String?
customerEmail   String?
orderedAt       DateTime  (when the order was placed)
fulfilledAt     DateTime? (when it was shipped/delivered)
syncedAt        DateTime  (when this record was last updated from API)
createdAt       DateTime
updatedAt       DateTime

@@unique([marketplace, externalOrderId])
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

@@unique([marketplace, externalId])
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

---

## Sync Implementation Outline

### 1. Sync Service (per marketplace)

Each marketplace has a sync service that:
- Accepts a MarketplaceConnection record
- Fetches data since `lastSyncAt` (delta sync)
- Transforms marketplace-specific data into unified format
- Upserts into unified tables
- Updates `lastSyncAt`

```
src/lib/sync/
  shopify-sync.ts    — Shopify → UnifiedOrder/Product
  flipkart-sync.ts   — Flipkart → UnifiedOrder/Product
  amazon-sync.ts     — (future)
  sync-manager.ts    — Orchestrates sync for all connections
```

### 2. Cron Job

```
src/app/api/cron/sync/route.ts
```
- Protected endpoint (verify cron secret header)
- Fetches all CONNECTED marketplace connections
- Groups by user to avoid parallel syncs for same user
- Calls appropriate sync service for each connection
- Handles errors per-connection (one failure doesn't block others)
- Logs sync results

Can be triggered by:
- Vercel Cron Jobs (vercel.json config)
- External cron service (e.g., cron-job.org)
- Self-hosted: node-cron or system crontab

### 3. On-Demand Sync (Chat-Triggered)

```
src/lib/sync/on-demand.ts
```
- Called before AI processes a chat message
- Checks `lastSyncAt` for user's connected marketplaces
- If stale (> threshold), runs delta sync for that user
- Returns quickly if data is fresh
- Has a lock mechanism to prevent concurrent syncs for same user

### 4. Currency Conversion

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
3. Return: "Your total sales last month were $45,230 — Shopify: $32,100, Flipkart: ₹8,50,000 ($10,130), Amazon: $3,000"

### "Which product sells best on Flipkart vs Shopify?"
1. Query `UnifiedOrderItem` joined with `UnifiedProduct` grouped by product + marketplace
2. Compare quantities and revenue per product across marketplaces
3. Return ranked comparison

### "Should I list Product X on Amazon?"
1. Look at Product X's performance on connected marketplaces
2. Compare with category averages (if available)
3. Analyze pricing, margins, competition data
4. Provide recommendation with reasoning

### "Show me my return rate by marketplace"
1. Query `UnifiedOrder` WHERE status = RETURNED grouped by marketplace
2. Calculate return rate = returned orders / total orders per marketplace
3. Return comparison chart data

---

## Implementation Priority

1. **Phase 1 (Current)**: OAuth integrations for all marketplaces (Shopify done, Flipkart done)
2. **Phase 2**: Unified data model (Prisma schema for UnifiedOrder, UnifiedProduct, UnifiedOrderItem)
3. **Phase 3**: Sync services for Shopify and Flipkart
4. **Phase 4**: Cron job + on-demand sync infrastructure
5. **Phase 5**: Connect AI chat layer to query unified data
6. **Phase 6**: Add sync services for remaining marketplaces as their OAuth integrations are built
7. **Phase 7**: Currency conversion, advanced analytics, historical trend tracking
