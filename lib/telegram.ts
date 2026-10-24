import "server-only";

/**
 * تنظیمات ربات تلگرام — تنها راز این پروژه.
 *
 * جدا از `lib/config.ts` چون آن یکی باید در کامپوننت کلاینت هم خوانده شود و
 * `server-only` در آنجا خطا می‌دهد. اینجا فقط سرور می‌خواندش.
 *
 * اگر توکن خالی باشد، ثبت‌نام با `TELEGRAM_VERIFICATION_BYPASS` کار می‌کند؛
 * این کلید فقط برای توسعه‌ی محلی است و نباید در سرور واقعی روشن باشد.
 */
export const TELEGRAM = {
  token: process.env.TELEGRAM_BOT_TOKEN ?? "",
  username: process.env.TELEGRAM_BOT_USERNAME ?? "",
  /** فقط برای توسعه: تایید بدون ربات. */
  bypass: process.env.TELEGRAM_VERIFICATION_BYPASS === "true",
  /**
   * توکنی که تلگرام باید در `X-Telegram-Bot-Api-Secret-Token` بفرستد تا
   * وب‌هوک را بپذیریم. با `pnpm bot:webhook` در خود تلگرام ثبت می‌شود.
   */
  webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
} as const;

export const telegramReady = TELEGRAM.token !== "" && TELEGRAM.username !== "";

/** همان مقداری که با `pnpm bot:webhook` در تلگرام ثبت می‌شود. */
export const TELEGRAM_WEBHOOK_SECRET = TELEGRAM.webhookSecret;

/** لینک دیپ‌لینک ربات برای یک ادعای تایید. */
export function telegramBotLink(claim: string): string | null {
  if (!telegramReady) return null;
  return `https://t.me/${TELEGRAM.username}?start=${claim}`;
}
