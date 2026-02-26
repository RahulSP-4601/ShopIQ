import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyPassword, generateResetToken, hashResetToken } from "@/lib/auth/password";
import { createUserSession, createEmployeeSession } from "@/lib/auth/session";
import { checkRateLimit, getClientIP, recordFailure, resetFailures } from "@/lib/rate-limit";

// Dummy hash for timing-safe comparison when user doesn't exist or has no password
const DUMMY_HASH = "$2a$12$K.0HwpsoPDGaB/atFBmmYOGTW4/E2Z5x5gK.j8s6WJqQVSE0aGR5G";

const signinSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Shared hard-limit key for requests with no identifiable IP.
// All no-IP requests share a single strict bucket to fail closed.
const NO_IP_RATE_LIMIT_KEY = "signin:blocked:no-ip";
const NO_IP_LOG_KEY = "log:signin:no-ip-warn";

async function buildSigninRateLimitKey(request: NextRequest): Promise<{ key: string; noIp: boolean }> {
  const ip = getClientIP(request);
  if (ip) return { key: `signin:${ip}`, noIp: false };

  // Fail closed: use a shared hard-limit key instead of a weak spoofable fingerprint.
  // Log the event (rate-limited to avoid noise).
  let canLog = false;
  try {
    const result = await checkRateLimit(NO_IP_LOG_KEY, {
      maxRequests: 1,
      windowMs: 60_000,
    });
    canLog = result.allowed;
  } catch (logRateLimitError) {
    // Default to false, log error but don't abort signin
    console.error("Failed to check NO_IP_LOG_KEY rate limit:", logRateLimitError instanceof Error ? logRateLimitError.message : String(logRateLimitError));
  }
  if (canLog) {
    console.warn("signin: getClientIP returned null — using shared hard-limit key");
  }

  return { key: NO_IP_RATE_LIMIT_KEY, noIp: true };
}

export async function POST(request: NextRequest) {
  try {
    const { key: rateLimitKey, noIp } = await buildSigninRateLimitKey(request);

    // Stricter limits when no IP is available (shared bucket, fail-closed)
    const { allowed, retryAfterMs } = await checkRateLimit(rateLimitKey, {
      maxRequests: noIp ? 3 : 10, // Much tighter for shared no-IP bucket
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

    const body = await request.json();

    const result = signinSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const emailLower = email.toLowerCase();

    // Fetch both tables concurrently to reduce timing differences
    const [user, employee] = await Promise.all([
      prisma.user.findUnique({
        where: { email: emailLower },
        include: {
          marketplaceConns: { where: { status: "CONNECTED" } },
          subscription: true,
        },
      }),
      prisma.employee.findUnique({
        where: { email: emailLower },
      }),
    ]);

    // Always run exactly 2 bcrypt comparisons to prevent timing attacks
    const userValid = await verifyPassword(password, user?.passwordHash || DUMMY_HASH);
    const employeeValid = await verifyPassword(password, employee?.passwordHash || DUMMY_HASH);

    // Check user match
    if (user?.passwordHash && userValid) {
      // Reset failures on successful signin for per-IP buckets only
      // Never reset the shared NO_IP_RATE_LIMIT_KEY bucket to prevent abuse
      // (attackers could clear the global failure counter by succeeding once)
      if (rateLimitKey !== NO_IP_RATE_LIMIT_KEY) {
        try {
          await resetFailures(rateLimitKey);
        } catch (resetError) {
          // Log but don't fail signin if reset fails
          const msg = resetError instanceof Error ? resetError.message : String(resetError);
          console.error(`Failed to reset rate limit failures after successful user signin: ${msg}`);
        }
      }

      await createUserSession({
        id: user.id,
        email: user.email,
        name: user.name,
      });

      // Check for a redirect param (e.g., from OAuth flows like Shopify)
      const url = new URL(request.url);
      const redirectParam = url.searchParams.get("redirect");

      let redirect = "/chat";
      if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")) {
        // Trusted relative redirect — resume the interrupted flow
        redirect = redirectParam;
      } else if (user.marketplaceConns.length === 0) {
        redirect = "/onboarding/connect";
      } else if (
        !user.subscription ||
        !["ACTIVE", "TRIAL"].includes(user.subscription.status)
      ) {
        redirect = "/onboarding/payment";
      }

      return NextResponse.json({
        success: true,
        user: { id: user.id, name: user.name, email: user.email },
        redirect,
      });
    }

    // Check employee match
    if (employee?.passwordHash && employeeValid) {
      // Reset failures on successful signin for per-IP buckets only
      if (rateLimitKey !== NO_IP_RATE_LIMIT_KEY) {
        try {
          await resetFailures(rateLimitKey);
        } catch (resetError) {
          // Log but don't fail signin if reset fails
          const msg = resetError instanceof Error ? resetError.message : String(resetError);
          console.error(`Failed to reset rate limit failures after successful employee signin: ${msg}`);
        }
      }

      // Force password change before granting a session
      if (employee.mustChangePassword) {
        // Create a short-lived reset token stored in HttpOnly cookie (not in URL)
        const resetToken = generateResetToken();
        const resetTokenHash = hashResetToken(resetToken);
        const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await prisma.employee.update({
          where: { id: employee.id },
          data: { resetTokenHash, resetTokenExpiry },
        });

        // Store token in HttpOnly cookie instead of exposing in redirect URL
        const response = NextResponse.json({
          success: false,
          mustChangePassword: true,
          user: { id: employee.id, name: employee.name, email: employee.email },
          redirect: "/reset-password",
        });

        response.cookies.set("frame_reset_token", resetToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 15 * 60, // 15 minutes
          path: "/",
        });

        return response;
      }

      await createEmployeeSession({
        id: employee.id,
        email: employee.email,
        name: employee.name,
        role: employee.role,
        isApproved: employee.isApproved,
      });

      const redirect =
        employee.role === "FOUNDER"
          ? "/founder/dashboard"
          : employee.isApproved
            ? "/sales/dashboard"
            : "/sales/pending-approval";

      return NextResponse.json({
        success: true,
        user: { id: employee.id, name: employee.name, email: employee.email },
        redirect,
      });
    }

    // Auth failed — record failure for exponential backoff
    try {
      await recordFailure(rateLimitKey);
    } catch (recordError) {
      // Log but don't fail signin response if recordFailure fails
      const msg = recordError instanceof Error ? recordError.message : String(recordError);
      console.error(`Failed to record rate limit failure after failed auth: ${msg}`);
    }

    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  } catch (error) {
    console.error("Signin error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "An error occurred during signin" },
      { status: 500 }
    );
  }
}
