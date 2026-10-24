import "server-only";

import { cookies, headers } from "next/headers";
import { sign, verify } from "jsonwebtoken";

import { db, type Role } from "@/lib/db";
import { SESSION_COOKIE, SESSION_USER_HEADER } from "@/lib/session-constants";

/**
 * Session handling: one signed, httpOnly cookie holding a JWT.
 *
 * Why a JWT and not a session row: the app has one role on the token and the
 * user row is re-read on every check anyway, so a database-backed session table
 * would buy nothing but an extra table to keep in sync. The trade-off is that
 * revoking a session before its 7-day expiry means rotating JWT_SECRET_KEY,
 * which logs out everyone — acceptable for a campus tool, worth knowing before
 * you need it.
 */

const MAX_AGE = 60 * 60 * 24 * 7;

export type SessionPayload = { sub: number };

function secret() {
  const value = process.env.JWT_SECRET_KEY;
  if (!value) throw new Error("JWT_SECRET_KEY تنظیم نشده است.");
  return value;
}

export async function createSession(userId: number) {
  const token = sign({ sub: userId } satisfies SessionPayload, secret(), {
    expiresIn: "7d",
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export type SessionUser = {
  id: number;
  name: string;
  studentId: string | null;
  phone: string;
  phoneVerified: boolean;
  role: Role;
  isBlocked: boolean;
  createdAt: Date;
};

/**
 * شماره‌ی کاربر از هدرِ proxy.
 *
 * The JWT is verified in `proxy.ts`, not here, and only the resulting user id
 * travels forward as a request header. The reason is not fashion: `jsonwebtoken`
 * calls `Date.now()` internally, and under Cache Components a `Date.now()` read
 * during the re-render that follows `revalidatePath()` fails the render with
 * "unstable value" — which is to say, verifying a token during a render quietly
 * breaks every page refresh in the app.
 *
 * The header is stripped and re-set by the proxy on every request, so a client
 * cannot forge it by sending one.
 */
async function userIdFromProxy(): Promise<number | null> {
  const value = (await headers()).get(SESSION_USER_HEADER);
  if (!value) return null;

  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) ? id : null;
}

/** Fallback for requests the proxy did not touch (tests, internal calls). */
async function userIdFromCookie(): Promise<number | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = verify(token, secret()) as unknown as SessionPayload;
    return typeof payload?.sub === "number" ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * The signed-in user, or `null`.
 *
 * Reads the verified id and hits the database on every call. Callers on hot
 * paths (a list of 20 listings rendering an owner name) should not use this —
 * join the relation instead. This is for "who is asking" checks.
 */
export async function currentUser(): Promise<SessionUser | null> {
  const id = (await userIdFromProxy()) ?? (await userIdFromCookie());
  if (id === null) return null;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      studentId: true,
      phone: true,
      phoneVerifiedAt: true,
      role: true,
      isBlocked: true,
      createdAt: true,
    },
  });

  if (!user || user.isBlocked) return null;

  return { ...user, phoneVerified: user.phoneVerifiedAt !== null };
}

export type AuthedUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

/** For server actions: refuses to continue unless someone is signed in. */
export async function requireUser(): Promise<AuthedUser> {
  const user = await currentUser();
  if (!user) throw new Error("برای این کار باید وارد حساب خود شوید.");
  return user;
}

export async function requireAdmin(): Promise<AuthedUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("این بخش فقط برای مدیر سایت است.");
  return user;
}