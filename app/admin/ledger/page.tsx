import { ScrollText, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Suspense } from "react";

import { LedgerForm } from "@/components/admin/ledger-form";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/motion-primitives";

import { requireAdmin } from "@/lib/auth";
import { toPersianDigits } from "@/lib/dates";
import { formatToman } from "@/lib/money";
import { LEDGER_KIND } from "@/lib/labels";
import { getLedger } from "@/lib/queries";

export const metadata = { title: "دفتر مالی" };

export default async function AdminLedgerPage() {
  await requireAdmin();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          دفتر مالی
        </h1>
        <p className="mt-1.5 text-[13px] leading-6 text-ink-muted">
          هر سطر یک حرکت پول: سهم سایت از هر معامله، و پرداخت به فروشنده‌ها. سود
          واقعی همین‌جاست.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader
            title="ثبت سند دستی"
            description="برای هزینه‌ها و اصلاحات"
          />
          <CardBody>
            <LedgerForm />
          </CardBody>
        </Card>

        <Suspense fallback={<LedgerStatsSkeleton />}>
          <LedgerStats />
        </Suspense>
      </div>

      <Card>
        <CardHeader title="گردش مالی" description="جدیدترین سندها" />
        <CardBody className="p-0">
          <Suspense fallback={<LedgerSkeleton />}>
            <LedgerRows />
          </Suspense>
        </CardBody>
      </Card>
    </div>
  );
}

async function LedgerStats() {
  await requireAdmin();
  const rows = await getLedger(200);

  const sum = (kind: "FEE" | "WITHDRAWAL_PAID" | "REFUND" | "ADJUSTMENT") =>
    rows
      .filter((row) => row.kind === kind)
      .reduce((total, row) => total + row.amount, 0);

  const fees = sum("FEE");
  const payouts = Math.abs(sum("WITHDRAWAL_PAID"));

  return (
    <div className="grid gap-4">
      <StatCard icon="trending" tone="jade" label="مجموع سهم سایت" text={formatToman(fees)} />
      <StatCard icon="trendDown" tone="ember" label="مجموع برداشت‌های پرداخت‌شده" text={formatToman(payouts)} />
      <div className="glass rounded-xl2 p-4">
        <p className="text-[12px] text-ink-muted">مانده در دفتر</p>
        <p
          className={`mt-1 text-xl font-black ${fees - payouts >= 0 ? "text-jade-400" : "text-rose-warm"}`}
        >
          {formatToman(fees - payouts)}
        </p>
        <p className="mt-2 text-[11px] leading-5 text-ink-faint">
          سهم سایت منهای پرداخت‌های انجام‌شده. پول خریدارانی که هنوز
          تحویل نشده در این عدد نیست.
        </p>
      </div>
    </div>
  );
}

async function LedgerRows() {
  await requireAdmin();
  const rows = await getLedger();

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Wallet className="size-6" />}
        title="دفتر خالی است"
        description="با اولین تایید رسید، سهم سایت اینجا ثبت می‌شود."
        className="m-5"
      />
    );
  }

  return (
    <ul className="divide-y divide-white/5">
      {rows.map((row) => {
        const kind = LEDGER_KIND[row.kind];
        const positive = row.amount >= 0;

        return (
          <li key={row.id} className="flex items-center gap-4 px-5 py-3.5">
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                positive
                  ? "bg-jade-400/12 text-jade-400"
                  : "bg-ember-400/12 text-ember-400"
              }`}
            >
              {positive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={kind.tone}>{kind.label}</Badge>
                {row.reservation ? (
                  <span
                    dir="ltr"
                    className="text-[11px] font-bold tracking-widest text-brand-300"
                  >
                    {row.reservation.code}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 truncate text-[12px] text-ink-muted">{row.note}</p>
            </div>

            <span
              className={`shrink-0 text-sm font-black ${positive ? "text-jade-400" : "text-ember-400"}`}
            >
              {positive ? "+" : "−"}
              {formatToman(Math.abs(row.amount))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function LedgerStatsSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="skeleton h-20 rounded-xl2" />
      <div className="skeleton h-20 rounded-xl2" />
      <div className="skeleton h-28 rounded-xl2" />
    </div>
  );
}

function LedgerSkeleton() {
  return (
    <div className="space-y-2 p-5">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-14 rounded-xl" />
      ))}
    </div>
  );
}

export { ScrollText, toPersianDigits };