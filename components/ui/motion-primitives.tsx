"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { toPersianDigits } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * سه تکه‌ی کوچک که کل حس «زنده بودن» صفحه را می‌سازند:
 * ورود با اسکرول، شمردن اعداد، و اسکلت لودینگ.
 */

/** محو شدن هنگام اسکرول — محتوای بالای صفحه موقع ورود پرش می‌کند. */
export function Reveal({
  children,
  delay = 0,
  y = 26,
  className,
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      data-reveal
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{
        duration: 0.65,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** شمارش عددی وقتی وارد دید می‌شود — برای آمار صفحه‌ی اصل. */
export function CountUp({
  value,
  duration = 1.6,
  className,
  format = toPersianDigits,
}: {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  // از همان اول عدد واقعی دیده می‌شود: اگر جاوااسکریپت دیر برسد، «۰» نشان دادن
  // بدترین حالت است. بعد که وارد دید شد، از صفر شمرده می‌شود.
  const [display, setDisplay] = useState(value);

  // با کاهش حرکت، شمارش انجام نمی‌شود و عدد درست از همان اول دیده می‌شود؛
  // setState در همان مسیر نبود، چون فقط رندر لازم است نه انیمیشن.
  useEffect(() => {
    if (!inView || reduce) return;

    let frame = 0;
    let cancelled = false;

    // صفر شدن در فریم بعد انجام می‌شود، نه هم‌زمان داخل افکت؛ وگرنه یک رندر
    // آبشاری می‌سازد و lint هم حق دارد شکایت کند.
    const startCounter = (now: number) => {
      setDisplay(0);
      const start = now;
      const tick = (time: number) => {
        if (cancelled) return;
        const progress = Math.min(1, (time - start) / (duration * 1000));
        // easeOutExpo — سریع شروع، آرام فرود.
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        setDisplay(Math.round(value * eased));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(startCounter);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [inView, value, duration, reduce]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {format(reduce ? value : display)}
    </span>
  );
}

/** اسکلت لودینگ — جای Suspense fallback. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function SkeletonCard() {
  return (
    <div className="glass space-y-4 rounded-xl2 p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-16" />
        </div>
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}

/** حالت خالی — با یک پیام و شاید یک دکمه. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl2 border border-dashed border-white/10 px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-1 flex size-14 items-center justify-center rounded-2xl bg-brand-400/10 text-brand-300">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? (
        <p className="max-w-sm text-[13px] leading-6 text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}