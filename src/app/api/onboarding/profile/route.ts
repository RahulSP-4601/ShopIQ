import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { IndustryType, BusinessSize } from "@prisma/client";

const VALID_INDUSTRIES = new Set<string>(Object.values(IndustryType));
const VALID_SIZES = new Set<string>(Object.values(BusinessSize));

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    const { industry, businessSize, primaryCategory, targetMarket } = body;

    // Validate industry (with type guard)
    if (!industry || typeof industry !== "string" || !VALID_INDUSTRIES.has(industry)) {
      return NextResponse.json(
        { error: "Invalid industry type" },
        { status: 400 }
      );
    }

    // Validate business size (with type guard)
    if (!businessSize || typeof businessSize !== "string" || !VALID_SIZES.has(businessSize)) {
      return NextResponse.json(
        { error: "Invalid business size" },
        { status: 400 }
      );
    }

    // Validate optional fields
    const safePrimaryCategory =
      primaryCategory && typeof primaryCategory === "string"
        ? primaryCategory.slice(0, 100)
        : null;
    const safeTargetMarket =
      targetMarket && typeof targetMarket === "string"
        ? targetMarket.slice(0, 100)
        : null;

    // Upsert business profile (idempotent)
    const profile = await prisma.businessProfile.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        industry: industry as IndustryType,
        businessSize: businessSize as BusinessSize,
        primaryCategory: safePrimaryCategory,
        targetMarket: safeTargetMarket,
      },
      update: {
        industry: industry as IndustryType,
        businessSize: businessSize as BusinessSize,
        primaryCategory: safePrimaryCategory,
        targetMarket: safeTargetMarket,
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        industry: profile.industry,
        businessSize: profile.businessSize,
        primaryCategory: profile.primaryCategory,
        targetMarket: profile.targetMarket,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorName = error instanceof Error ? error.name : "Error";
    console.error(`Profile save error: ${errorName} - ${errorMessage}`);
    return NextResponse.json(
      { error: "Failed to save business profile" },
      { status: 500 }
    );
  }
}
