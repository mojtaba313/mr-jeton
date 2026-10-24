"use client";

import { motion } from "motion/react";
import { LayoutGrid, SlidersHorizontal, Ticket } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form";
import { toPersianDigits } from "@/lib/dates";
import { formatNumber } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * فیلترهای بازار.
 *
 * Filter state lives in the URL, not in React state: a filtered market is
 * something you send to a friend ("این روز، زیر ۱۲۰ تومن") and something you
 * come back to after a reload. It also means the server does the filtering, so
 * the page has one source of truth.
 */

const SORTS = [
  { value: "newest", label: "تازه‌ترین" },
  { value: "cheapest", label: "ارزان‌ترین" },
  { value: "expensive", label: "گران‌ترین" },
] as const;

export function MarketFilters({
  days,
  stats,
}: {
  days: { id: number; label: string; tokens: number }[];
  stats: { count: number; minPrice: number; maxPrice: number };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const day = params.get("day") ?? "all";
  const sort = params.get("sort") ?? "newest";
  const maxPrice = params.get("max") ?? "";

  const apply = useCallback(
    (next: Record<string, string | null>) => {
      const search = new URLSearchParams(params.toString());

      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === "" || value === "all") {
          search.delete(key);
        } else {
          search.set(key, value);
        }
      }

      startTransition(() => {
        router.replace(`${pathname}?${search.toString()}`, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  return (
    <div className="glass sticky top-20 z-30 rounded-xl2 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-[13px] text-ink-muted">
          <SlidersHorizontal className="size-4 text-brand-300" />
          فیلتر
        </span>

        <div className="no-scrollbar -mx-1 flex flex-1 items-center gap-2 overflow-x-auto px-1">
          <FilterChip
            active={day === "all"}
            onClick={() => apply({ day: null })}
            icon={<Ticket className="size-3.5" />}
          >
            همه‌ی روزها
          </FilterChip>

          {days.map((item) => (
            <FilterChip
              key={item.id}
              active={day === String(item.id)}
              onClick={() => apply({ day: String(item.id) })}
            >
              {item.label}
              <span className="mr-1 text-[11px] opacity-70">
                ({toPersianDigits(item.tokens)})
              </span>
            </FilterChip>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-canvas-deep/60 p-1">
          {SORTS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => apply({ sort: option.value })}
              className={cn(
                "relative rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                sort === option.value
                  ? "text-canvas-deep"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {sort === option.value ? (
                <motion.span
                  layoutId="sort-active"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-brand-300"
                />
              ) : null}
              <span className="relative z-10">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/6 pt-3 text-[12px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <LayoutGrid className="size-3.5" />
          {toPersianDigits(stats.count)} آگهی
        </span>

        {stats.minPrice > 0 ? (
          <span>
            از {formatNumber(stats.minPrice)} تا {formatNumber(stats.maxPrice)} تومان
          </span>
        ) : null}

        <div className="ms-auto flex items-center gap-2">
          <label htmlFor="max-price" className="text-[12px] text-ink-faint">
            حداکثر قیمت
          </label>
          <div className="relative">
            <input
              id="max-price"
              inputMode="numeric"
              placeholder="مثلاً ۱۵۰۰۰۰"
              defaultValue={maxPrice}
              onBlur={(event) => apply({ max: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") apply({ max: event.currentTarget.value });
              }}
              className="h-8 w-32 rounded-lg border border-white/10 bg-canvas-deep/70 px-3 text-[12px] text-ink outline-none transition-colors focus:border-brand-300/50"
            />
          </div>
          {pending ? (
            <Button size="sm" variant="ghost" className="h-8">
              …
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex shrink-0 items-center rounded-xl px-3 py-1.5 text-[12px] font-medium transition-colors",
        active ? "text-canvas-deep" : "text-ink-muted hover:text-ink",
      )}
    >
      {active ? (
        <motion.span
          layoutId="day-active"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="absolute inset-0 rounded-xl bg-gradient-to-b from-brand-300 to-brand-500"
        />
      ) : (
        <span className="absolute inset-0 rounded-xl border border-white/10" />
      )}
      <span className="relative z-10 flex items-center gap-1.5">
        {icon}
        {children}
      </span>
    </button>
  );
}

/** نسخه‌ی ساده‌ی فیلتر برای صفحه‌ی روز غذا، بدون تغییر مسیر. */
export function DayFilterBar({
  days,
  currentId,
}: {
  days: { id: number; label: string }[];
  currentId?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {days.map((day) => {
        const active = day.id === currentId;
        return (
          <button
            key={day.id}
            type="button"
            onClick={() =>
              router.push(
                active ? pathname : `${pathname}?day=${day.id}`,
                { scroll: false },
              )
            }
            className={cn(
              "rounded-xl px-3 py-1.5 text-[12px] font-medium transition-colors",
              active
                ? "bg-gradient-to-b from-brand-300 to-brand-500 text-canvas-deep"
                : "border border-white/10 text-ink-muted hover:text-ink",
            )}
          >
            {day.label}
          </button>
        );
      })}
    </div>
  );
}

export { Field };