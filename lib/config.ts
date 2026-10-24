/**
 * تنظیمات سایت — یک جا، تا «عدد ۵ درصد» در ده فایل پخش نباشد.
 *
 * این ماژول **عمداً** `server-only` ندارد: کارت بانکی و مرکز نقشه باید در
 * کامپوننت‌های کلاینت هم خوانده شوند. تنها راز واقعی — توکن ربات تلگرام — در
 * `lib/telegram.ts` است که همین گارد را دارد.
 */

export const SITE = {
  name: "آقای ژتون",
  tagline: "ژتون اضافه‌ات را نگه دار، نگه ندار",
  description:
    "بازار ژتون غذای دانشگاه: ژتون رزروشده‌ی خودت را بیشتر از قیمت سلف بفروش، و برای روزی که یادت رفت رزرو کنی، ژتون کسی را بخر. تحویل در نقطه و ساعتی که فروشنده تعیین می‌کند.",
} as const;

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function positiveFloat(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** سهم پلتفرم از هر رزروی موفق. تنها خط درآمد سایت. */
export const FEE_PERCENT = Math.min(
  50,
  positiveInt(process.env.PLATFORM_FEE_PERCENT, 5),
);

/** حداقل شارژ کیف پول — کمتر از این، رزرو تقریباً همیشه ناموفق می‌شود. */
export const MIN_TOPUP = 50_000;

/** کمترین مبلغی که فروشنده می‌تواند برداشت کند. */
export const MIN_WITHDRAWAL = 100_000;

/** حداقل قیمت یک ژتون. */
export const MIN_TOKEN_PRICE = 20_000;

/** اطلاعات کارت سایت — برای شارژ کیف پول. */
export const PAYMENT = {
  cardNumber: process.env.PAYMENT_CARD_NUMBER ?? "",
  cardHolder: process.env.PAYMENT_CARD_HOLDER ?? "",
} as const;

/**
 * مرکز نقشه‌ی دانشگاه.
 *
 * این مختصات فقط «قاب نقشه» است؛ فروشنده هر نقطه‌ای را که بخواهد روی آن کلیک
 * می‌کند. اگر `NEXT_PUBLIC_MAP_TILE_URL` را عوض کنید، می‌توانید از سرور نقشه‌ی
 * داخلی دانشگاه استفاده کنید (OpenStreetMap در بعضی شبکه‌ها کند است).
 */
export const MAP = {
  lat: positiveFloat(process.env.NEXT_PUBLIC_MAP_LAT, 35.7000),
  lng: positiveFloat(process.env.NEXT_PUBLIC_MAP_LNG, 51.3900),
  zoom: positiveInt(process.env.NEXT_PUBLIC_MAP_ZOOM, 17),
  label: process.env.NEXT_PUBLIC_MAP_LABEL ?? "دانشگاه",
  tileUrl: process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? "© OpenStreetMap",
} as const;

/** بیشترین حجم رسیدی که باکت قبول می‌کند. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const UPLOAD_KINDS = ["receipt", "avatar"] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

/** انقضای پیش‌فرض آگهی، بر حسب ساعت. */
export const LISTING_TTL_HOURS = 72;

/** چند روز غذای آینده در صفحه‌ی اصل نشان داده می‌شود. */
export const UPCOMING_DAYS_LIMIT = 6;

/** سقف ژتون در یک آگهی — جلوگیری از انبوه‌کردن. */
export const MAX_TOKENS_PER_LISTING = 6;

/** چقدر جلوتر از روز غذا می‌شود زمان تحویل را انتخاب کرد (ساعت). */
export const MAX_DELIVERY_LEAD_HOURS = 72;