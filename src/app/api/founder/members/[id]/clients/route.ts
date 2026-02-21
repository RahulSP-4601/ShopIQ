import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireFounder } from "@/lib/auth/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let founder;
  try {
    founder = await requireFounder();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Verify the member exists and is a sales member
    const member = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!member || member.role !== "SALES_MEMBER") {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Note: Multi-tenancy (organizationId) not implemented in current schema.
    // In a multi-tenant system, verify member.organizationId === founder.organizationId here
    // and return 403 Forbidden if they don't match.
    void founder; // Acknowledge founder is available for future org validation

    const clients = await prisma.salesClient.findMany({
      where: { salesMemberId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ clients });
  } catch (error) {
    console.error("Failed to fetch member clients:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
