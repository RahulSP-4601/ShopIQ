# ShopIQ — End-to-End Client Onboarding & Platform Flow

---

## Entry Points (Two Paths)

```
╔══════════════════════════════════════════════════════════════════════╗
║                     HOW A CLIENT GETS ONBOARD                       ║
╚══════════════════════════════════════════════════════════════════════╝

  PATH A: Self-Signup (Paid)             PATH B: Sales Team (30-Day Trial)
  ──────────────────────────             ─────────────────────────────────
  User visits /signup                    Sales Member sends trial invite
       │                                 email to client (POST /api/
       ▼                                 sales/clients/[id]/send-trial)
  ┌──────────────┐                             │
  │ Zod validates │                            ▼
  │ name, email,  │                    Client receives "Free 1
  │ password, etc │                    Month Access" email with
  └──────┬───────┘                     trial link
         │                                   │
         ▼                                   ▼
  ┌──────────────┐                    Client clicks /trial/[token]
  │ Rate limit   │                           │
  │ 3 req/60s/IP │                    ┌──────┴──────────────────┐
  └──────┬───────┘                    │ New? → Setup form:      │
         │                            │  set password +         │
         ▼                            │  select 2 marketplaces  │
  ┌──────────────┐                    │  POST /api/trial/setup  │
  │ bcrypt hash  │                    │   → Create User         │
  │ password     │                    │   → Subscription (TRIAL)│
  └──────┬───────┘                    │   → 2 PENDING conns     │
         │                            │     (OAuth on next step)│
         │                            │   → "Account Ready"     │
         ▼                            │     email sent          │
  ┌──────────────┐                    │   → Auto-login          │
  │ Create User  │                    │   → /trial/connect      │
  │ in DB        │                    │                         │
  └──────┬───────┘                    │ Active? → Auto-login    │
         │                            │   → /chat               │
         ▼                            │                         │
  Create JWT Session                  │ Expired? → Sign-in page │
         │                            └──────┬──────────────────┘
         ▼                                   │
  /onboarding/connect                        ▼
  (all marketplaces)                  /trial/connect
         │                            (2 selected marketplaces)
         ▼                                   │
  /onboarding/profile                 OAuth callbacks use
         │                            frame_oauth_return cookie
         ▼                            to redirect back here
  /onboarding/payment                        │
  (Razorpay checkout)                        ▼
         │                            All connected? → /chat
         ▼                            ✅ NO PAYMENT (30-day trial)
       /chat                                 ��
  ✅ ONBOARDING COMPLETE                     │
                                       Trial expires (30 days)?
                                       checkSubscription() fails
                                             │
                                             ▼
                                       /onboarding/payment
                                       (Razorpay checkout)
                                             │
                                             ▼
                                           /chat
                                       ✅ NOW A PAID SUBSCRIBER
```

### Trial Path — Security & Operational Details

#### `/trial/[token]` Token Validation (`GET /api/trial/verify`)

- **Token format**: UUID v4 via `crypto.randomUUID()` — 122 bits of entropy
- **Storage**: `SalesClient.trialToken` column (unique DB constraint)
- **Expiration**: 30 days from `trialSentAt` timestamp
- **One-time setup**: After `POST /api/trial/setup` succeeds, `clientUserId` is
  set on the `SalesClient` record; subsequent setup attempts are rejected
  ("Invalid or expired trial link")
- **Token states & responses** (`GET /api/trial/verify`):

  | Condition                     | Response                     | UI behavior               |
  |-------------------------------|------------------------------|---------------------------|
  | Token not found               | `{ valid: false }`           | "Invalid Trial Link"      |
  | No `trialSentAt`              | `{ valid: false }`           | "Invalid Trial Link"      |
  | Expired (>30 days)            | `{ status: "expired" }`      | "Trial Period Ended" + Sign In |
  | New (no `clientUserId`)       | `{ status: "new" }`          | Setup form shown          |
  | Active (`clientUserId` set)   | `{ status: "active" }`       | Auto-login attempted      |

