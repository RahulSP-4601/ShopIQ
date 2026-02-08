# ShopIQ - Implementation Progress

## Overview

ShopIQ is an AI-powered multi-marketplace e-commerce analytics platform that helps store owners understand their business through natural language conversations and automated reports. It supports 9 active marketplace integrations (Shopify, eBay, Etsy, Flipkart, WooCommerce, BigCommerce, Wix, Square, and Magento) with a unified data model and real-time sync pipeline. The MarketplaceType enum also reserves AMAZON and PRESTASHOP for future integrations.

---

## User Flow

```
Landing Page (/)
    ↓ "Get Started" / "Request Trial"
Sign Up (/signup) or Sign In (/signin)
    ↓
Onboarding Connect (/onboarding/connect) - Connect marketplaces
    ↓ OAuth/API Key with Shopify / eBay / Etsy / Flipkart / WooCommerce / BigCommerce / Wix / Square / Magento
Onboarding Payment (/onboarding/payment) - Subscription setup
    ↓
Chat Page (/chat) - Full AI-powered analytics
    ↓ Optional
Reports Page (/reports) - Generate detailed reports
    ↓ Optional
Account Marketplaces (/account/marketplaces) - Manage connections
```

**Key Points:**

- Users must sign up/sign in before connecting marketplaces
- Onboarding page allows connecting multiple marketplaces in one session
- After OAuth callback, users return to onboarding connect page
- Shopify data syncs via two paths: the **legacy sync flow** (`src/lib/shopify/sync.ts` — syncs to Store/Product/Order/Customer tables) and the **unified sync pipeline** (`src/lib/sync/shopify-sync.ts` — syncs to UnifiedOrder/UnifiedProduct). The **unified sync pipeline is authoritative** for cross-marketplace analytics. The legacy sync flow is retained for backward compatibility with Shopify-specific features but should be migrated to the unified pipeline.

  **Legacy → Unified Migration Status:**

  | Consumer | Current Target | Migration Status | Risk Level | Mitigation |
  |---|---|---|---|---|
  | Metrics calculator (`src/lib/metrics/calculator.ts`) | Legacy tables (Store/Product/Order/Customer) | Pending migration | **High** | Implement dual-read fallback: query Unified tables first, fall back to Legacy if empty; migrate all queries to Unified before production launch |
  | Reports (`src/lib/reports/templates.ts`) | Legacy tables | Pending migration | **High** | Transient bridge: add adapter layer that reads from Unified tables and maps to Legacy interfaces; schedule full migration within 2 sprints |
  | Chat context (`src/lib/gemini/prompts.ts`) | Legacy tables via `getStoreContext()` | Pending migration | **High** | Replace `getStoreContext()` with Unified-table-based context builder; add feature flag to toggle between legacy and unified context sources |
  | Webhook handler (`src/app/api/webhooks/shopify/route.ts`) | Unified tables (UnifiedOrder/UnifiedProduct) | Complete | Low | Already migrated — no action needed |
  | Cron sync (`src/lib/sync/shopify-sync.ts`) | Unified tables | Complete | Low | Already migrated — no action needed |

  **Deprecation deadline:** Disable `src/lib/shopify/sync.ts` once **all** consumers above read from unified tables. Target: before production launch.

  **Deprecation validation checklist (must all pass before disabling legacy flow):**
  - [ ] `src/lib/metrics/calculator.ts` — all queries reference `unifiedOrder`/`unifiedProduct` (not `order`/`product`/`customer`)
  - [ ] `src/lib/reports/templates.ts` — all queries reference unified tables
  - [ ] `src/lib/gemini/prompts.ts` — `getStoreContext()` replaced with unified-table-based context
  - [ ] Runtime instrumentation logs (see below) show zero legacy table reads for 7+ consecutive days
  - [ ] `SHOPIFY_LEGACY_SYNC_ENABLED=false` deployed to staging, full regression pass completed

  **Safeguards:**
  - Runtime feature flag: Set `SHOPIFY_LEGACY_SYNC_ENABLED=true` env var to **opt-in** to the legacy flow (default: **disabled**). The legacy flow only runs when explicitly enabled to prevent concurrent sync conflicts. Implement in `src/lib/shopify/sync.ts` entry point.
  - **DB-level verification** (may miss ORM-level reads):
    ```sql
    -- Check for recent reads on legacy Order/Product tables (via pg_stat_user_tables)
    SELECT schemaname, relname, seq_scan, idx_scan, last_seq_scan, last_idx_scan
    FROM pg_stat_user_tables
    WHERE relname IN ('Order', 'Product', 'Customer', 'LineItem', 'order', 'product', 'customer', 'line_item');
    ```
  - **Application-level verification** (recommended — catches ORM reads that pg_stat may miss):
    1. Enable Prisma query logging by registering `prisma.$on('query', ...)` in `src/lib/prisma.ts` startup and search production logs for queries referencing legacy tables (`Order`, `Product`, `Customer`, `LineItem`).
    2. Add runtime instrumentation/warning logs in the three pending legacy consumers:
       - `src/lib/metrics/calculator.ts` — emit `console.warn('[LEGACY_TABLE_READ] metrics/calculator reading from Order/Product tables')` at function entry points
       - `src/lib/reports/templates.ts` — emit `console.warn('[LEGACY_TABLE_READ] reports/templates reading from legacy tables')` at report generation entry
       - `src/lib/gemini/prompts.ts` — emit `console.warn('[LEGACY_TABLE_READ] gemini/prompts getStoreContext() reading from legacy tables')` inside `getStoreContext()`
    3. Monitor production logs for `[LEGACY_TABLE_READ]` markers. When zero occurrences are observed for 7+ consecutive days, it is safe to flip `SHOPIFY_LEGACY_SYNC_ENABLED=false`.
  - Running both flows concurrently risks race conditions and duplicate data — the feature flag ensures only one flow writes at a time.
- All marketplace data is normalized into unified tables for cross-platform analytics
- Real-time webhooks: Shopify, WooCommerce, BigCommerce, Wix, Square
- Polling every 15 minutes: eBay, Etsy, Flipkart, Magento

---

## Completed Features

### 1. Landing Page

**Status:** Untested — Not Production Ready

**Files:**

- `src/app/page.tsx` - Main landing page
- `src/components/landing/Navbar.tsx` - Navigation bar
- `src/components/landing/Hero.tsx` - Hero section with CTA buttons
- `src/components/landing/Features.tsx` - Feature highlights
- `src/components/landing/HowItWorks.tsx` - Step-by-step guide
- `src/components/landing/ExampleQuestions.tsx` - Sample questions users can ask
- `src/components/landing/CTA.tsx` - Call to action section
- `src/components/landing/Footer.tsx` - Footer
- `src/components/landing/Integrations.tsx` - Marketplace integrations display
- `src/components/landing/TrustIndicators.tsx` - Trust signals
- `src/components/landing/RequestTrialModal.tsx` - Trial request modal
- `src/components/landing/BackgroundEffects.tsx` - Animated background

**Features:**

- White base theme with premium animations
- Responsive design
- "Get Started" → links to `/signup`
- Trial request modal

---

### 2. Authentication System

**Status:** Untested — Not Production Ready

**Files:**

