import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** ادغام کلاس‌های تیلویند، با برد آخرین کلاسِ هم‌شاخه. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** حروف اول نام، برای آواتار بدون تصویر. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] ?? "").join("");
}

/** کد کوتاه و خوانا برای تطبیق خریدار و فروشنده در روز غذا. */
export function humanCode(length = 6): string {
  // بدون I/O/U/0/O تا کد را نشود با اشتباه تایپ کرد.
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTVWXYZ";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(
    bytes,
    (b) => alphabet[b % alphabet.length]!,
  ).join("");
}

/** عدد → آرایه، برای رندر ستاره/نقطه بدون ساختن لیست در JSX. */
export function range(count: number): number[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => i);
}