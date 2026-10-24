/**
 * اعتبارسنجی ورودی — یک منبع حقیقت برای فرم‌ها و اکشن‌ها.
 *
 * Every field the browser sends goes through here on the server. The client
 * validates too, but only so the user gets an answer without a round trip;
 * nothing here trusts that validation happened.
 *
 * نکته‌ی مشترک این فایل: هر چیزی که کاربر تایپ می‌کند اول به شکل «تمیزشده» در
 * می‌آید (ارقام فارسی → لاتین، جداکننده‌ها حذف، شماره نرمال) و بعد سنجیده می‌شود.
 * بدون این کار، «۱۲۰٬۰۰۰» و «120,000» و «120000» سه ورودی متفاوت می‌شدند.
 */

import { z } from "zod";

import {
  MAP,
  MAX_TOKENS_PER_LISTING,
  MAX_DELIVERY_LEAD_HOURS,
  MIN_TOKEN_PRICE,
  MIN_TOPUP,
  MIN_WITHDRAWAL,
} from "@/lib/config";
import { toLatinDigits } from "@/lib/dates";
import { parseToman } from "@/lib/money";
import { isValidPhone, normalizePhone } from "@/lib/phone";

const latinize = (value: unknown): string =>
  typeof value === "string" ? toLatinDigits(value).trim() : String(value ?? "");

const requiredText = (label: string, min = 2, max = 120) =>
  z
    .string()
    .transform(latinize)
    .pipe(
      z
        .string()
        .min(min, `${label} را کامل بنویسید.`)
        .max(max, `${label} خیلی طولانی است.`),
    );

const optionalText = (max = 200) =>
  z
    .string()
    .transform(latinize)
    .pipe(z.string().max(max, "خیلی طولانی است."))
    .optional();

/* ------------------------------------------------------------------ *
 *  هویت
 * ------------------------------------------------------------------ */

const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .pipe(z.string().refine(isValidPhone, "شماره موبایل معتبر نیست. مثلاً ۰۹۱۲۳۴۵۶۷۸۹"));

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "رمز عبور را وارد کنید."),
});

