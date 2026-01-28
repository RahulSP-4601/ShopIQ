import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createUserSession } from "@/lib/auth/session";
import {
  checkRateLimit,
  getClientIP,
  recordFailure,
  resetFailures,
} from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);

    // If IP cannot be determined, apply strict rate limiting using a global key
    const rateLimitKey = clientIP ? `trial-login:${clientIP}` : "trial-login:unknown-ip";

    // Check rate limit before processing (stricter limits for unknown IP)
    const rateLimit = checkRateLimit(rateLimitKey, {
      maxRequests: clientIP ? 10 : 3, // Stricter limit for unknown IP
      windowMs: 60 * 1000,
      maxFailures: clientIP ? 5 : 2, // Fewer failures allowed for unknown IP
      baseBlockMs: 2000,
    });

    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.retryAfterMs || 1000) / 1000);
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const salesClient = await prisma.salesClient.findUnique({
      where: { trialToken: token },
      select: { clientUserId: true, trialSentAt: true },
    });

    if (!salesClient?.clientUserId) {
      // Record failed attempt for this IP
      recordFailure(rateLimitKey);
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    // Check if trial has expired (30 days from trialSentAt)
    if (!salesClient.trialSentAt) {
      return NextResponse.json({ error: "Trial expired" }, { status: 403 });
    }
    const expiresAt = new Date(salesClient.trialSentAt);
    expiresAt.setDate(expiresAt.getDate() + 30);
    if (new Date() > expiresAt) {
      return NextResponse.json({ error: "Trial expired" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: salesClient.clientUserId },
      include: {
        marketplaceConns: { where: { status: "CONNECTED" } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await createUserSession({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    // Reset failure count on successful login
    resetFailures(rateLimitKey);

    const redirect =
      user.marketplaceConns.length > 0 ? "/chat" : "/trial/connect";

    return NextResponse.json({ success: true, redirect });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("POST /api/trial/login error:", { message: errorMessage, stack: errorStack });
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
