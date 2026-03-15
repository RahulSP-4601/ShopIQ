import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserSession, clearLocalSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";

/**
 * Simple in-memory rate limiter for account deletion.
 * Limits each user to a small number of attempts per window to prevent
 * brute-force password guessing on this sensitive endpoint.
 *
 * Note: In-memory — resets on serverless cold start. For stricter
 * guarantees, use a Redis-backed rate limiter.
 */
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();

  // Prune stale entries to prevent unbounded map growth
  if (rateLimitMap.size > 100) {
    for (const [key, val] of rateLimitMap) {
      if (now - val.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.delete(key);
      }
    }
  }

  const entry = rateLimitMap.get(userId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * POST /api/account/delete
 *
 * GDPR right-to-erasure endpoint.
 * Deletes the authenticated user and all associated data.
 *
 * Requires password re-entry for verification before deletion.
 *
 * Most child records are cleaned up via ON DELETE CASCADE in the schema
 * (stores, marketplace connections, unified orders/products, subscription, etc.).
 * Records without cascade (RevokedToken, AuditLog) are deleted explicitly.
 */
export async function POST(request: NextRequest) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.userId;

  // Rate limit to prevent brute-force password guessing
  if (!checkRateLimit(userId)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  // Require password re-entry for destructive account deletion
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON with a 'password' field" },
      { status: 400 }
    );
  }

  if (!body.password || typeof body.password !== "string") {
    return NextResponse.json(
      { error: "Password is required to confirm account deletion" },
      { status: 400 }
    );
  }

  // Fetch user to verify password
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // OAuth/SSO accounts may not have a passwordHash — reject deletion via this endpoint
  // (OAuth users should use a separate identity-provider-verified flow)
  if (!user.passwordHash) {
    return NextResponse.json(
      { error: "Password-based deletion is not available for OAuth/SSO accounts" },
      { status: 400 }
    );
  }

  const passwordValid = await verifyPassword(body.password, user.passwordHash);
  if (!passwordValid) {
    return NextResponse.json(
      { error: "Incorrect password" },
      { status: 401 }
    );
  }

  try {
    // Delete non-cascading records first, then the user (which cascades the rest)
    await prisma.$transaction(async (tx) => {
      // RevokedToken: has userId but no ON DELETE CASCADE relation
      await tx.revokedToken.deleteMany({ where: { userId } });

      // AuditLog: has optional userId, no cascade — anonymize rather than delete
      // to preserve the audit trail while removing PII
      await tx.auditLog.updateMany({
        where: { userId },
        data: { userId: null, ipAddress: null, userAgent: null },
      });

      // Delete the user — cascades to: Store, Subscription, MarketplaceConnection,
      // UnifiedOrder, UnifiedProduct, and their children (Customer, Product, Order, etc.)
      await tx.user.delete({ where: { id: userId } });
    });

    // Clear the session cookie — isolated so failures don't mask successful deletion
    try {
      await clearLocalSession();
    } catch (sessionError) {
      const msg = sessionError instanceof Error ? sessionError.message : "Unknown error";
      console.error(`Session clear failed after account deletion for userId=${userId}: ${msg}`);
      // Account was successfully deleted; session will expire naturally
      return NextResponse.json({ success: true, warning: "Account deleted but session cookie could not be cleared" });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Account deletion failed for userId=${userId}: ${msg}`);
    return NextResponse.json(
      { error: "Account deletion failed. Please try again or contact support." },
      { status: 500 }
    );
  }
}
