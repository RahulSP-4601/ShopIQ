-- Migration: Ensure UnifiedOrder and UnifiedProduct unique constraints are connection-scoped
-- Run this BEFORE deploying code changes that depend on these constraints.
--
-- Pre-requisites:
-- 1. Take a database backup
-- 2. Ensure no sync cron jobs are running (disable the cron schedule temporarily)
--
-- The schema expects:
--   UnifiedOrder:   @@unique([connectionId, externalOrderId])
--   UnifiedProduct: @@unique([connectionId, externalId])
--
-- If you previously had marketplace-scoped constraints like:
--   @@unique([marketplace, externalOrderId])  or  @@unique([userId, marketplace, externalOrderId])
-- this script safely transitions to connection-scoped constraints.

-- ============================================
-- Step 0: Pre-migration diagnostic — run BEFORE the migration to identify duplicates
-- These SELECT queries are safe to run at any time (read-only).
-- If either returns rows, resolve duplicates manually before proceeding.
-- ============================================

-- Duplicate report for UnifiedOrder: lists every (connectionId, externalOrderId) pair
-- that has more than one row, along with the row IDs and timestamps for manual resolution.
-- Resolution options:
--   a) DELETE the older duplicate (keep the row with the latest syncedAt)
--   b) UPDATE one duplicate to a different connectionId if it was mis-assigned
--
-- SELECT o.id, o."connectionId", o."externalOrderId", o."marketplace", o."syncedAt", o."createdAt"
-- FROM "UnifiedOrder" o
-- INNER JOIN (
--   SELECT "connectionId", "externalOrderId"
--   FROM "UnifiedOrder"
--   GROUP BY "connectionId", "externalOrderId"
--   HAVING COUNT(*) > 1
-- ) dupes ON o."connectionId" = dupes."connectionId"
--        AND o."externalOrderId" = dupes."externalOrderId"
-- ORDER BY o."connectionId", o."externalOrderId", o."syncedAt" DESC;

-- Duplicate report for UnifiedProduct: same approach.
--
-- SELECT p.id, p."connectionId", p."externalId", p."marketplace", p."syncedAt", p."createdAt"
-- FROM "UnifiedProduct" p
-- INNER JOIN (
--   SELECT "connectionId", "externalId"
--   FROM "UnifiedProduct"
--   GROUP BY "connectionId", "externalId"
--   HAVING COUNT(*) > 1
-- ) dupes ON p."connectionId" = dupes."connectionId"
--        AND p."externalId" = dupes."externalId"
-- ORDER BY p."connectionId", p."externalId", p."syncedAt" DESC;

-- Duplicate report for UnifiedOrderItem: same approach.
--
-- SELECT oi.id, oi."orderId", oi."externalItemId", oi."createdAt"
-- FROM "UnifiedOrderItem" oi
-- INNER JOIN (
--   SELECT "orderId", "externalItemId"
--   FROM "UnifiedOrderItem"
--   GROUP BY "orderId", "externalItemId"
--   HAVING COUNT(*) > 1
-- ) dupes ON oi."orderId" = dupes."orderId"
--        AND oi."externalItemId" = dupes."externalItemId"
-- ORDER BY oi."orderId", oi."externalItemId", oi."createdAt" DESC;

-- Auto-fix: keep newest row per (connectionId, externalOrderId) and delete older duplicates.
-- Uncomment and run ONLY after reviewing the diagnostic queries above.
-- Tie-breaker: when syncedAt is equal, keep the row with the higher id.
--
-- DELETE FROM "UnifiedOrderItem" WHERE "orderId" IN (
--   SELECT id FROM "UnifiedOrder" o
--   WHERE EXISTS (
--     SELECT 1 FROM "UnifiedOrder" o2
--     WHERE o2."connectionId" = o."connectionId"
--       AND o2."externalOrderId" = o."externalOrderId"
--       AND (o2."syncedAt" > o."syncedAt" OR (o2."syncedAt" = o."syncedAt" AND o2.id > o.id))
--   )
-- );
-- DELETE FROM "UnifiedOrder" o
-- WHERE EXISTS (
--   SELECT 1 FROM "UnifiedOrder" o2
--   WHERE o2."connectionId" = o."connectionId"
--     AND o2."externalOrderId" = o."externalOrderId"
--     AND (o2."syncedAt" > o."syncedAt" OR (o2."syncedAt" = o."syncedAt" AND o2.id > o.id))
-- );
--
-- DELETE FROM "UnifiedProduct" p
-- WHERE EXISTS (
--   SELECT 1 FROM "UnifiedProduct" p2
--   WHERE p2."connectionId" = p."connectionId"
--     AND p2."externalId" = p."externalId"
--     AND (p2."syncedAt" > p."syncedAt" OR (p2."syncedAt" = p."syncedAt" AND p2.id > p.id))
-- );
--
-- DELETE FROM "UnifiedOrderItem" oi
-- WHERE EXISTS (
--   SELECT 1 FROM "UnifiedOrderItem" oi2
--   WHERE oi2."orderId" = oi."orderId"
--     AND oi2."externalItemId" = oi."externalItemId"
--     AND oi2.id > oi.id
-- );

