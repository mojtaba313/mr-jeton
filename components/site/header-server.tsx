import { Suspense } from "react";

import { AuthNavSkeleton, HeaderNav } from "@/components/site/header";

import { currentUser } from "@/lib/auth";
import { unreadCount } from "@/lib/notify";

/**
 * هدر سایت.
 *
 * Server component that renders a client nav. Reading the session happens in
 * `<Suspense>` so the page shell still prerenders — under Cache Components, a
 * `cookies()` read in the shell would make every route request-bound and kill
 * the static shell for visitors who are not signed in.
 */
export function SiteHeader() {
  return (
    <Suspense fallback={<HeaderShellSkeleton />}>
      <AuthHeader />
    </Suspense>
  );
}

async function AuthHeader() {
  const user = await currentUser();
  const unread = user ? await unreadCount(user.id) : 0;

  return (
    <HeaderNav
      user={user ? { name: user.name, role: user.role } : null}
      unread={unread}
    />
  );
}

function HeaderShellSkeleton() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-canvas-deep/85 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <div className="skeleton h-10 w-32 rounded-2xl" />
        <div className="flex-1" />
        <AuthNavSkeleton />
      </div>
    </header>
  );
}