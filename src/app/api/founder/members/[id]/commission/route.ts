import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireFounder } from "@/lib/auth/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireFounder();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const commissions = await prisma.commission.findMany({
      where: { salesMemberId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ commissions });
  } catch (error) {
    console.error("Failed to fetch commissions:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireFounder();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { amount, note } = await request.json();

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Valid positive amount is required" },
        { status: 400 }
      );
    }

    // Verify the sales member exists and has the correct role
    const member = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!member || member.role !== "SALES_MEMBER") {
      return NextResponse.json(
        { error: "Sales member not found" },
        { status: 404 }
      );
    }

    const commission = await prisma.commission.create({
      data: {
        salesMemberId: id,
        amount: Number(amount),
        note: note?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, commission }, { status: 201 });
  } catch (error) {
    console.error("Failed to add commission:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to add commission" },
      { status: 500 }
    );
  }
}