- `src/lib/auth/session.ts` - JWT session management
- `src/lib/auth/password.ts` - Password hashing/validation
- `src/lib/auth/subscription.ts` - Subscription checks
- `src/app/(auth)/signin/page.tsx` - Sign in page
- `src/app/(auth)/signup/page.tsx` - Sign up page
- `src/app/(auth)/forgot-password/page.tsx` - Forgot password
- `src/app/(auth)/reset-password/page.tsx` - Reset password
- `src/app/api/auth/signin/route.ts` - Sign in API
- `src/app/api/auth/signup/route.ts` - Sign up API
- `src/app/api/auth/signout/route.ts` - Sign out API
- `src/app/api/auth/me/route.ts` - Current user API
- `src/app/api/auth/forgot-password/route.ts` - Forgot password API
- `src/app/api/auth/reset-password/route.ts` - Reset password API
- `src/components/auth/AuthGuard.tsx` - Protected route wrapper
- `src/middleware.ts` - Route protection middleware

**Features:**

- JWT-based authentication using `jose` library
- HTTP-only secure cookies with 7-day default expiry (sliding session extends on activity)
- "Remember me" flag extends session to 30 days when selected
- Server-side session validation checks user exists in DB; sessions can be revoked at two levels:
  - **Single-session revocation (jti-based):** `createUserSession()` includes a `jti` (JWT ID) claim. `getUserSession()` checks the `RevokedToken` table before validating user existence. Call `revokeSessionToken(jti, userId, expiresAt)` exported from `src/lib/auth/session.ts` to revoke a specific session token. Expired revocations are cleaned up by `cleanupExpiredRevocations()`.
  - **User-wide revocation:** Deactivate or delete the user record — all subsequent `getUserSession()` calls will return `null`, forcing re-authentication on all devices.
  - **How to revoke (operator steps):**
    1. **Single session:** Call `revokeSessionToken(jti, userId, expiresAt)` programmatically, or insert directly into `RevokedToken` table.
    2. **All sessions:** `DELETE FROM "User" WHERE id = '<userId>';` or `npx prisma studio` → locate the user → delete.
    3. **Admin API (if implemented):** `POST /api/admin/users/:id/revoke` with admin bearer token.
  - **Effect on tokens/cookies:** Existing JWTs remain cryptographically valid until expiry but are functionally invalidated because `getUserSession()` checks the `RevokedToken` table and user existence on every request. Cookies are not physically cleared on other devices — they simply become rejected.
  - **Follow-up actions:** Audit the `UnifiedSyncLog` and `AuditLog` for recent activity by the revoked user; consider revoking marketplace OAuth tokens via their respective APIs; notify the user via email if the revocation was involuntary.
- Password hashing with bcrypt
- Forgot/reset password flow via email
- Auth guard component for protected pages
- Middleware for route protection

---

### 3. Database Schema (Prisma)

**Status:** Untested — Not Production Ready

**File:** `prisma/schema.prisma`

**Core Models:**

- `User` - Client user accounts (name, email, passwordHash, etc.)
- `Employee` - Team members with roles (FOUNDER, SALES_MEMBER)
- `Store` - Shopify store info, access tokens, sync status
- `MarketplaceConnection` - OAuth connections for all marketplaces
- `Subscription` - User billing/subscription management

**Shopify Data Models:**

- `Product` / `ProductVariant` - Synced products from Shopify
- `Customer` - Customer data
- `Order` / `LineItem` - Order records

**Unified Data Models (cross-marketplace):**

- `UnifiedOrder` - Normalized orders from all marketplaces
- `UnifiedProduct` - Normalized products from all marketplaces
- `UnifiedOrderItem` - Line items linked to unified orders
- `UnifiedSyncLog` - Sync history with trigger tracking (cron/webhook/manual)

**Security & Operations:**

- `RevokedToken` - JWT blacklist for jti-based session revocation
- `AuditLog` - Security audit trail (login, logout, session events, marketplace changes)
- `WebhookEvent` - Durable webhook deduplication table (marketplace + eventId unique constraint)

**Chat & Reports:**

- `Conversation` / `Message` / `Attachment` - Chat system
- `Report` - Generated analytics reports
- `SyncLog` - Shopify sync progress tracking

**Sales Team:**

- `TrialRequest` - Trial signup requests
- `SalesClient` - Clients managed by sales members
- `Commission` - Commission tracking

**Enums:**

- `MarketplaceType` - SHOPIFY, AMAZON, EBAY, ETSY, WOOCOMMERCE, BIGCOMMERCE, WIX, SQUARE, MAGENTO, PRESTASHOP, FLIPKART
- `ConnectionStatus` - PENDING, CONNECTED, DISCONNECTED, ERROR
- `UnifiedOrderStatus` - PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED, RETURNED
- `UnifiedProductStatus` - ACTIVE, INACTIVE, OUT_OF_STOCK
- `SubscriptionStatus` - TRIAL, ACTIVE, PAST_DUE, CANCELED, UNPAID
- `SyncStatus`, `MessageRole`, `ReportType`, `ReportStatus`, `TrialRequestStatus`, `EmployeeRole`

---

### 4. Shopify OAuth Integration

**Status:** Untested — Not Production Ready

**Files:**

- `src/lib/shopify/oauth.ts` - OAuth helpers (HMAC validation, URL building, code exchange, token encryption)
- `src/app/api/auth/shopify/route.ts` - Initiate OAuth flow
- `src/app/api/auth/shopify/callback/route.ts` - Handle OAuth callback + register webhooks

**Features:**

- Secure HMAC validation
- Nonce-based CSRF protection
- Token exchange with Shopify
- AES-256-GCM token encryption at rest
  - **Key storage:** Encryption key is read from `TOKEN_ENCRYPTION_KEY` env var (falls back to `SESSION_SECRET` then `SHOPIFY_API_SECRET` for backward compat). Stored in the deployment environment (e.g., Vercel Environment Variables). `SESSION_SECRET` is **deprecated for token encryption** — migrate to `TOKEN_ENCRYPTION_KEY`.
  - **Key scope:** `encryptToken`/`decryptToken` now support an optional `marketplace` parameter for per-marketplace key isolation via HKDF derivation. When called without the parameter, the legacy single-key derivation is used for backward compatibility. Per-user keys remain a future consideration.
  - **Key rotation:** Currently manual — update `TOKEN_ENCRYPTION_KEY`, re-encrypt all stored tokens, and redeploy. Recommended cadence: every 90 days or immediately on suspected compromise.
  - **Incident/compromise recovery:** (1) Rotate `TOKEN_ENCRYPTION_KEY` immediately, (2) re-encrypt all `accessToken`/`refreshToken` fields with the new key via migration script, (3) revoke and re-authorize compromised `MarketplaceConnection` records if tokens may have been exfiltrated, (4) audit `UnifiedSyncLog` for unauthorized access patterns. Ensure database backups are encrypted at rest and key material is never stored alongside encrypted data.
  - **KMS Migration Plan:**

    | Phase | Timeline | Deliverable |
    |---|---|---|
    | 1. Design & PoC | Day 0–30 | KMS proof-of-concept: integrate AWS KMS / Google Cloud KMS / HashiCorp Vault for `encryptToken`/`decryptToken` in `src/lib/shopify/oauth.ts` |
    | 2. Per-tenant KMS | Day 30–90 | Per-marketplace (or per-tenant) key wrapping via KMS; dual-key decryption support in `decryptToken` to decrypt tokens encrypted with either old or new key |
    | 3. Migration | Day 90–150 | Migration script to re-encrypt all `accessToken`/`refreshToken` fields in `MarketplaceConnection` table using KMS-managed keys; `SESSION_SECRET` fully deprecated for encryption |
    | 4. Cutover & Cleanup | Day 150–180 | Remove old `TOKEN_ENCRYPTION_KEY` env var fallback; KMS-only production; monitoring alerts for token decryption failures (log to `UnifiedSyncLog` or dedicated alert channel) |

    **Required deliverables:**
    1. KMS integration in `src/lib/shopify/oauth.ts` (`encryptToken`/`decryptToken`)
    2. Dual-key decryption: try new KMS key first, fall back to old `TOKEN_ENCRYPTION_KEY` during transition
    3. Migration script: re-encrypt all `accessToken`, `refreshToken`, `webhookSecret` fields in `MarketplaceConnection`
    4. Remove old key after migration is verified
    5. Monitoring: alert on token decryption failures (indicates missed migration or key mismatch)
