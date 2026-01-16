import { NextResponse } from "next/server";
import { getStore } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const store = await getStore();

    if (!store) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const reports = await prisma.report.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        title: true,
        status: true,
        startDate: true,
        endDate: true,
        createdAt: true,
      },
    });

    return NextResponse.json(reports);
  } catch {
    return NextResponse.json(
      { error: "Failed to get reports" },
      { status: 500 }
    );
  }
}
