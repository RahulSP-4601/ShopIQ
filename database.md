# Frame Database Documentation

## Core Users

### User
Your clients — business owners who sign up and use Frame to analyze their sales data across multiple marketplaces.

**Key fields:** name, email, passwordHash, profile info (phone, city, state, country)

### Employee
Your internal team. Two roles:
- **FOUNDER** — Admins who manage the platform, approve sales members, and oversee everything
- **SALES_MEMBER** — Sales reps who bring in new clients via referral codes and earn commissions

**Key fields:** name, email, role, isApproved, refCode, commissionRate

---

## Marketplace Connections

### MarketplaceConnection
When a client connects their store from any marketplace, one record is created per marketplace per user. Stores encrypted OAuth tokens so Frame can pull their data automatically.

**Supported marketplaces (10):**
Shopify, eBay, Etsy, WooCommerce, BigCommerce, Wix, Square, Magento, Flipkart, SnapDeal

**Planned (2):** Amazon, PrestaShop

**Key fields:** marketplace, status (PENDING/CONNECTED/DISCONNECTED/ERROR), accessToken (encrypted), refreshToken (encrypted), externalId, externalName, syncInProgress

---

## Unified Data (Heart of Analytics)

All marketplace data lands here in a single, consistent format — regardless of whether it came from Shopify, eBay, Etsy, or any other marketplace.

### UnifiedOrder
Every order from every connected marketplace.

**Key fields:** marketplace, externalOrderId, status (PENDING/CONFIRMED/SHIPPED/DELIVERED/CANCELLED/RETURNED), currency, totalAmount, customerName, customerEmail, orderedAt, fulfilledAt

### UnifiedProduct
Every product from every marketplace.

**Key fields:** marketplace, externalId, title, sku, category, price, currency, inventory, status (ACTIVE/INACTIVE/OUT_OF_STOCK), imageUrl

### UnifiedOrderItem
Individual line items within each order (e.g., "2x Blue T-Shirt at $25 each"). Links back to both the order and the product.

**Key fields:** title, sku, quantity, unitPrice, totalPrice, currency

### UnifiedSyncLog
Tracks every sync attempt — whether it succeeded or failed, how many records were synced, and what triggered it.

**Key fields:** marketplace, entity (orders/products), status (started/completed/failed), syncedCount, trigger (cron/webhook/manual)

---

## AI Chat & Reports

### Conversation
A chat thread between a client and the AI assistant. Each user can have multiple conversations.

**Key fields:** userId, title

### Message
Individual messages within a conversation — both user questions and AI responses.

**Key fields:** role (USER/ASSISTANT), content, queryData (for AI context)

### Attachment
Files or voice recordings attached to messages (stored in Supabase Storage).

**Key fields:** type (file/audio), name, size, mimeType, url, path

### Report
Generated analytics reports with AI-powered summaries. Four types available:
- **Revenue Summary** — Revenue trends, order counts, average order value
- **Product Analysis** — Top products, inventory levels, pricing insights
- **Customer Insights** — Top customers, spending patterns, customer lifetime value
- **Full Analysis** — Complete marketplace overview combining all the above

**Key fields:** type, title, content (raw data), summary (AI-generated), status (PENDING/GENERATING/COMPLETED/FAILED)

---

## Billing

### Subscription
Each client's subscription and billing information.

**Key fields:** status (TRIAL/ACTIVE/PAST_DUE/CANCELED/UNPAID/PAUSED), basePrice, additionalPrice, totalPrice, marketplaceCount, stripeCustomerId, stripeSubscriptionId, currentPeriodStart, currentPeriodEnd

---

## Sales Team

### TrialRequest
Incoming trial signup requests from potential clients. Can be linked to a sales member's referral code.

**Key fields:** name, email, phone, refCode, status (PENDING/CONTACTED/CONVERTED/DECLINED)

### SalesClient
Clients assigned to and tracked by a sales member. Manages the pipeline from lead to paying customer.

