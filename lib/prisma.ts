import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * یک کلاینت Prisma به‌ازای هر پروسه.
 *
 * On `global` in development so hot reloads don't open a new pool on every
 * edit — a pool that exhausts is the fastest way to make a dev server look
 * broken.
 *
 * Note the absence of `server-only`: this module is shared with
 * `bot/index.ts`, which is a plain Node process, and `server-only` throws
 * outside a React Server Component tree. The guard lives in `lib/db.ts`.
 */
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL تنظیم نشده است. آدرس دیتابیس را در .env قرار دهید.",
    );
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** برای اکشن‌ها و کامپوننت‌های سرور — با گارد. */
export const db = prisma;

/** Re-exported so callers need one import for an enum and the client. */
export * from "@/app/generated/prisma/enums";
export type { PrismaClient } from "@/app/generated/prisma/client";