- Auto-registers webhooks after successful OAuth
- Creates both Store and MarketplaceConnection records

---

### 5. eBay OAuth Integration

**Status:** Untested — Not Production Ready

**Files:**

- `src/lib/ebay/oauth.ts` - OAuth helpers (auth URL, token exchange, refresh)
- `src/lib/ebay/client.ts` - EbayClient class (orders, inventory, user info)
- `src/lib/ebay/token-refresh.ts` - Auto token refresh with per-user locking
- `src/app/api/auth/ebay/route.ts` - Initiate OAuth flow
- `src/app/api/auth/ebay/callback/route.ts` - Handle OAuth callback

**Features:**

- Standard OAuth 2.0 with Basic Auth for token exchange
- Automatic token refresh (tokens last ~2 hours)
- Per-user refresh lock prevents concurrent refresh storms
- 15-second timeout on refresh to prevent hanging
- Encrypted token storage

---

### 6. Etsy OAuth Integration

**Status:** Untested — Not Production Ready

**Files:**

- `src/lib/etsy/oauth.ts` - OAuth with PKCE (code_verifier, code_challenge, S256)
- `src/lib/etsy/client.ts` - EtsyClient class (shops, receipts, listings, user info)
- `src/lib/etsy/token-refresh.ts` - Auto token refresh (Etsy rotates refresh tokens)
- `src/app/api/auth/etsy/route.ts` - Initiate OAuth flow (sets PKCE cookies)
- `src/app/api/auth/etsy/callback/route.ts` - Handle OAuth callback with PKCE

**Features:**

- OAuth 2.0 with PKCE — no client secret needed (public client flow)
- Code verifier stored in httpOnly cookie during OAuth
- Etsy rotates both access AND refresh tokens on every refresh
- `x-api-key` header required on all API calls
- Handles Etsy's `amount/divisor` price pattern
- Encrypted token storage

---

### 7. Flipkart OAuth Integration

**Status:** Untested — Not Production Ready

**Files:**

- `src/lib/flipkart/oauth.ts` - OAuth with client credentials
- `src/lib/flipkart/client.ts` - FlipkartClient class (shipments, listings, order items)
- `src/lib/flipkart/token-refresh.ts` - Auto token refresh
- `src/app/api/auth/flipkart/route.ts` - Initiate OAuth flow
- `src/app/api/auth/flipkart/callback/route.ts` - Handle OAuth callback

**Features:**

- OAuth 2.0 with app ID + app secret
- Automatic token refresh
- Per-user refresh locking
- Sandbox/production mode support
- Encrypted token storage

---

### 8. WooCommerce Integration

**Status:** Untested — Not Production Ready

**Files:**

- `src/lib/woocommerce/auth.ts` - API credential verification, URL normalization
- `src/lib/woocommerce/client.ts` - WooCommerceClient class (orders, products, system status)
- `src/lib/woocommerce/webhooks.ts` - Webhook registration/deregistration
- `src/app/api/auth/woocommerce/route.ts` - Credentials submission endpoint
- `src/app/api/webhooks/woocommerce/route.ts` - Webhook receiver
- `src/lib/sync/woocommerce-sync.ts` - Sync service

**Features:**

- API Key + Secret authentication (Basic Auth)
- User-provided store URL + credentials (not centralized OAuth)
- HMAC-SHA256 webhook signature verification
- Auto-registers webhooks for orders and products
- Real-time updates via webhooks
- Encrypted credential storage

---

### 9. BigCommerce Integration

**Status:** Untested — Not Production Ready

**Files:**

- `src/lib/bigcommerce/oauth.ts` - OAuth flow with permanent tokens
- `src/lib/bigcommerce/client.ts` - BigCommerceClient class (orders, products, store info)
- `src/lib/bigcommerce/webhooks.ts` - Webhook registration/verification
- `src/app/api/auth/bigcommerce/route.ts` - Initiate OAuth flow
- `src/app/api/auth/bigcommerce/callback/route.ts` - Handle OAuth callback
- `src/app/api/webhooks/bigcommerce/route.ts` - Webhook receiver
- `src/lib/sync/bigcommerce-sync.ts` - Sync service

**Features:**

- Standard OAuth 2.0 with permanent access tokens (no refresh needed)
- Store hash identification
- X-BC-Store-Hash webhook verification
- Auto-registers webhooks for orders and products
- Real-time updates via webhooks
- Encrypted token storage

---

### 10. Wix Commerce Integration

**Status:** Untested — Not Production Ready

**Files:**

- `src/lib/wix/oauth.ts` - OAuth flow with short-lived tokens
- `src/lib/wix/client.ts` - WixClient class (orders, products, site info)
- `src/lib/wix/token-refresh.ts` - Auto token refresh (4-hour expiry)
- `src/app/api/auth/wix/route.ts` - Initiate OAuth flow
- `src/app/api/auth/wix/callback/route.ts` - Handle OAuth callback
- `src/app/api/webhooks/wix/route.ts` - Webhook receiver
- `src/lib/sync/wix-sync.ts` - Sync service

**Features:**

- OAuth 2.0 with 4-hour token expiry
- Both access AND refresh tokens rotate on refresh
- 30-minute refresh buffer before expiry
- Per-user refresh locking
- HMAC-SHA256 webhook signature verification
- Webhooks configured in Wix Dashboard
- Encrypted token storage

---

### 11. Square Integration

**Status:** Untested — Not Production Ready

**Files:**

- `src/lib/square/oauth.ts` - OAuth flow with PKCE support
- `src/lib/square/client.ts` - SquareClient class (orders, catalog, locations, inventory)
- `src/lib/square/token-refresh.ts` - Auto token refresh (30-day expiry)
- `src/lib/square/webhooks.ts` - Webhook registration
- `src/app/api/auth/square/route.ts` - Initiate OAuth flow with PKCE
- `src/app/api/auth/square/callback/route.ts` - Handle OAuth callback
- `src/app/api/webhooks/square/route.ts` - Webhook receiver
- `src/lib/sync/square-sync.ts` - Sync service

**Features:**

- OAuth 2.0 with PKCE (code_verifier/code_challenge)
- 30-day token expiry with refresh
- 1-day refresh buffer before expiry
- Per-user refresh locking
- Multi-location support (orders, inventory)
- Catalog sync with images and inventory counts
- HMAC-SHA256 webhook signature verification
- Encrypted token storage

---

