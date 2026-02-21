# Frame - Implementation Progress

## Overview

Frame is an AI-powered multi-marketplace e-commerce analytics platform that helps store owners understand their business through natural language conversations and automated reports. It supports 7 fully integrated marketplace integrations (Shopify, eBay, Etsy, Flipkart, BigCommerce, Square, and Snapdeal) with a unified data model and real-time sync pipeline. The MarketplaceType enum also reserves AMAZON and PRESTASHOP for future integrations.

---

## User Flow

```
Landing Page (/)
    ↓ "Get Started" / "Request Trial"
Sign Up (/signup) or Sign In (/signin)
    ↓
Onboarding Connect (/onboarding/connect) - Connect marketplaces
    ↓ OAuth/API Key with Shopify / eBay / Etsy / Flipkart / BigCommerce / Square / Snapdeal
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
  - [ ] Runtime instrumentation logs show zero legacy table reads for 7+ consecutive days
  - [ ] `SHOPIFY_LEGACY_SYNC_ENABLED=false` deployed to staging, full regression pass completed

  **Safeguards:**
  - Runtime feature flag: Set `SHOPIFY_LEGACY_SYNC_ENABLED=true` env var to **opt-in** to the legacy flow (default: **disabled**).
  - Running both flows concurrently risks race conditions and duplicate data — the feature flag ensures only one flow writes at a time.
- All marketplace data is normalized into unified tables for cross-platform analytics
- Real-time webhooks: Shopify, BigCommerce, Square
- Polling every 15 minutes: eBay, Etsy, Flipkart, Snapdeal

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
- `src/components/landing/Integrations.tsx` - Marketplace integrations display (9 marketplaces)
- `src/components/landing/TrustIndicators.tsx` - Trust signals (currently commented out)
- `src/components/landing/RequestTrialModal.tsx` - Trial request modal
- `src/components/landing/BackgroundEffects.tsx` - Animated background

**Features:**

- White base theme with premium animations
- Responsive design
- "Get Started" → links to `/signup`
- Trial request modal
- Interactive chat demo with auto-rotating conversations

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
- "Remember me" flag extends session to 30 days
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
- `AuditLog` - Security audit trail
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

- `MarketplaceType` - SHOPIFY, AMAZON, EBAY, ETSY, BIGCOMMERCE, SQUARE, PRESTASHOP, FLIPKART, SNAPDEAL
- `ConnectionStatus` - PENDING, CONNECTED, DISCONNECTED, ERROR
- `UnifiedOrderStatus` - PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED, RETURNED
- `UnifiedProductStatus` - ACTIVE, INACTIVE, OUT_OF_STOCK
- `SubscriptionStatus` - TRIAL, ACTIVE, PAST_DUE, CANCELED, UNPAID

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

### 8. BigCommerce Integration

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

### 9. Square Integration

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

### 10. Snapdeal Integration

**Status:** Untested — Not Production Ready

**Files:**

- `src/lib/snapdeal/oauth.ts` - Auth helpers (auth URL, nonce, credential access)
- `src/lib/snapdeal/client.ts` - SnapDealClient class (orders, products, seller info)
- `src/app/api/auth/snapdeal/route.ts` - Initiate auth redirect
- `src/app/api/auth/snapdeal/callback/route.ts` - Handle auth callback
- `src/lib/sync/snapdeal-sync.ts` - Sync service

**Features:**

- Redirect-based implicit grant (response_type=token) — not standard OAuth2
- Seller token returned directly in callback URL
- App-level credentials: `SNAPDEAL_CLIENT_ID` + `SNAPDEAL_AUTH_TOKEN`
- API headers: `clientId`, `X-Auth-Token`, `X-Seller-AuthZ-Token`
- No token refresh needed (seller tokens don't expire)
- Atomic order + item upserts via Prisma transactions
- Paginated order sync (new + completed orders)
- Paginated product sync
- Encrypted token storage
- Production APP_URL validation (fail-closed)

---

### 11. Multi-Marketplace Connect System

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

### 12. Real-Time Data Pipeline

**Status:** Untested — Not Production Ready

#### Webhooks (Real-Time Updates)

**Shopify Webhooks:**
- `src/lib/shopify/webhooks.ts` - HMAC verification, register/deregister
- `src/app/api/webhooks/shopify/route.ts` - Webhook receiver

**BigCommerce Webhooks:**
- `src/lib/bigcommerce/webhooks.ts` - Store hash verification, register
- `src/app/api/webhooks/bigcommerce/route.ts` - Webhook receiver

**Square Webhooks:**
- `src/lib/square/webhooks.ts` - HMAC verification, register
- `src/app/api/webhooks/square/route.ts` - Webhook receiver

**Webhook Topics (all platforms):**
- `orders/create`, `orders/updated` → Upsert UnifiedOrder + UnifiedOrderItem
- `products/create`, `products/update` → Upsert UnifiedProduct

**Features:**
- HMAC-SHA256 verification with timing-safe comparison
- Reads raw body before JSON parse (critical for HMAC)
- Auto-registers webhooks after OAuth (Shopify, BigCommerce, Square)
- Auto-deregisters webhooks on disconnect
- Durable deduplication via `WebhookEvent` table (unique on `[marketplace, eventId]`)
- Logs all events to UnifiedSyncLog

#### Polling Sync (eBay, Etsy, Flipkart, Snapdeal — Every 15 min)

**Files:**

- `src/lib/sync/types.ts` - Status mapping functions for all 7 marketplaces
- `src/lib/sync/shopify-sync.ts` - Shopify → Unified normalization
- `src/lib/sync/ebay-sync.ts` - eBay → Unified normalization
- `src/lib/sync/etsy-sync.ts` - Etsy → Unified normalization
- `src/lib/sync/flipkart-sync.ts` - Flipkart → Unified normalization
- `src/lib/sync/bigcommerce-sync.ts` - BigCommerce → Unified normalization
- `src/lib/sync/square-sync.ts` - Square → Unified normalization
- `src/lib/sync/snapdeal-sync.ts` - Snapdeal → Unified normalization
- `src/lib/sync/sync-manager.ts` - Orchestrates sync across all 7 marketplaces
- `src/app/api/cron/sync/route.ts` - Vercel Cron endpoint
- `vercel.json` - Cron schedule config (`*/15 * * * *`)

**Features:**
- Delta sync using `lastSyncAt` — only fetches new data
- `lastSyncAttemptAt` field tracks every attempt (success or failure)
- Batch processing (5 connections per cron invocation) for Vercel timeout safety
- Error isolation per connection — one failure doesn't block others
- Status mapping per marketplace
- UnifiedSyncLog tracking with trigger type (cron/webhook/manual)
- `CRON_SECRET` Bearer token authentication

---

### 13. Shopify API Client & Data Sync

**Status:** Untested — Not Production Ready

**Files:**

- `src/lib/shopify/client.ts` - ShopifyClient class
- `src/lib/shopify/sync.ts` - Full Shopify data sync (legacy)
- `src/app/api/sync/start/route.ts` - Start sync endpoint
- `src/app/api/sync/status/route.ts` - Get sync status endpoint

**Features:**

- Cursor-based pagination support
- Full TypeScript types for API responses
- Rate limit friendly
- Progress tracking via SyncLog table
- Upsert operations to handle re-syncs

---

### 14. Gemini AI Integration

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

### 15. Metrics Calculator

**Status:** Untested — Not Production Ready

**File:** `src/lib/metrics/calculator.ts`

**Functions:**

- `getRevenueMetrics(storeId, startDate, endDate)` - Revenue, orders, AOV, tax, discounts
- `getTopProducts(storeId, limit, startDate, endDate)` - Best selling products
- `getTopCustomers(storeId, limit)` - Highest spending customers
- `getDailyRevenue(storeId, days)` - Daily revenue breakdown
- `getStoreContext(storeId)` - Full context string for AI

---

### 16. Chat System

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

### 17. Reports System

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

### 18. Sync UI Page

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

### 19. Sales Team Management

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

### 20. Trial System

**Status:** Untested — Not Production Ready

**Files:**

- `src/app/api/trial/login/route.ts` - Trial login
- `src/app/api/trial/setup/route.ts` - Trial setup
- `src/app/api/trial/verify/route.ts` - Verify trial token
- `src/app/api/trial/trial-request/route.ts` - Trial request from landing page
- `src/app/trial/[token]/page.tsx` - Trial access page
- `src/app/trial/connect/page.tsx` - Trial marketplace connect

---

### 21. Subscription Management & Stripe Integration

**Status:** Untested — Not Production Ready

**Files:**

- `src/app/api/subscription/route.ts` - Get subscription
- `src/app/api/subscription/create/route.ts` - Create subscription (DB-only path for demo mode)
- `src/app/api/subscription/update/route.ts` - Update subscription
- `src/app/api/subscription/checkout/route.ts` - Create Stripe Checkout session
- `src/app/api/subscription/portal/route.ts` - Create Stripe Customer Portal session
- `src/app/api/webhooks/stripe/route.ts` - Stripe webhook handler
- `src/lib/stripe/client.ts` - Stripe SDK wrapper
- `src/lib/subscription/pricing.ts` - Pricing logic ($19.99 base + $4.99 per additional marketplace)
- `src/app/onboarding/payment/page.tsx` - Payment page

**Stripe Environment Variables Required:**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`