- **Note on "Expired → Sign-in page"**: When an expired trial token is visited,
  the user is directed to `/signin`. After sign-in, `checkSubscription()` detects
  the expired trial subscription and redirects to `/onboarding/payment` for paid
  conversion. The flow is: expired token → sign-in → `/chat` attempt →
  `checkSubscription()` → `/onboarding/payment`.

#### Trial Endpoint Rate Limits

| Endpoint                                  | Scope     | Limit                          | Notes                          |
|-------------------------------------------|-----------|--------------------------------|--------------------------------|
| `POST /api/trial/login`                   | Per IP    | 10 req/60s, 5 failures → block | Exponential backoff (2s base). Stricter (3/60s, 2 failures) for unknown IP |
| `POST /api/trial/setup`                   | Per token | One-time use (`clientUserId` guard) | Brute-force infeasible (UUID v4 = 122-bit entropy) |
| `GET /api/trial/verify`                   | Per IP    | 60 req/60s (10 for unknown IP) | Read-only; returns name/email only for valid tokens |
| `POST /api/sales/clients/[id]/send-trial` | Per member | Auth-gated + one-per-client   | `requireApprovedSalesMember()` + `trialToken: null` CAS guard |
| `POST /api/signup`                        | Per IP    | 3 req/60s/IP                   | Documented above in PATH A     |

- `/api/trial/login` uses `checkRateLimit()` with exponential backoff
  (`baseBlockMs=2000`) and degrades to stricter limits when client IP is unknown
- `/api/sales/clients/[id]/send-trial` requires authenticated, approved sales
  member and enforces one-time sending per client via CAS `updateMany` with
  `trialToken: null` precondition

#### Auto-Login Session Security

`POST /api/trial/setup` calls `createUserSession()` after account creation:

- **Token type**: JWT signed with HS256 (`JWT_SIGNING_SECRET`)
- **Expiration**: 7 days (default)
- **Cookie**: `frame_session` — `HttpOnly`, `Secure` (production), `SameSite=Lax`, `path=/`
- **Unique ID**: Each JWT contains a `jti` (UUID v4) for revocation tracking
- **Validation on each request** (`getUserSession()`):
  1. Verify JWT signature + expiration
  2. Check `RevokedToken` table — reject if jti is revoked
  3. Verify user still exists in DB
- **Sliding session**: When < 1 day remaining, token is re-signed with new jti;
  old jti revoked via `RevokedToken` (P2002 unique constraint = distributed mutex)
- **Fallback**: If session creation fails after account creation, returns
  `redirect: "/signin"` for manual login — account is preserved, not lost

#### OAuth Callback Security (`frame_oauth_return` cookie)

- **Cookie set client-side** on `/trial/connect` before each OAuth redirect:
  `document.cookie = "frame_oauth_return=/trial/connect; path=/; max-age=600; SameSite=Lax"`
- **Server-side validation** via `consumeOAuthReturnPath()`:
  - Reads cookie value and deletes it immediately (single-use)
  - Validates against strict allowlist: `{"/trial/connect", "/onboarding/connect"}`
  - Falls back to `/onboarding/connect` if value is tampered or missing
  - Return type is `Promise<string>` — never null/undefined
- **OAuth state/nonce validation**: Each marketplace callback verifies the `state`
  parameter matches a server-stored nonce cookie (e.g., `shopify_nonce`, `etsy_nonce`,
  `square_nonce`) before performing the token exchange
- **Session binding**: All 7 OAuth callbacks call `getUserSession()` and reject
  unauthenticated users — the callback redirects to `/signin` with a pending-connect
  cookie rather than completing the flow, ensuring the session that initiated OAuth
  is the one that finishes it
- **Note**: The cookie is not `HttpOnly` (set via `document.cookie` in the browser),
  but the server-side allowlist makes tampering harmless — the worst case is a
  redirect to the default `/onboarding/connect` path. Making it `HttpOnly` would
  require a server-side API call before the OAuth redirect with no security benefit.

#### Email Delivery Failure Handling

