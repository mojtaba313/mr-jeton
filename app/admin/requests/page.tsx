import { Inbox } from "lucide-react";
import { Suspense } from "react";

import { RequestReviewCard } from "@/components/admin/request-review-card";
import { EmptyState, Skeleton } from "@/components/ui/motion-primitives";

import { requireAdmin } from "@/lib/auth";
import { getPendingRequests } from "@/lib/queries";

export const metadata = { title: "شارژ و برداشت" };

/**
 * تنها صف کاری مدیر: شارژهای کیف پول و برداشت‌ها.
 *
 * The whole admin product is one screen long. Everything else in `/admin` is
 * reference, not work.
 */
export default async function AdminRequestsPage() {
  await requireAdmin();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          شارژ و برداشت
        </h1>
        <p className="mt-1.5 text-[13px] leading-6 text-ink-muted">
          رسید شارژ را با مبلغ و چهار رقم آخر کارت مقایسه کن و تایید کن. برداشت‌ها
          پولی نیستند که از کیف پول کاربر کم شده باشد — بعد از واریز کارت، تایید کن.
        </p>
      </header>

      <Suspense fallback={<RequestsSkeleton />}>
        <RequestsBlock />
      </Suspense>
    </div>
  );
}

async function RequestsBlock() {
  await requireAdmin();
  const requests = await getPendingRequests();

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="size-6" />}
        title="صف خالی است"
        description="همه‌چیز بررسی شده. درخواست جدیدی که بیاید همین‌جا می‌آید."
      />
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request, index) => (
        <RequestReviewCard key={request.id} request={request} index={index} />
      ))}
    </div>
  );
}

function RequestsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-48 rounded-xl2" />
      ))}
    </div>
  );
}
