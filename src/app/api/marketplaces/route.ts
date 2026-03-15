import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connections = await prisma.marketplaceConnection.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ connections });
  } catch (error) {
    console.error("Get marketplaces error:", error);
    return NextResponse.json(
      { error: "Failed to fetch marketplace connections" },
      { status: 500 }
    );
  }
}