Applies to: "Trial Invite" email, "Account Ready" email, "Weekly Briefing" email (all via Resend).

- **Delivery**: Single attempt via `await resend.emails.send()` — no automatic retries
- **Error handling**: Errors caught with try/catch and logged to `console.error`
  with context (email type, error message). The parent operation still succeeds —
  account creation, trial sending, and briefing generation are not rolled back
- **Fallback**: None — if email fails, the user receives no notification
- **Known gaps**:
  - No retry queue or dead-letter mechanism
  - No in-app notification fallback when email delivery fails
  - No user-facing "resend email" functionality
  - Failures only visible in server logs (Vercel function logs)

#### Trial-to-Paid Transition Details

When a trial subscription expires (`currentPeriodEnd < now`):

1. `checkSubscription()` returns `hasActiveSubscription: false`
2. `/chat` page redirects user to `/onboarding/payment`
3. Razorpay checkout upserts existing Subscription record (not a new one)
4. After payment: subscription updated in-place (`TRIAL → ACTIVE`)
5. All user data persists (conversations, beliefs, connections, orders — all tied to `userId`)

**Pre-expiration notifications**: Not yet implemented. No email or in-app warnings
before the 30-day trial ends.

**Payment failure after conversion**:
- Razorpay webhook `payment.failed` → subscription status → `PAST_DUE`
- `PAST_DUE` fails `checkSubscription()` → user redirected to payment page
- User data (conversations, beliefs, marketplace connections, synced orders)
  retained indefinitely — no automatic data deletion on payment failure

**Grace period**: None currently. When the trial period ends, access to `/chat`
is blocked immediately. Razorpay handles subscription-level retry logic internally.

**State transitions**:
```
TRIAL → (expires) → payment prompt
      → (pays)    → ACTIVE
      → (payment fails) → PAST_DUE → payment prompt

ACTIVE → (payment fails) → PAST_DUE → (pays) → ACTIVE
       → (canceled)      → CANCELED
```

---

## Onboarding Flow (3 Steps)

```
╔══════════════════════════════════════════════════════════════════════╗
║                  STEP 1: CONNECT MARKETPLACES                       ║
║                     /onboarding/connect                              ║
╚══════════════════════════════════════════════════════════════════════╝
                           │
          ┌────────────────┼─────────────────┐
          ▼                ▼                  ▼
    ┌───────────┐   ┌───────────┐     ┌────────────┐
    │  OAuth    │   │  OAuth    │     │ API Key    │
    │ Shopify   │   │ eBay     │     │ PrestaShop │
    │ Etsy      │   │ Square   │     └─────┬──────┘
    │ Flipkart  │   │ BigComm  │           │
    │ Wix       │   │ Magento  │           │
    │ WooComm   │   │          │           │
    └─────┬─────┘   └────┬─────┘           │
          │               │                 │
          ▼               ▼                 ▼
    ┌──────────────────────────────────────────┐
    │ POST /api/marketplaces/connect           │
    │   → Generate OAuth URL (state=CSRF)      │
    │   → Redirect to marketplace              │
    │   → Callback: exchange code for tokens   │
    │   → encryptToken() (AES-256-GCM)        │
    │   → Store in MarketplaceConnection       │
    │   → Register webhooks                    │
    └──────────────────┬───────────────────────┘
                       │
                       │  (minimum 1 marketplace connected)
                       ▼
╔══════════════════════════════════════════════════════════════════════╗
║                  STEP 2: BUSINESS PROFILE                           ║
║                    /onboarding/profile                               ║
╚══════════════════════════════════════════════════════════════════════╝
                       │
                       ▼
    ┌──────────────────────────────────────────┐
    │ Select Industry (13 options):            │
    │   FASHION, ELECTRONICS, HOME_GARDEN,     │
    │   BEAUTY, FOOD, SPORTS, TOYS, etc.       │
    │                                          │
    │ Select Business Size:                    │
    │   SOLO → SMALL → MEDIUM → LARGE         │
    │                                          │
    │ Optional: primaryCategory, targetMarket  │
    │                                          │
    │ → POST /api/onboarding/profile           │
    │ → Upsert BusinessProfile                 │
    │ (Can skip — defaults to OTHER industry)  │
    └──────────────────┬───────────────────────┘
                       │
                       ▼
╔══════════════════════════════════════════════════════════════════════╗
║                  STEP 3: PAYMENT                                    ║
║                   /onboarding/payment                                ║
╚══════════════════════════════════════════════════════════════════════╝
                       │
                       ▼
    ┌──────────────────────────────────────────┐
    │ PRICING LOGIC:                           │
    │   Base Price (₹999) + ₹449 per extra     │
    │   marketplace beyond included count      │
    │                                          │
    │ RAZORPAY FLOW:                           │
    │   1. POST /api/subscription/checkout     │
    │      → Create/reuse RazorpayPlan         │
    │      → Create Razorpay subscription      │
    │      → Return subscriptionId + keyId     │
    │                                          │
    │   2. Razorpay checkout modal opens       │
    │      → User enters card/UPI details      │
    │                                          │
    │   3. POST /api/subscription/verify       │
    │      → HMAC signature validation         │
    │      → Create Subscription (ACTIVE)      │
    └──────────────────┬───────────────────────┘
                       │
                       ▼
              Redirect to /chat
            ✅ ONBOARDING COMPLETE
```