### 12. Magento Integration

**Status:** Untested — Not Production Ready

**Files:**

- `src/lib/magento/auth.ts` - Bearer token verification, URL normalization
- `src/lib/magento/client.ts` - MagentoClient class (orders, products, store configs)
- `src/app/api/auth/magento/route.ts` - Credentials submission endpoint
- `src/lib/sync/magento-sync.ts` - Sync service

**Features:**

- Bearer Token authentication (no OAuth)
- User-provided store URL + integration access token
- Tokens never expire (unless revoked)
- Polling-only sync (Magento has no native webhooks)
- SearchCriteria pagination support
- Encrypted token storage

---

### 13. Multi-Marketplace Connect System

**Status:** Untested — Not Production Ready

**Files:**

- `src/app/api/marketplaces/connect/route.ts` - Initiate connection for any marketplace
- `src/app/api/marketplaces/disconnect/route.ts` - Disconnect with cleanup (incl. webhook deregistration)
- `src/app/api/marketplaces/route.ts` - List all marketplace connections
- `src/lib/marketplace/config.tsx` - Marketplace configuration (names, icons, colors)
- `src/lib/marketplace/types.ts` - Marketplace type definitions

**Features:**

- Unified connect/disconnect API for all marketplaces
- Shopify disconnect also deregisters webhooks
- Marketplace status tracking (CONNECTED, DISCONNECTED, etc.)

---

### 14. Real-Time Data Pipeline

**Status:** Untested — Not Production Ready

#### Webhooks (Real-Time Updates)

**Shopify Webhooks:**
- `src/lib/shopify/webhooks.ts` - HMAC verification, register/deregister
- `src/app/api/webhooks/shopify/route.ts` - Webhook receiver

**WooCommerce Webhooks:**
- `src/lib/woocommerce/webhooks.ts` - HMAC verification, register/deregister
- `src/app/api/webhooks/woocommerce/route.ts` - Webhook receiver

**BigCommerce Webhooks:**
- `src/lib/bigcommerce/webhooks.ts` - Store hash verification, register
- `src/app/api/webhooks/bigcommerce/route.ts` - Webhook receiver

**Square Webhooks:**
- `src/lib/square/webhooks.ts` - HMAC verification, register
- `src/app/api/webhooks/square/route.ts` - Webhook receiver

**Wix Webhooks:**
- `src/app/api/webhooks/wix/route.ts` - Webhook receiver (webhooks configured in Wix Dashboard)

**Webhook Topics (all platforms):**
- `orders/create`, `orders/updated` → Upsert UnifiedOrder + UnifiedOrderItem
- `products/create`, `products/update` → Upsert UnifiedProduct

**Features:**
- HMAC-SHA256 verification with timing-safe comparison
- Reads raw body before JSON parse (critical for HMAC)
- Auto-registers webhooks after OAuth (Shopify, WooCommerce, BigCommerce, Square)
- Auto-deregisters webhooks on disconnect
- **Response code strategy:**
  - Returns **200** for validation failures (invalid HMAC, malformed payload) — prevents retries for permanently invalid requests
  - Returns **503** for transient processing errors (DB connection failures, external API rate limits) — signals the sender to retry
  - Returns **2xx** for successful processing
  - **Idempotency:** Webhook handlers use `externalOrderId`/`externalId` as natural idempotency keys via upsert operations, making retries safe. Duplicate webhook deliveries produce the same result without side effects.
  - **Durable deduplication:** All webhook handlers (Shopify, BigCommerce, Square) check/create a `WebhookEvent` record (unique on `[marketplace, eventId]`) before processing. Duplicate deliveries are short-circuited with a 200 response. Shopify uses `X-Shopify-Webhook-Id` header, BigCommerce constructs from `scope:data.id:created_at`, Square uses the payload `event_id`. Stale records are cleaned up by the daily `/api/cron/cleanup` job (7-day TTL).
  - **Note:** Transient vs permanent failures are distinguished in response codes so marketplace webhook systems can retry appropriately
- Logs all events to UnifiedSyncLog

#### Polling Sync (eBay, Etsy, Flipkart, Magento — Every 15 min)

**Files:**

- `src/lib/sync/types.ts` - Status mapping functions for all 9 marketplaces
- `src/lib/sync/shopify-sync.ts` - Shopify → Unified normalization
- `src/lib/sync/ebay-sync.ts` - eBay → Unified normalization
- `src/lib/sync/etsy-sync.ts` - Etsy → Unified normalization
- `src/lib/sync/flipkart-sync.ts` - Flipkart → Unified normalization
- `src/lib/sync/woocommerce-sync.ts` - WooCommerce → Unified normalization
- `src/lib/sync/bigcommerce-sync.ts` - BigCommerce → Unified normalization
- `src/lib/sync/wix-sync.ts` - Wix → Unified normalization
- `src/lib/sync/square-sync.ts` - Square → Unified normalization
- `src/lib/sync/magento-sync.ts` - Magento → Unified normalization
- `src/lib/sync/sync-manager.ts` - Orchestrates sync across all 9 marketplaces
- `src/app/api/cron/sync/route.ts` - Vercel Cron endpoint
- `vercel.json` - Cron schedule config (`*/15 * * * *`)

**Features:**
- Delta sync using `lastSyncAt` — only fetches new data
- `lastSyncAttemptAt` field tracks every attempt (success or failure) so failing connections are naturally backed off and don't monopolize the batch
- Batch processing (5 connections per cron invocation) for Vercel timeout safety
- Error isolation per connection — one failure doesn't block others
- Status mapping per marketplace (e.g., Shopify `fulfilled` → `DELIVERED`)
- UnifiedSyncLog tracking with trigger type (cron/webhook/manual)
- `CRON_SECRET` Bearer token authentication (see `src/app/api/cron/sync/route.ts` line 7–11)

**CRON_SECRET Operational Security:**
- **Generation:** Use `openssl rand -base64 32` (256-bit random). Store in Vercel Environment Variables (encrypted at rest). Never commit to source control.
- **Rotation:** Rotate every 90 days (match `JWT_SIGNING_SECRET`/`TOKEN_ENCRYPTION_KEY` cadence) or immediately on suspected compromise. Update in Vercel dashboard + redeploy.
- **Monitoring:** Log and alert on failed auth attempts to `/api/cron/sync` (401 responses). Check `UnifiedSyncLog` for unexpected patterns (e.g., sync triggered outside cron schedule).
- **Rate limiting:** The cron runs every 15 minutes (`vercel.json`). Reject manual invocations more frequent than 1 per 5 minutes to prevent abuse.
- **IP allowlisting:** If available, restrict `/api/cron/sync` to Vercel's cron IP ranges via Vercel Firewall or middleware.

---

### 15. Shopify API Client & Data Sync

**Status:** Untested — Not Production Ready

**Files:**

- `src/lib/shopify/client.ts` - ShopifyClient class
- `src/lib/shopify/sync.ts` - Full Shopify data sync (legacy)
- `src/app/api/sync/start/route.ts` - Start sync endpoint
- `src/app/api/sync/status/route.ts` - Get sync status endpoint

**Methods:**

- `getShopInfo()` - Fetch store details
- `getProducts()` - Paginated products fetch
- `getCustomers()` - Paginated customers fetch
- `getOrders()` - Paginated orders fetch (with date filtering)
- Count methods for each entity

**Features:**

