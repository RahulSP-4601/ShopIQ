import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { generateWeeklyBriefing } from "@/lib/ai/briefing/generator";
import { sendWeeklyBriefingEmail } from "@/lib/ai/briefing/email";
import type { AiMaturity } from "@/lib/ai/memory/maturity";

// Type guard for AiMaturity runtime validation
function isValidAiMaturity(value: unknown): value is AiMaturity {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.aiYears === "number" &&
    typeof obj.geometricMeanReliability === "number" &&
    typeof obj.stage === "string" &&
    ["Infant", "Apprentice", "Professional", "Expert"].includes(obj.stage as string) &&
    typeof obj.stageDescription === "string" &&
    typeof obj.totalBeliefs === "number" &&
    typeof obj.highConfidenceCount === "number" &&
    typeof obj.lowConfidenceCount === "number" &&
    typeof obj.totalValidatedCycles === "number"
  );
}

// Vercel serverless max duration (seconds) — briefing cron generates AI narratives per user
export const maxDuration = 300;

/**
 * Weekly briefing cron job — runs every Monday at 00:00 UTC.
 *
 * For each user with an active subscription and connected marketplace:
 * 1. Aggregates weekly metrics
 * 2. Generates AI narrative
 * 3. Saves WeeklyBriefing record
 * 4. Sends email via Resend
 */

