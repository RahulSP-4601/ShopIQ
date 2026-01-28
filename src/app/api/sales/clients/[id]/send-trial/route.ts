import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApprovedSalesMember } from "@/lib/auth/session";
import crypto from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireApprovedSalesMember();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const salesClient = await prisma.salesClient.findFirst({
      where: { id, salesMemberId: user.id },
    });

    if (!salesClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (salesClient.trialToken) {
      return NextResponse.json({ error: "Trial already sent to this client" }, { status: 400 });
    }

    const trialToken = crypto.randomUUID();

    // Use both id and salesMemberId in where clause to prevent TOCTOU race
    const updated = await prisma.salesClient.updateMany({
      where: { id, salesMemberId: user.id, trialToken: null },
      data: {
        trialToken,
        trialSentAt: new Date(),
        status: "CONTACTED",
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Trial already sent to this client" }, { status: 400 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const trialLink = `${origin}/trial/${trialToken}`;

    return NextResponse.json({ success: true, trialLink });
  } catch {
    return NextResponse.json({ error: "Failed to send trial" }, { status: 500 });
  }
}
