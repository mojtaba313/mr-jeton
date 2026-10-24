"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  JALALI_MONTHS,
  dateInputToJalali,
  jalaliMonthDays,
  toPersianDigits,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

/** سرستون‌ها به ترتیب تقویم ایران — شنبه اول هفته است، نه یکشنبه. */
const WEEKDAY_LABELS = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

/**
 * انتخاب‌گر روز با تقویم شمسی و ساعت تهران.
 *
 * مقدار فرم همان `YYYY-MM-DD` میلادیِ تهران است، پس اعتبارسنجی و ذخیره‌سازی
 * سمت سرور دست‌نخورده می‌ماند و فقط چیزی که کاربر می‌بیند شمسی است. این
 * کامپوننت جای `<input type="date">` را می‌گیرد: آن یکی را مرورگر با تقویم
 * میلادی و به زبان خودش باز می‌کرد — که برای فروشنده‌ی ایرانی یعنی حساب‌کردن
 * دستیِ فاصله‌ی مهر تا اکتبر.
 *
 * روزهای بیرون از بازه (گذشته، یا دورتر از سقف تحویل) غیرفعال‌اند تا کاربر
 * خطا را بعد از ثبت نبیند.
 */
export function JalaliDatePicker({
  name,
  defaultValue,
  minISO,
  maxISO,
  error,
}: {
  name: string;
  /** روز پیشنهادی، میلادی — `YYYY-MM-DD` به‌وقت تهران. */
  defaultValue: string;
  /** کمترین روزِ قابل انتخاب (امروز به‌وقت تهران). */
  minISO?: string;
  /** بیشترین روزِ قابل انتخاب (سقف زمانی تحویل). */
  maxISO?: string;
  error?: string;
}) {
  const [iso, setIso] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const { jy, jm } = dateInputToJalali(defaultValue);
    return { jy, jm };
  });
  const rootRef = useRef<HTMLDivElement>(null);

  // بستن با کلیک بیرون و Escape — همان چیزی که از هر منوی باز انتظار می‌رود.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const days = useMemo(() => jalaliMonthDays(view.jy, view.jm), [view.jy, view.jm]);
  const selected = useMemo(() => dateInputToJalali(iso), [iso]);

  const shiftMonth = (delta: number) => {
    setView(({ jy, jm }) => {
      const next = jm + delta;
      if (next < 1) return { jy: jy - 1, jm: 12 };
      if (next > 12) return { jy: jy + 1, jm: 1 };
      return { jy, jm: next };
    });
  };

  const monthLabel = `${JALALI_MONTHS[view.jm - 1]} ${toPersianDigits(view.jy)}`;
  const label = `${toPersianDigits(selected.jd)} ${JALALI_MONTHS[selected.jm - 1]} ${toPersianDigits(selected.jy)}`;

  // جای خالیِ اول ماه: ستون‌ها از شنبه شروع می‌شوند.
  const lead = days.length > 0 ? (days[0]!.weekday + 1) % 7 : 0;

  return (
    <div ref={rootRef} className="relative space-y-2">
      <input type="hidden" name={name} value={iso} />

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "flex h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-2xl border bg-canvas-deep/70 px-4 text-sm text-ink transition-[border,box-shadow] duration-200 focus:outline-none focus:ring-4 focus:ring-brand-400/12",
          error ? "border-rose-warm/50" : "border-white/10",
          open && "border-brand-300/60",
        )}
      >
        <span className="flex items-center gap-2">
          <CalendarDays className="size-4 text-brand-300/80" />
          {label}
        </span>
        <span className="text-[11px] text-ink-faint">شمسی</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="انتخاب روز تحویل"
          className="absolute end-0 top-full z-30 mt-2 w-72 rounded-2xl border border-white/10 bg-surface p-3 shadow-[0_24px_70px_-30px_rgb(0_0_0_/_0.9)]"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="ماه قبل"
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-white/[0.06] hover:text-ink"
            >
              <ChevronRight className="size-4" />
            </button>
            <p className="text-[13px] font-bold text-ink">{monthLabel}</p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="ماه بعد"
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-white/[0.06] hover:text-ink"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((labelText) => (
              <span key={labelText} className="py-1 text-[11px] font-medium text-ink-faint">
                {labelText}
              </span>
            ))}

            {Array.from({ length: lead }).map((_, index) => (
              <span key={`lead-${index}`} aria-hidden />
            ))}

            {days.map((day) => {
              const disabled =
                (minISO !== undefined && day.dateISO < minISO) ||
                (maxISO !== undefined && day.dateISO > maxISO);
              const active =
                selected.jy === view.jy && selected.jm === view.jm && selected.jd === day.day;

              return (
                <button
                  key={day.dateISO}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setIso(day.dateISO);
                    setOpen(false);
                  }}
                  aria-pressed={active}
                  aria-label={`${toPersianDigits(day.day)} ${JALALI_MONTHS[view.jm - 1]} ${toPersianDigits(view.jy)}`}
                  className={cn(
                    "flex h-8 items-center justify-center rounded-lg text-[12px] transition-colors",
                    active
                      ? "bg-gradient-to-b from-brand-300 to-brand-500 font-bold text-canvas-deep"
                      : disabled
                        ? "cursor-not-allowed text-ink-faint/40"
                        : "cursor-pointer text-ink-soft hover:bg-white/[0.06] hover:text-ink",
                  )}
                >
                  {toPersianDigits(day.day)}
                </button>
              );
            })}
          </div>

          <p className="mt-2 border-t border-white/8 pt-2 text-center text-[11px] text-ink-faint">
            همه‌ی روزها به وقت تهران
          </p>
        </div>
      ) : null}

      {error ? <p className="text-[12px] font-medium text-rose-warm">{error}</p> : null}
    </div>
  );
}