---

## Background: First Sync & AI Bootstrap

```
╔══════════════════════════════════════════════════════════════════════╗
║              CRON: MARKETPLACE SYNC (every few minutes)             ║
╚══════════════════════════════════════════════════════════════════════╝
                       │
                       ▼
    ┌──────────────────────────────────────────┐
    │ GET /api/cron/sync                       │
    │   → Pick 5 oldest connections (CAS lock) │
    │   → Fetch orders/products from API       │
    │   → Upsert UnifiedOrder,                 │
    │     UnifiedProduct, UnifiedOrderItem     │
    │   → rawData sanitized before storage     │
    └──────────────────┬───────────────────────┘
                       │
                       │  (First sync for a new user?)
                       ▼
    ┌──────────────────────────────────────────┐
    │ BOOTSTRAP BELIEFS (one-time per user)    │
    │   CAS on User.bootstrappedAt             │
    │                                          │
    │   1. Load IndustryPack from              │
    │      BusinessProfile.industry            │
    │   2. Seed industry-specific beliefs      │
    │   3. Analyze sync data:                  │
    │      → Large catalog? Multi-channel?     │
    │      → High/Low AOV? Inventory needed?   │
    │   4. Create welcome Note (48h TTL)       │
    │   5. Take AiMaturitySnapshot (Infant)    │
    └──────────────────────────────────────────┘
```

---

## Main AI Chat Loop

