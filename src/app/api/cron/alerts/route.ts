import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { runAllDetections } from "@/lib/ai/alerts/detector";

// Vercel serverless max duration (seconds) — alerts cron needs time for many users
export const maxDuration = 300;

/**
 * Proactive alerts cron job — runs hourly with 24-shard rotation.
 *
 * Uses rotating shard selection based on UTC hour (0-23) to process 1/24th of users
 * each hour, ensuring every user is processed once per day with even distribution.
 * For each eligible user in the current shard (active subscription + connected marketplace),
 * runs stockout, demand surge, revenue anomaly, and return pattern detection.
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

  // Find all eligible users: active subscription + connected marketplace
  // Use rotating shard selection based on current hour to ensure all users get processed over time
  let eligibleUsers: { id: string }[];
  try {
    const currentHour = new Date().getUTCHours(); // 0-23
    const TOTAL_SHARDS = 24; // Process 1/24th of users each hour, full rotation every day

    eligibleUsers = await prisma.user.findMany({
      where: {
        subscription: {
          status: { in: ["ACTIVE", "TRIAL"] },
        },
        marketplaceConns: {
          some: { status: "CONNECTED" },
        },
      },
      select: { id: true },
      orderBy: { id: "asc" },
    });

    // Filter to current shard (id hash % TOTAL_SHARDS == currentHour)
    // Use simple string hash to evenly distribute users across shards
    // Use unsigned conversion (>>> 0) to avoid Math.abs overflow when hash === -2147483648
    eligibleUsers = eligibleUsers.filter((user) => {
      let hash = 0;
      for (let i = 0; i < user.id.length; i++) {
        hash = (hash << 5) - hash + user.id.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
      }
      return ((hash >>> 0) % TOTAL_SHARDS) === currentHour;
    });

    // Shuffle to prevent user starvation (deterministic order always processes same MAX_USERS_PER_RUN users first)
    // Fisher-Yates shuffle for fair random selection
    for (let i = eligibleUsers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligibleUsers[i], eligibleUsers[j]] = [eligibleUsers[j], eligibleUsers[i]];
    }

    // Note: User cap will be applied after startup timeout check below for clarity
  } catch (queryError) {
    console.error("Alerts cron: failed to fetch eligible users:", queryError instanceof Error ? queryError.message : queryError);
    return NextResponse.json({ error: "Failed to fetch eligible users" }, { status: 500 });
  }

  let totalAlerts = 0;
  let errorCount = 0;
  let timeoutCount = 0;

  // Process each user with bounded concurrency and timeout handling
  const CONCURRENCY_LIMIT = 10; // Process max 10 users concurrently
  const USER_TIMEOUT_MS = 5_000; // 5s per user
  const MAX_USERS_PER_RUN = 400; // Cap to prevent exceeding maxDuration
  const hashId = (id: string) => crypto.createHash("sha256").update(id).digest("hex").slice(0, 12);

  // Startup check: ensure worst-case execution time doesn't exceed maxDuration
  // Worst case: MAX_USERS_PER_RUN × USER_TIMEOUT_MS / CONCURRENCY_LIMIT
  const worstCaseMs = (MAX_USERS_PER_RUN * USER_TIMEOUT_MS) / CONCURRENCY_LIMIT;
  const maxDurationMs = maxDuration * 1000;
  const bufferFactor = 0.8; // 20% safety buffer
  if (worstCaseMs > maxDurationMs * bufferFactor) {
    console.error(
      `[CRITICAL] Alerts cron timeout math violation: worst-case ${worstCaseMs}ms exceeds ${maxDurationMs * bufferFactor}ms (maxDuration=${maxDuration}s with ${bufferFactor * 100}% buffer). ` +
      `Adjust CONCURRENCY_LIMIT, USER_TIMEOUT_MS, or MAX_USERS_PER_RUN.`
    );
    return NextResponse.json({ error: "Configuration error: timeout math exceeds maxDuration" }, { status: 500 });
  }

  // Apply user cap
  if (eligibleUsers.length > MAX_USERS_PER_RUN) {
    console.warn(
      `Alerts cron: capping eligible users from ${eligibleUsers.length} to ${MAX_USERS_PER_RUN} to prevent timeout`
    );
    eligibleUsers = eligibleUsers.slice(0, MAX_USERS_PER_RUN);
  }

  for (let i = 0; i < eligibleUsers.length; i += CONCURRENCY_LIMIT) {
    const batch = eligibleUsers.slice(i, i + CONCURRENCY_LIMIT);
    const batchPromises = batch.map((user) => {
      const controller = new AbortController();
      let timeoutId: NodeJS.Timeout;
      return Promise.race([
        runAllDetections(user.id, controller.signal),
        new Promise<null>((_, reject) => {
          timeoutId = setTimeout(() => {
            controller.abort();
            reject(new Error("Detection timeout"));
          }, USER_TIMEOUT_MS);
        }),
      ])
        .then((detectionResult) => {
          totalAlerts += detectionResult?.total ?? 0;
        })
        .catch((error) => {
          const msg = error instanceof Error ? error.message : "Unknown error";
          if (msg === "Detection timeout") {
            console.error(`Alert detection timeout for user ${hashId(user.id)} after ${USER_TIMEOUT_MS}ms`);
            timeoutCount++;
          } else {
            console.error(`Alert detection failed for user ${hashId(user.id)}:`, msg);
            errorCount++;
          }
        })
        .finally(() => {
          clearTimeout(timeoutId);
        });
    });
    await Promise.all(batchPromises);
  }

  return NextResponse.json(
    {
      success: errorCount === 0 && timeoutCount === 0,
      usersProcessed: eligibleUsers.length,
      totalAlerts,
      errorCount,
      timeoutCount,
    },
    { status: errorCount > 0 || timeoutCount > 0 ? 207 : 200 }
  );
}
