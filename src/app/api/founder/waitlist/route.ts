import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireFounder } from "@/lib/auth/session";

export async function GET() {
  try {
    await requireFounder();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const entries = await prisma.waitlistEntry.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        companyName: true,
        email: true,
        phone: true,
        source: true,
        status: true,
        trialSentAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to fetch waitlist:", message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
