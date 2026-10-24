"use client";

import { motion, useScroll, useSpring } from "motion/react";
import {
  ArrowLeft,
  BadgeCheck,
  HandCoins,
  MapPin,
  Repeat2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { CountUp, Reveal } from "@/components/ui/motion-primitives";
import { RelativeTime } from "@/components/ui/relative-time";
import { LinkButton } from "@/components/ui/button";
import { toPersianDigits } from "@/lib/dates";
import { formatNumber, formatToman } from "@/lib/money";

/**
 * بخش‌های صفحه‌ی اصل: روند کار، روزهای پیش‌رو، و نوار زنده‌ی معامله‌ها.
 *
 * The section is `client` only for `whileInView` and the scroll progress bar;
 * the copy and the numbers come from the server as props, so nothing here
 * needs a client fetch.
 */

const STEPS = [
  {
    icon: Ticket,
    title: "آگهی می‌گذاری",
    body: "قیمت دلخواهت را می‌نویسی و روی نقشه نقطه‌ی تحویل را انتخاب می‌کنی — هرجا که خودت راحتی.",
  },
  {
    icon: Wallet,
    title: "خریدار کیف پولش را شارژ می‌کند",
    body: "یک‌بار کارت‌به‌کارت واریز می‌کند و رسید را بارگذاری می‌کند. موجودی، اعتبارِ او برای رزرو است.",
  },
  {
    icon: MapPin,
    title: "رزرو و پیدا شدن همدیگر",
    body: "خریدار ژتون را رزرو می‌کند و شماره‌ی تو باز می‌شود. نقطه و ساعت روی نقشه برای هر دو نفر یکی است.",
  },
  {
    icon: HandCoins,
    title: "تحویل و تسویه",
    body: "سر وقت ژتون را می‌دهی، خریدار تایید می‌کند، و سهم تو به کیف پولت می‌آید.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <Reveal>
        <SectionHeading
          eyebrow="روند کار"
          title="چهار قدم، بدون واسطه"
          description="هر قدم یک وضعیت روشن دارد. می‌دانی پول کجاست و ژتون کِی و کجا تحویل می‌شود."
        />
      </Reveal>

      <div className="relative mt-14">
        {/* خط اتصال بین قدم‌ها — روی دسکتاپ */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-brand-300/25 to-transparent lg:block"
        />

        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.08}>
              <li className="group relative h-full">
                <div className="glass relative flex h-full flex-col gap-4 rounded-xl2 p-5 transition-colors duration-300 group-hover:border-brand-300/30">
                  <span className="absolute -top-3 right-5 grid size-11 place-items-center rounded-2xl border border-brand-300/25 bg-canvas-deep text-brand-200 transition-transform duration-300 group-hover:scale-110">
                    <step.icon className="size-5" />
                  </span>

                  <span className="mt-6 text-[11px] font-bold tracking-widest text-ink-faint">
                    {toPersianDigits(index + 1).padStart(2, "۰")}
                  </span>
                  <h3 className="text-[15px] font-bold text-ink">{step.title}</h3>
                  <p className="text-[13px] leading-7 text-ink-muted">{step.body}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "start";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-300/20 bg-brand-400/8 px-3 py-1 text-[11px] font-semibold tracking-wide text-brand-200">
        <Sparkles className="size-3" />
        {eyebrow}
      </span>
      <h2 className="mt-4 text-[clamp(1.6rem,3.4vw,2.4rem)] font-black leading-tight tracking-tight text-ink">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-[14px] leading-8 text-ink-muted">{description}</p>
      ) : null}
    </div>
  );
}

export type DayCardData = {
  id: number;
  title: string;
  mealType: string;
  menu: string;
  dateLabel: string;
  officialPrice: number;
  statusLabel: string;
  openListings: number;
  availableTokens: number;
};