export async function GET(request: NextRequest) {
  // Verify cron secret (timing-safe)
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
    const secretDigest = crypto
      .createHash("sha256")
      .update(cronSecret)
      .digest();
    if (!crypto.timingSafeEqual(tokenDigest, secretDigest)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Validate APP_URL before fetching users (fail-fast)
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    if (!process.env.APP_URL && process.env.NODE_ENV !== "development") {
      console.error("Briefing cron: APP_URL is not configured in production — aborting briefing generation");
      return NextResponse.json(
        { error: "APP_URL environment variable is required in production" },
        { status: 500 }
      );
    }

    // Find all eligible users
    const eligibleUsers = await prisma.user.findMany({
      where: {
        subscription: {
          status: { in: ["ACTIVE", "TRIAL"] },
        },
        marketplaceConns: {
          some: { status: "CONNECTED" },
        },
      },
      select: { id: true, name: true, email: true },
    });

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let emailErrorCount = 0;
    let briefingNotFoundCount = 0;
    let timedOutCount = 0;
    let processedCount = 0;

    // Time-budget guard: stop processing users before Vercel timeout.
    // Reserve 20% of maxDuration for response + cleanup overhead.
    const startTime = Date.now();
    const timeBudgetMs = maxDuration * 1000 * 0.80; // 80% of 300s = 240s

    // Compute week label once (UTC-based, shared across all users)
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceMonday - 7);
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    const formatUTCDate = (d: Date, includeYear = false) => {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const str = `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
      return includeYear ? `${str}, ${d.getUTCFullYear()}` : str;
    };
    const weekLabel = `${formatUTCDate(weekStart)} - ${formatUTCDate(weekEnd, true)}`;

    for (const user of eligibleUsers) {
      // Check time budget before starting work for the next user
      if (Date.now() - startTime >= timeBudgetMs) {
        timedOutCount = eligibleUsers.length - processedCount;
        console.warn(
          `Briefing cron: time budget exhausted after ${Math.round((Date.now() - startTime) / 1000)}s, ` +
          `${timedOutCount} users deferred to next run`
        );
        break;
      }

      try {
        const result = await generateWeeklyBriefing(user.id);

        if (!result) {
          skippedCount++;
          processedCount++;
          continue;
        }

        // Verify the briefing record was persisted (for all users, not just those with email)
        let briefingPersisted = false;
        const metrics = result.metricsData;

        // Defensive: validate metricsData has expected shape before use
        if (
          !metrics ||
          typeof metrics !== "object" ||
          !metrics.revenue ||
          typeof metrics.revenue.total !== "number" ||
          typeof metrics.revenue.orders !== "number" ||
          typeof metrics.revenue.aov !== "number" ||
          typeof metrics.revenueChangePercent !== "number" ||
          !Array.isArray(metrics.topProducts) ||
          !Array.isArray(metrics.lowStockProducts)
        ) {
          console.error(
            `Briefing cron: metricsData has unexpected shape for user ${user.id}, ` +
            `briefingId=${result.briefingId} — skipping email`
          );
          errorCount++;
          processedCount++;
          continue;
        }

        const briefing = await prisma.weeklyBriefing.findUnique({
          where: { id: result.briefingId },
          select: { narrative: true, maturity: true, emailSentAt: true },
        });

        if (briefing) {
          briefingPersisted = true;

          // Send email (only if user has an email address)
          if (user.email) {
            try {
              // Claim-first: atomically set emailSentAt before sending.
              // Only the instance that successfully claims (count > 0) proceeds to send.
              const claimed = await prisma.weeklyBriefing.updateMany({
                where: { id: result.briefingId, emailSentAt: null },
                data: { emailSentAt: new Date() },
              });

              if (claimed.count > 0) {
                try {
                  // Validate maturity shape before passing to email sender
                  if (!isValidAiMaturity(briefing.maturity)) {
                    throw new Error(
                      `Briefing maturity validation failed: invalid AiMaturity shape for briefing ${result.briefingId}`
                    );
                  }
                  const validatedMaturity = briefing.maturity as AiMaturity;

                  await sendWeeklyBriefingEmail({
                    email: user.email,
                    name: user.name || "there",
                    narrative: briefing.narrative,
                    revenue: metrics.revenue.total,
                    revenueChangePercent: metrics.revenueChangePercent,
                    orders: metrics.revenue.orders,
                    aov: metrics.revenue.aov,
                    topProducts: metrics.topProducts,
                    lowStockProducts: metrics.lowStockProducts,
                    maturity: validatedMaturity,
                    dashboardUrl: `${appUrl}/dashboard`,
                    weekLabel,
                  });
                } catch (sendError) {
                  // Roll back emailSentAt so future runs can retry
                  try {
                    await prisma.weeklyBriefing.update({
                      where: { id: result.briefingId },
                      data: { emailSentAt: null },
                    });
                  } catch (rollbackError) {
                    // CRITICAL: Rollback failed - briefing is marked as sent but email was not delivered
                    // This creates an orphaned record that won't be retried automatically
                    console.error(
                      `[CRITICAL] Briefing emailSentAt rollback failed - manual intervention required`,
                      {
                        severity: "CRITICAL",
                        briefingId: result.briefingId,
                        userId: user.id,
                        weekLabel,
                        originalError: sendError instanceof Error ? sendError.message : String(sendError),
                        rollbackError: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
                        timestamp: new Date().toISOString(),
                        // Recovery instructions: manually set emailSentAt=NULL in database for this briefingId
                        // to allow retry, or implement a background job to detect stuck records with
                        // emailSentAt != NULL but no corresponding email send confirmation
                        remediation: `UPDATE "WeeklyBriefing" SET "emailSentAt" = NULL WHERE id = '${result.briefingId}'`,
                      }
                    );
                    // TODO: Implement resilient recovery - e.g., write to a DLQ table, set retryCount field,
                    // or enqueue a DB recovery job to detect and fix stuck emailSentAt records
                  }
                  throw sendError; // Re-throw to be caught by outer email catch
                }
              }
              // else: emailSentAt already set — another instance claimed, skip
            } catch (emailError) {
              const msg =
                emailError instanceof Error
                  ? emailError.message
                  : "Unknown email error";
              console.error(
                `Briefing email failed for user ${user.id}:`,
                msg
              );
              emailErrorCount++;
              // Don't fail the whole briefing just because email failed
            }
          }
        } else {
          briefingNotFoundCount++;
          console.warn(
            `Briefing record not found after generation — briefingId=${result.briefingId}, ` +
            `userId=${user.id}, weekLabel=${weekLabel}`
          );
        }

        if (briefingPersisted) {
          successCount++;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error(`Weekly briefing failed for user ${user.id}:`, msg);
        errorCount++;
      }

      processedCount++;
    }

    const hasErrors = errorCount > 0 || emailErrorCount > 0 || briefingNotFoundCount > 0;
    return NextResponse.json(
      {
        success: !hasErrors && timedOutCount === 0,
        usersProcessed: processedCount,
        successCount,
        skippedCount,
        errorCount,
        emailErrorCount,
        briefingNotFoundCount,
        ...(timedOutCount > 0 ? { timedOutCount } : {}),
      },
      { status: hasErrors || timedOutCount > 0 ? 207 : 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Briefing cron: Failed to fetch eligibleUsers or process briefings:", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch users or process briefings" },
      { status: 500 }
    );
  }
}