-- ============================================
-- Migration begins here — run inside a transaction
-- ============================================

BEGIN;

-- ============================================
-- Step 1: Validate — check for duplicate rows that would violate the new constraints
-- ============================================

-- Check UnifiedOrder duplicates (should return 0 rows)
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT "connectionId", "externalOrderId", COUNT(*) as cnt
    FROM "UnifiedOrder"
    GROUP BY "connectionId", "externalOrderId"
    HAVING COUNT(*) > 1
  ) dupes;

  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Found % duplicate UnifiedOrder rows for (connectionId, externalOrderId). Run the diagnostic queries in Step 0 to identify and resolve duplicates before retrying.', dup_count;
  END IF;
END $$;

-- Check UnifiedProduct duplicates (should return 0 rows)
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT "connectionId", "externalId", COUNT(*) as cnt
    FROM "UnifiedProduct"
    GROUP BY "connectionId", "externalId"
    HAVING COUNT(*) > 1
  ) dupes;

  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Found % duplicate UnifiedProduct rows for (connectionId, externalId). Run the diagnostic queries in Step 0 to identify and resolve duplicates before retrying.', dup_count;
  END IF;
END $$;

-- Check UnifiedOrderItem duplicates (should return 0 rows)
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT "orderId", "externalItemId", COUNT(*) as cnt
    FROM "UnifiedOrderItem"
    GROUP BY "orderId", "externalItemId"
    HAVING COUNT(*) > 1
  ) dupes;

  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Found % duplicate UnifiedOrderItem rows for (orderId, externalItemId). Resolve duplicates before retrying.', dup_count;
  END IF;
END $$;

-- ============================================
-- Step 2: Drop old constraints if they exist (safe — uses IF EXISTS)
-- ============================================

-- Drop any old marketplace-scoped unique index on UnifiedOrder
DROP INDEX IF EXISTS "UnifiedOrder_marketplace_externalOrderId_key";
DROP INDEX IF EXISTS "UnifiedOrder_userId_marketplace_externalOrderId_key";

-- Drop any old marketplace-scoped unique index on UnifiedProduct
DROP INDEX IF EXISTS "UnifiedProduct_marketplace_externalId_key";
DROP INDEX IF EXISTS "UnifiedProduct_userId_marketplace_externalId_key";

-- ============================================
-- Step 3: Create connection-scoped unique constraints (idempotent)
-- ============================================

-- UnifiedOrder: unique on (connectionId, externalOrderId)
CREATE UNIQUE INDEX IF NOT EXISTS "UnifiedOrder_connectionId_externalOrderId_key"
  ON "UnifiedOrder" ("connectionId", "externalOrderId");

-- UnifiedProduct: unique on (connectionId, externalId)
CREATE UNIQUE INDEX IF NOT EXISTS "UnifiedProduct_connectionId_externalId_key"
  ON "UnifiedProduct" ("connectionId", "externalId");

-- UnifiedOrderItem: unique on (orderId, externalItemId)
CREATE UNIQUE INDEX IF NOT EXISTS "UnifiedOrderItem_orderId_externalItemId_key"
  ON "UnifiedOrderItem" ("orderId", "externalItemId");

COMMIT;

-- ============================================
-- ROLLBACK (if needed — run these manually):
-- ============================================
-- DROP INDEX IF EXISTS "UnifiedOrder_connectionId_externalOrderId_key";
-- DROP INDEX IF EXISTS "UnifiedProduct_connectionId_externalId_key";
-- DROP INDEX IF EXISTS "UnifiedOrderItem_orderId_externalItemId_key";
-- Then recreate your old indexes as needed.
