import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { generateResetToken, hashResetToken } from "@/lib/auth/password";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Rate-limit the fallback-fingerprint warning log using checkRateLimit.
// NOTE: This is per-instance in-memory — each serverless instance has its own bucket,
// so a few extra logs may appear across cold starts. Acceptable for a throttled warning.
const FALLBACK_LOG_LIMIT_KEY = "log:forgot-password:fallback-warn";
const GLOBAL_FALLBACK_LIMIT_KEY = "forgot-password:global-fallback";

async function buildRateLimitKey(request: NextRequest): Promise<{ key: string; isFallback: boolean }> {
  const ip = getClientIP(request);
  if (ip) return { key: `forgot-password:${ip}`, isFallback: false };

  // No reliable IP available — use fingerprint-based fallback.
  // Derive a semi-unique identifier from User-Agent + Accept-Language headers.
  // Include CDN/TLS headers when available to strengthen fingerprint against spoofing.
  // This provides better granularity than a single global bucket while still
  // rate-limiting abuse from the same client fingerprint.
  //
  // DEFENSE IN DEPTH: Note that user-agent and accept-language are ALWAYS client-controlled
  // and provide minimal protection against determined attackers who can easily rotate these
  // values. The fingerprint mechanism adds some friction but should not be relied upon as
  // the sole defense. A global fallback bucket (checked below) provides backstop protection
  // against attackers rapidly cycling UA/Accept-Language combinations.

  const userAgent = request.headers.get("user-agent") || "unknown";
  const acceptLanguage = request.headers.get("accept-language") || "unknown";

  // IMPORTANT: The following headers (cf-ssl, x-forwarded-client-cert, x-client-cert,
  // x-ssl-client-fingerprint) are ONLY non-spoofable when set by a trusted CDN or reverse
  // proxy (e.g., Cloudflare, AWS ALB). The proxy MUST strip any client-supplied versions
  // of these headers before setting its own. Without a trusted proxy stripping incoming
  // headers, clients can trivially spoof these values. Only trust these headers when:
  // 1. You have verified your proxy is configured to strip client-supplied headers, AND
  // 2. You validate requests originate from your proxy's IP range/signature.
  // Otherwise, fall back to connection-level TLS info or treat as untrusted user input.
  const cfSsl = request.headers.get("cf-ssl") || "";
  const xForwardedClientCert = request.headers.get("x-forwarded-client-cert") || "";
  const xClientCert = request.headers.get("x-client-cert") || "";
  const xSslClientFingerprint = request.headers.get("x-ssl-client-fingerprint") || "";

  // Hash the combination to create a fingerprint
  const fingerprint = crypto
    .createHash("sha256")
    .update(`${userAgent}|${acceptLanguage}|${cfSsl}|${xForwardedClientCert}|${xClientCert}|${xSslClientFingerprint}`)
    .digest("hex")
    .slice(0, 16); // Use first 16 chars for readability

  // Emit telemetry warning — throttled to avoid log floods
  const { allowed: canLog } = await checkRateLimit(FALLBACK_LOG_LIMIT_KEY, {
    maxRequests: 1,
    windowMs: 60_000,
  });
  if (canLog) {
    console.warn(
      "forgot-password: no reliable client IP — using fingerprint-based rate-limit bucket. " +
      "Investigate proxy configuration if this occurs frequently."
    );
  }

  return { key: `forgot-password:fp:${fingerprint}`, isFallback: true };
}

export async function POST(request: NextRequest) {
  try {
    // IMPORTANT: Rate limiting for forgot-password (a security-sensitive endpoint vulnerable to
    // email enumeration and abuse) requires distributed state in serverless/multi-instance deployments.
    // checkRateLimit uses Redis when configured (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
    // Without Redis, each serverless instance maintains its own in-memory bucket, allowing attackers
    // to bypass limits by sending requests to different instances. For production, configure Redis
    // to ensure rate limits are enforced globally across all instances.
    const { key: rateLimitKey, isFallback } = await buildRateLimitKey(request);

    // DEFENSIVE GLOBAL FALLBACK: When using fingerprint-based keys (easily spoofed by rotating
    // UA/Accept-Language), also check a global bucket with very strict limits to catch attackers
    // cycling through fingerprints. This backstop prevents abuse even when fingerprint rotation bypasses per-fingerprint limits.
    if (isFallback) {
      const { allowed: globalAllowed, retryAfterMs: globalRetryAfter } = await checkRateLimit(
        GLOBAL_FALLBACK_LIMIT_KEY,
        {
          maxRequests: 5, // Very low global limit (5 requests per minute across ALL fingerprint-based requests)
          windowMs: 60_000,
        }
      );
      if (!globalAllowed) {
        console.warn(
          `[SECURITY] Global fallback rate limit hit for forgot-password (fingerprint-based). ` +
          `Possible fingerprint rotation attack. Investigate if this occurs frequently.`
        );
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: { "Retry-After": String(Math.ceil((globalRetryAfter ?? 60_000) / 1000)) },
          }
        );
      }
    }

    const { allowed, retryAfterMs } = await checkRateLimit(rateLimitKey, {
      maxRequests: isFallback ? 2 : 3, // Stricter limit for fingerprint-based fallback (weaker signal, higher risk)
      windowMs: 60_000,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((retryAfterMs ?? 60_000) / 1000)) },
        }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const result = forgotPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const emailLower = email.toLowerCase();

    // Fetch both tables concurrently to prevent timing leaks
    const [user, employee] = await Promise.all([
      prisma.user.findUnique({ where: { email: emailLower } }),
      prisma.employee.findUnique({ where: { email: emailLower } }),
    ]);

    // Always return success to prevent email enumeration
    if (!user && !employee) {
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, we've sent a password reset link.",
      });
    }

    const resetToken = generateResetToken();
    const resetTokenHash = hashResetToken(resetToken);
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const accountName = user?.name || employee?.name || "User";

    // Persist the token first so it exists when the user clicks the link
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { resetTokenHash, resetTokenExpiry },
      });
    } else if (employee) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: { resetTokenHash, resetTokenExpiry },
      });
    }

    // Send the reset email after token is persisted
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const resetUrl = `${origin}/reset-password?token=${resetToken}`;

    try {
      await sendPasswordResetEmail({
        email: emailLower,
        name: accountName,
        resetUrl,
      });
    } catch (emailError) {
      // Log the error but return success to prevent email enumeration
      console.error("Failed to send reset email:", emailError instanceof Error ? emailError.message : emailError);
    }

    if (
      process.env.NODE_ENV === "development" &&
      process.env.DEBUG_LOG_RESET_TOKEN === "true"
    ) {
      const targetId = user?.id || employee?.id;
      console.log(
        `[DEV] Password reset token generated for ${user ? "user" : "employee"} ${targetId} (ends with: ...${resetToken.slice(-4)})`
      );
    }

    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, we've sent a password reset link.",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorName = error instanceof Error ? error.name : "Error";

    if (process.env.NODE_ENV === "development") {
      console.error("Forgot password error:", error);
    } else {
      console.error(`Forgot password error: ${errorName} - ${errorMessage}`);
    }

    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
