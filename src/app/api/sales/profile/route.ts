import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApprovedSalesMember } from "@/lib/auth/session";

export async function GET() {
  let user;
  try {
    user = await requireApprovedSalesMember();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [clientCount, commissions] = await Promise.all([
      prisma.salesClient.count({ where: { salesMemberId: user.id } }),
      prisma.commission.findMany({
        where: { salesMemberId: user.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalCommission = commissions.reduce(
      (sum, c) => sum + Number(c.amount),
      0
    );

    return NextResponse.json({
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        refCode: user.refCode,
        clientCount,
        totalCommission,
        commissions,
      },
    });
  } catch (error) {
    console.error("Failed to fetch sales profile:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
