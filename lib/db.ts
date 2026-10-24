import "server-only";

/**
 * نقطه‌ی ورود اپلیکیشن به Prisma.
 *
 * این فایل فقط یک گارد `server-only` است و به دلیل آن هر کامپوننت کلاینتی که
 * اشتباهی دیتابیس را ایمپورت کند، همان لحظه در بیلد می‌شکند. خودِ کلاینت در
 * `lib/prisma.ts` است چون ربات تلگرام هم به آن نیاز دارد.
 */
export { db, prisma } from "@/lib/prisma";
export * from "@/app/generated/prisma/enums";
export type { PrismaClient } from "@/app/generated/prisma/client";