```
╔══════════════════════════════════════════════════════════════════════╗
║                     AI CHAT (/chat)                                  ║
║                User sends a message                                  ║
╚══════════════════════════════════════════════════════════════════════╝
                       │
                       ▼
    ┌──────────────────────────────────────────┐
    │ POST /api/chat/message                   │
    │   1. Auth + Rate limit (20 req/60s/user) │
    │   2. Subscription check (ACTIVE/TRIAL)   │
    │   3. Load/create Conversation            │
    │   4. Save user Message                   │
    └──────────────────┬───────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────┐
    │ BUILD WORKING MEMORY (7 parallel queries)│
    │   ┌─────────────┐  ┌──────────────────┐ │
    │   │ Beliefs     │  │ Contextual Notes │ │
    │   │ (strength   │  │ (relevant to     │ │
    │   │  > 0.3)     │  │  message)        │ │
    │   └─────────────┘  └──────────────────┘ │
    │   ┌─────────────┐  ┌──────────────────┐ │
    │   │ Pending     │  │ AI Maturity      │ │
    │   │ Alerts (3)  │  │ Stage + Score    │ │
    │   └─────────────┘  └──────────────────┘ │
    │   ┌─────────────┐  ┌──────────────────┐ │
    │   │ Business    │  │ Top Customers    │ │
    │   │ Profile     │  │ (pseudonymized)  │ │
    │   └─────────────┘  └──────────────────┘ │
    │   ┌──────────────────────────────────┐   │
    │   │ Channel Inventory Summary        │   │
    │   └──────────────────────────────────┘   │
    └──────────────────┬───────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────┐
    │ SYSTEM PROMPT = FRAME_SYSTEM_PROMPT      │
    │   (Frax identity, rules, autonomy)       │
    │   + Working Memory Block                 │
    │   + Message History (last 20 msgs)       │
    └──────────────────┬───────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────┐
    │ TOOL LOOP (up to 3 rounds)               │
    │                                          │
    │   OpenAI (gpt-4o-mini)                   │
    │        │                                 │
    │        ├── Calls tools? ──► Execute ─┐   │
    │        │   (max 4 parallel)          │   │
    │        │                             │   │
    │        │   15 AVAILABLE TOOLS:       │   │
    │        │   ├─ get_revenue_metrics    │   │
    │        │   ├─ get_top_products       │   │
    │        │   ├─ get_top_customers      │   │
    │        │   ├─ get_daily_revenue      │   │
    │        │   ├─ get_store_overview     │   │
    │        │   ├─ get_low_stock_products │   │
    │        │   ├─ get_channel_comparison │   │
    │        │   ├─ compare_periods        │   │
    │        │   ├─ get_product_profit     │   │
    │        │   ├─ get_demand_forecast    │   │
    │        │   ├─ get_order_status       │   │
    │        │   ├─ get_geographic_insights│   │
    │        │   ├─ create_note            │   │
    │        │   ├─ get_my_notes           │   │
    │        │   └─ dismiss_note           │   │
    │        │                             │   │
    │        ◄── Tool results ─────────────┘   │
    │        │                                 │
    │        ▼ (after 3 rounds or no tools)    │
    │   Final text response                    │
    └──────────────────┬───────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────┐
    │ POST-RESPONSE                            │
    │   → Save assistant Message (awaited)     │
    │   → after(): fire-and-forget ops         │
    │     ├─ incrementValidatedCycles (beliefs) │
    │     └─ markAlertsSurfaced                │
    │   → maybeCreateMicroBelief (per tool,    │
    │     fire-and-forget in tool loop)        │
    └──────────────────────────────────────────┘
```

### Post-Response Reliability

```
┌──────────────────────────────────────────────────────────────────────┐
│ OPERATION               │ IDEMPOTENT? │ FAILURE MODE & RECOVERY     │
├─────────────────────────┼─────────────┼─────────────────────────────┤
│ Save assistant Message  │ No (create) │ AWAITED in main flow —      │
│ (prisma.message.create) │             │ failure returns 500 to      │
│                         │             │ client, user can retry.     │
│                         │             │ Not fire-and-forget.        │
├─────────────────────────┼─────────────┼─────────────────────────────┤
│ incrementValidatedCycles│ Yes (CAS    │ Runs in after() with        │
│ (belief strength update)│ idempotent  │ Promise.allSettled. Failure  │
│                         │ on same     │ logged to console. Lost     │
│                         │ cycle)      │ update = 1 missed cycle     │
│                         │             │ count — self-corrects on    │
│                         │             │ next conversation turn.     │
├─────────────────────────┼─────────────┼─────────────────────────────┤
│ markAlertsSurfaced      │ Yes (sets   │ Runs in after() with        │
│ (alert.surfacedAt flag) │ surfacedAt  │ Promise.allSettled. Failure  │
│                         │ if null)    │ = alert resurfaces next     │
│                         │             │ turn (safe, slightly noisy).│
├─────────────────────────┼─────────────┼─────────────────────────────┤
│ maybeCreateMicroBelief  │ Mostly (CAS │ .catch() in tool loop —     │
│ (pattern → new belief)  │ on belief   │ logged as console.warn.     │
│                         │ upsert,     │ Failure = missed belief     │
│                         │ rate-limited│ creation. Pattern will be   │
│                         │ per convo)  │ re-detected on next similar │
│                         │             │ tool call.                  │
└─────────────────────────┴─────────────┴─────────────────────────────┘

  CURRENT GUARANTEES:
  • Save Message — fully durable (awaited, transactional via Prisma)
  • after() ops — best-effort; logged on failure; self-healing on retry
  • Micro-beliefs — best-effort; rate-limited; re-detectable

  KNOWN GAPS:
  • No persistent task queue — after() relies on Vercel's
    serverless lifecycle; function cold-stop loses in-flight work
  • No dead-letter tracking — failures only visible in logs
  • No reconciliation job — belief cycle counts can drift if
    after() consistently fails for a user

  RECOMMENDED IMPROVEMENTS:
  • For critical belief adjustments: use a durable job queue
    (e.g., Inngest, QStash, or DB-backed task table) to ensure
    eventual consistency even if the serverless function exits
  • Add a reconciliation cron that detects conversations with
    assistant messages but no corresponding validatedCycles
    increment (join Message + Belief on timestamps)
  • Surface after() failure rates via structured logging or
    an operational dashboard for alerting on systemic issues
```

