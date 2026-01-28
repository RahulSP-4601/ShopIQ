import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import prisma from "@/lib/prisma";

const SESSION_COOKIE = "shopiq_session";
const EMPLOYEE_SESSION_COOKIE = "shopiq_employee_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

// ============================================
// USER SESSION (CLIENT only)
// ============================================

export interface UserSessionPayload {
  userId: string;
  email: string;
  name: string;
  [key: string]: unknown;
}

export async function createUserSession(user: {
  id: string;
  email: string;
  name: string;
}): Promise<string> {
  const payload: UserSessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return token;
}

export async function getUserSession(): Promise<UserSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.userId) {
      return payload as unknown as UserSessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getUser() {
  const session = await getUserSession();
  if (!session) return null;

  return prisma.user.findUnique({ where: { id: session.userId } });
}

export async function getUserWithStores() {
  const session = await getUserSession();
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
    include: { stores: true, marketplaceConns: true, subscription: true },
  });
}

export async function getUserWithMarketplaces() {
  const session = await getUserSession();
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
    include: { marketplaceConns: { orderBy: { createdAt: "asc" } } },
  });
}

export async function requireUser() {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

// ============================================
// EMPLOYEE SESSION (FOUNDER & SALES_MEMBER)
// ============================================

export interface EmployeeSessionPayload {
  employeeId: string;
  email: string;
  name: string;
  role: string;
  /**
   * @deprecated Use getVerifiedEmployeeApproval() for sensitive operations.
   * This value is cached at session creation and may become stale if approval status changes.
   */
  isApproved: boolean;
  [key: string]: unknown;
}

export async function createEmployeeSession(employee: {
  id: string;
  email: string;
  name: string;
  role: string;
  isApproved: boolean;
}): Promise<string> {
  const payload: EmployeeSessionPayload = {
    employeeId: employee.id,
    email: employee.email,
    name: employee.name,
    role: employee.role,
    isApproved: employee.isApproved,
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(EMPLOYEE_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return token;
}

export async function getEmployeeSession(): Promise<EmployeeSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(EMPLOYEE_SESSION_COOKIE)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.employeeId) {
      return payload as unknown as EmployeeSessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getEmployee() {
  const session = await getEmployeeSession();
  if (!session) return null;

  return prisma.employee.findUnique({ where: { id: session.employeeId } });
}

export async function requireFounder() {
  const employee = await getEmployee();
  if (!employee || employee.role !== "FOUNDER") {
    throw new Error("Unauthorized");
  }
  return employee;
}

export async function requireApprovedSalesMember() {
  const employee = await getEmployee();
  if (!employee || employee.role !== "SALES_MEMBER" || !employee.isApproved) {
    throw new Error("Unauthorized");
  }
  return employee;
}

/**
 * Verifies the current approval status from the database.
 * Use this instead of trusting the JWT's isApproved field for sensitive operations.
 * Returns the current isApproved status, or null if no valid session.
 */
export async function getVerifiedEmployeeApproval(): Promise<boolean | null> {
  const session = await getEmployeeSession();
  if (!session) return null;

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { isApproved: true },
  });

  return employee?.isApproved ?? null;
}

/**
 * Verifies an employee JWT token and fetches fresh data from the database.
 * This is designed for use in middleware where cookies() is not available.
 * @param token - The JWT token string from the cookie
 * @returns Employee data with fresh role and isApproved from DB, or null if invalid
 */
export async function verifyEmployeeTokenFromDB(
  token: string
): Promise<{ employeeId: string; role: string; isApproved: boolean } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());

    if (!payload.employeeId) {
      return null;
    }

    const employee = await prisma.employee.findUnique({
      where: { id: payload.employeeId as string },
      select: { id: true, role: true, isApproved: true },
    });

    if (!employee) {
      return null;
    }

    return {
      employeeId: employee.id,
      role: employee.role,
      isApproved: employee.isApproved,
    };
  } catch {
    return null;
  }
}

// ============================================
// STORE-BASED AUTH (Legacy)
// ============================================

export interface SessionPayload {
  storeId: string;
  domain: string;
  [key: string]: unknown;
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getStore() {
  const userSession = await getUserSession();
  if (userSession) {
    return prisma.store.findFirst({
      where: { userId: userSession.userId, syncStatus: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    });
  }

  const session = await getSession();
  if (!session?.storeId) return null;

  return prisma.store.findFirst({
    where: { id: session.storeId, syncStatus: "COMPLETED" },
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(EMPLOYEE_SESSION_COOKIE);
}

export async function requireAuth() {
  const store = await getStore();
  if (!store) throw new Error("Unauthorized");
  return store;
}
