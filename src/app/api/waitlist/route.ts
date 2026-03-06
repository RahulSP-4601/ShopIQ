import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitKey = clientIP ? `waitlist:${clientIP}` : "waitlist:unknown-ip";
    const rateLimit = await checkRateLimit(rateLimitKey, {
      maxRequests: clientIP ? 5 : 2,
      windowMs: 60 * 1000,
    });
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.retryAfterMs || 1000) / 1000);
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      if (error instanceof SyntaxError || (error instanceof Error && error.name === "SyntaxError")) {
        return NextResponse.json(
          { error: "Malformed JSON payload" },
          { status: 400 }
        );
      }
      throw error;
    }

    const parsedBody = body as Record<string, unknown>;
    const companyName = typeof parsedBody.companyName === "string" ? parsedBody.companyName.trim() : "";
    const emailRaw = typeof parsedBody.email === "string" ? parsedBody.email.trim().toLowerCase() : "";
    const phone = typeof parsedBody.phone === "string" ? parsedBody.phone.trim() : "";
    const source = typeof parsedBody.source === "string" ? parsedBody.source.trim() : "";

    if (!companyName || !emailRaw) {
      return NextResponse.json(
        { error: "Company name and email are required" },
        { status: 400 }
      );
    }

    if (!isValidEmail(emailRaw)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    if (phone) {
      const digitsOnly = phone.replace(/\D/g, "");
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        return NextResponse.json(
          { error: "Please enter a valid phone number (10-15 digits)" },
          { status: 400 }
        );
      }
    }

    if (source.length > 200) {
      return NextResponse.json(
        { error: "Source must be 200 characters or less" },
        { status: 400 }
      );
    }

    const entry = await prisma.waitlistEntry.upsert({
      where: { email: emailRaw },
      update: {
        companyName,
        phone: phone || null,
        source: source || null,
      },
      create: {
        companyName,
        email: emailRaw,
        phone: phone || null,
        source: source || null,
      },
      select: { id: true, status: true, createdAt: true, updatedAt: true },
    });

    const alreadyJoined = entry.updatedAt > entry.createdAt;

    return NextResponse.json(
      {
        success: true,
        alreadyJoined,
        id: entry.id,
        status: entry.status,
      },
      { status: alreadyJoined ? 200 : 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to join waitlist:", message);
    return NextResponse.json(
      { error: "Failed to join waitlist. Please try again." },
      { status: 500 }
    );
  }
}
