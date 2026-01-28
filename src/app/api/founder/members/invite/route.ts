import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireFounder } from "@/lib/auth/session";
import { hashPassword, validatePassword, generateResetToken, hashResetToken } from "@/lib/auth/password";
import { sendSalesWelcomeEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    await requireFounder();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, email, phone, commissionRate } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const emailLower = email.trim().toLowerCase();

    // Check both tables for existing email
    const [existingEmployee, existingUser] = await Promise.all([
      prisma.employee.findUnique({ where: { email: emailLower } }),
      prisma.user.findUnique({ where: { email: emailLower } }),
    ]);

    if (existingEmployee || existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // Generate a temporary random password (user will reset via email link)
    const tempPassword = generateResetToken().slice(0, 16) + "Aa1!";
    const passwordValidation = validatePassword(tempPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: "Internal error generating credentials" },
        { status: 500 }
      );
    }
    const passwordHash = await hashPassword(tempPassword);

    // Generate reset token so user sets their own password
    // Use longer expiry for invites (24 hours) vs user-initiated resets (1 hour)
    const INVITE_TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours
    const resetToken = generateResetToken();
    const resetTokenHash = hashResetToken(resetToken);
    const resetTokenExpiry = new Date(Date.now() + INVITE_TOKEN_TTL);

    let parsedCommissionRate: number | null = null;
    if (commissionRate !== undefined && commissionRate !== null && commissionRate !== "") {
      parsedCommissionRate = parseFloat(commissionRate);
      if (!Number.isFinite(parsedCommissionRate) || parsedCommissionRate < 0 || parsedCommissionRate > 100) {
        return NextResponse.json(
          { error: "Commission rate must be a number between 0 and 100" },
          { status: 400 }
        );
      }
    }

    let employee;
    try {
      employee = await prisma.employee.create({
        data: {
          name: name.trim(),
          email: emailLower,
          phone: phone?.trim() || null,
          passwordHash,
          role: "SALES_MEMBER",
          isApproved: true,
          refCode: `ref-${crypto.randomUUID()}`,
          commissionRate: parsedCommissionRate,
          mustChangePassword: true,
          resetTokenHash,
          resetTokenExpiry,
        },
      });
    } catch (createError) {
      // Handle unique constraint violation (race condition where email was created between check and insert)
      if (
        createError instanceof Prisma.PrismaClientKnownRequestError &&
        createError.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 400 }
        );
      }
      throw createError;
    }

    // Send welcome email with reset link (non-blocking)
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const resetUrl = `${origin}/reset-password?token=${resetToken}`;
    sendSalesWelcomeEmail({
      name: employee.name,
      email: employee.email,
      resetUrl,
      dashboardUrl: `${origin}/sales/dashboard`,
      expiryHours: 24, // Matches INVITE_TOKEN_TTL (24 hours)
    }).catch((err) => {
      console.error("Failed to send welcome email:", err instanceof Error ? err.message : err);
    });

    return NextResponse.json(
      {
        success: true,
        member: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          refCode: employee.refCode,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create sales member:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to create sales member" },
      { status: 500 }
    );
  }
}
