import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireFounder } from "@/lib/auth/session";

export async function PATCH(
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

    // Verify the employee exists and is a sales member before approving
    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, role: true, name: true },
    });

    if (!existingEmployee || existingEmployee.role !== "SALES_MEMBER") {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Note: Multi-tenancy (organizationId) not implemented in current schema.
    // In a multi-tenant system, verify existingEmployee.organizationId === founder.organizationId here.

    const employee = await prisma.employee.update({
      where: { id },
      data: { isApproved: true },
    });

    // Log approval action for audit trail
    console.log(`Founder ${founder.id} (${founder.email}) approved sales member ${employee.id} (${employee.name})`);

    return NextResponse.json({
      success: true,
      member: { id: employee.id, name: employee.name, isApproved: employee.isApproved },
    });
  } catch (err) {
    // P2025: Record not found (invalid id or not a SALES_MEMBER)
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to approve member" }, { status: 500 });
  }
}
