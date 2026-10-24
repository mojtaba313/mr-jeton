import { NextResponse } from "next/server";

import { handleUpdate, type TgUpdate } from "@/lib/telegram-bot";
import { TELEGRAM_WEBHOOK_SECRET } from "@/lib/telegram";

/**
 * وب‌هوک تلگرام — همان ربات، بدون پروسه‌ی دائمی.
 *
 * چرا این مسیر وجود دارد: long polling یعنی یک پروسه باید همیشه بیدار بماند، و
 * Vercel (و هر هاست سرورلس دیگری) پروسه‌ی دائمی ندارد. وب‌هوک همان کار را می‌کند
 * بدون هیچ هزینه‌ای: تلگرام خودش این آدرس را صدا می‌زند.
 *
 *   POST /api/telegram/webhook   ← تلگرام
 *
 * یک سرویس میکرو روی هاست اشتراکی ممکن است هر مسیری را صدا بزند، پس هدر
 * `X-Telegram-Bot-Api-Secret-Token` بررسی می‌شود؛ مقدارش را خود تلگرام هنگام
 * ثبت وب‌هوک تعیین می‌کند و از `TELEGRAM_WEBHOOK_SECRET` می‌آید.
 *
 * پاسخ همیشه ۲۰۰ است، حتی وقتی پردازش شکست خورد: تلگرام پاسخ غیر ۲۰۰ را تا ۲۴
 * ساعت دوباره می‌فرستد، و تلاش دوباره یعنی دوباره پیام دادن به کاربری که شاید
 * جوابش را گرفته است.
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (!TELEGRAM_WEBHOOK_SECRET || secret !== TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await request.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await handleUpdate(update);
  } catch (error) {
    console.error("پردازش آپدیت تلگرام ناموفق بود:", error);
  }

  return NextResponse.json({ ok: true });
}