---

## Feedback Loop (How AI Learns)

```
╔══════════════════════════════════════════════════════════════════════╗
║                    FEEDBACK & LEARNING                               ║
╚══════════════════════════════════════════════════════════════════════╝

    User gives 👍 or 👎 on AI response
                   │
                   ▼
    POST /api/chat/feedback
                   │
                   ▼
    ┌──────────────────────────────────────────┐
    │ recordFeedback(userId, messageId, rating)│
    │                                          │
    │   → Read message's queryData (tools used)│
    │   → For each tool's belief:              │
    │       👍 → strength += reward (1x)       │
    │       👎 → strength -= penalty (2x)      │
    │   → CAS retry (up to 3x) on Belief      │
    │                                          │
    │   RESULT: Frax gets better at knowing    │
    │   which tools/approaches work for this   │
    │   specific user's business               │
    └──────────────────────────────────────────┘

    AI MATURITY STAGES (evolves over time):
    ┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌────────┐
    │  Infant  │→ │ Apprentice │→ │ Professional │→ │ Expert │
    └──────────┘  └────────────┘  └──────────────┘  └────────┘
      (new user)    (learning)      (reliable)       (trusted)
```

---

## Background Cron Jobs

```
╔══════════════════════════════════════════════════════════════════════╗
║                    AUTOMATED BACKGROUND SYSTEMS                      ║
╚══════════════════════════════════════════════════════════════════════╝

  ┌─────────────────────────────────────────────────────────────────┐
  │ CRON: ALERTS (Hourly, 24-shard rotation)                       │
  │   /api/cron/alerts                                             │
  │                                                                │
  │   Users split into 24 shards (hour % 24)                       │
  │   Each hour processes 1 shard (up to 400 users, 10 concurrent) │
  │                                                                │
  │   4 DETECTORS run in parallel per user:                        │
  │                                                                │
  │   ┌─────────────────┐    ┌─────────────────┐                   │
  │   │ Stockout Risk   │    │ Demand Surge    │                   │
  │   │ inventory /     │    │ 7-day vs 30-day │                   │
  │   │ daily velocity  │    │ velocity (2x+)  │                   │
  │   │ < 8 days        │    │                 │                   │
  │   └─────────────────┘    └─────────────────┘                   │
  │   ┌─────────────────┐    ┌─────────────────┐                   │
  │   │ Revenue Anomaly │    │ Return Patterns │                   │
  │   │ z-score vs same │    │ >10% return rate│                   │
  │   │ weekday history │    │ per product     │                   │
  │   │ (|z| >= 2.0)    │    │ (min 5 orders)  │                   │
  │   └─────────────────┘    └─────────────────┘                   │
  │                                                                │
  │   → Creates Alert records (dedup via unique constraint)        │
  │   → Alerts surface in next chat via working memory             │
  └─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ CRON: WEEKLY BRIEFING (Every Monday 00:00 UTC)                 │
  │   /api/cron/briefing                                           │
  │                                                                │
  │   → Aggregate last week's metrics                              │
  │   → AI generates 200-300 word narrative (OpenAI)               │
  │   → Save WeeklyBriefing + AiMaturitySnapshot                   │
  │   → Send email via Resend (claim-first dedup)                  │
  └─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ CRON: CLEANUP (Daily)                                          │
  │   /api/cron/cleanup                                            │
  │                                                                │
  │   → PII anonymization (orders > 365 days)                      │
  │   → Delete expired: RevokedTokens, WebhookEvents, AuditLogs   │
  │   → Expire/cleanup old Notes and Alerts (30 days)              │
  │   → Prune AiMaturitySnapshots (365 days)                       │
  └─────────────────────────────────────────────────────────────────┘
```