---

### 22. Legal & Compliance

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

### 23. PII Cleanup & Data Retention

**Status:** Untested — Not Production Ready

**Files:**

- `src/app/api/cron/cleanup/route.ts` - Daily cleanup cron job
- `vercel.json` - Cron schedule (`0 3 * * *` — daily at 3 AM UTC)

**Features:**

- PII anonymization: Orders older than 365 days have `customerName` and `customerEmail` NULLed out
- Expired `RevokedToken` cleanup
- `WebhookEvent` TTL cleanup — deletes events older than 7 days
- `AuditLog` TTL cleanup — deletes entries older than configurable retention period

---

### 24. GDPR Account Deletion

**Status:** Untested — Not Production Ready

**Files:**

- `src/app/api/account/delete/route.ts` - GDPR right-to-erasure endpoint

**Features:**

- Authenticated POST endpoint for user self-deletion
- Transactional: cleans up non-cascading records then deletes User
- User deletion cascades to: Store, Subscription, MarketplaceConnection, UnifiedOrder, UnifiedProduct, and all children
- Clears session cookie after deletion

---

### 25. Token Re-encryption Script

**Status:** Untested — Not Production Ready

**Files:**

- `scripts/reencrypt-tokens.ts` - Re-encrypts all MarketplaceConnection tokens with a new key

