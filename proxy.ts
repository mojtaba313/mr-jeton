import { verify } from "jsonwebtoken";
import { NextResponse, type NextRequest } from "next/server";

import {
  SESSION_COOKIE,
  SESSION_USER_HEADER,
} from "@/lib/session-constants";

/**
 * دروازه‌ی احراز هویت.
 *
 * Proxy runs before a route renders, so a signed-out visitor to /dashboard never
 * reaches a component that would have to render a redirect. It is a shortcut,
 * not a security boundary: every Server Action and Route Handler re-checks the
 * session itself, because a matcher that excludes a path also skips Server
 * Function calls on that path.
 *
 * Two jobs, and the second one is the reason this file exists at all:
 *
 *  1. Redirect signed-out visitors away from protected paths.
 *  2. **Verify the JWT once, here**, and hand the render layer nothing but a user
 *     id. `jsonwebtoken` calls `Date.now()` internally; under Cache Components a
 *     `Date.now()` read during the re-render that follows `revalidatePath()`
 *     aborts that render ("unstable value"). Verifying inside the render — the
 *     obvious place for it — quietly breaks page refreshes app-wide.
 *
 * The list is of *protected* prefixes rather than public ones, so a new public
 * page is reachable by default and a new protected section has to be named
 * explicitly. The inverse — allowlisting public pages — fails open, which is the
 * wrong direction for a list of pages that need a session.
 */

const PROTECTED_PREFIXES = ["/dashboard", "/admin"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** شماره‌ی کاربر از توکن، یا null اگر توکن نامعتبر/منقضی باشد. */
function verifySession(token: string | undefined): number | null {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret || !token) return null;

  try {
    const payload = verify(token, secret) as { sub?: unknown };
    return typeof payload?.sub === "number" ? payload.sub : null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const headers = new Headers(request.headers);
  // هدر ورودی کاربر هرگز قابل اعتماد نیست: اول پاک می‌شود، بعد مقدار معتبر
  // خودمان رویش نوشته می‌شود.
  headers.delete(SESSION_USER_HEADER);

  const userId = verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (userId !== null) headers.set(SESSION_USER_HEADER, String(userId));

  if (!isProtected(pathname)) {
    return NextResponse.next({ request: { headers } });
  }

  if (userId === null) {
    const login = new URL("/login", request.url);
    // Remember where they were headed so login can send them back.
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  // A valid token is not the same as an admin token, and decoding a JWT here to
  // find out would mean shipping the secret to the edge. Admin routes are gated
  // per-page by requireAdmin(); this layer only keeps signed-out visitors out.
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)).*)",
  ],
};