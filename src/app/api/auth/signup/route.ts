import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { createUserSession } from "@/lib/auth/session";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().min(1, "Country is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    if (!ip) {
      console.warn(
        `Signup rate-limit: unable to determine client IP (user-agent: ${request.headers.get("user-agent") || "unknown"})`
      );
      return NextResponse.json(
        { error: "Unable to determine client identity. Please try again." },
        { status: 400 }
      );
    }
    const { allowed, retryAfterMs } = await checkRateLimit(`signup:${ip}`, {
      maxRequests: 3,
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

    const result = signupSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone, city, state, zipCode, country, password } =
      result.data;

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    const emailLower = email.trim().toLowerCase();

    // Check both User and Employee tables for existing email
    const [existingUser, existingEmployee] = await Promise.all([
      prisma.user.findUnique({ where: { email: emailLower } }),
      prisma.employee.findUnique({ where: { email: emailLower } }),
    ]);

    if (existingUser || existingEmployee) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    let user;
    try {
      user = await prisma.user.create({
        data: {
          name,
          email: emailLower,
          phone: phone || null,
          city: city || null,
          state: state || null,
          zipCode: zipCode || null,
          country,
          passwordHash,
        },
      });
    } catch (createError) {
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

    try {
      await createUserSession({
        id: user.id,
        email: user.email,
        name: user.name,
      });
    } catch (sessionError) {
      const sessionErrorMessage = sessionError instanceof Error ? sessionError.message : "Unknown error";
      console.error(`Session creation failed for user ${user.id}, rolling back: ${sessionErrorMessage}`);

      try {
        await prisma.user.delete({ where: { id: user.id } });
      } catch (deleteError) {
        const deleteErrorMessage = deleteError instanceof Error ? deleteError.message : "Unknown error";
        console.error(
          `Rollback failed: could not delete orphaned user (id: ${user.id}): ${deleteErrorMessage}`
        );
        return NextResponse.json(
          { error: "Account creation failed and rollback unsuccessful. Please contact support." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create session. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
      redirect: "/onboarding/connect",
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "An error occurred during signup" },
      { status: 500 }
    );
  }
}
