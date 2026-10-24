import { ArrowDownLeft, ArrowUpRight, History, Wallet } from "lucide-react";
import { Suspense } from "react";

import { WalletActions } from "@/components/wallet/wallet-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, Reveal, Skeleton } from "@/components/ui/motion-primitives";
import { RelativeTime } from "@/components/ui/relative-time";

import { requireUser } from "@/lib/auth";
import { MIN_TOPUP, MIN_WITHDRAWAL } from "@/lib/config";
import { formatToman } from "@/lib/money";
import { getWalletView } from "@/lib/queries";

export const metadata = { title: "کیف پول" };

export default function WalletPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">کیف پول</h1>
        <p className="mt-1.5 text-[13px] leading-6 text-ink-muted">
          برای رزرو باید موجودی داشته باشی؛ پول خریدار تا تایید تحویل همین‌جا می‌ماند
          و بعد به فروشنده می‌رسد.
        </p>
      </header>

      <Suspense fallback={<WalletSkeleton />}>
        <WalletBlock />
      </Suspense>
    </div>
  );
}

async function WalletBlock() {
  const user = await requireUser();
  const wallet = await getWalletView(user.id);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="aura relative p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[12px] text-ink-muted">
                <Wallet className="size-3.5" />
                موجودی قابل استفاده
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight text-ink">
                {formatToman(wallet.balance)}
              </p>
              {wallet.held > 0 ? (
                <p className="mt-2 text-[12px] text-ember-400">
                  {formatToman(wallet.held)} در رزروهای باز قفل است
                </p>
              ) : null}
            </div>

            <Badge tone="neutral">{wallet.entries.length} گردش</Badge>
          </div>

          <div className="mt-5">
            <WalletActions
              balance={wallet.balance}
              minTopUp={MIN_TOPUP}
              minWithdrawal={MIN_WITHDRAWAL}
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="درخواست‌های مالی" description="شارژها و برداشت‌های تو" />
        <CardBody className="p-0">
          {wallet.requests.length === 0 ? (
            <EmptyState
              icon={<History className="size-6" />}
              title="هنوز درخواستی نداری"
              description="شارژ کیف پول یا برداشت، اینجا پیگیری می‌شود."
              className="m-5"
            />
          ) : (
            <ul className="divide-y divide-white/5">
              {wallet.requests.map((request) => (
                <li key={request.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                      request.kind === "TOPUP"
                        ? "bg-brand-400/12 text-brand-300"
                        : "bg-ember-400/12 text-ember-400"
                    }`}
                  >
                    {request.kind === "TOPUP" ? (
                      <ArrowDownLeft className="size-4" />
                    ) : (
                      <ArrowUpRight className="size-4" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold text-ink">
                        {request.kindLabel}
                      </span>
                      <Badge tone={request.statusTone}>{request.statusLabel}</Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-ink-faint">
                      <RelativeTime date={request.atISO} fallback={request.atLabel} />
                      {request.reviewNote ? ` — ${request.reviewNote}` : ""}
                    </p>
                  </div>

                  <span className="shrink-0 text-[13px] font-black text-ink">
                    {formatToman(request.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="گردش کیف پول" description="هر ورود و خروج پول" />
        <CardBody className="p-0">
          {wallet.entries.length === 0 ? (
            <EmptyState
              icon={<Wallet className="size-6" />}
              title="کیف پولت خالی است"
              description="اولین شارژ، اینجا ثبت می‌شود."
              className="m-5"
            />
          ) : (
            <ul className="divide-y divide-white/5">
              {wallet.entries.map((entry) => (
                <Reveal key={entry.id} y={10}>
                  <li className="flex items-center gap-3 px-5 py-3.5">
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                        entry.amount >= 0
                          ? "bg-jade-400/12 text-jade-400"
                          : "bg-ember-400/12 text-ember-400"
                      }`}
                    >
                      {entry.amount >= 0 ? (
                        <ArrowDownLeft className="size-4" />
                      ) : (
                        <ArrowUpRight className="size-4" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-medium text-ink">
                          {entry.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-ink-faint">
                        {entry.note ?? "—"}{" "}
                        <RelativeTime date={entry.atISO} fallback={entry.atLabel} />
                      </p>
                    </div>

                    <span
                      className={`shrink-0 text-[13px] font-black ${
                        entry.amount >= 0 ? "text-jade-400" : "text-ember-400"
                      }`}
                    >
                      {entry.amount >= 0 ? "+" : "−"}
                      {formatToman(Math.abs(entry.amount))}
                    </span>
                  </li>
                </Reveal>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function WalletSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44 rounded-xl2" />
      <Skeleton className="h-64 rounded-xl2" />
    </div>
  );
}