**Key fields:** salesMemberId, name, email, status, trialToken, trialSentAt, clientUserId (links to the actual User account once they sign up)

### Commission
Commission payments earned by sales members for bringing in clients. Two types:
- **INITIAL** — One-time signup bonus when a referred client subscribes
- **RECURRING** — Monthly recurring commission (period stored as YYYY-MM format)

**Key fields:** salesMemberId, salesClientId, amount, period ("INITIAL" or "YYYY-MM"), note

---

## PII Handling & Compliance

### Encryption at Rest

**OAuth tokens:** `accessToken`, `refreshToken`, `webhookSecret` on MarketplaceConnection are encrypted using AES-256-GCM at the application layer. Use `encryptToken()` / `decryptToken()` for all reads and writes.

**PII fields (also AES-256-GCM):**
- **UnifiedOrder:** `customerName`, `customerEmail`
- **User:** `phone`, `city`, `state`, `zipCode`, `country` (note: `name` and `email` are kept in plaintext for login/search — apply pseudonymization or hashing if searchability is not needed)
- **SalesClient:** `name`, `email`, `phone`
- **TrialRequest:** `name`, `email`, `phone`

Use the same `encryptToken()` / `decryptToken()` helpers for PII encryption. All writes MUST encrypt; all reads MUST decrypt. PII MUST NOT appear in logs, error messages, or analytics pipelines.

**Key management:**
- Encryption key is stored in the `TOKEN_ENCRYPTION_KEY` env var (fallback: `SESSION_SECRET`, deprecated).
- **Production target:** Migrate to a KMS/Vault-backed key. The env var should hold a KMS key reference, and `encryptToken()`/`decryptToken()` should call KMS encrypt/decrypt APIs.
- **Key rotation:** When rotating, keep the previous key available. Update `decryptToken()` to attempt decryption with the current key first, then fall back to the previous key. Re-encrypt records in a background migration, then retire the old key. Tag ciphertexts with a key version prefix (e.g., `v2:...`) to support multi-key decryption.
- **Access control:** Only the application service account should have access to the encryption key. Audit all key access via KMS/Vault audit logs.
- **Disaster recovery:** Back up key material in a separate, access-controlled location. If a key is lost and no backup exists, affected ciphertext is unrecoverable — document this risk and maintain offline key escrow.

### Data Retention

**PII cleanup (daily cron — `/api/cron/cleanup`):**
- NULLs `customerName` and `customerEmail` on UnifiedOrders older than 365 days
- Deletes expired RevokedTokens (past `expiresAt`)
- Deletes WebhookEvents older than 7 days
- Pseudonymizes then deletes AuditLogs older than `AUDIT_LOG_RETENTION_DAYS` (default 365 days — see AuditLog retention below)

**AI reports and derived data:**
- Report `content` (raw analytics JSON) and `summary` (AI-generated text) do not contain raw PII — they use aggregated/anonymized metrics. No additional scrubbing needed unless report templates change to include customer-level data, in which case add a retention sweep.
- Conversation messages and queryData may reference aggregated store metrics but MUST NOT contain raw PII. Verify this invariant when adding new AI context sources.

**Database backups:**
- Backups should follow a rotation schedule (e.g., daily for 7 days, weekly for 4 weeks, monthly for 12 months).
- PII in backups: Use scrub-on-restore — when restoring a backup older than 365 days, run the PII cleanup job immediately after restore to NULL stale PII fields. Alternatively, use scrub-before-backup if your backup tooling supports pre-processing hooks.
- Ensure backup storage is encrypted at rest and access-controlled to the same standard as the production database.

**Logs and error tracking:**
- Application logs MUST NOT contain PII (enforced by code review — see schema comments mandating "MUST NOT appear in logs").
- If using external error-tracking services (e.g., Sentry), configure PII scrubbing rules to redact `customerName`, `customerEmail`, `phone`, and other PII fields before transmission.
- Log retention should not exceed 90 days for any pipeline containing request/response bodies.

