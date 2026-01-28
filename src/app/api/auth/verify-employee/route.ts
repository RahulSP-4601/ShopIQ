import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import prisma from "@/lib/prisma";

const EMPLOYEE_SESSION_COOKIE = "shopiq_employee_session";

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Internal API endpoint to verify employee approval status from database.
 * Used by middleware to get fresh approval status instead of relying on JWT cache.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey());

    if (!payload.employeeId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: payload.employeeId as string },
      select: { id: true, role: true, isApproved: true },
    });

    if (!employee) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      employeeId: employee.id,
      role: employee.role,
      isApproved: employee.isApproved,
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