- Cursor-based pagination support
- Full TypeScript types for API responses
- Rate limit friendly
- Progress tracking via SyncLog table
- Upsert operations to handle re-syncs

---

### 16. Gemini AI Integration

**Status:** Untested — Not Production Ready

**Files:**

- `src/lib/gemini/client.ts` - Gemini API wrapper
- `src/lib/gemini/prompts.ts` - System prompts

**Features:**

- Uses Gemini 1.5 Flash model
- Configurable temperature/tokens
- Dedicated prompts for Q&A and reports
- Context-aware responses based on store data

---

### 17. Metrics Calculator

**Status:** Untested — Not Production Ready

**File:** `src/lib/metrics/calculator.ts`

**Functions:**

- `getRevenueMetrics(storeId, startDate, endDate)` - Revenue, orders, AOV, tax, discounts
- `getTopProducts(storeId, limit, startDate, endDate)` - Best selling products
- `getTopCustomers(storeId, limit)` - Highest spending customers
- `getDailyRevenue(storeId, days)` - Daily revenue breakdown
- `getStoreContext(storeId)` - Full context string for AI

---

### 18. Chat System

**Status:** Untested — Not Production Ready

**API Routes:**

- `src/app/api/chat/message/route.ts` - Send/receive messages
- `src/app/api/chat/conversations/route.ts` - List/create conversations
- `src/app/api/chat/conversations/[id]/route.ts` - Get/update/delete conversation
- `src/app/api/chat/upload/route.ts` - File upload for attachments

**UI Components:**

- `src/app/chat/page.tsx` - Main chat page
- `src/app/chat/[id]/page.tsx` - Conversation detail page
- `src/components/chat/ChatContainer.tsx` - Chat UI container
- `src/components/chat/ChatMessage.tsx` - Message bubble component
- `src/components/chat/ChatInput.tsx` - Input with auto-resize
- `src/components/chat/ChatSidebar.tsx` - Sidebar with conversation history
- `src/components/chat/ChatHeader.tsx` - Header with controls
- `src/components/chat/ChatLayout.tsx` - Layout wrapper
- `src/components/chat/MobileSidebarContext.tsx` - Mobile responsive sidebar

**Features:**

- Real-time AI-powered messaging
- Conversation history
- File attachments (via Supabase Storage)
- Suggested questions for new users
- Loading states with animated dots
- Mobile-responsive layout

---

### 19. Reports System

**Status:** Untested — Not Production Ready

**API Routes:**

- `src/app/api/reports/route.ts` - List reports
- `src/app/api/reports/generate/route.ts` - Generate new report
- `src/app/api/reports/[id]/route.ts` - Get report detail

**UI Components:**

- `src/app/reports/page.tsx` - Reports list page
- `src/app/reports/[id]/page.tsx` - Report detail page
- `src/components/reports/ReportsList.tsx` - Report list with generation buttons
- `src/components/reports/ReportView.tsx` - Report display component

**Report Types:**

1. **Revenue Summary** - Sales, orders, AOV, trends
2. **Product Analysis** - Best sellers, inventory, low stock alerts
3. **Customer Insights** - Segments, top customers, geography
4. **Full Analysis** - Complete store overview

---

### 20. Sync UI Page

**Status:** Untested — Not Production Ready

**Files:**

- `src/app/sync/page.tsx` - Sync progress page
- `src/components/sync/SyncProgress.tsx` - Progress component
- `src/components/ui/Spinner.tsx` - Loading spinner

**Features:**

- Real-time progress updates (2-second polling)
- Entity-by-entity progress display
- Auto-redirect to chat when complete

---

### 21. Sales Team Management

**Status:** Untested — Not Production Ready

**API Routes:**

- `src/app/api/founder/members/route.ts` - List/create sales members
- `src/app/api/founder/members/[id]/approve/route.ts` - Approve member
- `src/app/api/founder/members/[id]/reject/route.ts` - Reject member
- `src/app/api/founder/members/[id]/clients/route.ts` - Member's clients
- `src/app/api/founder/members/[id]/commission/route.ts` - Commission management
- `src/app/api/founder/members/invite/route.ts` - Invite new member
- `src/app/api/founder/clients/route.ts` - All clients overview
- `src/app/api/sales/profile/route.ts` - Sales member profile
- `src/app/api/sales/clients/route.ts` - Sales member's clients
- `src/app/api/sales/clients/[id]/send-trial/route.ts` - Send trial to client

**Pages:**

- `src/app/founder/dashboard/page.tsx` - Founder dashboard
- `src/app/sales/dashboard/page.tsx` - Sales member dashboard
- `src/app/sales/pending-approval/page.tsx` - Pending approval page

**Features:**

- Founder can invite, approve, reject sales members
- Sales members can manage clients and send trials
- Commission tracking per member per period
- Role-based access (FOUNDER vs SALES_MEMBER)

---

### 22. Trial System

**Status:** Untested — Not Production Ready

**Files:**

- `src/app/api/trial/login/route.ts` - Trial login
- `src/app/api/trial/setup/route.ts` - Trial setup
- `src/app/api/trial/verify/route.ts` - Verify trial token
- `src/app/api/trial/trial-request/route.ts` - Trial request from landing page
- `src/app/trial/[token]/page.tsx` - Trial access page
- `src/app/trial/connect/page.tsx` - Trial marketplace connect

---

### 23. Subscription Management & Stripe Integration

**Status:** Untested — Not Production Ready

**Files:**

- `src/app/api/subscription/route.ts` - Get subscription
- `src/app/api/subscription/create/route.ts` - Create subscription (DB-only path for demo mode)
- `src/app/api/subscription/update/route.ts` - Update subscription (adjusts marketplace count in DB)
- `src/app/api/subscription/checkout/route.ts` - Create Stripe Checkout session
- `src/app/api/subscription/portal/route.ts` - Create Stripe Customer Portal session
- `src/app/api/webhooks/stripe/route.ts` - Stripe webhook handler (subscription lifecycle)
- `src/lib/stripe/client.ts` - Stripe SDK wrapper (customer, checkout, portal, webhook verification)
- `src/lib/subscription/pricing.ts` - Pricing logic ($19.99 base + $4.99 per additional marketplace)
- `src/app/onboarding/payment/page.tsx` - Payment page (demo mode uses dummy form; production redirects to Stripe Checkout)

**Current State:**
- **Demo mode** (`NEXT_PUBLIC_DEMO_MODE=true`): DB-only subscription, no real payment
- **Production mode**: Uses Stripe Checkout for payment, Stripe Customer Portal for subscription management
- Stripe webhook handler processes: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
- The `Subscription` model has `stripeCustomerId` and `stripeSubscriptionId` fields linked by webhook events
- Trial conversion and sales commission tracking work at the DB level

**Stripe Environment Variables Required:**
- `STRIPE_SECRET_KEY` — Stripe secret key
- `STRIPE_WEBHOOK_SECRET` — Webhook endpoint signing secret
- `STRIPE_PRICE_ID` — Price ID for the subscription product

**Note:** The payment page UI still needs updating to use `POST /api/subscription/checkout` instead of the demo card form when not in demo mode.

---

### 24. Legal & Compliance

**Status:** Untested — Not Production Ready

**Files:**

