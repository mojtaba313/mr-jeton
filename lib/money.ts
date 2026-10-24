/**
 * پول — تومان، عدد صحیح، همیشه.
 *
 * Three rules the rest of the app relies on:
 *
 *  1. **No floats.** Amounts are Int Toman end to end. There is no code path
 *     that divides money and stores the result, because 137000 * 0.05 is
 *     6849.999999999999 and a Persian user counting banknotes is not going to
 *     forgive that.
 *  2. **Prices round to 1,000 Toman.** A price that is not a round number is
 *     not a real price; it is someone doing arithmetic in a comment box. The
 *     admin sets 137,431 and the site stores 137,000.
 *  3. **The fee is derived, never entered.** `splitAmount` is the only place a
 *     fee becomes a number, so gross always equals fee + seller, to the Toman.
 */

import { toLatinDigits, toPersianDigits } from "@/lib/dates";

const faNumber = new Intl.NumberFormat("fa-IR");

/** گرد کردن به هزار تومان — نزدیک‌ترین، رو به بالا. */
export function roundToThousand(value: number): number {
  return Math.ceil(value / 1000) * 1000;
}

/** «۱۲۰٬۰۰۰» با ارقام فارسی و جداکننده‌ی هزارگان. */
export function formatNumber(value: number): string {
  return faNumber.format(value);
}

/** «۱۲۰٬۰۰۰ تومان» */
export function formatToman(value: number): string {
  return `${formatNumber(value)} تومان`;
}

/**
 * «۱۲۰ هزار تومان» — برای کارت‌های آگهی، جایی که رقم دقیق لازم نیست و
 * جای کمی برای دقت وجود ندارد.
 */
export function formatTomanCompact(value: number): string {
  if (value >= 1_000_000) {
    const millions = Math.round((value / 1_000_000) * 10) / 10;
    return `${faNumber.format(millions)} میلیون تومان`;
  }
  if (value >= 1000) {
    return `${faNumber.format(Math.round(value / 1000))} هزار تومان`;
  }
  return formatToman(value);
}

export type AmountSplit = {
  gross: number;
  fee: number;
  seller: number;
};

/**
 * Split a gross amount into the platform fee and the seller's share.
 *
 * The fee is rounded to the nearest 1,000 Toman in the platform's favour and
 * the seller gets the remainder, so `fee + seller === gross` always. Rounding
 * the *fee* rather than the seller's share keeps a 5% commission from quietly
 * shaving 500 Toman off every single-token sale.
 */
export function splitAmount(gross: number, feePercent: number): AmountSplit {
  if (gross <= 0) return { gross: 0, fee: 0, seller: 0 };

  // سهم صفر یعنی سایت واقعاً هیچ‌چیز برنمی‌دارد؛ نباید کفِ ۱٬۰۰۰ تومانی اعمال شود
  // (وگرنه «۰٪» عملاً ۱٬۰۰۰ تومان کارمزد می‌شد و پول از کیف پول قفل می‌شد).
  if (feePercent <= 0) return { gross, fee: 0, seller: gross };

  const rawFee = (gross * feePercent) / 100;
  const fee = Math.max(1000, Math.round(rawFee / 1000) * 1000);

  // A 1,000-Toman minimum would exceed the price of a cheap token; in that
  // case the platform takes nothing rather than making the seller pay.
  if (fee >= gross) {
    return { gross, fee: 0, seller: gross };
  }

  return { gross, fee, seller: gross - fee };
}

/** Input from a Persian user: «۱۲۰٬۰۰۰» → 120000. NaN-safe. */
export function parseToman(input: string): number | null {
  const normalized = toLatinDigits(String(input))
    .replace(/[,\u066C\s٬]/g, "")
    .replace(/[^\d-]/g, "");

  if (!normalized) return null;

  const value = Number.parseInt(normalized, 10);
  return Number.isFinite(value) ? value : null;
}

/** Latin digits with thousands separators — for `dir="ltr"` fields. */
export function formatNumberLatin(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/** Converts a Persian-typed number to Latin for form submission. */
export function normalizeNumericInput(input: string): string {
  return toPersianDigits(input) === String(input)
    ? input
    : toLatinDigits(input);
}