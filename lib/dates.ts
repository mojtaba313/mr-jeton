/**
 * تاریخ و اعداد فارسی — همه‌چیز از `Intl`، بدون کتابخانه.
 *
 * Why `Intl` and not a hand-rolled Jalali conversion: the algorithms that
 * circulate for this (the 33-year-cycle one behind `jalaali-js` and friends)
 * are a hundred lines of magic constants, and getting them subtly wrong
 * produces dates that are off by one day at Nowruz — the one boundary a
 * calendar app cannot be wrong about. Both Node and every browser that matters
 * ship a Persian calendar in ICU, so the conversion is a formatting call:
 * `new Intl.DateTimeFormat("fa-IR-u-ca-persian", …)` renders ۱۴۰۵/۰۷/۲۵ and
 * the right Persian digits, from a vetted data source, forever.
 *
 * Everything here renders in **Asia/Tehran**. That is a decision, not a
 * detail: a meal day stored as `2026-10-20T20:30:00Z` is midnight on the 20th
 * in Tehran, and formatting it in the server's timezone would show the 19th.
 * Meal days are therefore always written at Tehran midnight.
 */

export const TEHRAN_TZ = "Asia/Tehran";

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

export const WEEKDAYS = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنج‌شنبه",
  "جمعه",
  "شنبه",
] as const;

export type Jalali = { jy: number; jm: number; jd: number };

const partsFormatter = new Intl.DateTimeFormat("en-US-u-ca-persian", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: TEHRAN_TZ,
});

/**
 * اجزای تاریخ جلالی، با ارقام لاتین (برای محاسبه و مقایسه).
 *
 * The locale is `en-US` on purpose: `fa` renders Persian digits, and the point
 * of this function is to hand back numbers. Persian digits for display come
 * from `formatJalali` below, which asks for `fa` and keeps ICU's output.
 */
export function toJalali(date: Date): Jalali {
  const parts = partsFormatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  return { jy: pick("year"), jm: pick("month"), jd: pick("day") };
}

/** ارقام لاتین → فارسی. فقط برای نمایش. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

/** ارقام فارسی/عربی → لاتین، برای چیزی که کاربر تایپ می‌کند. */
export function toLatinDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

const dayMonth = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  day: "numeric",
  month: "long",
  timeZone: TEHRAN_TZ,
});

const weekdayFormatter = new Intl.DateTimeFormat("fa-IR", {
  weekday: "long",
  timeZone: TEHRAN_TZ,
});

/** تاریخ میلادی، به وقت تهران — «۲۰۲۶-۱۰-۲۰» */
const gregorianInTehran = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TEHRAN_TZ,
});

const fullDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TEHRAN_TZ,
});

/** «۲۵ مهر ۱۴۰۵» */
export function formatJalali(date: Date): string {
  return fullDate.format(date);
}

/** «شنبه ۲۵ مهر» — بدون سال، برای چیزهایی که همین حالا هستند. */
export function formatJalaliShort(date: Date): string {
  return `${weekdayFormatter.format(date)} ${dayMonth.format(date)}`;
}

/** «۱۴۰۵/۰۷/۲۵» — برای جاهای باریک مثل جدول‌ها. */
export function formatJalaliNumeric(date: Date): string {
  const { jy, jm, jd } = toJalali(date);
  const pad = (n: number) => toPersianDigits(String(n).padStart(2, "0"));
  return `${toPersianDigits(jy)}/${pad(jm)}/${pad(jd)}`;
}

const timeFormatter = new Intl.DateTimeFormat("fa-IR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TEHRAN_TZ,
});

/** «۱۴:۳۰» */
export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

/** «۱۸:۰۰ تا ۱۹:۳۰» — بازه‌ی تحویل، که ساعت است نه تاریخ. */
export function formatTimeRange(value: string | null | undefined): string | null {
  if (!value) return null;
  const parts = value
    .split(/\s*(?:تا|to|-|–|—)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return parts.map(toPersianDigits).join(" تا ");
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600e3],
  ["month", 30 * 24 * 3600e3],
  ["day", 24 * 3600e3],
  ["hour", 3600e3],
  ["minute", 60e3],
];

const relativeFormatter = new Intl.RelativeTimeFormat("fa-IR", {
  numeric: "auto",
});

/** «۳ ساعت پیش» / «فردا» */
export function formatRelative(from: Date, now: Date = new Date()): string {
  const diff = from.getTime() - now.getTime();
  const abs = Math.abs(diff);

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (abs >= ms) {
      return relativeFormatter.format(Math.trunc(diff / ms), unit);
    }
  }

  return "همین حالا";
}

/** «۳ روز و ۴ ساعت دیگر» — برای شمارش معکوس تحویل. */
export function formatCountdown(target: Date, now: Date = new Date()): string {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return "زمانش گذشته";

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);

  const chunks: string[] = [];
  if (days > 0) chunks.push(`${toPersianDigits(days)} روز`);
  if (hours > 0) chunks.push(`${toPersianDigits(hours)} ساعت`);
  if (days === 0 && minutes > 0) chunks.push(`${toPersianDigits(minutes)} دقیقه`);

  return chunks.join(" و ") || "کمتر از یک دقیقه";
}

/**
 * نیمه‌شب تهران برای تاریخ امروز — مبنای ذخیره‌ی «روز غذا».
 *
 * تهران روی ۳:۳۰ UTC است، پس نیمه‌شبِ یک روز در تهران، ۲۰:۳۰ UTC روز قبل
 * است. با این کمک، «روز غذای ۲۰ اکتبر» همیشه ۲۰ اکتبر به نمایش درمی‌آید، هر
 * timezoneای که سرور داشته باشد.
 */
export function tehranMidnight(date: Date = new Date()): Date {
  const [y, m, d] = gregorianInTehran
    .format(date)
    .split("-")
    .map((part) => Number(part));

  return new Date(Date.UTC(y!, m! - 1, d! - 1, 20, 30, 0, 0));
}

/** تاریخ میلادی به وقت تهران، به شکل `YYYY-MM-DD` برای `<input type="date">`. */
export function toDateInput(date: Date): string {
  return gregorianInTehran.format(date);
}

/** شروع روز به وقت محلی سرور — برای بازه‌های جست‌وجو. */
export function startOfDay(date: Date = new Date()): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round(
    (startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000,
  );
}