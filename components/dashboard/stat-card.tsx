"use client";

import {
  Bell,
  Coins,
  LayoutGrid,
  ShoppingBag,
  Ticket,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { toPersianDigits } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * آیکون‌ها با نام می‌آیند، نه با کامپوننت.
 *
 * A server component cannot hand a function to a client component — that is the
 * "Functions cannot be passed directly to Client Components" error — so the icon
 * arrives as a string and is resolved here, inside the client bundle.
 */
export const STAT_ICONS = {
  ticket: Ticket,
  wallet: Wallet,
  shopping: ShoppingBag,
  trending: TrendingUp,
  trendDown: TrendingDown,
  coins: Coins,
  users: Users,
  bell: Bell,
  grid: LayoutGrid,
} as const;

export type StatIcon = keyof typeof STAT_ICONS;

/**
 * کارت آمار.
 *
 * The number counts up when it scrolls into view, but only once, and only if
 * the visitor has not asked for reduced motion — an animation that loops for a
 * number that will never change is noise, not polish.
 */
export function StatCard({
  icon,
  label,
  value,
  text,
  suffix,
  tone = "brand",
  className,
}: {
  icon: StatIcon;
  label: string;
  /** عددی که با ارقام فارسی نمایش داده می‌شود. */
  value?: number;
  /** مقدار آماده — برای مبلغ‌ها و متن‌هایی که عدد نیستند. */
  text?: string;
  suffix?: string;
  tone?: "brand" | "jade" | "ember";
  className?: string;
}) {
  const reduce = useReducedMotion();
  const Icon = STAT_ICONS[icon];

  const tones = {
    brand: "bg-brand-400/12 text-brand-300",
    jade: "bg-jade-400/12 text-jade-400",
    ember: "bg-ember-400/12 text-ember-400",
  } as const;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn("glass rounded-xl2 p-4", className)}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tones[tone])}
        >
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12px] text-ink-muted">{label}</p>
          <p className="mt-0.5 text-xl font-black text-ink">
            {value !== undefined ? toPersianDigits(value) : text}
            {suffix ? (
              <span className="mr-1.5 text-[12px] font-normal text-ink-muted">
                {suffix}
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </motion.div>
  );
}