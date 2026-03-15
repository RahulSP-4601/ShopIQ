import { NextRequest, NextResponse } from "next/server";
import { EmployeeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, companyName, source, refCode } = body;
    const trimmedRef = refCode?.trim() || null;

    if (!trimmedRef && process.env.ENABLE_PUBLIC_TRIAL_REQUESTS !== "true") {
      return NextResponse.json(
        { error: "Public trial requests are disabled. Please join the waitlist." },
        { status: 403 }
      );
    }

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
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

    if (source && String(source).trim().length > 200) {
      return NextResponse.json(
        { error: "Notes must be 200 characters or less" },
        { status: 400 }
      );
    }

    const normalizedName = String(name).trim();
    const normalizedCompanyName = String(companyName || name).trim() || normalizedName;
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = phone?.trim() || null;
    const normalizedSource = source?.trim() || null;

    if (trimmedRef) {
      const result = await prisma.$transaction(async (tx) => {
        const salesMember = await tx.employee.findFirst({
          where: {
            refCode: trimmedRef,
            role: EmployeeRole.SALES_MEMBER,
            isApproved: true,
          },
          select: { id: true },
        });

        if (!salesMember) {
          throw new Error("INVALID_REFERRAL_CODE");
        }

        const existingWaitlist = await tx.waitlistEntry.findUnique({
          where: { email: normalizedEmail },
          select: {
            id: true,
            salesClientId: true,
            salesClient: {
              select: { id: true, salesMemberId: true },
            },
          },
        });

        if (
          existingWaitlist?.salesClient?.salesMemberId &&
          existingWaitlist.salesClient.salesMemberId !== salesMember.id
        ) {
          throw new Error("EMAIL_ALREADY_ASSIGNED");
        }

        let salesClient = existingWaitlist?.salesClientId
          ? await tx.salesClient.findUnique({
              where: { id: existingWaitlist.salesClientId },
              select: { id: true, salesMemberId: true },
            })
          : null;

        if (salesClient && salesClient.salesMemberId !== salesMember.id) {
          throw new Error("EMAIL_ALREADY_ASSIGNED");
        }

        if (!salesClient) {
          salesClient = await tx.salesClient.findFirst({
            where: {
              salesMemberId: salesMember.id,
              email: normalizedEmail,
            },
            select: { id: true, salesMemberId: true },
          });
        }

        if (salesClient) {
          await tx.salesClient.update({
            where: { id: salesClient.id },
            data: {
              name: normalizedName,
              email: normalizedEmail,
              phone: normalizedPhone,
            },
          });
        } else {
          salesClient = await tx.salesClient.create({
            data: {
              salesMemberId: salesMember.id,
              name: normalizedName,
              email: normalizedEmail,
              phone: normalizedPhone,
            },
            select: { id: true, salesMemberId: true },
          });
        }

        const waitlistEntry = await tx.waitlistEntry.upsert({
          where: { email: normalizedEmail },
          update: {
            companyName: normalizedCompanyName,
            phone: normalizedPhone,
            source: normalizedSource,
            salesClientId: salesClient.id,
            invitedByEmployeeId: salesMember.id,
          },
          create: {
            companyName: normalizedCompanyName,
            email: normalizedEmail,
            phone: normalizedPhone,
            source: normalizedSource,
            salesClientId: salesClient.id,
            invitedByEmployeeId: salesMember.id,
          },
          select: { id: true },
        });

        return {
          waitlistEntryId: waitlistEntry.id,
          salesClientId: salesClient.id,
          alreadyExists: Boolean(existingWaitlist),
        };
      });

      return NextResponse.json(
        {
          success: true,
          message: "Private trial request submitted successfully",
          waitlistEntryId: result.waitlistEntryId,
          salesClientId: result.salesClientId,
          alreadyExists: result.alreadyExists,
        },
        { status: result.alreadyExists ? 200 : 201 }
      );
    }

    const trialRequest = await prisma.$transaction(async (tx) => {
      return tx.trialRequest.create({
        data: {
          name: normalizedName,
          email: normalizedEmail,
          phone: normalizedPhone,
          refCode: trimmedRef,
        },
      });
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
    if (error instanceof Error && error.message === "EMAIL_ALREADY_ASSIGNED") {
      return NextResponse.json(
        { error: "This email is already assigned to another sales owner." },
        { status: 409 }
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
