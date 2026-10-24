import { Users } from "lucide-react";
import { Suspense } from "react";

import { UsersTable } from "@/components/admin/users-table";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/motion-primitives";

import { requireAdmin } from "@/lib/auth";
import { getUsers } from "@/lib/queries";

export const metadata = { title: "کاربران" };

export default async function AdminUsersPage() {
  await requireAdmin();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          کاربران
        </h1>
        <p className="mt-1.5 text-[13px] leading-6 text-ink-muted">
          نقش‌ها و مسدودی‌ها. مسدود کردن، دسترسی کاربر را به بازار می‌بندد ولی
          سوابقش را پاک نمی‌کند.
        </p>
      </header>

      <Card>
        <CardBody className="p-0">
          <Suspense fallback={<UsersSkeleton />}>
            <UsersBlock />
          </Suspense>
        </CardBody>
      </Card>
    </div>
  );
}

async function UsersBlock() {
  const admin = await requireAdmin();
  const users = await getUsers();

  if (users.length === 0) {
    return (
      <EmptyState
        icon={<Users className="size-6" />}
        title="کاربری ثبت نشده"
        description="اولین ثبت‌نام‌ها اینجا نمایش داده می‌شوند."
      />
    );
  }

  return <UsersTable users={users} selfId={admin.id} />;
}

function UsersSkeleton() {
  return (
    <div className="space-y-2 p-5">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-14 rounded-xl" />
      ))}
    </div>
  );
}