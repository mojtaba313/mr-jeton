import { Clock, HandCoins, ShieldCheck, Sparkles, Utensils } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/site/logo";

const COLUMNS = [
  {
    title: "بازار",
    links: [
      { href: "/market", label: "همه‌ی آگهی‌ها" },
      { href: "/sell", label: "فروش ژتون اضافه" },
      { href: "/how-it-works", label: "قوانین و روند کار" },
    ],
  },
  {
    title: "حساب کاربری",
    links: [
      { href: "/dashboard", label: "داشبورد" },
      { href: "/dashboard/orders", label: "سفارش‌های من" },
      { href: "/dashboard/notifications", label: "اعلان‌ها" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-white/8 bg-canvas-deep/60">
      <div className="aura pointer-events-none absolute inset-x-0 top-0 h-40 opacity-60" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-5">
            <Logo />
            <p className="max-w-sm text-[13px] leading-7 text-ink-muted">
              ژتونی که رزرو نکردی را بخر، ژتونی که استفاده نکردی را بفروش. بدون
              واسطه، با تسویه‌ی کارت‌به‌کارت و تحویل در روز غذا.
            </p>

            <div className="flex flex-wrap gap-2 text-[11px] text-ink-faint">
              <Feature icon={ShieldCheck} label="احراز با شماره دانشجویی" />
              <Feature icon={Clock} label="تحویل در بازه‌ی اعلام‌شده" />
              <Feature icon={HandCoins} label="تسویه‌ی شفاف با رسید" />
            </div>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title} className="space-y-4">
              <h4 className="text-[13px] font-bold text-ink">{column.title}</h4>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-ink-muted transition-colors hover:text-brand-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/6 pt-6 text-[12px] text-ink-faint sm:flex-row">
          <p>ساخته‌شده برای دانشجویان، با کمی سود برای خودمان.</p>
          <p className="flex items-center gap-1.5">
            <Utensils className="size-3.5" />
            پلتفرم غذای دانشگاه
          </p>
        </div>
      </div>
    </footer>
  );
}

function Feature({
  icon: Icon,
  label,
}: {
  icon: typeof Sparkles;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">
      <Icon className="size-3 text-brand-300" />
      {label}
    </span>
  );
}