"use client";

import { useEffect, useState } from "react";

import { formatRelative } from "@/lib/dates";

/**
 * زمان نسبی، حساب‌شده در مرورگر.
 *
 * Why not on the server: «۳ ساعت پیش» depends on `Date.now()`, and under Cache
 * Components a `Date.now()` read during prerendering is an unstable value that
 * fails the render. The server sends an absolute label (computed from a fixed
 * date, so it is stable) and the browser swaps in the relative one a frame
 * after paint — which is also more correct, because a label baked into HTML is
 * wrong the moment it is cached.
 */
export function RelativeTime({
  date,
  fallback,
}: {
  date: string;
  /** برچسب مطلق برای رندر اول (و برای وقتی جاوااسکریپت خاموش است). */
  fallback: string;
}) {
  const [label, setLabel] = useState(fallback);

  useEffect(() => {
    const update = () => setLabel(formatRelative(new Date(date)));

    // نه فراخوانی هم‌زمان داخل افکت: با یک فریم بعد به‌روزرسانی می‌کنیم تا
    // رندر آبشاری ایجاد نشود.
    const frame = requestAnimationFrame(update);
    const timer = window.setInterval(update, 60_000);

    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, [date]);

  return (
    <time dateTime={date} suppressHydrationWarning>
      {label}
    </time>
  );
}