import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const TRIAL_DURATION_DAYS = 30;

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ valid: false });
    }

    const salesClient = await prisma.salesClient.findUnique({
      where: { trialToken: token },
      select: {
        name: true,
        email: true,
        clientUserId: true,
        trialSentAt: true,
      },
    });

    if (!salesClient) {
      return NextResponse.json({ valid: false });
    }

    // If trialSentAt is missing, the trial was never properly initiated
    if (!salesClient.trialSentAt) {
      return NextResponse.json({ valid: false, status: "invalid" });
    }

    // Check if trial has expired (30 days from trialSentAt)
    const expiresAt = new Date(salesClient.trialSentAt);
    expiresAt.setDate(expiresAt.getDate() + TRIAL_DURATION_DAYS);
    if (new Date() > expiresAt) {
      return NextResponse.json({ valid: true, status: "expired" });
    }

    // No account created yet — show setup form (token acts as bearer credential)
    if (!salesClient.clientUserId) {
      return NextResponse.json({
        valid: true,
        status: "new",
        clientName: salesClient.name,
        clientEmail: salesClient.email,
      });
    }

    // Account exists, trial still active — auto-login
    return NextResponse.json({
      valid: true,
      status: "active",
    });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
