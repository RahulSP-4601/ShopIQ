import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { generateDailyBriefing } from "@/lib/ai/briefing/daily-generator";
import { sendDailyBriefingEmail } from "@/lib/ai/briefing/daily-email";

// Vercel serverless max duration (seconds)
export const maxDuration = 300;

/**
 * Daily briefing cron job — runs every day at 07:00 UTC.
 *
 * For each user with an active subscription and connected marketplace:
 * 1. Aggregates yesterday's metrics (with per-marketplace breakdown)
 * 2. Generates AI narrative (3-sentence morning coffee format)
 * 3. Saves DailyBriefing record
 * 4. Sends email via Resend
 */

export async function GET(request: NextRequest) {
  // ── Auth: timing-safe CRON_SECRET verification ──
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
    // ── Validate APP_URL (fail-fast) ──
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    if (!process.env.APP_URL && process.env.NODE_ENV !== "development") {
      console.error(
        "Daily briefing cron: APP_URL is not configured in production — aborting"
      );
      return NextResponse.json(
        { error: "APP_URL environment variable is required in production" },
        { status: 500 }
      );
    }

    // ── Find eligible users ──
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

    // ── Time-budget guard ──
    const startTime = Date.now();
    const timeBudgetMs = maxDuration * 1000 * 0.8; // 80% of 300s = 240s

    // ── Compute date label once ──
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const dateLabel = `${months[yesterday.getUTCMonth()]} ${yesterday.getUTCDate()}, ${yesterday.getUTCFullYear()}`;

    // ── Process each user ──
    for (const user of eligibleUsers) {
      // Check time budget before starting work for the next user
      if (Date.now() - startTime >= timeBudgetMs) {
        timedOutCount = eligibleUsers.length - processedCount;
        console.warn(
          `Daily briefing cron: time budget exhausted after ${Math.round((Date.now() - startTime) / 1000)}s, ` +
            `${timedOutCount} users deferred to next run`
        );
        break;
      }

      try {
        const result = await generateDailyBriefing(user.id);

        if (!result) {
          skippedCount++;
          processedCount++;
          continue;
        }

        let briefingPersisted = false;
        const metrics = result.metricsData;

        // ── Defensive: validate metricsData shape ──
        if (
          !metrics ||
          typeof metrics !== "object" ||
          !metrics.revenue ||
          typeof metrics.revenue.total !== "number" ||
          typeof metrics.revenue.orders !== "number" ||
          typeof metrics.revenue.aov !== "number" ||
          typeof metrics.revenueChangePercent !== "number" ||
          !Array.isArray(metrics.marketplaceBreakdown) ||
          !Array.isArray(metrics.topProducts) ||
          !Array.isArray(metrics.lowStockProducts)
        ) {
          console.error(
            `Daily briefing cron: metricsData has unexpected shape for user ${user.id}, ` +
              `briefingId=${result.briefingId} — skipping email`
          );
          errorCount++;
          processedCount++;
          continue;
        }

        const briefing = await prisma.dailyBriefing.findUnique({
          where: { id: result.briefingId },
          select: { narrative: true, emailSentAt: true },
        });

        if (briefing) {
          briefingPersisted = true;

          // ── Send email ──
          if (user.email) {
            try {
              // Claim-first: atomically set emailSentAt before sending
              const claimed = await prisma.dailyBriefing.updateMany({
                where: { id: result.briefingId, emailSentAt: null },
                data: { emailSentAt: new Date() },
              });

              if (claimed.count > 0) {
                try {
                  await sendDailyBriefingEmail({
                    email: user.email,
                    name: user.name || "there",
                    narrative: briefing.narrative,
                    revenue: metrics.revenue.total,
                    revenueChangePercent: metrics.revenueChangePercent,
                    orders: metrics.revenue.orders,
                    aov: metrics.revenue.aov,
                    winnerPlatform: metrics.winnerPlatform,
                    topProducts: metrics.topProducts,
                    lowStockProducts: metrics.lowStockProducts,
                    dashboardUrl: `${appUrl}/dashboard`,
                    dateLabel,
                  });
                } catch (sendError) {
                  // Roll back emailSentAt so future runs can retry
                  try {
                    await prisma.dailyBriefing.update({
                      where: { id: result.briefingId },
                      data: { emailSentAt: null },
                    });
                  } catch (rollbackError) {
                    console.error(
                      `[CRITICAL] Daily briefing emailSentAt rollback failed - manual intervention required`,
                      {
                        severity: "CRITICAL",
                        briefingId: result.briefingId,
                        userId: user.id,
                        dateLabel,
                        originalError:
                          sendError instanceof Error
                            ? sendError.message
                            : String(sendError),
                        rollbackError:
                          rollbackError instanceof Error
                            ? rollbackError.message
                            : String(rollbackError),
                        timestamp: new Date().toISOString(),
                        remediation: `UPDATE "DailyBriefing" SET "emailSentAt" = NULL WHERE id = '${result.briefingId}'`,
                      }
                    );
                  }
                  throw sendError;
                }
              }
              // else: emailSentAt already set — another instance claimed, skip
            } catch (emailError) {
              const msg =
                emailError instanceof Error
                  ? emailError.message
                  : "Unknown email error";
              console.error(
                `Daily briefing email failed for user ${user.id}:`,
                msg
              );
              emailErrorCount++;
            }
          }
        } else {
          briefingNotFoundCount++;
          console.warn(
            `Daily briefing record not found after generation — briefingId=${result.briefingId}, ` +
              `userId=${user.id}, dateLabel=${dateLabel}`
          );
        }

        if (briefingPersisted) {
          successCount++;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error(`Daily briefing failed for user ${user.id}:`, msg);
        errorCount++;
      }

      processedCount++;
    }

    const hasErrors =
      errorCount > 0 || emailErrorCount > 0 || briefingNotFoundCount > 0;
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
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      "Daily briefing cron: Failed to fetch eligibleUsers or process briefings:",
      errorMessage
    );
    return NextResponse.json(
      { error: "Failed to fetch users or process briefings" },
      { status: 500 }
    );
  }
}
