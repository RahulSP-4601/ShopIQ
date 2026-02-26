import { PrismaClient } from "@prisma/client";
// import { PrismaPg } from "@prisma/adapter-pg";  // Disabled for Studio compatibility
import { validateEnv } from "./env";

// ============================================
// STARTUP VALIDATIONS
// ============================================

validateEnv();

// Validate SHOPIFY_LEGACY_SYNC_ENABLED is strictly 'true' or 'false'
const legacySyncFlag = process.env.SHOPIFY_LEGACY_SYNC_ENABLED;
if (legacySyncFlag !== undefined && legacySyncFlag !== "true" && legacySyncFlag !== "false") {
  throw new Error(
    `SHOPIFY_LEGACY_SYNC_ENABLED must be 'true' or 'false', got '${legacySyncFlag}'. ` +
    `Set it explicitly to enforce correct sync pipeline configuration.`
  );
}

// Validate encryption keys are configured in production
if (process.env.NODE_ENV === "production") {
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY environment variable is required in production. " +
      "Generate with: openssl rand -base64 32"
    );
  }
  if (!process.env.JWT_SIGNING_SECRET) {
    throw new Error(
      "JWT_SIGNING_SECRET environment variable is required in production. " +
      "Generate with: openssl rand -base64 32"
    );
  }
}

// Emit deprecation warning if SESSION_SECRET is still being used
if (process.env.SESSION_SECRET) {
  if (!process.env.JWT_SIGNING_SECRET || !process.env.TOKEN_ENCRYPTION_KEY) {
    console.warn(
      "[DEPRECATION] SESSION_SECRET is deprecated. Migrate to JWT_SIGNING_SECRET (for JWT signing) " +
      "and TOKEN_ENCRYPTION_KEY (for token encryption). SESSION_SECRET fallback will be removed in a future release."
    );
  }
}

// ============================================
// PRISMA CLIENT
// ============================================

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// TEMPORARY: Adapter disabled for Prisma Studio compatibility
// Prisma Studio (as of v7.4.0) doesn't support custom adapters and throws ECONNRESET errors
// Re-enable the adapter for production use if needed
// const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
//
// PRISMA VERSION NOTE:
// Pinned to 5.22.0 for Prisma Studio compatibility (v7.x adapter causes ECONNRESET errors).
// Adapter is disabled above. Track upgrade: https://github.com/prisma/prisma/issues (Studio adapter support)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // adapter,  // Disabled for Studio
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// ============================================
// PRISMA MIDDLEWARE
// ============================================

/**
 * Note model middleware: Ensure expiresAt is always derived from ttlHours.
 * This prevents divergence between ttlHours and expiresAt by enforcing a single source of truth.
 *
 * On Note.create: computes expiresAt from createdAt (or current time) + ttlHours
 * On Note.update: recalculates expiresAt if ttlHours is being updated
 */
