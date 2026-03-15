import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApprovedSalesMember } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await requireApprovedSalesMember();

    const clients = await prisma.salesClient.findMany({
      where: { salesMemberId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ clients });
  } catch (err) {
    // Auth errors from requireApprovedSalesMember throw "Unauthorized"
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Unexpected errors (e.g., database issues)
    console.error("GET /api/sales/clients error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireApprovedSalesMember();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, email, phone } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const client = await prisma.salesClient.create({
      data: {
        salesMemberId: user.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, client }, { status: 201 });
  } catch (err) {
    // Unexpected server/database errors
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/sales/clients error:", errorMessage);
    return NextResponse.json(
      { error: "Failed to add client" },
      { status: 500 }
    );
  }
}
