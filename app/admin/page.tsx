import { Inbox, Ticket, Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { AdminReservationRow } from "@/components/admin/reservation-row";
import { RequestReviewCard } from "@/components/admin/request-review-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/motion-primitives";

import { requireAdmin } from "@/lib/auth";
import { FEE_PERCENT } from "@/lib/config";
import { toPersianDigits } from "@/lib/dates";
import { formatToman } from "@/lib/money";
import { getAdminStats, getAllReservations, getPendingRequests } from "@/lib/queries";

export const metadata = { title: "پنل مدیریت" };

/**
 * پنل مدیریت — حسابداری، نه دلالی.
 *
 * Everything a manager needs to see at a glance: how much the platform earned,
 * how much money is sitting in users' wallets, and how many requests are waiting.
 */
export default async function AdminPage() {
  await requireAdmin();

  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminOverview />
    </Suspense>
  );
}

async function AdminOverview() {
  await requireAdmin();

  const [stats, requests, reservations] = await Promise.all([
    getAdminStats(),
    getPendingRequests(),
    getAllReservations(4),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon="trending"
          tone="jade"
          label={`سود سایت (${toPersianDigits(FEE_PERCENT)}٪)`}
          text={formatToman(stats.profit)}
        />
        <StatCard
          icon="wallet"
          label="پول داخل کیف پول کاربران"
          text={formatToman(stats.walletTotal)}
        />
        <StatCard
          icon="bell"
          tone="ember"
          label="در انتظار بررسی"
          value={stats.pendingRequests}
          suffix="درخواست"
        />
        <StatCard
          icon="coins"
          label="پرداخت‌شده به کاربران"
          text={formatToman(stats.paidOut)}
        />
      </div>

      {stats.pendingRequests > 0 ? (
        <Card className="border-ember-400/25 bg-ember-400/6">
          <CardBody className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-ink">
                {toPersianDigits(stats.pendingRequests)} درخواست منتظر بررسی است
              </p>
              <p className="mt-1 text-[12px] leading-6 text-ink-muted">
                تا وقتی شارژ تایید نشود، کاربر نمی‌تواند ژتون رزرو کند.
              </p>
            </div>
            <Link href="/admin/requests">
              <Button size="sm">بررسی کن</Button>
            </Link>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat icon={Ticket} label="معامله‌ی موفق" value={stats.settled} />
        <MiniStat icon={Ticket} label="در جریان" value={stats.openReservations} />
        <MiniStat icon={Users} label="کاربر" value={stats.users} />
      </div>

      <Card>
        <CardHeader
          title="در انتظار بررسی"
          description="شارژها و برداشت‌های جدید"
          action={
            <Link
              href="/admin/requests"
              className="text-[12px] font-semibold text-brand-300 hover:underline"
            >
              همه
            </Link>
          }
        />
        <CardBody className="space-y-3">
          {requests.length === 0 ? (
            <EmptyState
              icon={<Inbox className="size-6" />}
              title="صف خالی است"
              description="درخواست جدیدی که بیاید همین‌جا نمایش داده می‌شود."
            />
          ) : (
            requests.slice(0, 3).map((request, index) => (
              <RequestReviewCard key={request.id} request={request} index={index} />
            ))
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="آخرین رزروها"
          description="هر رزروی که در جریان است"
          action={
            <Link
              href="/admin/reservations"
              className="text-[12px] font-semibold text-brand-300 hover:underline"
            >
              همه
            </Link>
          }
        />
        <CardBody className="space-y-3">
          {reservations.length === 0 ? (
            <EmptyState
              icon={<Ticket className="size-6" />}
              title="هنوز رزروی ثبت نشده"
              description="اولین معامله که در بازار انجام شود، اینجا دیده می‌شود."
            />
          ) : (
            reservations.map((reservation, index) => (
              <AdminReservationRow
                key={reservation.id}
                reservation={reservation}
                index={index}
              />
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Ticket;
  label: string;
  value: number;
}) {
  return (
    <div className="glass flex items-center gap-3 rounded-xl2 px-4 py-3">
      <span className="grid size-9 place-items-center rounded-xl bg-white/[0.05] text-ink-muted">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-[17px] font-black text-ink">{toPersianDigits(value)}</p>
        <p className="text-[11px] text-ink-muted">{label}</p>
      </div>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl2" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl2" />
    </div>
  );
}