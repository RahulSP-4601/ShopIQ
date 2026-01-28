import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { generateResetToken, hashResetToken } from "@/lib/auth/password";
import { sendPasswordResetEmail } from "@/lib/email";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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
