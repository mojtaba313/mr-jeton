import { redirect } from "next/navigation";

import { MobileTabBar, Sidebar } from "@/components/dashboard/sidebar";

import { currentUser } from "@/lib/auth";

/**
 * An authenticated area is allowed to block: the whole point of the layout is
 * to read the session and redirect, and wrapping that in `<Suspense>` would
 * render the page for someone who is about to be bounced.
 */
export const instant = false;

/**
 * چیدمان داشبورد.
 *
 * The session check happens here rather than in each page: a layout wraps every
 * nested route, so the redirect and the user lookup cost one query per
 * navigation instead of one per page. Pages read the user again only when they
 * need the id for their own queries.
 */
export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/dashboard");

  const isAdmin = user.role === "ADMIN";

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8 pb-28 sm:px-6 lg:pb-8">
      <Sidebar
        name={user.name}
        studentId={user.studentId ?? "—"}
        isAdmin={isAdmin}
      />
      <div className="min-w-0 flex-1">{children}</div>
      <MobileTabBar isAdmin={isAdmin} />
    </div>
  );
}