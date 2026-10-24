import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/nav";
import { Sidebar } from "@/components/dashboard/sidebar";

import { currentUser } from "@/lib/auth";

/** پنل مدیریت هم یک ناحیه‌ی احراز‌شده است و اجازه‌ی بلاک دارد. */
export const instant = false;

/**
 * چیدمان پنل مدیریت.
 *
 * The role check lives here so a non-admin is redirected before any admin query
 * runs — and the sidebar is reused from the user dashboard rather than
 * duplicated, because the navigation between the two is the same list with one
 * extra item.
 */
export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8 pb-28 sm:px-6 lg:pb-8">
      <Sidebar name={user.name} studentId={user.studentId ?? "—"} isAdmin />
      <div className="min-w-0 flex-1">
        <AdminNav>{children}</AdminNav>
      </div>
    </div>
  );
}