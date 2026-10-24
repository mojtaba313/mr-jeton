/**
 * شماره تماس ایرانی — یک قالب، نه ده.
 *
 * کاربر ممکن است `09123456789`، `+989123456789`، `009891234456789` یا
 * «۰۹۱۲ ۳۴۵ ۶۷۸۹» بنویسد. تلگرام هم گاهی `+98912…` و گاهی `98912…` می‌فرستد.
 * همه‌ی این‌ها باید به یک رشته تبدیل شوند — `9xxxxxxxxx` — وگرنه کاربر تاییدشده
 * با شماره‌ای که ثبت کرده فرق می‌کند و تایید بی‌دلیل رد می‌شود.
 */

const PERSIAN_ZERO = "۰";

/** ارقام فارسی/عربی → لاتین و حذف جداکننده‌ها. */
export function normalizePhone(input: string): string {
  let digits = input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[\s\-()._]/g, "")
    .replace(/^\+/, "");

  if (digits.startsWith("0098")) digits = digits.slice(4);
  else if (digits.startsWith("98")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);

  return digits;
}

/** `۰۹۱۲۳۴۵۶۷۸۹` — برای نمایش به خود کاربر. */
export function formatPhone(input: string): string {
  const digits = normalizePhone(input);
  if (digits.length !== 10) return input;

  return `۰۹${digits.slice(1, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`.replace(
    /[0-9]/g,
    (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!,
  );
}

/** آیا این رشته یک موبایل ایرانی معتبر است؟ */
export function isValidPhone(input: string): boolean {
  return /^9\d{9}$/.test(normalizePhone(input));
}

/** نمایش فشرده برای لاگ‌ها: `۰۹۱۲***۶۷۸۹`. */
export function maskPhone(input: string): string {
  const digits = normalizePhone(input);
  if (digits.length < 6) return input;

  return `${digits.slice(0, 4)}***${digits.slice(-4)}`;
}

export { PERSIAN_ZERO };