/**
 * هسته‌ی ربات تلگرام — تایید شماره تماس.
 *
 * این فایل هیچ کاری در زمان اجرا انجام نمی‌دهد؛ فقط «یک آپدیت را بگیر، نتیجه را
 * بنویس». هر دو شکل اجرا از همین استفاده می‌کنند:
 *
 *   • **وب‌هوک** (روی Vercel): `app/api/telegram/webhook/route.ts` هر آپدیت را
 *     به `handleUpdate` می‌دهد. هیچ پروسه‌ای بیدار نمی‌ماند، پس روی یک هاست
 *     سرورلس که پروسه‌ی دائمی ندارد هم کار می‌کند.
 *   • **long polling** (روی یک ماشین یا لپ‌تاپ): `bot/index.ts`.
 *
 * این دو با هم قابل استفاده نیستند: تلگرام وقتی وب‌هوک ثبت باشد، `getUpdates` را
 * با خطای ۴۰۹ رد می‌کند. با `pnpm bot:webhook` و `pnpm bot:webhook:off` جابه‌جا شو.
 *
 * عمداً بدون هیچ کتابخانه‌ی تلگرام نوشته شده: Bot API چند `sendMessage` ساده است
 * و یک وابستگی که هر چند ماه یک‌بار نسخه‌ی ناسازگار منتشر می‌کند، ارزشش را ندارد.
 *
 * جریان:
 *   /start <claim>  →  دکمه‌ی «ارسال شماره من»
 *   contact         →  مقایسه با شماره‌ی ادعا → VERIFIED یا MISMATCH
 *
 * ربات هیچ راهی برای «تایید کردن بدون دیدن شماره» ندارد: شماره را از خود تلگرام
 * می‌گیرد، یعنی شماره‌ای که تلگرام برای آن حساب را تایید کرده است.
 */

import { normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { resolveClaim } from "@/lib/verification-core";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";

const API = `https://api.telegram.org/bot${TOKEN}`;

type TgResponse = { ok: boolean; result?: unknown; description?: string };

export async function call(
  method: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  if (!TOKEN) throw new Error("TELEGRAM_BOT_TOKEN تنظیم نشده است.");

  let response: Response;
  try {
    response = await fetch(`${API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // شبکه‌ی ربات گاهی می‌رود؛ یک پاسخ ناموفق باید لاگ شود، نه اینکه کل پروسه
    // را زمین بزند.
    console.error(
      `تلگرام در دسترس نیست (${method}):`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }

  const body = (await response.json()) as TgResponse;
  if (!body.ok) {
    console.error(`تلگرام: ${method} → ${body.description ?? response.status}`);
    return null;
  }

  return body.result;
}

function reply(chatId: number, text: string, keyboard?: unknown) {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: keyboard } : {}),
  });
}

const CONTACT_KEYBOARD = {
  keyboard: [[{ text: "📱 ارسال شماره من", request_contact: true }]],
  // فقط یک‌بار می‌خواهیم شماره را؛ کاربر می‌تواند بعد از تایید صفحه را ببندد.
  resize_keyboard: true,
  one_time_keyboard: true,
};

const HELP_TEXT = `<b>ربات آقای ژتون</b>

برای تایید شماره تماس، روی لینکی که در سایت گرفتی ضربه بزن و شماره‌ات را بفرست.

⚠️ این ربات فقط شماره‌ی تو را <b>می‌خواند</b> و جایی نمی‌فرستد؛ فقط برای اینکه مطمئن شویم شماره‌ای که در سایت می‌نویسی مال خودت است.`;

async function handleStart(
  chatId: number,
  claim: string | undefined,
  telegramUserId: number,
  telegramUsername?: string | null,
) {
  if (!claim) {
    await reply(
      chatId,
      `${HELP_TEXT}

اگر لینک نداری، به سایت برگرد و دوباره ثبت‌نام را شروع کن.`,
    );
    return;
  }

  const found = await prisma.phoneVerification.findUnique({
    where: { claim },
    select: { phone: true, status: true },
  });

  if (!found) {
    await reply(
      chatId,
      "این لینک معتبر نیست یا منقضی شده. به سایت برگرد و یک لینک تازه بگیر.",
    );
    return;
  }

  if (found.status !== "PENDING") {
    await reply(
      chatId,
      "این درخواست قبلاً بررسی شده است. به سایت برگرد و ادامه بده.",
    );
    return;
  }

  // ادعا را همین‌جا به کاربر تلگرام گره می‌زنیم. پیامِ «ارسال شماره» دیگر متن
  // `/start` ندارد، پس بدون این گره، `contact` هیچ راهی برای پیدا کردن ادعا
  // نداشت و تایید همیشه با «اول لینک را باز کن» برمی‌گشت.
  await prisma.phoneVerification.update({
    where: { claim },
    data: {
      telegramUserId: String(telegramUserId),
      telegramUsername: telegramUsername ?? null,
    },
  });

  await reply(
    chatId,
    `شماره‌ات را بفرست تا با شماره‌ای که در سایت نوشتی (<b>${mask(found.phone)}</b>) مقایسه شود.

اگر شماره‌ات یکی نیست، یعنی لینک را با حساب دیگری باز کرده‌ای.`,
    CONTACT_KEYBOARD,
  );
}

async function handleContact(input: {
  chatId: number;
  phone: string;
  claim?: string | undefined;
  telegramUserId: string;
  telegramUsername?: string | null;
}) {
  if (!input.claim) {
    await reply(
      input.chatId,
      "اول باید لینک سایت را باز کنی، بعد شماره را بفرستی.",
    );
    return;
  }

  const result = await resolveClaim({
    claim: input.claim,
    telegramUserId: input.telegramUserId,
    telegramUsername: input.telegramUsername,
    telegramPhone: input.phone,
  });

  if (!result) {
    await reply(input.chatId, "این لینک معتبر نیست یا منقضی شده.");
    return;
  }

  if (result.matches) {
    await reply(
      input.chatId,
      `✅ شماره <b>${mask(input.phone)}</b> تایید شد.

حالا به سایت برگرد — فرم ثبت‌نام خودش باز می‌شود. این پنجره را ببند.`,
    );
    return;
  }

  await reply(
    input.chatId,
    `❌ این شماره با شماره‌ای که در سایت وارد کرده‌ای یکی نیست.

شماره‌ی سایت: <b>${mask(result.phone)}</b>
شماره‌ی تلگرام: <b>${mask(input.phone)}</b>

یا با همان اکانتی که شماره‌اش مال خودت است وارد شو، یا در سایت شماره‌ی درست را بنویس.`,
  );
}

function mask(phone: string) {
  const digits = normalizePhone(phone);
  return digits.length < 6 ? phone : `${digits.slice(0, 4)}***${digits.slice(-4)}`;
}

export type TgUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number; type: string };
    from: { id: number; username?: string };
    contact?: { phone_number: string };
  };
};

/**
 * یک آپدیت تلگرام را پردازش می‌کند. تنها نقطه‌ی مشترک بین وب‌هوک و پولینگ.
 *
 * هیچ چیزی اینجا پرتاب نمی‌شود مگر خطای واقعی: فراخوان بی‌پاسخ تلگرام خودش
 * خطا نمی‌دهد (فقط لاگ می‌کند)، چون پاسخ ناموفق نباید باعث تلاش دوباره‌ی تلگرام
 * شود — کاربر تایید را دوباره نمی‌بیند.
 */
export async function handleUpdate(update: TgUpdate): Promise<void> {
  const message = update.message;
  if (!message) return;

  const text = message.text ?? "";

  // /start یا /start <claim> — توکن در متن بعد از اسپیس است.
  if (text.startsWith("/start")) {
    await handleStart(
      message.chat.id,
      text.split(/\s+/)[1],
      message.from.id,
      message.from.username ?? null,
    );
    return;
  }

  if (message.contact) {
    const claim = await prisma.phoneVerification.findFirst({
      where: {
        status: "PENDING",
        telegramUserId: String(message.from.id),
      },
      orderBy: { createdAt: "desc" },
      select: { claim: true },
    });

    await handleContact({
      chatId: message.chat.id,
      phone: message.contact.phone_number,
      claim: claim?.claim,
      telegramUserId: String(message.from.id),
      telegramUsername: message.from.username ?? null,
    });
    return;
  }

  if (text.startsWith("/help")) {
    await reply(message.chat.id, HELP_TEXT);
  }
}