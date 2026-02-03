import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("shopiq_employee_session")?.value;
  const path = request.nextUrl.pathname;

  if (!token) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  try {
    // Verify JWT only (no DB call — Edge Runtime cannot use Prisma)
    const { payload } = await jwtVerify(token, getSecretKey());

    if (!payload.employeeId) {
      return NextResponse.redirect(new URL("/signin", request.url));
    }

    const role = typeof payload.role === "string" ? payload.role : "";
    const isApproved = payload.isApproved === true;

    // Founder routes - verify role
    if (path.startsWith("/founder") && role !== "FOUNDER") {
      return NextResponse.redirect(new URL("/signin", request.url));
    }

    // Sales routes - verify role and approval status
    if (path.startsWith("/sales")) {
      if (role !== "SALES_MEMBER") {
        return NextResponse.redirect(new URL("/signin", request.url));
      }

      // Unapproved sales members can only see pending-approval page
      if (!isApproved && path !== "/sales/pending-approval") {
        return NextResponse.redirect(
          new URL("/sales/pending-approval", request.url)
        );
      }
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/signin", request.url));
  }
}

export const config = {
  matcher: ["/founder/:path*", "/sales/:path*"],
};
