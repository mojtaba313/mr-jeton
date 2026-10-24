/**
 * هسته‌ی تایید شماره — بدون `server-only`.
 *
 * این فایل هم از سایت (که سرور است) و هم از پروسه‌ی ربات صدا زده می‌شود؛ و
 * `server-only` در Node خالص خطا می‌دهد. بنابراین منطق اینجا می‌نشیند و
 * `lib/verification.ts` فقط دوباره آن را صادر می‌کند تا بقیه‌ی کد اپلیکیشن
 * همچنان همان گارد را داشته باشد.
 */

/**
 * تایید شماره تماس با ربات تلگرام.
 *
 * ایده: سایت یک «ادعا» (claim) می‌سازد و لینک دیپ‌لینک ربات را به کاربر
 * می‌دهد. کاربر در تلگرام دکمه‌ی «ارسال شماره» را می‌زند، تلگرام شماره را (که
 * به حسابش تأیید شده) برای ربات می‌فرستد، و ربات آن را با شماره‌ی ادعا مقایسه
 * می‌کند. اگر یکی بود، ادعا VERIFIED می‌شود و فرم ثبت‌نام باز می‌شود.
 *
 * سه تصمیم که امنیت را می‌سازند:
 *
 *  ۱. **فقط ربات می‌تواند تایید کند.** وب‌سایت ادعا را می‌سازد و می‌خواند؛ هر
 *     مسیر HTTP فقط GET است و هیچ راهی برای نوشتن `status` ندارد.
 *  ۲. **ادعا به یک شماره گره خورده و تصادفی است.** حدس زدنش غیرممکن است و به
 *     محض استفاده مصرف می‌شود (status یک‌بارمصرف).
 *  ۳. **عدم تطابق هم ثبت می‌شود** تا مدیر بتواند ببیند چه کسی با شماره‌ی خودش
 *     ادعای شماره‌ی دیگری را کرده — نشانه‌ی سوءاستفاده.
 */

import { prisma as db } from "@/lib/prisma";
import type { VerificationStatus } from "@/app/generated/prisma/enums";
import { normalizePhone } from "@/lib/phone";

/** طول عمر ادعا. کاربر موقع ثبت‌نام باید در همین بازه ربات را باز کند. */
export const CLAIM_TTL_MS = 20 * 60 * 1000;

/**
 * ادعای تازه برای یک شماره می‌سازد.
 *
 * ادعاهای قبلیِ همین شماره باطل می‌شوند تا کسی نتواند دو فرم را هم‌زمان باز نگه
 * دارد و ادعای قدیمی‌اش را دوباره استفاده کند.
 */
export async function createClaim(phone: string) {
  const normalized = normalizePhone(phone);

  await db.phoneVerification.updateMany({
    where: { phone: normalized, status: "PENDING" },
    data: { status: "EXPIRED" },
  });

  return db.phoneVerification.create({
    data: {
      claim: crypto.randomUUID().replaceAll("-", ""),
      phone: normalized,
    },
    select: { id: true, claim: true, phone: true },
  });
}

/** وضعیت فعلی ادعا — این چیزی است که فرم ثبت‌نام هر چند ثانیه می‌پرسد. */
export async function claimStatus(claim: string) {
  const row = await db.phoneVerification.findUnique({
    where: { claim },
    select: {
      id: true,
      phone: true,
      status: true,
      telegramUsername: true,
      createdAt: true,
    },
  });

  if (!row) return null;

  // فرم ثبت‌نام هر دو ثانیه این را می‌پرسد، پس بازبینی انقضا فقط وقتی انجام
  // می‌شود که مهلت واقعاً گذشته باشد؛ وگرنه هر poll یک نوشتن اضافه می‌سازد.
  if (row.status === "PENDING" && isExpired(row.createdAt)) {
    await db.phoneVerification.update({
      where: { id: row.id },
      data: { status: "EXPIRED" },
    });
    return { ...row, status: "EXPIRED" as const };
  }

  return row;
}

function isExpired(createdAt: Date) {
  return Date.now() - createdAt.getTime() > CLAIM_TTL_MS;
}

/**
 * ثبت نتیجه‌ی ربات.
 *
 * این تابع فقط از پروسه‌ی ربات صدا زده می‌شود، نه از اکشن‌های سایت — و هیچ
 * route عمومی‌ای آن را صدا نمی‌زند.
 */
export async function resolveClaim(input: {
  claim: string;
  telegramUserId: string;
  telegramUsername?: string | null;
  telegramPhone: string;
}) {
  const row = await db.phoneVerification.findUnique({
    where: { claim: input.claim },
    select: { id: true, phone: true, status: true, createdAt: true },
  });

  if (!row || row.status !== "PENDING") return null;

  // ربات شاید ساعت‌ها بعد دکمه را بزند؛ مهلت ادعا سرِ جایش است.
  if (isExpired(row.createdAt)) {
    await db.phoneVerification.update({
      where: { id: row.id },
      data: { status: "EXPIRED" },
    });
    return null;
  }

  const incoming = normalizePhone(input.telegramPhone);
  const matches = incoming === row.phone;

  await db.phoneVerification.update({
    where: { id: row.id },
    data: {
      status: matches ? "VERIFIED" : ("MISMATCH" satisfies VerificationStatus),
      telegramUserId: input.telegramUserId,
      telegramUsername: input.telegramUsername ?? null,
      telegramPhone: incoming,
      resolvedAt: new Date(),
    },
  });

  return { matches, phone: row.phone };
}

/** آیا این شماره قبلاً تایید شده است؟ (برای ثبت‌نام و بازیابی) */
export async function isPhoneVerified(phone: string) {
  const row = await db.phoneVerification.findFirst({
    where: { phone: normalizePhone(phone), status: "VERIFIED" },
    select: { id: true },
    orderBy: { resolvedAt: "desc" },
  });

  return row !== null;
}