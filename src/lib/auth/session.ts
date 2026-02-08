import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const SESSION_COOKIE = "shopiq_session";
const EMPLOYEE_SESSION_COOKIE = "shopiq_employee_session";
const SESSION_DEFAULT_MAX_AGE = 60 * 60 * 24 * 7; // 7 days (default)
const SESSION_REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30; // 30 days (remember me)
const SESSION_REFRESH_THRESHOLD = 60 * 60 * 24; // Refresh if < 1 day remaining

function getSecretKey() {
  // Prefer JWT_SIGNING_SECRET; fall back to SESSION_SECRET for backward compatibility
  const secret = process.env.JWT_SIGNING_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("JWT_SIGNING_SECRET (or SESSION_SECRET) is not set");
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

export async function createUserSession(
  user: {
    id: string;
    email: string;
    name: string;
  },
  options?: { rememberMe?: boolean }
): Promise<string> {
  const maxAge = options?.rememberMe
    ? SESSION_REMEMBER_ME_MAX_AGE
    : SESSION_DEFAULT_MAX_AGE;

  const payload: UserSessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    rememberMe: !!options?.rememberMe,
  };

  const jti = randomUUID();

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(jti)
    .setExpirationTime(`${maxAge}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
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
    if (!payload.userId) return null;

    // Batch both DB checks (revocation + user existence) in parallel to reduce latency
    const [revoked, userExists] = await Promise.all([
      payload.jti
        ? prisma.revokedToken.findUnique({
            where: { jti: payload.jti as string },
            select: { id: true },
          })
        : null,
      prisma.user.findUnique({
        where: { id: payload.userId as string },
        select: { id: true },
      }),
    ]);

    if (revoked) return null;
    if (!userExists) return null;

    // Sliding session: re-sign token if close to expiry
    if (payload.exp) {
      const timeRemaining = payload.exp - Math.floor(Date.now() / 1000);
      if (timeRemaining > 0 && timeRemaining < SESSION_REFRESH_THRESHOLD) {
        // Determine max age: prefer explicit rememberMe flag, fall back to iat/exp inference
        let maxAge = SESSION_DEFAULT_MAX_AGE;
        if (payload.rememberMe === true) {
          maxAge = SESSION_REMEMBER_ME_MAX_AGE;
        } else if (typeof payload.iat === "number" && payload.iat > 0) {
          const tokenLifetime = payload.exp - payload.iat;
          if (tokenLifetime > SESSION_DEFAULT_MAX_AGE) {
            maxAge = SESSION_REMEMBER_ME_MAX_AGE;
          }
        }

        const newJti = randomUUID();
        const refreshedToken = await new SignJWT({
          userId: payload.userId,
          email: payload.email,
          name: payload.name,
          rememberMe: payload.rememberMe ?? false,
        } as unknown as Record<string, unknown>)
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setJti(newJti)
          .setExpirationTime(`${maxAge}s`)
          .sign(getSecretKey());

        // Atomic claim: use INSERT (not upsert) on the old jti to act as a
        // distributed mutex. The unique constraint on jti ensures only the first
        // concurrent request wins the refresh — losers get P2002 and skip,
        // preventing duplicate valid tokens from being issued.
        let revocationSucceeded = true;
        if (payload.jti && typeof payload.jti === "string" && payload.exp) {
          try {
            await prisma.revokedToken.create({
              data: {
                jti: payload.jti,
                userId: payload.userId as string,
                expiresAt: new Date(payload.exp * 1000),
              },
            });
          } catch (revokeError) {
            if (
              revokeError instanceof Prisma.PrismaClientKnownRequestError &&
              revokeError.code === "P2002"
            ) {
              // Another request already claimed this refresh — skip silently
            }
            // Any error (P2002 or otherwise) means we should NOT issue a new cookie
            revocationSucceeded = false;
          }
        }

        // Only set the new cookie if old token was successfully revoked
        if (revocationSucceeded) {
          // Wrap in try-catch: cookieStore.set can throw in Server Components
          // when headers have already been sent (read-only response context)
          try {
            cookieStore.set(SESSION_COOKIE, refreshedToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge,
              path: "/",
            });
          } catch {
            // Cookie could not be set (e.g., Server Component context where
            // headers are read-only). Session is still valid — the refresh
            // will be retried on the next request in a writable context.
          }
        }
      }
    }

    return payload as unknown as UserSessionPayload;
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
    .setExpirationTime(`${SESSION_DEFAULT_MAX_AGE}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(EMPLOYEE_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DEFAULT_MAX_AGE,
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
    .setExpirationTime(`${SESSION_DEFAULT_MAX_AGE}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DEFAULT_MAX_AGE,
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

/**
 * Clear the local session cookie for the current browser.
 * This only removes the cookie from the current client — it does NOT
 * invalidate tokens on other devices. To revoke all sessions server-wide,
 * delete or deactivate the user record (getUserSession validates existence).
 */
export async function clearLocalSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: SESSION_COOKIE, path: "/" });
}

/**
 * Revoke a specific session token by its jti claim.
 * The token will be rejected on subsequent validation checks.
 */
export async function revokeSessionToken(
  jti: string,
  userId: string,
  expiresAt: Date
): Promise<void> {
  // Use upsert to be idempotent — duplicate jti won't throw a unique constraint error
  await prisma.revokedToken.upsert({
    where: { jti },
    create: { jti, userId, expiresAt },
    update: {},
  });
}

/**
 * Remove expired entries from the revoked tokens table.
 * Call periodically (e.g., daily cron) to keep the table small.
 */
export async function cleanupExpiredRevocations(): Promise<number> {
  const result = await prisma.revokedToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

export async function requireAuth() {
  const store = await getStore();
  if (!store) throw new Error("Unauthorized");
  return store;
}