**Verification:**
- Add automated tests that assert PII fields are NULL on orders older than 365 days after the cleanup cron runs.
- Periodically audit backup restores to confirm PII scrubbing is applied correctly.

### GDPR / CCPA
- **Account Deletion:** `POST /api/account/delete` performs a transactional cascade delete of the user and all associated data (connections, orders, products, conversations, reports, subscription)
- **Right to Access:** User data is scoped by `userId` — all queries are user-isolated
- **Right to Data Portability:** `GET /api/account/export` returns all user-scoped data as a structured, machine-readable JSON payload. Implementation details:
  - **Auth:** Same session/userId guard as other user-scoped endpoints (`!session?.userId` → 401)
  - **Scope:** User profile, MarketplaceConnections (minus encrypted tokens), UnifiedOrders + UnifiedOrderItems, UnifiedProducts, Conversations + Messages + Attachments, Reports, Subscription
  - **Consistency:** Use a Prisma interactive transaction (`prisma.$transaction`) for a consistent snapshot — same service module as account deletion
  - **Metadata envelope:** `{ exportTimestamp, userId, formatVersion: "1.0", data: { ... } }`
  - **Large exports:** Stream using NDJSON (`application/x-ndjson`) or paginate with cursor-based pagination if the user has >10k orders. Set a response timeout and use `Transfer-Encoding: chunked` to avoid memory exhaustion
  - **Sensitive fields:** Decrypt PII fields (customerName, customerEmail) before including in the export. Exclude raw OAuth tokens and passwordHash — these are not user data

### Audit Trail
All security-sensitive events (logins, logouts, password resets, marketplace connect/disconnect) are recorded in the AuditLog table with IP address and user agent.

---

## Security & Infrastructure

### RevokedToken
Blacklisted JWT session tokens — used when a user logs out or when a session token is refreshed. Prevents reuse of old tokens.

**Key fields:** jti (JWT ID), userId, expiresAt (auto-cleaned after expiry)

### AuditLog
Tracks security-sensitive events across the platform.

**Tracked events:** LOGIN, LOGOUT, LOGIN_FAILED, SESSION_CREATED, SESSION_REVOKED, PASSWORD_RESET_REQUESTED, PASSWORD_RESET_COMPLETED, MARKETPLACE_CONNECTED, MARKETPLACE_DISCONNECTED

**Key fields:** userId, action, ipAddress, userAgent, metadata

**Retention:** 365 days (configurable via `AUDIT_LOG_RETENTION_DAYS` env var). The daily cleanup cron (`/api/cron/cleanup`) handles audit records in two phases:
1. **PII pseudonymization** — NULLs `ipAddress` and `userAgent` on records older than `PII_RETENTION_DAYS` (default 365 days), preserving the action/timestamp/userId for compliance
2. **Record deletion** — Deletes records older than `AUDIT_LOG_RETENTION_DAYS` (default 365 days)

If `AUDIT_LOG_RETENTION_DAYS` > `PII_RETENTION_DAYS`, PII is scrubbed first while keeping the record. If they are equal, deletion covers PII removal and the pseudonymization step is skipped.

### WebhookEvent
Prevents processing the same marketplace webhook twice (deduplication). Automatically cleaned up after 7 days.

**Key fields:** marketplace, eventId, eventType, processedAt

---

## Data Flows

### Client Flow
```
Client signs up (User)
  → connects marketplaces (MarketplaceConnection)
    → data syncs into unified tables (UnifiedOrder / UnifiedProduct / UnifiedOrderItem)
      → AI analyzes it through chat (Conversation / Message) and reports (Report)
```

### Sales Team Flow
```
Founder creates Employee (SALES_MEMBER)
  → sales member gets approved + assigned refCode
    → shares referral link with potential clients
      → lead submits TrialRequest (linked via refCode)
        → sales member tracks them as SalesClient
          → sends trial invite (trialToken via email)
            → client signs up as User (linked via clientUserId on SalesClient)
              → client subscribes (Subscription)
                → Commission generated for the sales member
```
