import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyPassword, generateResetToken, hashResetToken } from "@/lib/auth/password";
import { createUserSession, createEmployeeSession } from "@/lib/auth/session";

// Dummy hash for timing-safe comparison when user doesn't exist or has no password
const DUMMY_HASH = "$2a$12$K.0HwpsoPDGaB/atFBmmYOGTW4/E2Z5x5gK.j8s6WJqQVSE0aGR5G";

const signinSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
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
      await createUserSession({
        id: user.id,
        email: user.email,
        name: user.name,
      });

      let redirect = "/chat";
      if (user.marketplaceConns.length === 0) {
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
