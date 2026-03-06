import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { generateBiWeeklyBriefing } from "@/lib/ai/briefing/biweekly-generator";
import { sendBiWeeklyBriefingEmail } from "@/lib/ai/briefing/biweekly-email";

// Vercel serverless max duration (seconds)
export const maxDuration = 300;

/**
 * ISO week number — used to determine bi-weekly cadence.
 * Cron runs every Monday; we only proceed on even ISO weeks.
 */
function getISOWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Bi-weekly briefing cron job — runs every Monday at 02:00 UTC.
 * Only proceeds on even ISO weeks (true bi-weekly cadence).
 *
 * For each eligible user:
 * 1. Aggregates 2 weeks of metrics (with per-marketplace breakdown)
 * 2. Generates AI narrative (5-7 sentence trend analysis)
 * 3. Saves BiWeeklyBriefing record
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

  // ── Bi-weekly cadence check: only run on even ISO weeks ──
  const isoWeek = getISOWeekNumber(new Date());
  if (isoWeek % 2 !== 0) {
    return NextResponse.json(
      { skipped: true, reason: "Odd ISO week — not a bi-weekly week", isoWeek },
      { status: 200 }
    );
  }

  try {
    // ── Validate APP_URL (fail-fast) ──
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    if (!process.env.APP_URL && process.env.NODE_ENV !== "development") {
      console.error(
        "Bi-weekly briefing cron: APP_URL is not configured in production — aborting"
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
    const timeBudgetMs = maxDuration * 1000 * 0.8;

    // ── Compute period dates ──
    const now = new Date();
    // periodEnd = yesterday (Sunday)
    const periodEnd = new Date(now);
    periodEnd.setUTCDate(periodEnd.getUTCDate() - 1);
    periodEnd.setUTCHours(0, 0, 0, 0);

    // periodStart = 14 days before periodEnd (Monday 2 weeks ago)
    const periodStart = new Date(periodEnd);
    periodStart.setUTCDate(periodStart.getUTCDate() - 13);
    periodStart.setUTCHours(0, 0, 0, 0);

    // ── Compute period label ──
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const formatUTCDate = (d: Date, includeYear = false) => {
      const str = `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
      return includeYear ? `${str}, ${d.getUTCFullYear()}` : str;
    };
    const periodLabel = `${formatUTCDate(periodStart)} - ${formatUTCDate(periodEnd, true)}`;

    // ── Process each user ──
    for (const user of eligibleUsers) {
      if (Date.now() - startTime >= timeBudgetMs) {
        timedOutCount = eligibleUsers.length - processedCount;
        console.warn(
          `Bi-weekly briefing cron: time budget exhausted after ${Math.round((Date.now() - startTime) / 1000)}s, ` +
            `${timedOutCount} users deferred to next run`
        );
        break;
      }

      try {
        const result = await generateBiWeeklyBriefing(
          user.id,
          periodStart,
          periodEnd
        );

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
            `Bi-weekly briefing cron: metricsData has unexpected shape for user ${user.id}, ` +
              `briefingId=${result.briefingId} — skipping email`
          );
          errorCount++;
          processedCount++;
          continue;
        }

        const briefing = await prisma.biWeeklyBriefing.findUnique({
          where: { id: result.briefingId },
          select: { narrative: true, emailSentAt: true },
        });

        if (briefing) {
          briefingPersisted = true;

          // ── Send email ──
          if (user.email) {
            try {
              const claimed = await prisma.biWeeklyBriefing.updateMany({
                where: { id: result.briefingId, emailSentAt: null },
                data: { emailSentAt: new Date() },
              });

              if (claimed.count > 0) {
                try {
                  await sendBiWeeklyBriefingEmail({
                    email: user.email,
                    name: user.name || "there",
                    narrative: briefing.narrative,
                    revenue: metrics.revenue.total,
                    revenueChangePercent: metrics.revenueChangePercent,
                    orders: metrics.revenue.orders,
                    aov: metrics.revenue.aov,
                    winnerPlatform: metrics.winnerPlatform,
                    marketplaceBreakdown: metrics.marketplaceBreakdown,
                    topProducts: metrics.topProducts,
                    lowStockProducts: metrics.lowStockProducts,
                    week1Revenue: metrics.week1Revenue,
                    week2Revenue: metrics.week2Revenue,
                    dashboardUrl: `${appUrl}/chat`,
                    periodLabel,
                  });
                } catch (sendError) {
                  try {
                    await prisma.biWeeklyBriefing.update({
                      where: { id: result.briefingId },
                      data: { emailSentAt: null },
                    });
                  } catch (rollbackError) {
                    console.error(
                      `[CRITICAL] Bi-weekly briefing emailSentAt rollback failed - manual intervention required`,
                      {
                        severity: "CRITICAL",
                        briefingId: result.briefingId,
                        userId: user.id,
                        periodLabel,
                        originalError:
                          sendError instanceof Error
                            ? sendError.message
                            : String(sendError),
                        rollbackError:
                          rollbackError instanceof Error
                            ? rollbackError.message
                            : String(rollbackError),
                        timestamp: new Date().toISOString(),
                        remediation: `UPDATE "BiWeeklyBriefing" SET "emailSentAt" = NULL WHERE id = '${result.briefingId}'`,
                      }
                    );
                  }
                  throw sendError;
                }
              }
            } catch (emailError) {
              const msg =
                emailError instanceof Error
                  ? emailError.message
                  : "Unknown email error";
              console.error(
                `Bi-weekly briefing email failed for user ${user.id}:`,
                msg
              );
              emailErrorCount++;
            }
          }
        } else {
          briefingNotFoundCount++;
          console.warn(
            `Bi-weekly briefing record not found after generation — briefingId=${result.briefingId}, ` +
              `userId=${user.id}, periodLabel=${periodLabel}`
          );
        }

        if (briefingPersisted) {
          successCount++;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error(
          `Bi-weekly briefing failed for user ${user.id}:`,
          msg
        );
        errorCount++;
      }

      processedCount++;
    }

    const hasErrors =
      errorCount > 0 || emailErrorCount > 0 || briefingNotFoundCount > 0;
    return NextResponse.json(
      {
        success: !hasErrors && timedOutCount === 0,
        isoWeek,
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
      "Bi-weekly briefing cron: Failed to fetch eligibleUsers or process briefings:",
      errorMessage
    );
    return NextResponse.json(
      { error: "Failed to fetch users or process briefings" },
      { status: 500 }
    );
  }
}