---

## Ongoing Billing (Post-Onboarding)

```
╔══════════════════════════════════════════════════════════════════════╗
║                    SUBSCRIPTION LIFECYCLE                             ║
╚══════════════════════════════════════════════════════════════════════╝

  Razorpay auto-charges monthly
           │
           ▼
  Webhook → /api/webhooks/razorpay
           │
           ├── payment.captured    → Subscription stays ACTIVE
           ├── payment.failed      → Subscription → PAST_DUE
           ├── subscription.paused → Subscription → PAUSED
           └── subscription.cancelled → Subscription → CANCELED
                                              │
                                              ▼
                                   User blocked from /chat
                                   (subscription check fails)
                                   Redirected to /onboarding/payment

  SUBSCRIPTION STATES:
  ┌───────┐    ┌────────┐    ┌──────────┐    ┌──────────┐
  │ TRIAL │ →  │ ACTIVE │ →  │ PAST_DUE │ →  │ CANCELED │
  └───────┘    └────────┘    └──────────┘    └──────────┘
                  │                              ▲
                  └── PAUSED ────────────────────┘
                  └── UNPAID (pre-checkout) ─────┘
```

---

## Complete Journey Summary

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                         ║
║   Self-Signup ──┐                                                       ║
║                 ├──► Session ──► Connect Marketplaces (OAuth/API Key)    ║
║   Sales Trial ──┘       │        (Shopify, eBay, Etsy, Flipkart,        ║
║                         │         WooCommerce, BigCommerce, Wix,        ║
║                         │         Square, Magento)                      ║
║                         │                    │                          ║
║                         │                    ▼                          ║
║                         │           Business Profile (optional)         ║
║                         │                    │                          ║
║                         │                    ▼                          ║
║                         │           Payment via Razorpay                ║
║                         │           (₹999 base + ₹449/extra)           ║
║                         │                    │                          ║
║                         │                    ▼                          ║
║                         │         ┌──── /chat (Frax AI) ◄────┐         ║
║                         │         │          │                │         ║
║                         │         │    ┌─────┴──────┐        │         ║
║                         │         │    ▼            ▼        │         ║
║                         │         │  User asks    Proactive  │         ║
║                         │         │  questions    Alerts     │         ║
║                         │         │    │          surface    │         ║
║                         │         │    ▼            │        │         ║
║                         │         │  AI calls      │        │         ║
║                         │         │  tools (15)    │        │         ║
║                         │         │    │           │        │         ║
║                         │         │    ▼           │        │         ║
║                         │         │  Response +   │        │         ║
║                         │         │  micro-beliefs│        │         ║
║                         │         │    │           │        │         ║
║                         │         │    ▼           │        │         ║
║                         │         │  Feedback ─────┘        │         ║
║                         │         │  (👍/👎 updates beliefs) │         ║
║                         │         │                         │         ║
║                    BACKGROUND:    │                         │         ║
║                    ├─ Sync (5 connections/run, every few min)         ║
║                    ├─ Alerts (hourly, 4 detectors)          │         ║
║                    ├─ Weekly Briefing (Monday, email) ──────┘         ║
║                    └─ Cleanup (daily, GDPR compliance)                ║
║                                                                         ║
╚═══════════════════════════════════════════════════════════════════════════╝
```
