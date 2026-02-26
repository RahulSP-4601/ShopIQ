import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export type AlertType = "stockout" | "demand_surge" | "revenue_anomaly" | "return_pattern";
export type AlertSeverity = "low" | "medium" | "high" | "critical";

export interface CreateAlertInput {
  userId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

// -------------------------------------------------------
// Daily Dedup Key
// -------------------------------------------------------

function deepSortKeys(value: unknown, visited = new WeakSet<object>()): unknown {
  if (value === null || value === undefined || typeof value !== "object") {
    return value;
  }
  if (visited.has(value as object)) {
    return "[circular]";
  }
  visited.add(value as object);
  // Preserve special types that Object.keys() would return [] for
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Map) {
    return deepSortKeys(Object.fromEntries(Array.from(value.entries()).sort(([a], [b]) => String(a).localeCompare(String(b)))), visited);
  }
  if (value instanceof Set) {
    // Prefix with type to avoid conflation (e.g., 1 vs "1" both becoming "1")
    return deepSortKeys(
      Array.from(value.values())
        .map((v) => `${typeof v}:${String(v)}`)
        .sort(),
      visited
    );
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepSortKeys(item, visited));
  }
  // For non-plain objects (Buffer, custom classes, etc.), fall back to string representation
  const proto = Object.getPrototypeOf(value);
  if (proto !== null && proto !== Object.prototype) {
    return String(value);
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = deepSortKeys((value as Record<string, unknown>)[key], visited);
  }
  return sorted;
}

function buildDedupKey(
  userId: string,
  type: AlertType,
  metadata?: Record<string, unknown>
): string {
  const dayBucket = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const baseKey = `${userId}:${type}:${dayBucket}`;

  // Append metadata only if it exists and has keys
  if (metadata && Object.keys(metadata).length > 0) {
    return `${baseKey}:${JSON.stringify(deepSortKeys(metadata))}`;
  }

  return baseKey;
}

// -------------------------------------------------------
// Create Alert (with daily dedup via day-bucket in dedupKey)
// -------------------------------------------------------

export async function createAlert(input: CreateAlertInput): Promise<boolean> {
  const { userId, type, severity, title, body, metadata } = input;

  // Compute deterministic dedup key with day bucket from metadata
  // Always returns a string (never null) to enable Postgres unique constraint deduping
  const dedupKey = buildDedupKey(userId, type, metadata);

  try {
    await prisma.alert.create({
      data: {
        userId,
        type,
        severity,
        title,
        body,
        metadata: metadata
          ? (() => {
              try {
                return structuredClone(metadata) as Prisma.InputJsonValue;
              } catch {
                // structuredClone can throw on non-cloneable values (functions, DOM nodes, etc.)
                return JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue;
              }
            })()
          : undefined,
        dedupKey,
      },
    });
    return true;
  } catch (error: unknown) {
    // P2002 = unique constraint violation — duplicate alert, skip
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return false;
    }
    throw error;
  }
}

// -------------------------------------------------------
// CRUD Operations
// -------------------------------------------------------

export async function getPendingAlerts(userId: string, limit = 10) {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  return prisma.$queryRaw`
    SELECT "id", "userId", "type", "severity", "title", "body", "metadata",
           "dedupKey", "status", "surfacedAt", "createdAt", "updatedAt"
    FROM "Alert"
    WHERE "userId" = ${userId} AND "status" = 'pending'
    ORDER BY
      CASE "severity"
        WHEN 'critical' THEN 4
        WHEN 'high' THEN 3
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 1
        ELSE 0
      END DESC,
      "createdAt" DESC
    LIMIT ${safeLimit}
  ` as Promise<Array<{
    id: string;
    userId: string;
    type: string;
    severity: string;
    title: string;
    body: string;
    metadata: unknown;
    dedupKey: string | null;
    status: string;
    surfacedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>>;
}

export async function dismissAlert(
  alertId: string,
  userId: string
): Promise<boolean> {
  const result = await prisma.alert.updateMany({
    where: { id: alertId, userId, status: { in: ["pending", "surfaced"] } },
    data: { status: "dismissed" },
  });
  return result.count > 0;
}

export async function resolveAlert(
  alertId: string,
  userId: string
): Promise<boolean> {
  const result = await prisma.alert.updateMany({
    where: { id: alertId, userId, status: { in: ["pending", "surfaced"] } },
    data: { status: "resolved" },
  });
  return result.count > 0;
}

// -------------------------------------------------------
// Cleanup (called by cleanup cron)
// -------------------------------------------------------

export async function cleanupOldAlerts(
  olderThanDays = 30
): Promise<number> {
  if (!Number.isFinite(olderThanDays) || olderThanDays < 1) {
    throw new RangeError(
      `cleanupOldAlerts: olderThanDays must be a positive number, got ${olderThanDays}`
    );
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  const result = await prisma.alert.deleteMany({
    where: {
      status: { in: ["dismissed", "resolved"] },
      updatedAt: { lt: cutoff },
    },
  });
  return result.count;
}
