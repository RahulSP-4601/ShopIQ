import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { cleanupExpiredRevocations } from "@/lib/auth/session";

/**
 * Scheduled cleanup cron job.
 *
 * Handles:
 * 1. PII anonymization for orders past retention period (default: 365 days)
 * 2. Expired revoked token cleanup
 * 3. Old WebhookEvent dedup record cleanup (default: 7 days)
 * 4. AuditLog PII pseudonymization (nullify ipAddress/userAgent past retention period)
 * 5. Old AuditLog cleanup (default: 365 days, configurable via AUDIT_LOG_RETENTION_DAYS)
 */

function safeParseIntEnv(envVar: string | undefined, fallback: number): number {
  if (!envVar) return fallback;
  const parsed = parseInt(envVar, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

const PII_RETENTION_DAYS = safeParseIntEnv(process.env.PII_RETENTION_DAYS, 365);
const WEBHOOK_EVENT_TTL_DAYS = 7;
const AUDIT_LOG_TTL_DAYS = safeParseIntEnv(process.env.AUDIT_LOG_RETENTION_DAYS, 365);

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tokenDigest = crypto.createHash("sha256").update(token).digest();
    const secretDigest = crypto.createHash("sha256").update(cronSecret).digest();
    if (!crypto.timingSafeEqual(tokenDigest, secretDigest)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // 1. Anonymize PII on old orders
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - PII_RETENTION_DAYS);

    const anonymized = await prisma.unifiedOrder.updateMany({
      where: {
        orderedAt: { lt: cutoff },
        OR: [
          { customerName: { not: null } },
          { customerEmail: { not: null } },
        ],
      },
      data: {
        customerName: null,
        customerEmail: null,
      },
    });
    results.piiAnonymized = anonymized.count;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`PII cleanup failed: ${msg}`);
    results.piiError = msg;
  }

  // 2. Cleanup expired revoked tokens
  try {
    const cleaned = await cleanupExpiredRevocations();
    results.revokedTokensCleaned = cleaned;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Revoked token cleanup failed: ${msg}`);
    results.revokedTokensError = msg;
  }

  // 3. Cleanup old WebhookEvent dedup records
  try {
    const webhookCutoff = new Date();
    webhookCutoff.setDate(webhookCutoff.getDate() - WEBHOOK_EVENT_TTL_DAYS);

    const webhookCleaned = await prisma.webhookEvent.deleteMany({
      where: { processedAt: { lt: webhookCutoff } },
    });
    results.webhookEventsCleaned = webhookCleaned.count;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`WebhookEvent cleanup failed: ${msg}`);
    results.webhookEventsError = msg;
  }

  // 4. Pseudonymize PII on old AuditLog records (ipAddress, userAgent)
  // Skip if audit logs are deleted at or before PII retention — the delete in step 5 handles it
  if (AUDIT_LOG_TTL_DAYS > PII_RETENTION_DAYS) {
    try {
      const auditPiiCutoff = new Date();
      auditPiiCutoff.setDate(auditPiiCutoff.getDate() - PII_RETENTION_DAYS);

      const auditPiiAnonymized = await prisma.auditLog.updateMany({
        where: {
          createdAt: { lt: auditPiiCutoff },
          OR: [
            { ipAddress: { not: null } },
            { userAgent: { not: null } },
          ],
        },
        data: {
          ipAddress: null,
          userAgent: null,
        },
      });
      results.auditLogPiiAnonymized = auditPiiAnonymized.count;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error(`AuditLog PII pseudonymization failed: ${msg}`);
      results.auditLogPiiError = msg;
    }
  } else {
    console.log(
      `AuditLog PII pseudonymization skipped: AUDIT_LOG_TTL_DAYS (${AUDIT_LOG_TTL_DAYS}) <= PII_RETENTION_DAYS (${PII_RETENTION_DAYS}) — deletion in step 5 covers PII removal`
    );
    results.auditLogPiiAnonymized = 0;
  }

  // 5. Cleanup old AuditLog records
  try {
    const auditCutoff = new Date();
    auditCutoff.setDate(auditCutoff.getDate() - AUDIT_LOG_TTL_DAYS);

    const auditCleaned = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: auditCutoff } },
    });
    results.auditLogsCleaned = auditCleaned.count;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`AuditLog cleanup failed: ${msg}`);
    results.auditLogsError = msg;
  }

  // Determine if any step failed
  const hasErrors = Object.keys(results).some((key) => key.endsWith("Error"));

  return NextResponse.json(
    { success: !hasErrors, results },
    { status: hasErrors ? 207 : 200 }
  );
}
