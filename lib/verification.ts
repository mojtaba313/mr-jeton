import "server-only";

/**
 * نقطه‌ی ورود سایت به منطق تایید شماره.
 *
 * `server-only` اینجاست تا یک کامپوننت کلاینت نتواند (حتی اشتباهی) دفتر
 * پول یا ادعاهای تایید را بخواند. منطق در `verification-core.ts` است چون ربات
 * تلگرام هم به آن نیاز دارد و آن پروسه یک سرور Next نیست.
 */
export {
  CLAIM_TTL_MS,
  claimStatus,
  createClaim,
  isPhoneVerified,
  resolveClaim,
} from "@/lib/verification-core";
