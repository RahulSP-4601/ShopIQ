import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Validate phone if provided: strip non-digits and check length
    if (phone) {
      const digitsOnly = phone.replace(/\D/g, "");
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        return NextResponse.json(
          { error: "Please enter a valid phone number (10-15 digits)" },
          { status: 400 }
        );
      }
    }

    // Create trial request in database
    const trialRequest = await prisma.trialRequest.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Trial request submitted successfully",
        id: trialRequest.id,
      },
      { status: 201 }
    );
  } catch (error) {
    // Log only error name/code to avoid leaking PII from validation messages
    const errorType = error instanceof Error ? error.constructor.name : "UnknownError";
    console.error("Failed to create trial request:", errorType);
    return NextResponse.json(
      { error: "Failed to submit trial request. Please try again." },
      { status: 500 }
    );
  }
}