export const registerSchema = z
  .object({
    name: requiredText("نام و نام خانوادگی", 3, 60),
    /** اختیاری: فقط برای اینکه فروشنده‌ی مطمئن باشد، هیچ نقشی در ورود ندارد. */
    studentId: z
      .string()
      .transform(latinize)
      .pipe(z.string().regex(/^\d{4,12}$/, "اگر شماره دانشجویی داری، بین ۴ تا ۱۲ رقم باشد."))
      .optional()
      .or(z.literal("")),
    phone: phoneSchema,
    /** توکن تایید ربات تلگرام. */
    claim: z.string().max(64).optional().or(z.literal("")),
    password: z
      .string()
      .min(8, "رمز عبور باید حداقل ۸ نویسه باشد.")
      .max(72, "رمز عبور خیلی طولانی است."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "تکرار رمز عبور مطابقت ندارد.",
    path: ["confirmPassword"],
  });

/* ------------------------------------------------------------------ *
 *  آگهی و نقطه‌ی تحویل
 * ------------------------------------------------------------------ */

/** قیمت: کاربر فارسی می‌نویسد («۱۲۰٬۰۰۰»)؛ اینجا عدد صحیح تومان می‌شود. */
const toman = (label: string, min: number, max: number) =>
  z
    .string()
    .transform((v) => parseToman(v) ?? Number.NaN)
    .pipe(
      z
        .number({ error: `${label} را عدد بنویسید.` })
        .min(min, `${label} حداقل ${min.toLocaleString("fa-IR")} تومان است.`)
        .max(max, `${label} بیشتر از حد مجاز است.`),
    );

/** «۱۲:۳۰» — تایپ کاربر ممکن است «۱۲.۳۰» یا «۱۲:۳۰» باشد. */
const timeString = z
  .string()
  .transform((v) => {
    const digits = latinize(v).replace(/[^\d:：]/g, ":").replace(/：/g, ":");
    return digits;
  })
  .pipe(
    z
      .string()
      .regex(/^([01]?\d|2[0-4]):[0-5]\d$/, "ساعت را مثل ۱۲:۳۰ بنویس."),
  );

export const listingSchema = z.object({
  mealDayId: z.coerce.number().int().positive("روز غذا را انتخاب کنید."),
  quantity: z.coerce
    .number()
    .int("تعداد باید عدد صحیح باشد.")
    .min(1, "حداقل یک ژتون.")
    .max(MAX_TOKENS_PER_LISTING, `حداکثر ${MAX_TOKENS_PER_LISTING} ژتون در هر آگهی.`),
  unitPrice: toman("قیمت هر ژتون", MIN_TOKEN_PRICE, 5_000_000),
  note: optionalText(280),

  /** نقطه‌ی تحویل روی نقشه. */
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  locationText: requiredText("توضیح محل تحویل", 4, 140),
  placeLabel: optionalText(60),

  /** روز و بازه‌ی تحویل که فروشنده خودش اعلام می‌کند. */
  deliveryDate: z.coerce.date("روز تحویل را انتخاب کنید."),
  deliveryFrom: timeString,
  deliveryTo: timeString,
}).superRefine((data, ctx) => {
  if (data.deliveryTo <= data.deliveryFrom) {
    ctx.addIssue({
      code: "custom",
      path: ["deliveryTo"],
      message: "پایان بازه باید بعد از شروع آن باشد.",
    });
  }

  const limit = Date.now() + MAX_DELIVERY_LEAD_HOURS * 3600e3;
  if (data.deliveryDate.getTime() > limit) {
    ctx.addIssue({
      code: "custom",
      path: ["deliveryDate"],
      message: "زمان تحویل خیلی دور است.",
    });
  }

  // نقطه باید داخل شعاع قابل‌قبول نقشه باشد، وگرنه فروشنده جایی در کربن می‌گذارد
  // و خریدار در تهران دنبالش می‌گردد.
  const distance = haversineKm(MAP.lat, MAP.lng, data.lat, data.lng);
  if (distance > 3) {
    ctx.addIssue({
      code: "custom",
      path: ["lat"],
      message: "نقطه‌ی انتخابی خیلی دور از محدوده‌ی دانشگاه است.",
    });
  }
});

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

/* ------------------------------------------------------------------ *
 *  رزرو
 * ------------------------------------------------------------------ */

export const reserveSchema = z.object({
  listingId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(MAX_TOKENS_PER_LISTING),
});

/** دلیل اعتراض — چیزی است که مدیر بر اساسش داوری می‌کند، پس بی‌معنا ردش نمی‌کنیم. */
export const disputeSchema = z.object({
  reason: z
    .string()
    .transform(latinize)
    .pipe(z.string().trim().min(10, "دلیل اعتراض را کمی توضیح بده.").max(400, "خیلی طولانی است.")),
});

export const handoverCodeSchema = z.object({
  reservationId: z.coerce.number().int().positive(),
  code: z
    .string()
    .transform((v) => latinize(v).toUpperCase())
    .pipe(z.string().length(6, "کد رزرو ۶ نویسه است.")),
});

/* ------------------------------------------------------------------ *
 *  کیف پول
 * ------------------------------------------------------------------ */

export const topUpSchema = z.object({
  amount: toman("مبلغ شارژ", MIN_TOPUP, 50_000_000),
  receiptUrl: z
    .string()
    .min(8, "تصویر رسید را بارگذاری کنید.")
    .max(400)
    .refine((value) => value.startsWith("http") || value.startsWith("/"), "نشانی رسید نامعتبر است."),
  note: optionalText(280),
});

export const withdrawSchema = z.object({
  amount: toman("مبلغ برداشت", MIN_WITHDRAWAL, 50_000_000),
  note: optionalText(280),
});

/* ------------------------------------------------------------------ *
 *  مدیریت
 * ------------------------------------------------------------------ */

export const mealDaySchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  title: requiredText("عنوان", 3, 80),
  mealType: z.enum(["صبحانه", "ناهار", "شام"]),
  date: z.coerce.date("تاریخ را انتخاب کنید."),
  menu: requiredText("منو", 3, 200),
  officialPrice: toman("قیمت رسمی", 1000, 5_000_000),
  capacity: z.coerce.number().int().min(0).max(100_000).optional(),
  notes: optionalText(400),
  status: z.enum(["OPEN", "LOCKED", "CLOSED", "DONE", "CANCELLED"]),
});

export const ledgerSchema = z.object({
  kind: z.enum(["ADJUSTMENT", "REFUND"]),
  amount: toman("مبلغ", 1000, 100_000_000),
  note: requiredText("شرح", 3, 200),
});

/** پیام‌های خطا را به شکل `{ field: message }` درمی‌آورد. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}