- `src/app/terms/page.tsx` - Terms of Service
- `src/app/privacy/page.tsx` - Privacy Policy
- `src/app/security/page.tsx` - Security Policy
- `src/app/gdpr/page.tsx` - GDPR Compliance
- `src/app/cookies/page.tsx` - Cookie Policy
- `src/components/legal/LegalLayout.tsx` - Shared legal page layout
- `src/components/cookie-consent/` - Cookie consent banner, provider, preferences modal
- `src/lib/cookies/` - Cookie storage and types
- `src/hooks/useCookieConsent.ts` - Cookie consent hook

---

### 25. PII Cleanup & Data Retention

**Status:** Untested — Not Production Ready

**Files:**

- `src/app/api/cron/cleanup/route.ts` - Daily cleanup cron job
- `vercel.json` - Cron schedule (`0 3 * * *` — daily at 3 AM UTC)

**Features:**

- PII anonymization: Orders older than 365 days have `customerName` and `customerEmail` NULLed out (not hashed — true erasure for GDPR compliance)
- Legacy Customer PII anonymization: Customer records older than 365 days have `email`, `firstName`, `lastName`, `phone` NULLed out
- Expired `RevokedToken` cleanup — removes entries past their `expiresAt`
- `WebhookEvent` TTL cleanup — deletes events older than 7 days
- `AuditLog` TTL cleanup — deletes entries older than configurable retention period (`AUDIT_LOG_RETENTION_DAYS` env var, default 365 days)
- Uses same SHA-256 hash-based `CRON_SECRET` verification as the sync cron

---

### 27. GDPR Account Deletion

**Status:** Untested — Not Production Ready

**Files:**

- `src/app/api/account/delete/route.ts` - GDPR right-to-erasure endpoint

**Features:**

- Authenticated POST endpoint for user self-deletion
- Transactional: cleans up non-cascading records (RevokedToken, AuditLog) then deletes User
- User deletion cascades to: Store, Subscription, MarketplaceConnection, UnifiedOrder, UnifiedProduct, and all children
- AuditLog records are anonymized (userId, ipAddress, userAgent NULLed) rather than deleted to preserve audit trail
- Clears session cookie after deletion

---

### 26. Token Re-encryption Script

**Status:** Untested — Not Production Ready

**Files:**

- `scripts/reencrypt-tokens.ts` - Re-encrypts all MarketplaceConnection tokens with a new key

**Usage:**
1. Set `OLD_TOKEN_ENCRYPTION_KEY` to the current key
2. Set `NEW_TOKEN_ENCRYPTION_KEY` to the new key
3. Run: `npx tsx scripts/reencrypt-tokens.ts`
4. Verify by running a sample sync for one connection
5. Update `TOKEN_ENCRYPTION_KEY` env var to the new key and redeploy
6. Securely delete the old key material

**Safety:** Processes one connection at a time, skips null tokens, idempotent (safe to re-run).

---

## Additional Files

### Utilities

- `src/lib/prisma.ts` - Prisma client singleton
- `src/lib/supabase.ts` - Supabase client
- `src/lib/utils.ts` - Utility functions (cn for className merging)
- `src/lib/email.ts` - Email service (Resend)
- `src/lib/rate-limit.ts` - API rate limiting

### Config

- `vercel.json` - Vercel deployment config with cron job
- `prisma.config.ts` - Prisma configuration
- `.env.example` - Environment variable template

---

## Environment Variables Required

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://..."

# Shopify App Credentials
SHOPIFY_API_KEY="your_api_key"
SHOPIFY_API_SECRET="your_api_secret"
SHOPIFY_SCOPES="read_orders,read_products,read_customers"

# eBay App Credentials
EBAY_CLIENT_ID="your_ebay_client_id"
EBAY_CLIENT_SECRET="your_ebay_client_secret"
EBAY_RU_NAME="your_ebay_ru_name"

# Etsy App Credentials (PKCE — no secret needed)
ETSY_API_KEY="your_etsy_api_key"

# Flipkart App Credentials
FLIPKART_APP_ID="your_flipkart_app_id"
FLIPKART_APP_SECRET="your_flipkart_app_secret"

# BigCommerce App Credentials
BIGCOMMERCE_CLIENT_ID="your_bigcommerce_client_id"
BIGCOMMERCE_CLIENT_SECRET="your_bigcommerce_client_secret"

# Wix App Credentials
WIX_APP_ID="your_wix_app_id"
WIX_APP_SECRET="your_wix_app_secret"

# Square App Credentials
SQUARE_APPLICATION_ID="your_square_application_id"
SQUARE_APPLICATION_SECRET="your_square_application_secret"

# Stripe (Subscription Payments)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID="price_..."

# WooCommerce & Magento use user-provided credentials (no app secrets needed)

# Google Gemini API
GEMINI_API_KEY="your_gemini_key"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# JWT Signing (HMAC-SHA256) — used in src/lib/auth/session.ts
JWT_SIGNING_SECRET="<cryptographically-random-256-bit-secret>"
# Generate: openssl rand -base64 32 (~44 chars base64)
# Used for signing/verifying session JWTs (HS256). Must be cryptographically random.

# Token Encryption (AES-256-GCM) — used in src/lib/shopify/oauth.ts (encryptToken/decryptToken)
TOKEN_ENCRYPTION_KEY="<cryptographically-random-256-bit-secret>"
# Generate: openssl rand -base64 32 (~44 chars base64)
# Used for encrypting OAuth accessToken/refreshToken at rest.
# Key is hashed to 32 bytes via SHA-256 before use.

# DEPRECATED: SESSION_SECRET — DO NOT USE for new deployments.
# Previously used as fallback for both JWT_SIGNING_SECRET and TOKEN_ENCRYPTION_KEY.
# A startup warning is emitted if this env var is still present.
# Migrate to the two separate secrets above and remove SESSION_SECRET entirely.
# SESSION_SECRET="<remove-this>"

# Shopify Legacy Sync Migration
# SHOPIFY_LEGACY_SYNC_ENABLED="true"
# Valid values: "true" or "false" (default: disabled — legacy sync does NOT run unless explicitly set to "true")
# When "true", the legacy sync flow (src/lib/shopify/sync.ts) runs and writes to
# Store/Product/Order/Customer tables. When unset or "false", only the unified pipeline runs.
# Consumed by: src/lib/shopify/sync.ts entry point
# WARNING: Do NOT run both legacy and unified sync flows simultaneously — this
# risks race conditions and duplicate data. The unified pipeline uses an atomic
# compare-and-swap on Store.syncStatus to prevent concurrent execution.
# To re-enable legacy sync temporarily:
#   1. Set SHOPIFY_LEGACY_SYNC_ENABLED=true
#   2. The unified pipeline will skip automatically when this flag is set
#   3. Monitor logs for [LEGACY_SYNC] and [UNIFIED_SYNC] markers
# Example: SHOPIFY_LEGACY_SYNC_ENABLED=true