**Usage:**
1. Set `OLD_TOKEN_ENCRYPTION_KEY` to the current key
2. Set `NEW_TOKEN_ENCRYPTION_KEY` to the new key
3. Run: `npx tsx scripts/reencrypt-tokens.ts`
4. Verify by running a sample sync for one connection
5. Update `TOKEN_ENCRYPTION_KEY` env var to the new key and redeploy

---

## Environment Variables Required

```env
DATABASE_URL="postgresql://..."

NEXT_PUBLIC_APP_URL="http://localhost:3000"
APP_URL="http://localhost:3000"
SESSION_SECRET="your_session_secret"
TOKEN_ENCRYPTION_KEY="your_64_hex_char_key"

SHOPIFY_API_KEY="your_api_key"
SHOPIFY_API_SECRET="your_api_secret"
SHOPIFY_SCOPES="read_orders,read_products,read_customers"

EBAY_CLIENT_ID="your_ebay_client_id"
EBAY_CLIENT_SECRET="your_ebay_client_secret"
EBAY_RU_NAME="your_ebay_ru_name"

ETSY_API_KEY="your_etsy_api_key"

FLIPKART_APP_ID="your_flipkart_app_id"
FLIPKART_APP_SECRET="your_flipkart_app_secret"

BIGCOMMERCE_CLIENT_ID="your_bigcommerce_client_id"
BIGCOMMERCE_CLIENT_SECRET="your_bigcommerce_client_secret"

SQUARE_APPLICATION_ID="your_square_application_id"
SQUARE_APPLICATION_SECRET="your_square_application_secret"

SNAPDEAL_CLIENT_ID="your_snapdeal_client_id"
SNAPDEAL_AUTH_TOKEN="your_snapdeal_auth_token"

STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID="price_..."

GEMINI_API_KEY="your_gemini_key"

CRON_SECRET="your_cron_secret"

NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

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
│       │   ├── bigcommerce/route.ts
│       │   ├── bigcommerce/callback/route.ts
│       │   ├── square/route.ts
│       │   ├── square/callback/route.ts
│       │   ├── snapdeal/route.ts
│       │   └── snapdeal/callback/route.ts
│       ├── marketplaces/
│       │   ├── route.ts
│       │   ├── connect/route.ts
│       │   └── disconnect/route.ts
│       ├── webhooks/
│       │   ├── shopify/route.ts
│       │   ├── bigcommerce/route.ts
│       │   ├── square/route.ts
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
    ├── bigcommerce/
    │   ├── oauth.ts
    │   ├── client.ts
    │   └── webhooks.ts
    ├── square/
    │   ├── oauth.ts
    │   ├── client.ts
    │   ├── token-refresh.ts
    │   └── webhooks.ts
    ├── snapdeal/
    │   ├── oauth.ts
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
    │   ├── bigcommerce-sync.ts
    │   ├── square-sync.ts
    │   └── snapdeal-sync.ts
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

1. **Run `prisma db push` or migration** — Schema changes need to be applied to the production database
2. **Run `scripts/migrate-unique-constraints.sql`** — Validates and creates connection-scoped unique constraints
3. **Set required environment variables** — All env vars must be configured
4. **Test all 7 OAuth flows** — Zero marketplace integrations have been tested with real credentials
5. **Test Stripe webhook lifecycle** — Verify checkout, invoice, and subscription events process correctly
6. **Verify GDPR account deletion** — Test cascades correctly without orphaned records

### Testing Checklist

- [ ] **Token refresh flows** — Verify each marketplace's automatic token refresh:
  - [ ] Square: 30-day expiry with PKCE
  - [ ] eBay: ~2-hour expiry with Basic Auth refresh
  - [ ] Etsy: ~1-hour expiry with PKCE, both tokens rotate
  - [ ] Flipkart: client credentials refresh
- [ ] **End-to-end OAuth flows** — Connect and disconnect each marketplace:
  - [ ] Shopify, eBay, Etsy, Flipkart, BigCommerce, Square, Snapdeal
- [ ] **Webhook delivery** — Verify real-time updates:
  - [ ] Shopify, BigCommerce, Square
- [ ] **Polling sync (cron)** — Verify delta sync for eBay, Etsy, Flipkart, Snapdeal
- [ ] **Data integrity** — Spot-check unified records match source marketplace data

### Marketplace Staging Validation

| Marketplace | OAuth | Sync | Webhooks | Overall |
|---|---|---|---|---|
| Shopify | Not tested | Not tested | Not tested | Pending |
| eBay | Not tested | Not tested | N/A (polling) | Pending |
| Etsy | Not tested | Not tested | N/A (polling) | Pending |
| Flipkart | Not tested | Not tested | N/A (polling) | Pending |
| BigCommerce | Not tested | Not tested | Not tested | Pending |
| Square | Not tested | Not tested | Not tested | Pending |
| Snapdeal | Not tested | Not tested | N/A (polling) | Pending |

### Future Enhancements

- Amazon Seller Central integration
- PrestaShop integration
- Meesho, Myntra, Nykaa, JioMart, IndiaMart, Udaan, Ajio integrations
- Unified analytics dashboard (charts/graphs across all marketplaces)
- Scheduled report generation and email delivery
- Export reports to PDF/CSV
- Advanced forecasting with AI
- KMS migration for token encryption
