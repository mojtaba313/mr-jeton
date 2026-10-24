/** پیوندهای ناوبری — یک جا، تا هدر، سایدبار و منوی موبایل یکی بمانند. */

export type NavItem = {
  href: string;
  label: string;
};

export const NAV_LINKS: NavItem[] = [
  { href: "/market", label: "بازار ژتون" },
  { href: "/sell", label: "فروش ژتون" },
  { href: "/how-it-works", label: "چطور کار می‌کند" },
];

export const DASHBOARD_LINKS: NavItem[] = [
  { href: "/dashboard", label: "نمای کلی" },
  { href: "/dashboard/reservations", label: "رزروها" },
  { href: "/dashboard/listings", label: "آگهی‌های من" },
  { href: "/wallet", label: "کیف پول" },
  { href: "/dashboard/notifications", label: "اعلان‌ها" },
];

export const ADMIN_LINKS: NavItem[] = [
  { href: "/admin", label: "نمای کلی" },
  { href: "/admin/requests", label: "شارژ و برداشت" },
  { href: "/admin/reservations", label: "رزروها" },
  { href: "/admin/days", label: "روزهای غذا" },
  { href: "/admin/users", label: "کاربران" },
  { href: "/admin/ledger", label: "دفتر مالی" },
];
