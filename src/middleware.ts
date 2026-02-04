import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * Middleware for protecting /founder and /sales routes.
 *
 * Security model:
 * - JWT signature is verified for all protected routes (fast, Edge-compatible).
 * - Founder routes (highly sensitive): fresh DB lookup via internal API call
 *   to ensure role/approval status hasn't been revoked since JWT was issued.
 * - Sales routes (less sensitive): JWT claims used for routing; actual
 *   authorization is enforced by route handlers (requireApprovedSalesMember).
 *
 * Future improvement: adopt short-lived JWTs (e.g., 15 min) with refresh
 * tokens so stale claims expire quickly without needing per-request DB lookups.
 */

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Fetch fresh employee status from the database via internal API route.
 * Edge Runtime cannot use Prisma directly, so this calls a Node.js route handler.
 * Used for sensitive routes (founder) where stale JWT claims are unacceptable.
 */
const VERIFY_TIMEOUT_MS = 5000;

function getInternalBaseUrl(request: NextRequest): string | null {
  // Prefer explicit env var to avoid SSRF via manipulated Host header
  const envBase = process.env.INTERNAL_API_BASE_URL;
  if (envBase) return envBase;

  // Fall back to request origin but validate against NEXTAUTH_URL / APP_URL
  const trustedOrigin =
    process.env.NEXTAUTH_URL || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  const requestOrigin = request.nextUrl.origin;

  if (!trustedOrigin) return null;

  try {
    const trusted = new URL(trustedOrigin).origin;
    if (requestOrigin !== trusted) return null;
  } catch {
    return null;
  }

  return requestOrigin;
}

async function getLatestEmployeeStatus(
  employeeId: string,
  request: NextRequest
): Promise<{ valid: boolean; role: string; isApproved: boolean } | null> {
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret) return null;

  const baseUrl = getInternalBaseUrl(request);
  if (!baseUrl) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/api/auth/verify-employee`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({ employeeId }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.valid) return null;

    return {
      valid: true,
      role: typeof data.role === "string" ? data.role : "",
      isApproved: data.isApproved === true,
    };
  } catch {
    // If the internal check fails or times out, return null to signal unavailability
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("shopiq_employee_session")?.value;
  const path = request.nextUrl.pathname;

  if (!token) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  try {
    // Verify JWT signature (Edge-compatible, no DB call)
    const { payload } = await jwtVerify(token, getSecretKey());

    if (typeof payload.employeeId !== "string" || !payload.employeeId) {
      return NextResponse.redirect(new URL("/signin", request.url));
    }

    const employeeId = payload.employeeId;

    // Default to JWT claims
    let role = typeof payload.role === "string" ? payload.role : "";
    let isApproved = payload.isApproved === true;

    // Founder routes — fresh DB check (highly sensitive, stale claims unacceptable)
    if (path.startsWith("/founder")) {
      const freshStatus = await getLatestEmployeeStatus(employeeId, request);

      if (freshStatus) {
        // Use fresh DB values instead of potentially stale JWT claims
        role = freshStatus.role;
        isApproved = freshStatus.isApproved;
      } else {
        // Internal API unreachable — deny access as a safe default.
        // Prevents stale JWT claims from granting founder access when
        // we can't confirm the employee's current status.
        return NextResponse.redirect(new URL("/signin", request.url));
      }

      if (role !== "FOUNDER") {
        return NextResponse.redirect(new URL("/signin", request.url));
      }
    }

    // Sales routes — JWT claims for fast routing; route handlers enforce fresh DB checks
    if (path.startsWith("/sales")) {
      if (role !== "SALES_MEMBER") {
        return NextResponse.redirect(new URL("/signin", request.url));
      }

      // Unapproved sales members can only see pending-approval page
      if (!isApproved && path !== "/sales/pending-approval") {
        return NextResponse.redirect(
          new URL("/sales/pending-approval", request.url)
        );
      }
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/signin", request.url));
  }
}

export const config = {
  matcher: ["/founder/:path*", "/sales/:path*"],
};
