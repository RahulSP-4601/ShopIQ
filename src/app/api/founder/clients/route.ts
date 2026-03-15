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
    const clients = await prisma.salesClient.findMany({
      include: {
        salesMember: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ clients });
  } catch (error) {
    console.error("Failed to fetch clients:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
