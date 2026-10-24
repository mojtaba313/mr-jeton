/**
 * ربات تلگرام به‌صورت پروسه‌ی مستقل (long polling) + ثبت/حذف وب‌هوک.
 *
 *   pnpm bot              # اجرای دائمی با long polling (لپ‌تاپ، VPS)
 *   pnpm bot:once         # فقط یک گرد (تست دستی)
 *   pnpm bot:webhook      # وب‌هوک را روی همین سایت ثبت می‌کند (Vercel)
 *   pnpm bot:webhook:off  # وب‌هوک را حذف می‌کند تا پولینگ محلی کار کند
 *
 * روی هاستی که پروسه‌ی دائمی ندارد (Vercel) هیچ‌کدام از این فرمان‌ها اجرا نمی‌شود:
 * همان کد از `app/api/telegram/webhook` صدا زده می‌شود. این فایل فقط برای
 * توسعه‌ی محلی و برای *ثبت* وب‌هوک لازم است.
 *
 * منطق مشترک در `lib/telegram-bot.ts` است؛ اینجا فقط ترابری.
 */

import "dotenv/config";

import { call, handleUpdate, type TgUpdate } from "../lib/telegram-bot";

const ONCE = process.argv.includes("--once");
const SET_WEBHOOK = process.argv.includes("--set-webhook");
const DELETE_WEBHOOK = process.argv.includes("--delete-webhook");

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error(
    "TELEGRAM_BOT_TOKEN تنظیم نشده است.\nاز @BotFather یک بات بساز و توکنش را در .env بگذار.",
  );
  process.exit(1);
}

function webhookUrl() {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  if (!site) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL تنظیم نشده است؛ آدرس سایت لازم است تا وب‌هوک ساخته شود.",
    );
  }
  return `${site}/api/telegram/webhook`;
}

async function setWebhook() {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "TELEGRAM_WEBHOOK_SECRET تنظیم نشده است.\nیک رشته‌ی تصادفی بساز (مثلاً openssl rand -hex 16) و در .env بگذار؛ همین مقدار باید در تنظیمات Vercel هم باشد.",
    );
    process.exit(1);
  }

  const result = await call("setWebhook", {
    url: webhookUrl(),
    secret_token: secret,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });

  if (!result) process.exit(1);
  console.log(`وب‌هوک ثبت شد: ${webhookUrl()}`);
  console.log("از این به بعد دیگر نباید `pnpm bot` را هم‌زمان اجرا کنی.");
}

async function deleteWebhook() {
  const result = await call("deleteWebhook", { drop_pending_updates: false });
  if (!result) process.exit(1);
  console.log("وب‌هوک حذف شد؛ حالا `pnpm bot` می‌تواند با getUpdates کار کند.");
}

async function longPoll() {
  console.log("ربات آقای ژتون بالا آمد. برای توقف Ctrl+C.");

  let offset = 0;
  while (true) {
    try {
      const updates = (await call("getUpdates", {
        offset,
        timeout: 25,
        allowed_updates: ["message"],
      })) as TgUpdate[] | null;

      for (const update of updates ?? []) {
        offset = update.update_id + 1;
        await handleUpdate(update);
      }
    } catch (error) {
      console.error("خطا در دریافت آپدیت‌ها:", error);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

async function once() {
  const updates = (await call("getUpdates", {
    timeout: 0,
    allowed_updates: ["message"],
  })) as TgUpdate[] | null;

  for (const update of updates ?? []) await handleUpdate(update);
  console.log(`پردازش شد: ${updates?.length ?? 0} پیام`);
}

async function main() {
  const me = await call("getMe", {});
  if (!me) {
    console.error("ارتباط با تلگرام برقرار نشد.");
    process.exit(1);
  }

  if (SET_WEBHOOK) await setWebhook();
  else if (DELETE_WEBHOOK) await deleteWebhook();
  else if (ONCE) await once();
  else await longPoll();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});