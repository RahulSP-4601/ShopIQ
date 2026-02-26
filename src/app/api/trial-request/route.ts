import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, refCode } = body;

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

    // Create trial request (and optionally sales client) atomically
    const trimmedRef = refCode?.trim() || null;

    const trialRequest = await prisma.$transaction(async (tx) => {
      // Validate refCode inside transaction to avoid TOCTOU
      let salesMember = null;
      if (trimmedRef) {
        salesMember = await tx.employee.findUnique({
          where: { refCode: trimmedRef },
        });
        if (!salesMember) {
          throw new Error("INVALID_REFERRAL_CODE");
        }
      }

      const req = await tx.trialRequest.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone?.trim() || null,
          refCode: trimmedRef,
        },
      });

      if (salesMember) {
        await tx.salesClient.create({
          data: {
            salesMemberId: salesMember.id,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone?.trim() || null,
            trialRequestId: req.id,
          },
        });
      }

      return req;
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
    if (error instanceof Error && error.message === "INVALID_REFERRAL_CODE") {
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 400 }
      );
    }
    const errorType = error instanceof Error ? error.constructor.name : "UnknownError";
    console.error("Failed to create trial request:", errorType);
    return NextResponse.json(
      { error: "Failed to submit trial request. Please try again." },
      { status: 500 }
    );
  }
}
