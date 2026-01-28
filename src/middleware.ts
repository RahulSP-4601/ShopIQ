import { NextRequest, NextResponse } from "next/server";
import { verifyEmployeeTokenFromDB } from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("shopiq_employee_session")?.value;
  const path = request.nextUrl.pathname;

  if (!token) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  try {
    // Verify token and fetch fresh employee data from database
    const employee = await verifyEmployeeTokenFromDB(token);

    if (!employee) {
      return NextResponse.redirect(new URL("/signin", request.url));
    }

    // Founder routes - verify role
    if (path.startsWith("/founder") && employee.role !== "FOUNDER") {
      return NextResponse.redirect(new URL("/signin", request.url));
    }

    // Sales routes - verify role and approval status
    if (path.startsWith("/sales")) {
      if (employee.role !== "SALES_MEMBER") {
        return NextResponse.redirect(new URL("/signin", request.url));
      }

      // Unapproved sales members can only see pending-approval page
      if (!employee.isApproved && path !== "/sales/pending-approval") {
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
