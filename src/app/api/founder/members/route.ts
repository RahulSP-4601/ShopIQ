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
    const members = await prisma.employee.findMany({
      where: { role: "SALES_MEMBER" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isApproved: true,
        refCode: true,
        createdAt: true,
        _count: {
          select: { salesClients: true },
        },
        commissions: {
          select: { amount: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      phone: m.phone,
      isApproved: m.isApproved,
      refCode: m.refCode,
      createdAt: m.createdAt,
      clientCount: m._count.salesClients,
      totalCommission: m.commissions.reduce(
        (sum, c) => sum + Number(c.amount),
        0
      ),
    }));

    return NextResponse.json({ members: result });
  } catch (error) {
    console.error("Failed to fetch members:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
