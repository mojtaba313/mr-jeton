import { NextResponse } from "next/server";

import { TELEGRAM, telegramBotLink, telegramReady } from "@/lib/telegram";
import { createClaim } from "@/lib/verification-core";

/**
 * ساخت ادعای تایید شماره و برگرداندن لینک ربات.
 *
 * POST (نه GET) چون این مسیر یک رکورد می‌سازد؛ و عمداً بدون احراز هویت، چون
 * دقیقاً قبل از ثبت‌نام صدا زده می‌شود و کاربر هنوز حساب ندارد.
 *
 * چیزی که برمی‌گردد هرگز حساس نیست: یک توکن تصادفی و یک لینک عمومی تلگرام.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "مبدأ درخواست مجاز نیست." }, { status: 403 });
  }

  let body: { phone?: unknown };
  try {
    body = (await request.json()) as { phone?: unknown };
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }

  const phone = typeof body.phone === "string" ? body.phone : "";
  if (!/^[\d۰-۹٠-٩+\-\s()]{10,20}$/.test(phone)) {
    return NextResponse.json({ error: "شماره معتبر نیست." }, { status: 400 });
  }

  // بدون این گارد، فرم ثبت‌نام یک «در انتظار» بی‌پایان نشان می‌داد که هیچ‌وقت
  // تایید نمی‌شد؛ خطای صریح بهتر از انتظاری است که توضیحی ندارد.
  if (!telegramReady && !TELEGRAM.bypass) {
    return NextResponse.json(
      {
        error:
          "تایید شماره هنوز پیکربندی نشده است. ربات تلگرام یا باید تنظیم شود یا در حالت توسعه بای‌پس روشن باشد.",
      },
      { status: 503 },
    );
  }

  const claim = await createClaim(phone);

  return NextResponse.json({
    claim: claim.claim,
    phone: claim.phone,
    botLink: telegramBotLink(claim.claim),
    /** در حالت bypass (فقط توسعه) رباتی در کار نیست. */
    bypass: TELEGRAM.bypass,
    botUsername: TELEGRAM.username || null,
  });
}

/**
 * بررسی مبدأ درخواست.
 *
 * Server Actions have a built-in Origin check; a Route Handler does not. Without
 * this, any site on the internet could create claims using the visitor's
 * browser.
 */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const host = request.headers.get("host");
  return origin === `http://${host}` || origin === `https://${host}`;
}