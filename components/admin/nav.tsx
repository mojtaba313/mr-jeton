"use client";

import { motion } from "motion/react";
import {
  CalendarDays,
  LayoutGrid,
  ScrollText,
  ShieldCheck,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * ناوبری پنل مدیریت.
 *
 * The user dashboard has a sidebar; the admin area sits *inside* the same
 * dashboard shell, so it needs its own row of tabs — otherwise every admin page
 * is a dead end reachable only from the header. Scrollable on mobile, because
 * six items do not fit a 390px screen.
 */

const TABS = [
  { href: "/admin", label: "نمای کلی", icon: LayoutGrid, exact: true },
  { href: "/admin/requests", label: "شارژ و برداشت", icon: Wallet },
  { href: "/admin/reservations", label: "رزروها", icon: Ticket },
  { href: "/admin/days", label: "روزهای غذا", icon: CalendarDays },
  { href: "/admin/users", label: "کاربران", icon: Users },
  { href: "/admin/ledger", label: "دفتر مالی", icon: ScrollText },
];

export function AdminNav({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl bg-brand-400/12 text-brand-300">
          <ShieldCheck className="size-4" />
        </span>
        <div>
          <p className="text-[13px] font-bold text-ink">پنل مدیریت</p>
          <p className="text-[11px] text-ink-faint">
            فقط شارژ، برداشت و روزهای غذا
          </p>
        </div>
      </div>

      <nav className="no-scrollbar mb-5 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <AdminTab key={tab.href} {...tab} />
        ))}
      </nav>

      {children}
    </>
  );
}

function AdminTab({
  href,
  label,
  icon: Icon,
  exact,
}: {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "relative flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-colors",
        active ? "text-canvas-deep" : "text-ink-muted hover:text-ink",
      )}
    >
      {active ? (
        <motion.span
          layoutId="admin-tab"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="absolute inset-0 rounded-xl bg-gradient-to-b from-brand-300 to-brand-500"
        />
      ) : (
        <span className="absolute inset-0 rounded-xl border border-white/10 bg-white/[0.03]" />
      )}
      <Icon className="relative z-10 size-4" />
      <span className="relative z-10">{label}</span>
    </Link>
  );
}