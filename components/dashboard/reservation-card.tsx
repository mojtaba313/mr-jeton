"use client";

import { motion } from "motion/react";
import { ArrowLeft, Hash, Phone, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { toPersianDigits } from "@/lib/dates";
import { formatToman } from "@/lib/money";
import { RESERVATION_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * کارت رزرو + نوار مراحل.
 *
 * The contact line is the whole point of this card: before the reservation there
 * is nothing to see, and after it there is a phone number. Showing it here (and
 * not only on the detail page) means the buyer who reserved six of them does
 * not have to open six tabs to call six people.
 */

export type ReservationView = {
  id: number;
  code: string;
  quantity: number;
  grossAmount: number;
  sellerAmount: number;
  status: string;
  role: "buyer" | "seller";
  counterpartyName: string;
  counterpartyPhone: string;
  dayTitle: string;
  deliveryDateLabel: string;
  deliveryWindow: string | null;
  meetPoint: string | null;
  createdAtISO: string;
  createdAtLabel: string;
};

const STEPS = ["RESERVED", "AWAITING_BUYER", "COMPLETED"] as const;

export function ReservationCard({
  reservation,
  index = 0,
}: {
  reservation: ReservationView;
  index?: number;
}) {
  const status = RESERVATION_STATUS[reservation.status as keyof typeof RESERVATION_STATUS];
  const isBuyer = reservation.role === "buyer";
  const current = reservation.status === "CANCELLED" ? -1 : STEPS.indexOf(reservation.status as (typeof STEPS)[number]);
  const amount = isBuyer ? reservation.grossAmount : reservation.sellerAmount;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: Math.min(index * 0.05, 0.3),
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -3 }}
      className="glass group rounded-xl2 p-5 transition-colors hover:border-brand-300/25"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isBuyer ? (
              <ShoppingBag className="size-4 text-brand-300" />
            ) : (
              <Store className="size-4 text-brand-300" />
            )}
            <span className="text-[12px] text-ink-muted">
              {isBuyer ? "خریدی از" : "فروشی به"} {reservation.counterpartyName}
            </span>
          </div>

          <h3 className="mt-1.5 text-[15px] font-bold text-ink">
            {toPersianDigits(reservation.quantity)} ژتون — {reservation.dayTitle}
          </h3>
          <p className="mt-1 text-[12px] text-ink-faint">
            {reservation.deliveryDateLabel}
            {reservation.deliveryWindow ? ` · ${reservation.deliveryWindow}` : ""}
            {reservation.meetPoint ? ` · ${reservation.meetPoint}` : ""}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Badge tone={status.tone} pulse={reservation.status === "AWAITING_BUYER"}>
            {status.label}
          </Badge>
          <span className="text-lg font-black text-ink">{formatToman(amount)}</span>
        </div>
      </div>

      <div className="mt-4">
        <StepBar current={current} cancelled={current === -1} />
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/6 pt-3.5">
        <span className="flex items-center gap-1.5 text-[12px] text-ink-faint">
          <Hash className="size-3.5" />
          <span dir="ltr" className="font-bold tracking-widest text-ink-muted">
            {reservation.code}
          </span>
          <span>کد رزرو</span>
        </span>

        <div className="flex items-center gap-3">
          <a
            href={`tel:${reservation.counterpartyPhone}`}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:text-brand-200"
          >
            <Phone className="size-3.5" />
            تماس با {isBuyer ? "فروشنده" : "خریدار"}
          </a>
          <Link
            href={`/dashboard/reservations/${reservation.code}`}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-300 transition-colors hover:text-brand-200"
          >
            جزئیات
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          </Link>
        </div>
      </footer>
    </motion.article>
  );
}

/** نوار مراحل — مشترک بین کارت رزرو و صفحه‌ی جزئیات. */
export function ReservationStepper({ status }: { status: string }) {
  const current =
    status === "CANCELLED" ? -1 : STEPS.indexOf(status as (typeof STEPS)[number]);

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-4">
      <StepBar current={current} cancelled={current === -1} />
    </div>
  );
}

function StepBar({ current, cancelled }: { current: number; cancelled: boolean }) {
  if (cancelled) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-[12px] text-ink-faint">
        این رزرو لغو شده و پول به کیف پول خریدار برگشته است.
      </div>
    );
  }

  const labels: Record<(typeof STEPS)[number], string> = {
    RESERVED: "رزرو و قفل پول",
    AWAITING_BUYER: "تحویل ژتون",
    COMPLETED: "تسویه",
  };

  return (
    <ol className="flex items-center gap-1">
      {STEPS.map((step, index) => {
        const done = index <= current;
        const active = index === current;

        return (
          <li key={step} className="flex flex-1 flex-col gap-1.5">
            <span
              className={cn(
                "h-1 rounded-full transition-colors duration-500",
                done ? "bg-brand-400" : "bg-white/10",
              )}
            />
            <span
              className={cn(
                "truncate text-[10px] font-medium transition-colors",
                active ? "text-brand-200" : done ? "text-ink-muted" : "text-ink-faint",
              )}
            >
              {labels[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