# Vercel Cron
CRON_SECRET="<cryptographically-random-256-bit-secret>"
# Generate: openssl rand -base64 32. Rotate every 90 days.
# See "CRON_SECRET Operational Security" in Polling Sync section for full guidance.

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Email (Resend)
RESEND_API_KEY="your_resend_key"
RESEND_FROM_EMAIL="onboarding@yourdomain.com"
```

---

## File Structure

```
src/
├── app/
│   ├── page.tsx (landing page)
│   ├── (auth)/
│   │   ├── signin/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── onboarding/
│   │   ├── connect/page.tsx
│   │   └── payment/page.tsx
│   ├── chat/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── reports/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── sync/page.tsx
│   ├── connect/page.tsx
│   ├── account/marketplaces/page.tsx
│   ├── founder/dashboard/page.tsx
│   ├── sales/
│   │   ├── dashboard/page.tsx
│   │   └── pending-approval/page.tsx
│   ├── trial/
│   │   ├── [token]/page.tsx
│   │   └── connect/page.tsx
│   ├── terms/page.tsx
│   ├── privacy/page.tsx
│   ├── security/page.tsx
│   ├── gdpr/page.tsx
│   ├── cookies/page.tsx
│   └── api/
│       ├── auth/
│       │   ├── signin/route.ts
│       │   ├── signup/route.ts
│       │   ├── signout/route.ts
│       │   ├── me/route.ts
│       │   ├── forgot-password/route.ts
│       │   ├── reset-password/route.ts
│       │   ├── verify-employee/route.ts
│       │   ├── shopify/route.ts
│       │   ├── shopify/callback/route.ts
│       │   ├── ebay/route.ts
│       │   ├── ebay/callback/route.ts
│       │   ├── etsy/route.ts
│       │   ├── etsy/callback/route.ts
│       │   ├── flipkart/route.ts
│       │   ├── flipkart/callback/route.ts
│       │   ├── woocommerce/route.ts
│       │   ├── bigcommerce/route.ts
│       │   ├── bigcommerce/callback/route.ts
│       │   ├── wix/route.ts
│       │   ├── wix/callback/route.ts
│       │   ├── square/route.ts
│       │   ├── square/callback/route.ts
│       │   └── magento/route.ts
│       ├── marketplaces/
│       │   ├── route.ts
│       │   ├── connect/route.ts
│       │   └── disconnect/route.ts
│       ├── webhooks/
│       │   ├── shopify/route.ts
│       │   ├── woocommerce/route.ts
│       │   ├── bigcommerce/route.ts
│       │   ├── square/route.ts
│       │   ├── wix/route.ts
│       │   └── stripe/route.ts
│       ├── account/
│       │   └── delete/route.ts
│       ├── cron/
│       │   ├── sync/route.ts
│       │   └── cleanup/route.ts
│       ├── store/route.ts
│       ├── sync/
│       │   ├── start/route.ts
│       │   └── status/route.ts
│       ├── chat/
│       │   ├── message/route.ts
│       │   ├── upload/route.ts
│       │   └── conversations/
│       │       ├── route.ts
│       │       └── [id]/route.ts
│       ├── reports/
│       │   ├── route.ts
│       │   ├── generate/route.ts
│       │   └── [id]/route.ts
│       ├── subscription/
│       │   ├── route.ts
│       │   ├── create/route.ts
│       │   ├── update/route.ts
│       │   ├── checkout/route.ts
│       │   └── portal/route.ts
│       ├── founder/
│       │   ├── clients/route.ts
│       │   ├── members/route.ts
│       │   ├── members/invite/route.ts
│       │   └── members/[id]/
│       │       ├── approve/route.ts
│       │       ├── reject/route.ts
│       │       ├── clients/route.ts
│       │       └── commission/route.ts
│       ├── sales/
│       │   ├── profile/route.ts
│       │   ├── clients/route.ts
│       │   └── clients/[id]/send-trial/route.ts
│       └── trial/
│           ├── login/route.ts
│           ├── setup/route.ts
│           ├── verify/route.ts
│           └── trial-request/route.ts
├── components/
│   ├── landing/
│   │   ├── BackgroundEffects.tsx
│   │   ├── CTA.tsx
│   │   ├── ExampleQuestions.tsx
│   │   ├── Features.tsx
│   │   ├── Footer.tsx
│   │   ├── Hero.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── Integrations.tsx
│   │   ├── Navbar.tsx
│   │   ├── RequestTrialModal.tsx
│   │   ├── TrustIndicators.tsx
│   │   └── index.ts
│   ├── chat/
│   │   ├── ChatContainer.tsx
│   │   ├── ChatHeader.tsx
│   │   ├── ChatInput.tsx
│   │   ├── ChatLayout.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ChatSidebar.tsx
│   │   ├── MobileSidebarContext.tsx
│   │   └── index.ts
│   ├── reports/
│   │   ├── ReportView.tsx
│   │   ├── ReportsList.tsx
│   │   └── index.ts
│   ├── auth/
│   │   ├── AuthGuard.tsx
│   │   └── index.ts
│   ├── cookie-consent/
│   │   ├── CookieConsentBanner.tsx
│   │   ├── CookieConsentProvider.tsx
│   │   ├── CookiePreferencesModal.tsx
│   │   └── index.ts
│   ├── legal/LegalLayout.tsx
│   ├── sync/SyncProgress.tsx
│   └── ui/
│       ├── MobileBackdrop.tsx
│       └── Spinner.tsx
├── hooks/
│   └── useCookieConsent.ts
├── types/
└── lib/
    ├── prisma.ts
    ├── supabase.ts
    ├── utils.ts
    ├── email.ts
    ├── rate-limit.ts
    ├── auth/
    │   ├── session.ts
    │   ├── password.ts
    │   └── subscription.ts
    ├── marketplace/
    │   ├── config.tsx
    │   └── types.ts
    ├── shopify/
    │   ├── client.ts
    │   ├── oauth.ts
    │   ├── sync.ts
    │   └── webhooks.ts
    ├── ebay/
    │   ├── client.ts
    │   ├── oauth.ts
    │   └── token-refresh.ts
    ├── etsy/
    │   ├── client.ts
    │   ├── oauth.ts
    │   └── token-refresh.ts
    ├── flipkart/
    │   ├── client.ts
    │   ├── oauth.ts
    │   └── token-refresh.ts
    ├── woocommerce/
    │   ├── auth.ts
    │   ├── client.ts
    │   └── webhooks.ts
    ├── bigcommerce/
    │   ├── oauth.ts
    │   ├── client.ts
    │   └── webhooks.ts
    ├── wix/
    │   ├── oauth.ts
    │   ├── client.ts
    │   └── token-refresh.ts
    ├── square/
    │   ├── oauth.ts
    │   ├── client.ts
    │   ├── token-refresh.ts
    │   └── webhooks.ts
    ├── magento/
    │   ├── auth.ts
    │   └── client.ts
    ├── stripe/
    │   └── client.ts
    ├── sync/
    │   ├── types.ts
    │   ├── sanitize.ts
    │   ├── sync-manager.ts
    │   ├── shopify-sync.ts
    │   ├── ebay-sync.ts
    │   ├── etsy-sync.ts
    │   ├── flipkart-sync.ts
    │   ├── woocommerce-sync.ts
    │   ├── bigcommerce-sync.ts
    │   ├── wix-sync.ts
    │   ├── square-sync.ts
    │   └── magento-sync.ts
    ├── gemini/
    │   ├── client.ts
    │   └── prompts.ts
    ├── metrics/calculator.ts
    ├── reports/templates.ts
    ├── subscription/pricing.ts
    └── cookies/
        ├── storage.ts
        └── types.ts

prisma/
└── schema.prisma

scripts/
├── reencrypt-tokens.ts
└── migrate-unique-constraints.sql

