import { ArrowLeft, Bell, Ticket } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { ReservationCard } from "@/components/dashboard/reservation-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, SkeletonCard } from "@/components/ui/motion-primitives";

import { requireUser } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/queries";
import { formatToman } from "@/lib/money";

/** نمای کلی داشبورد. */
export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">نمای کلی</h1>
          <p className="mt-1.5 text-[13px] text-ink-muted">
            رزروها، موجودی کیف پول و کارهای در انتظارت تو.
          </p>
        </div>
        <LinkButton href="/sell" size="sm">
          <Ticket className="size-4" />
          فروش ژتون
        </LinkButton>
      </header>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardBlock searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function DashboardBlock({
  searchParams,
}: Pick<PageProps<"/dashboard">, "searchParams">) {
  const params = await searchParams;
  const user = await requireUser();
  const summary = await getDashboardSummary(user.id);
  const welcome = params.welcome === "1";

  return (
    <div className="space-y-6">
      {welcome ? (
        <Card className="border-jade-400/25 bg-jade-400/6">
          <CardBody className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-jade-400/15 text-jade-400">
              ✓
            </span>
            <p className="text-[13px] text-ink-soft">
              خوش آمدی. اول کیف پولت را شارژ کن تا بتوانی ژتون رزرو کنی.
            </p>
            <LinkButton href="/wallet" size="sm" className="ms-auto">
              شارژ کیف پول
            </LinkButton>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon="wallet"
          label="موجودی کیف پول"
          text={formatToman(summary.balance)}
        />
        <StatCard
          icon="ticket"
          label="آگهی فعال"
          value={summary.openListings}
          suffix="آگهی"
        />
        <StatCard
          icon="trending"
          label="فروش‌های انجام‌شده"
          value={summary.sellingTotal}
          suffix="معامله"
        />
      </div>

      <Card>
        <CardHeader
          title="رزروهای اخیر"
          description="هر کدی که سر وقت باید سرش بروی"
          action={
            <Link
              href="/dashboard/reservations"
              className="text-[12px] font-semibold text-brand-300 hover:underline"
            >
              همه
            </Link>
          }
        />
        <CardBody className="space-y-3">
          {summary.recent.length === 0 ? (
            <EmptyState
              icon={<Ticket className="size-6" />}
              title="هنوز رزروی نداری"
              description="از بازار یک ژتون رزرو کن یا خودت آگهی بگذار."
              action={
                <div className="flex gap-2">
                  <LinkButton href="/market">دیدن بازار</LinkButton>
                  <LinkButton href="/wallet" variant="outline">
                    شارژ کیف پول
                  </LinkButton>
                </div>
              }
            />
          ) : (
            summary.recent.map((reservation, index) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                index={index}
              />
            ))
          )}
        </CardBody>
      </Card>

      {summary.unread > 0 ? (
        <Link href="/dashboard/notifications">
          <Card className="border-brand-300/20 transition-colors hover:border-brand-300/40">
            <CardBody className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-brand-400/12 text-brand-300">
                <Bell className="size-4" />
              </span>
              <p className="text-[13px] text-ink-soft">
                {toPersianDigits(summary.unread)} اعلان خوانده‌نشده داری
              </p>
              <Button variant="ghost" size="sm" className="ms-auto">
                دیدن
                <ArrowLeft className="size-4" />
              </Button>
            </CardBody>
          </Card>
        </Link>
      ) : null}
    </div>
  );
}

function toPersianDigits(value: number): string {
  return value.toLocaleString("fa-IR");
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="skeleton h-24 rounded-xl2" />
        ))}
      </div>
      <SkeletonCard />
    </div>
  );
}