"use client";

import { AnimatePresence, motion } from "motion/react";
import { Bell, LayoutGrid, Menu, ShieldCheck, Ticket, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Logo } from "@/components/site/logo";
import { NAV_LINKS } from "@/components/site/nav-links";
import { cn, initials } from "@/lib/utils";

/**
 * ناوبری بالای صفحه.
 *
 * Client component on purpose: the active link, the mobile drawer and the badge
 * count are all browser state. The user object itself arrives as a prop from a
 * server component, so the session cookie is still read on the server.
 */

function NavLink({
  href,
  label,
  active,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "relative rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",
        active ? "text-brand-200" : "text-ink-muted hover:text-ink",
      )}
    >
      {active ? (
        <motion.span
          layoutId="nav-active"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="absolute inset-0 rounded-xl border border-brand-300/25 bg-brand-400/10"
        />
      ) : null}
      <span className="relative z-10">{label}</span>
    </Link>
  );
}

export function HeaderNav({
  user,
  unread,
}: {
  user: { name: string; role: "USER" | "ADMIN" } | null;
  unread: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // قفل اسکرول وقتی کشوی موبایل باز است
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 transition-all duration-300",
          scrolled
            ? "border-b border-white/8 bg-canvas-deep/85 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-18 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="shrink-0" aria-label="آقای ژتون — خانه">
            <Logo />
          </Link>

          <nav className="mr-4 hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.href}
                {...link}
                active={isActive(link.href)}
              />
            ))}
          </nav>

          <div className="flex-1" />

          {user ? (
            <div className="hidden items-center gap-2 lg:flex">
              <Link
                href="/dashboard/notifications"
                className="relative grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-ink-soft transition-colors hover:border-brand-300/40 hover:text-brand-200"
                aria-label="اعلان‌ها"
              >
                <Bell className="size-4" />
                <AnimatePresence>
                  {unread > 0 ? (
                    <motion.span
                      key={unread}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      className="absolute -left-1 -top-1 grid min-w-5 place-items-center rounded-full bg-brand-400 px-1 text-[10px] font-bold text-canvas-deep"
                    >
                      {unread > 9 ? "۹+" : unread}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </Link>

              {user.role === "ADMIN" ? (
                <Link
                  href="/admin"
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-brand-300/25 bg-brand-400/10 px-3 text-[13px] font-medium text-brand-200 transition-colors hover:bg-brand-400/20"
                >
                  <ShieldCheck className="size-4" />
                  مدیریت
                </Link>
              ) : null}

              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 transition-colors hover:border-brand-300/40"
              >
                <span className="grid size-6 place-items-center rounded-lg bg-gradient-to-br from-brand-300 to-ember-500 text-[11px] font-black text-canvas-deep">
                  {initials(user.name)}
                </span>
                <span className="max-w-24 truncate text-[13px] text-ink-soft">
                  {user.name}
                </span>
              </Link>
            </div>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Link
                href="/login"
                className="inline-flex h-10 items-center rounded-xl px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                ورود
              </Link>
              <Link
                href="/register"
                className="inline-flex h-10 items-center rounded-xl bg-gradient-to-b from-brand-300 to-brand-500 px-4 text-[13px] font-bold text-canvas-deep shadow-[0_10px_28px_-12px_rgba(251,191,36,0.8)] transition-transform hover:-translate-y-0.5"
              >
                ثبت‌نام
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "بستن منو" : "باز کردن منو"}
            aria-expanded={open}
            className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-ink-soft lg:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-canvas-deep/80 backdrop-blur-md lg:hidden"
            onClick={() => setOpen(false)}
          >
            <motion.nav
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              onClick={(event) => event.stopPropagation()}
              // بالای کشو باید از زیر هدرِ چسبان (h-18 = ۷۲px، با z-50) بیرون بیاید؛
              // وگرنه هدر روی اولین آیتم‌های منو می‌افتد و آن‌ها را می‌پوشاند.
              className="glass-strong mx-3 mb-3 mt-20 space-y-1 rounded-3xl p-4 shadow-lift"
            >
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.href}
                  {...link}
                  active={isActive(link.href)}
                  onClick={() => setOpen(false)}
                />
              ))}

              <div className="rule-glow my-3" />

              {user ? (
                <>
                  <NavLink
                    href="/dashboard"
                    label="داشبورد من"
                    active={isActive("/dashboard")}
                    onClick={() => setOpen(false)}
                  />
                  <NavLink
                    href="/dashboard/orders"
                    label="سفارش‌ها"
                    active={isActive("/dashboard/orders")}
                    onClick={() => setOpen(false)}
                  />
                  <NavLink
                    href="/dashboard/listings"
                    label="آگهی‌های من"
                    active={isActive("/dashboard/listings")}
                    onClick={() => setOpen(false)}
                  />
                  <NavLink
                    href="/dashboard/notifications"
                    label={`اعلان‌ها${unread ? ` (${unread})` : ""}`}
                    active={isActive("/dashboard/notifications")}
                    onClick={() => setOpen(false)}
                  />
                  {user.role === "ADMIN" ? (
                    <NavLink
                      href="/admin"
                      label="پنل مدیریت"
                      active={isActive("/admin")}
                      onClick={() => setOpen(false)}
                    />
                  ) : null}
                </>
              ) : (
                <div className="grid gap-2 pt-1">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="flex h-11 items-center justify-center rounded-xl border border-white/12 text-sm text-ink-soft"
                  >
                    ورود به حساب
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="flex h-11 items-center justify-center rounded-xl bg-gradient-to-b from-brand-300 to-brand-500 text-sm font-bold text-canvas-deep"
                  >
                    ثبت‌نام رایگان
                  </Link>
                </div>
              )}
            </motion.nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/** جای خالی ناحیه‌ی کاربر تا زمانی که نشست از سرور خوانده شود. */
export function AuthNavSkeleton() {
  return (
    <div className="hidden items-center gap-2 lg:flex">
      <div className="skeleton h-10 w-28 rounded-xl" />
      <div className="skeleton h-10 w-20 rounded-xl" />
    </div>
  );
}

export { Bell, LayoutGrid, Ticket };