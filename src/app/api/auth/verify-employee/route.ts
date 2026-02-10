import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";

const EMPLOYEE_SESSION_COOKIE = "frame_employee_session";

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Internal API endpoint to verify employee status from database.
 *
 * GET: Cookie-based auth (used by frontend).
 * POST: Internal secret auth (used by Edge middleware to get fresh DB status).
 *
 * Edge Runtime middleware cannot use Prisma directly, so it calls this
 * Node.js route handler via fetch() for founder routes that need fresh
 * role/approval data.
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

/**
 * POST handler for middleware internal calls.
 * Protected by INTERNAL_API_SECRET header to prevent external abuse.
 */
export async function POST(request: NextRequest) {
  const internalSecret = request.headers.get("x-internal-secret");
  const expectedSecret = process.env.INTERNAL_API_SECRET;

  if (!internalSecret || !expectedSecret) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const providedBuf = Buffer.from(internalSecret);
  const expectedBuf = Buffer.from(expectedSecret);

  if (
    providedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  let body: { employeeId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const { employeeId } = body;

  if (!employeeId || typeof employeeId !== "string") {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, role: true, isApproved: true },
    });

    if (!employee) {
      return NextResponse.json({ valid: false }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      role: employee.role,
      isApproved: employee.isApproved,
    });
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