// Prevent re-registration on hot reload
if (!(globalForPrisma as any)._noteTtlMiddlewareRegistered) {
  (globalForPrisma as any)._noteTtlMiddlewareRegistered = true;

  prisma.$use(async (params, next) => {
  if (params.model === "Note") {
    const MS_PER_HOUR = 3_600_000;

    if (params.action === "create") {
      // Derive expiresAt from ttlHours on creation
      const data = params.args.data as any;
      if (data.ttlHours !== undefined) {
        if (!Number.isFinite(data.ttlHours)) {
          throw new Error(
            `Note middleware: ttlHours must be a finite number, got ${data.ttlHours} (${typeof data.ttlHours})`
          );
        }
        let createdAt: Date;
        if (data.createdAt instanceof Date) {
          createdAt = data.createdAt;
        } else if (typeof data.createdAt === "string") {
          createdAt = new Date(data.createdAt);
          if (isNaN(createdAt.getTime())) {
            console.warn(
              `Note middleware: Invalid createdAt ISO string "${data.createdAt}" - falling back to current time. ` +
              `Record context: ${JSON.stringify({ ttlHours: data.ttlHours, contentLength: data.content?.length })}`
            );
            createdAt = new Date(); // Invalid ISO string, fallback to now
          }
        } else if (typeof data.createdAt === "number") {
          createdAt = new Date(data.createdAt);
          if (isNaN(createdAt.getTime())) {
            console.warn(
              `Note middleware: Invalid numeric createdAt ${data.createdAt} - falling back to current time. ` +
              `Record context: ${JSON.stringify({ ttlHours: data.ttlHours, contentLength: data.content?.length })}`
            );
            createdAt = new Date();
          }
        } else {
          createdAt = new Date();
        }
        const ttlHours = Math.max(1, Math.min(data.ttlHours, 168)); // Clamp to 1h-7d
        if (data.ttlHours !== ttlHours) {
          console.warn(
            `Note middleware (create): ttlHours clamped from ${data.ttlHours} to ${ttlHours} ` +
            `(valid range: 1-168 hours). Context: ${JSON.stringify({ contentLength: data.content?.length })}`
          );
        }
        data.expiresAt = new Date(createdAt.getTime() + ttlHours * MS_PER_HOUR);
        data.ttlHours = ttlHours; // Store the clamped value
      }
    } else if (params.action === "createMany") {
      // Block createMany with ttlHours to prevent bypassing TTL derivation
      const dataArray = params.args.data;
      if (Array.isArray(dataArray) && dataArray.some((item: any) => item.ttlHours !== undefined)) {
        throw new Error(
          `Note middleware: createMany with ttlHours is not supported. ` +
          `Bulk operations cannot properly derive per-record expiresAt timestamps. ` +
          `Use individual create() calls or handle TTL calculation before calling createMany.`
        );
      }
    } else if (params.action === "update") {
      // Recalculate expiresAt if ttlHours is being updated
      const data = params.args.data as any;
      if (data.ttlHours !== undefined) {
        if (!Number.isFinite(data.ttlHours)) {
          throw new Error(
            `Note middleware: ttlHours must be a finite number, got ${data.ttlHours} (${typeof data.ttlHours})`
          );
        }
        const ttlHours = Math.max(1, Math.min(data.ttlHours, 168)); // Clamp to 1h-7d
        if (data.ttlHours !== ttlHours) {
          console.warn(
            `Note middleware (update): ttlHours clamped from ${data.ttlHours} to ${ttlHours} ` +
            `(valid range: 1-168 hours)`
          );
        }
        // Fetch the existing record's createdAt to preserve original TTL anchor.
        // This prevents ttlHours updates from resetting the TTL clock to now.
        // TOCTOU note: createdAt is read here but applied in the subsequent update — a concurrent
        // update that changes createdAt (or deletes the row) between this lookup and the update
        // could produce a stale expiresAt. Prisma middleware doesn't support SELECT ... FOR UPDATE,
        // so this is accepted as a low-probability race (createdAt is immutable by convention).
        let baseTime: number | null = null;
        try {
          const existing = await prisma.note.findUnique({
            where: params.args.where,
            select: { createdAt: true },
          });
          if (existing === null) {
            console.warn(
              `Note middleware (update): Record not found during TTL anchor lookup — ` +
              `skipping expiresAt/ttlHours update. The update will likely fail with P2025.`
            );
          } else {
            baseTime = existing.createdAt.getTime();
          }
        } catch (lookupErr) {
          // DB error — skip TTL modification rather than silently extending lifetime with Date.now()
          console.warn(
            `Note middleware (update): DB error during TTL anchor lookup — skipping expiresAt/ttlHours update. ` +
            `Error: ${lookupErr instanceof Error ? lookupErr.message : String(lookupErr)}`
          );
        }
        if (baseTime !== null) {
          data.expiresAt = new Date(baseTime + ttlHours * MS_PER_HOUR);
          data.ttlHours = ttlHours; // Store the clamped value
        } else {
          // Cannot determine original createdAt — remove ttlHours from update payload
          // so the existing expiresAt/ttlHours values are preserved unchanged
          delete data.ttlHours;
        }
      }
    } else if (params.action === "updateMany") {
      // Block updateMany with ttlHours to prevent data integrity issues
      const data = params.args.data as any;
      if (data.ttlHours !== undefined) {
        throw new Error(
          `Note middleware: updateMany with ttlHours is not supported. ` +
          `It would apply identical expiresAt to all matched records, breaking per-record TTL. ` +
          `Use individual update() calls, upsert(), or handle TTL updates via create/update only.`
        );
      }
    } else if (params.action === "upsert") {
      // Handle both create and update branches of upsert
      const createData = params.args.create as any;
      const updateData = params.args.update as any;

      if (createData?.ttlHours !== undefined) {
        if (!Number.isFinite(createData.ttlHours)) {
          throw new Error(
            `Note middleware: ttlHours must be a finite number, got ${createData.ttlHours} (${typeof createData.ttlHours})`
          );
        }
        let createdAt: Date;
        if (createData.createdAt instanceof Date) {
          createdAt = createData.createdAt;
        } else if (typeof createData.createdAt === "string") {
          createdAt = new Date(createData.createdAt);
          if (isNaN(createdAt.getTime())) {
            console.warn(
              `Note middleware (upsert create): Invalid createdAt ISO string "${createData.createdAt}" - falling back to current time. ` +
              `Record context: ${JSON.stringify({ ttlHours: createData.ttlHours, contentLength: createData.content?.length })}`
            );
            createdAt = new Date(); // Invalid ISO string, fallback to now
          }
        } else if (typeof createData.createdAt === "number") {
          createdAt = new Date(createData.createdAt);
          if (isNaN(createdAt.getTime())) {
            console.warn(
              `Note middleware (upsert create): Invalid numeric createdAt ${createData.createdAt} - falling back to current time. ` +
              `Record context: ${JSON.stringify({ ttlHours: createData.ttlHours, contentLength: createData.content?.length })}`
            );
            createdAt = new Date();
          }
        } else {
          createdAt = new Date();
        }
        const ttlHours = Math.max(1, Math.min(createData.ttlHours, 168));
        if (createData.ttlHours !== ttlHours) {
          console.warn(
            `Note middleware (upsert create): ttlHours clamped from ${createData.ttlHours} to ${ttlHours} ` +
            `(valid range: 1-168 hours). Context: ${JSON.stringify({ contentLength: createData.content?.length })}`
          );
        }
        createData.expiresAt = new Date(createdAt.getTime() + ttlHours * MS_PER_HOUR);
        createData.ttlHours = ttlHours;
      }

      if (updateData?.ttlHours !== undefined) {
        if (!Number.isFinite(updateData.ttlHours)) {
          throw new Error(
            `Note middleware: ttlHours must be a finite number, got ${updateData.ttlHours} (${typeof updateData.ttlHours})`
          );
        }
        const ttlHours = Math.max(1, Math.min(updateData.ttlHours, 168));
        if (updateData.ttlHours !== ttlHours) {
          console.warn(
            `Note middleware (upsert update): ttlHours clamped from ${updateData.ttlHours} to ${ttlHours} ` +
            `(valid range: 1-168 hours)`
          );
        }
        // Fetch existing record's createdAt to preserve original TTL anchor (consistent with update branch).
        // TOCTOU note: same race condition as update branch — see comment above.
        let baseTime: number | null = null;
        try {
          const existing = await prisma.note.findUnique({
            where: params.args.where,
            select: { createdAt: true },
          });
          if (existing === null) {
            // Record not found — for upsert this is expected (create path will be taken)
            // Leave baseTime as null so ttlHours is removed from update payload
          } else {
            baseTime = existing.createdAt.getTime();
          }
        } catch (lookupErr) {
          // DB error — skip TTL modification rather than silently extending lifetime with Date.now()
          console.warn(
            `Note middleware (upsert update): DB error during TTL anchor lookup — skipping expiresAt/ttlHours update. ` +
            `Error: ${lookupErr instanceof Error ? lookupErr.message : String(lookupErr)}`
          );
        }
        if (baseTime !== null) {
          updateData.expiresAt = new Date(baseTime + ttlHours * MS_PER_HOUR);
          updateData.ttlHours = ttlHours;
        } else {
          // Cannot determine original createdAt — remove ttlHours from update payload
          // so the existing expiresAt/ttlHours values are preserved unchanged
          delete updateData.ttlHours;
        }
      }
    }
  }

  return next(params);
  });
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
