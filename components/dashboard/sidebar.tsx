"use client";

import { motion } from "motion/react";
import {
  Bell,
  LayoutGrid,
  LogOut,
  Plus,
  ShieldCheck,
  Ticket,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { signOut } from "@/app/actions/auth";
import { DASHBOARD_LINKS } from "@/components/site/nav-links";
import { Button } from "@/components/ui/button";
import { cn, initials } from "@/lib/utils";

/**
 * نوار کناری داشبورد.
 *
 * Active item is marked with a shared `layoutId`, so moving between pages slides
 * the highlight instead of blinking it somewhere else — a small thing that makes
 * the whole panel feel like one object rather than a list of links.
 */

const ICONS: Record<string, typeof Ticket> = {
  "/dashboard": LayoutGrid,
  "/dashboard/reservations": Ticket,
  "/dashboard/listings": Ticket,
  "/wallet": Wallet,
  "/dashboard/notifications": Bell,
};

export function Sidebar({
  name,
  studentId,
  isAdmin,
}: {
  name: string;
  studentId: string;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="sticky top-24 hidden h-fit w-64 shrink-0 space-y-4 lg:block">
      <div className="glass rounded-xl2 p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-300 to-ember-500 text-sm font-black text-canvas-deep">
            {initials(name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink">{name}</p>
            <p dir="ltr" className="truncate text-[11px] text-ink-faint">
              {studentId}
            </p>
          </div>
        </div>

        <Link href="/sell" className="mt-4 block">
          <Button className="w-full" size="sm">
            <Plus className="size-4" />
            فروش ژتون
          </Button>
        </Link>
      </div>

      <nav className="glass space-y-1 rounded-xl2 p-3">
        {DASHBOARD_LINKS.map((link) => {
          const active = isActive(link.href);
          const Icon = ICONS[link.href] ?? LayoutGrid;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                active ? "text-brand-200" : "text-ink-muted hover:text-ink",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="dashboard-active"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-xl border border-brand-300/25 bg-brand-400/10"
                />
              ) : null}
              <Icon className="relative z-10 size-4" />
              <span className="relative z-10">{link.label}</span>
            </Link>
          );
        })}

        {isAdmin ? (
          <Link
            href="/admin"
            className="relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-brand-200"
          >
            <ShieldCheck className="size-4" />
            پنل مدیریت
          </Link>
        ) : null}
      </nav>

      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-ink-faint"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await signOut();
            toast.success("از حساب خارج شدی");
          })
        }
      >
        <LogOut className="size-4" />
        خروج از حساب
      </Button>
    </aside>
  );
}

/** نوار پایین برای موبایل — چون سایدبار بالا روی صفحه‌ی کوچک جایی ندارد. */
export function MobileTabBar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin
    ? [...DASHBOARD_LINKS, { href: "/admin", label: "مدیریت" }]
    : DASHBOARD_LINKS;

  return (
    <nav className="glass-strong fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-1 rounded-2xl p-1.5 lg:hidden">
      {items.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === item.href
            : pathname.startsWith(item.href);
        const Icon = ICONS[item.href] ?? LayoutGrid;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors",
              active ? "text-brand-200" : "text-ink-faint",
            )}
          >
            {active ? (
              <motion.span
                layoutId="mobile-tab-active"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                className="absolute inset-0 rounded-xl bg-brand-400/12"
              />
            ) : null}
            <Icon className="relative z-10 size-4" />
            <span className="relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}