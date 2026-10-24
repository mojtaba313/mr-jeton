import { BellRing, CheckCheck } from "lucide-react";
import { Suspense } from "react";

import { markNotificationsReadAction } from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/motion-primitives";
import { NotificationsList } from "@/components/dashboard/notifications-list";

import { requireUser } from "@/lib/auth";
import { getNotifications } from "@/lib/queries";

export const metadata = { title: "اعلان‌ها" };

export default async function NotificationsPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">
            اعلان‌ها
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-muted">
            هر چیزی که باید بدانی — تایید رسید، تحویل ژتون، انقضای آگهی.
          </p>
        </div>
        <Suspense fallback={null}>
          <MarkAllRead />
        </Suspense>
      </header>

      <Suspense fallback={<NotificationsSkeleton />}>
        <NotificationsBlock />
      </Suspense>
    </div>
  );
}

async function MarkAllRead() {
  const user = await requireUser();
  const items = await getNotifications(user.id);
  const unread = items.filter((item) => !item.readAt);

  if (unread.length === 0) return null;

  return (
    <form action={markNotificationsReadAction}>
      <Button type="submit" variant="outline" size="sm">
        <CheckCheck className="size-4" />
        خواندن همه
      </Button>
    </form>
  );
}

async function NotificationsBlock() {
  const user = await requireUser();
  const items = await getNotifications(user.id);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<BellRing className="size-6" />}
        title="اعلانی نداری"
        description="وقتی چیزی برایت اتفاق بیفتد، همین‌جا می‌بینی."
      />
    );
  }

  return (
    <Card>
      <NotificationsList
        items={items.map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          link: item.link,
          atISO: item.atISO,
          atLabel: item.atLabel,
          read: item.readAt !== null,
        }))}
      />
    </Card>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-20 rounded-2xl" />
      ))}
    </div>
  );
}