export function UpcomingDays({ days }: { days: DayCardData[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            align="start"
            eyebrow="تقویم غذا"
            title="روزهای پیش‌رو"
            description="منوی اعلام‌شده و قیمت رسمی هر روز. آگهی‌ها را برای هر روز جدا ببین."
          />
          <LinkButton href="/market" variant="ghost" size="sm">
            همه‌ی آگهی‌ها
            <ArrowLeft className="size-4" />
          </LinkButton>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {days.map((day, index) => (
          <Reveal key={day.id} delay={index * 0.06}>
            <Link
              href={`/market?day=${day.id}`}
              className="glass group flex h-full flex-col gap-3 rounded-xl2 p-5 transition-colors hover:border-brand-300/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] text-brand-300">{day.mealType}</p>
                  <h3 className="mt-1 text-[15px] font-bold text-ink">{day.title}</h3>
                </div>
                <span className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-ink-muted">
                  {day.dateLabel}
                </span>
              </div>

              <p className="line-clamp-2 text-[13px] leading-6 text-ink-muted">
                {day.menu}
              </p>

              <div className="mt-auto flex items-end justify-between border-t border-white/6 pt-3">
                <span className="text-[12px] text-ink-faint">
                  {toPersianDigits(day.openListings)} آگهی ·{" "}
                  {toPersianDigits(day.availableTokens)} ژتون
                </span>
                <span className="text-sm font-bold text-ink">
                  {formatNumber(day.officialPrice)}
                  <span className="mr-1 text-[11px] font-normal text-ink-muted">تومان</span>
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function LiveFeed({
  items,
}: {
  items: {
    id: number;
    seller: string;
    day: string;
    quantity: number;
    atISO: string;
    atLabel: string;
  }[];
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <Reveal>
        <SectionHeading
          eyebrow="بازار زنده"
          title="معامله‌های انجام‌شده"
          description="هر تحویل انجام‌شده، یک ژتون نجات‌داده‌شده از سطل زباله است."
        />
      </Reveal>

      <Reveal delay={0.1}>
        <div className="glass mt-10 overflow-hidden rounded-xl2">
          <div className="flex items-center gap-2 border-b border-white/6 px-5 py-4">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-jade-400 opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-jade-400" />
            </span>
            <span className="text-[13px] text-ink-muted">آخرین تحویل‌ها</span>
          </div>

          <ul className="divide-y divide-white/5">
            {items.map((item, index) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <BadgeCheck className="size-4 shrink-0 text-jade-400" />
                  <p className="min-w-0 truncate text-[13px] text-ink-soft">
                    <span className="font-semibold text-ink">{item.seller}</span>{" "}
                    {toPersianDigits(item.quantity)} ژتون «{item.day}» فروخت
                  </p>
                </div>
                <span className="shrink-0 text-[12px] text-ink-faint">
                  <RelativeTime date={item.atISO} fallback={item.atLabel} />
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}

/** نوار اعتماد — چهار ادعای کوچک که هر کدام یک عدد واقعی دارند. */
export function TrustBar({
  profit,
  completed,
}: {
  profit: number;
  completed: number;
}) {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="glass grid gap-6 rounded-xl2 p-7 sm:grid-cols-3">
        <TrustItem
          icon={Repeat2}
          value={completed}
          label="معامله‌ی انجام‌شده"
          suffix="ژتون"
        />
        <TrustItem
          icon={ShieldCheck}
          value={100}
          label="شفافیت مالی"
          suffix="درصد"
          raw
        />
        <TrustItem
          icon={BadgeCheck}
          value={profit}
          label="سهم سایت از معاملات"
          suffix={formatToman(profit)}
        />
      </div>
    </section>
  );
}

function TrustItem({
  icon: Icon,
  value,
  label,
  suffix,
  raw,
}: {
  icon: typeof Sparkles;
  value: number;
  label: string;
  suffix: string;
  raw?: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-400/10 text-brand-300">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xl font-black text-ink">
          {raw ? value : <CountUp value={value} />}
          {raw ? <span className="text-sm text-ink-muted">٪</span> : null}
        </p>
        <p className="mt-0.5 text-[12px] text-ink-muted">
          {label} {raw ? "" : `— ${suffix}`}
        </p>
      </div>
    </div>
  );
}

/** نوار پیشرفت اسکرول بالای صفحه. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 150, damping: 30 });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-60 h-0.5 origin-right bg-gradient-to-l from-brand-300 via-ember-400 to-brand-500"
    />
  );
}