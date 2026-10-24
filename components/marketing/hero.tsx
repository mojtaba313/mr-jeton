"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowLeft, Sparkles, UtensilsCrossed } from "lucide-react";
import { useRef } from "react";

import { LinkButton } from "@/components/ui/button";
import { toPersianDigits } from "@/lib/dates";
import { formatNumber } from "@/lib/money";

/**
 * هدر صفحه‌ی اصل.
 *
 * چهار تکنیک انیمیشن، هر کدام برای یک کار:
 *
 *  - ورود پله‌ای با CSS (`rise`): محتوای بالای صفحه باید *بدون* جاوااسکریپت هم
 *    دیده شود، پس انیمیشنش CSS است نه `initial={{ opacity: 0 }}`.
 *  - پارالاکس با `useScroll`: عمق پشت متن، و متن کمی آرام‌تر از پس‌زمینه حرکت
 *    می‌کند.
 *  - شناوری بی‌پایان روی کارت‌های تزئینی: بی‌صدا زنده‌اند، نه اینکه حواس را
 *    پرت کنند.
 *  - اسپرینگ روی دکمه‌ها (در خود `Button`): فشردن باید حس شود.
 */

export function Hero({
  stats,
  nextDay,
}: {
  stats: { users: number; openListings: number; tokens: number };
  nextDay: { title: string; dateLabel: string; tokens: number } | null;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const glowY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 60]);

  return (
    <section ref={ref} className="aura relative overflow-hidden pb-20 pt-14 sm:pt-20">
      {/* هاله‌های نور پس‌زمینه */}
      <motion.div
        aria-hidden
        style={reduce ? undefined : { y: glowY }}
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]"
      >
        <div className="absolute left-1/2 top-[-140px] size-[520px] -translate-x-1/2 rounded-full bg-brand-500/18 blur-[120px]" />
        <div className="absolute right-[8%] top-40 size-72 rounded-full bg-ember-500/12 blur-[100px]" />
        <div className="absolute left-[6%] top-56 size-64 rounded-full bg-brand-300/10 blur-[90px]" />
      </motion.div>

      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.15fr_0.85fr]">
        <motion.div style={reduce ? undefined : { y: textY }}>
          <div
            className="rise inline-flex items-center gap-2 rounded-full border border-brand-300/25 bg-brand-400/8 px-3.5 py-1.5 text-[12px] text-brand-200"
            style={{ animationDelay: "40ms" }}
          >
            <Sparkles className="size-3.5" />
            {nextDay
              ? `${toPersianDigits(stats.openListings)} ژتون همین حالا در بازار — ${nextDay.title}`
              : "فعلاً روز غذایی ثبت نشده"}
          </div>

          <h1
            className="rise mt-6 text-[clamp(2.4rem,6.4vw,4.4rem)] font-black leading-[1.12] tracking-tight text-ink"
            style={{ animationDelay: "90ms" }}
          >
            ژتون اضافه‌ات
            <br />
            <span className="text-gold">نگه ندار.</span>
          </h1>

          <p
            className="rise mt-6 max-w-xl text-[15px] leading-8 text-ink-soft sm:text-base"
            style={{ animationDelay: "150ms" }}
          >
            فروشنده خودش قیمت می‌گذارد و خودش می‌گوید کجا و چه ساعتی ژتون را
            تحویل بدهد. خریدار رزرو می‌کند، سر وقت می‌رود سراغش، و پول تا لحظه‌ی
            تحویل در کیف پول سایت می‌ماند. بدون واسطه، بدون مدیر در معامله.
          </p>

          <div
            className="rise mt-9 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "210ms" }}
          >
            <LinkButton href="/market" size="lg">
              دیدن بازار ژتون
              <ArrowLeft className="size-4" />
            </LinkButton>
            <LinkButton href="/sell" variant="outline" size="lg">
              فروش ژتون اضافه
            </LinkButton>
          </div>

          <dl
            className="rise mt-12 grid max-w-lg grid-cols-3 gap-4"
            style={{ animationDelay: "280ms" }}
          >
            <HeroStat label="عضو بازار" value={stats.users} />
            <HeroStat label="آگهی فعال" value={stats.openListings} />
            <HeroStat label="ژتون در گردش" value={stats.tokens} />
          </dl>
        </motion.div>

        {/* کارت «ژتون من» — خلاصه‌ی محصول در یک نگاه */}
        <div
          className="rise-float relative mx-auto w-full max-w-md"
          style={{ animationDelay: "320ms, 1.3s" }}
        >
          <div className="glass-strong relative overflow-hidden rounded-[2rem] p-6 shadow-lift">
            <div className="absolute -right-16 -top-16 size-48 rounded-full bg-brand-400/12 blur-3xl" />

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] text-ink-muted">
                <UtensilsCrossed className="size-4 text-brand-300" />
                ژتون من
              </span>
              <span className="rounded-full bg-jade-400/12 px-2.5 py-1 text-[11px] font-semibold text-jade-400">
                قابل استفاده
              </span>
            </div>

            <div className="mt-6 flex items-end gap-3">
              <span className="text-6xl font-black leading-none text-ink">
                {toPersianDigits(stats.openListings)}
              </span>
              <span className="pb-1.5 text-sm text-ink-muted">آگهی باز همین حالا</span>
            </div>

            <div className="mt-6 space-y-2.5">
              <Line label="روز غذای بعدی">
                {nextDay ? nextDay.title : "—"}
              </Line>
              <Line label="بازار فعال">
                {toPersianDigits(stats.openListings)} آگهی
              </Line>
              <Line label="تحویل">جایی که فروشنده گفته</Line>
              <Line label="تسویه">کیف پول، بعد از تحویل</Line>
            </div>

            <div className="rule-glow my-5" />

            <div className="flex items-center justify-between text-[12px] text-ink-faint">
              <span>سهم سایت از هر معامله</span>
              <span className="font-bold text-brand-300">۵٪</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-ink-muted">{label}</span>
      <span className="font-semibold text-ink-soft">{children}</span>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-2xl px-4 py-3.5">
      <dd className="text-2xl font-black text-ink">{formatNumber(value)}</dd>
      <dt className="mt-1 text-[12px] text-ink-muted">{label}</dt>
    </div>
  );
}