vercel.json
```

---

## Next Steps

### Deployment Blockers

The following must be resolved before any production deployment:

1. **Run `prisma db push` or migration** — Schema changes (PII comments, enum additions) need to be applied to the production database
2. **Run `scripts/migrate-unique-constraints.sql`** — Validates and creates connection-scoped unique constraints on UnifiedOrder/UnifiedProduct tables
3. **Set required environment variables** — All new env vars must be configured: `AUDIT_LOG_RETENTION_DAYS`, `ALLOWED_REDIRECT_HOSTS`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`
4. **Test all 9 OAuth flows** — Zero marketplace integrations have been tested with real credentials
5. **Test Stripe webhook lifecycle** — Verify checkout, invoice, and subscription events process correctly
6. **Verify GDPR account deletion** — Test `POST /api/account/delete` cascades correctly without orphaned records
7. **Legacy sync flag change** — `SHOPIFY_LEGACY_SYNC_ENABLED` now defaults to **disabled**. Verify existing deployments don't depend on legacy sync being active by default

### Immediate (BEFORE DEPLOYMENT)

1. **Set up marketplace developer accounts** - Register apps on all marketplace developer portals and add real API credentials to `.env`
2. **Write minimum required tests** — The following must pass before any deployment:
   - [ ] Unit: Token encryption/decryption roundtrip (including `SHOPIFY_API_SECRET` fallback path)
   - [ ] Unit: `encryptToken`/`decryptToken` with per-marketplace HKDF key derivation
   - [ ] Integration: Shopify OAuth flow (mock callback, verify token storage + encryption)
   - [ ] Integration: eBay OAuth flow (mock token exchange + refresh with Basic Auth)
   - [ ] Unit: Webhook HMAC-SHA256 verification (valid, tampered, and missing signatures)
   - [ ] Unit: `SHOPIFY_LEGACY_SYNC_ENABLED` behavior — verify unified sync skips when `true`, runs when `false`
   - [ ] Unit: Sync race-condition — verify atomic `updateMany` compare-and-swap on `Store.syncStatus` prevents concurrent runs
3. **Test token refresh flows** - Verify automatic token refresh for Wix (4hr), Square (30-day), eBay (2hr), Etsy (1hr), and Flipkart before deploying
4. **Deploy to staging** - Deploy to a staging environment first; verify cron activation, webhook URL accessibility, and `APP_URL` configuration
5. **Run staging validation** - Execute full testing checklist below against staging; do **NOT** promote to production until all checks pass
6. **Test end-to-end OAuth flows** - Connect each marketplace and verify data sync
7. **Configure webhooks** - Set up webhook URLs in Wix Dashboard (manual configuration required)
8. **Production deploy** - Only after staging validation passes and all deployment blockers above are resolved

### Testing Checklist

All features above are marked "Untested — Not Production Ready". Each feature moves to final "Complete" status only after the corresponding checklist items are signed off.

- [ ] **Token refresh flows** — Verify each marketplace's automatic token refresh:
  - [ ] Wix: 4-hour expiry, both tokens rotate (ref: Section 10)
  - [ ] Square: 30-day expiry with PKCE (ref: Section 11)
  - [ ] eBay: ~2-hour expiry with Basic Auth refresh (ref: Section 5)
  - [ ] Etsy: ~1-hour expiry with PKCE, both tokens rotate (ref: Section 6)
  - [ ] Flipkart: client credentials refresh (ref: Section 7)
- [ ] **End-to-end OAuth flows** — Connect and disconnect each marketplace, verify data appears in unified tables:
  - [ ] Shopify, eBay, Etsy, Flipkart, WooCommerce, BigCommerce, Wix, Square, Magento
- [ ] **Webhook delivery** — Verify real-time updates for order/product events:
  - [ ] Shopify, WooCommerce, BigCommerce, Square, Wix
  - [ ] Verify HMAC signature validation rejects tampered payloads
- [ ] **Polling sync (cron)** — Trigger cron endpoint and verify delta sync for eBay, Etsy, Flipkart, Magento
- [ ] **Deploy to Vercel** — Verify environment variables, cron activation, webhook URL accessibility
  - [ ] Staging environment smoke test before production
  - [ ] Verify `APP_URL` is set correctly for webhook registration
- [ ] **Data integrity** — Spot-check unified order/product records match source marketplace data
- [ ] **Error handling** — Simulate token expiry, API failures, and verify graceful degradation

### Test Results

**Current Status:** BLOCKED ON TESTING — Do not deploy to production. No automated tests or staging validation performed yet. All 9 marketplace integrations remain at "Untested — Not Production Ready".

**Test Coverage:** 0% (no unit/integration/e2e test suites have been created)

| Category | Test Type | Status | Blocks Deploy? | Notes |
|---|---|---|---|---|
| Token encryption roundtrip (incl. SHOPIFY_API_SECRET fallback) | Unit | **Required** | Yes | Can be tested locally with no external deps |
| Webhook HMAC verification (valid/tampered/missing) | Unit | **Required** | Yes | Can be tested locally with no external deps |
| SHOPIFY_LEGACY_SYNC_ENABLED behavior | Unit | **Required** | Yes | Verify unified skip + legacy guard |
| Sync race-condition (atomic compare-and-swap) | Unit | **Required** | Yes | Verify Store.syncStatus prevents concurrent runs |
| OAuth flow (Shopify + eBay mock) | Integration | **Required** | Yes | Use mock callbacks, verify token storage |
| Token refresh flows | Integration | Not started | Yes | Requires real marketplace developer accounts |
| OAuth flows (9 marketplaces) | E2E | Not started | Yes | Requires staging environment with real credentials |
| Webhook delivery (5 platforms) | Integration | Not started | Yes | Requires deployed webhook URLs |
| Polling sync (cron) | Integration | Not started | No | Can be tested locally with mock data |
| Data integrity | E2E | Not started | No | Requires populated unified tables |
| Error handling | Unit | Not started | No | Can be tested with mocked API failures |

**CI/CD Pipeline:** Not yet configured. Recommended setup:
- Unit tests: Run on every PR (Jest/Vitest)
- Integration tests: Run on staging deploy (requires marketplace sandbox credentials)
- E2E tests: Run post-deploy to staging (Playwright or Cypress)
- Coverage metrics: Track via CI and enforce minimum threshold

**Marketplace Staging Validation:**

| Marketplace | OAuth | Sync | Webhooks | Overall |
|---|---|---|---|---|
| Shopify | Not tested | Not tested | Not tested | Pending |
| eBay | Not tested | Not tested | N/A (polling) | Pending |
| Etsy | Not tested | Not tested | N/A (polling) | Pending |
| Flipkart | Not tested | Not tested | N/A (polling) | Pending |
| WooCommerce | Not tested | Not tested | Not tested | Pending |
| BigCommerce | Not tested | Not tested | Not tested | Pending |
| Wix | Not tested | Not tested | Not tested | Pending |
| Square | Not tested | Not tested | Not tested | Pending |
| Magento | Not tested | Not tested | N/A (polling) | Pending |

### Future Enhancements

- Amazon Seller Central integration
- PrestaShop integration
- Unified analytics dashboard (charts/graphs across all marketplaces)
- Scheduled report generation and email delivery
- Export reports to PDF/CSV
- Advanced forecasting with AI
- Payment page UI update to redirect to Stripe Checkout in production mode (see Section 23)
- KMS migration for token encryption (see Section 4 KMS Migration Plan)
