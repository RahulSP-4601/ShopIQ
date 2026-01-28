import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { hashPassword, validatePassword, hashResetToken } from "@/lib/auth/password";

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const result = resetPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { token, password } = result.data;

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    const tokenHash = hashResetToken(token);
    const now = new Date();
    const passwordHash = await hashPassword(password);

    // Try atomic update on User table first
    const userUpdateResult = await prisma.user.updateMany({
      where: { resetTokenHash: tokenHash, resetTokenExpiry: { gt: now } },
      data: { passwordHash, resetTokenHash: null, resetTokenExpiry: null },
    });

    if (userUpdateResult.count > 0) {
      return NextResponse.json({
        success: true,
        message: "Password has been reset successfully",
        redirect: "/signin",
      });
    }

    // Try atomic update on Employee table
    const employeeUpdateResult = await prisma.employee.updateMany({
      where: { resetTokenHash: tokenHash, resetTokenExpiry: { gt: now } },
      data: { passwordHash, resetTokenHash: null, resetTokenExpiry: null, mustChangePassword: false },
    });

    if (employeeUpdateResult.count > 0) {
      return NextResponse.json({
        success: true,
        message: "Password has been reset successfully",
        redirect: "/signin",
      });
    }

    return NextResponse.json(
      { error: "Invalid or expired reset token" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
