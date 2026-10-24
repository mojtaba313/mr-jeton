/**
 * کیف پول — یک دفتر، نه یک عدد.
 *
 * موجودی هر کاربر جمع `amount` سطرهای `WalletEntry` اوست. هیچ ستون `balance`ای در
 * جدول کاربران وجود ندارد، و این عمدی است: ستون موجودی اولین چیزی است که با دو
 * نفرِ هم‌زمانِ رزروکننده اختلاف پیدا می‌کند، و اختلافِ پول بدترین نوع باگ است.
 *
 * چهار حرکت، و هر کدام دقیقاً یک سطر:
 *
 *   TOPUP                +  شارژ تاییدشده توسط مدیر
 *   HOLD                 −  قفل شدن پول خریدار هنگام رزرو
 *   RELEASE              +  آزاد شدن سهم فروشنده پس از تحویل
 *   REFUND               +  برگشت پول خریدار اگر رزرو لغو شد
 *
 * سهم سایت هیچ‌وقت وارد دفتر کاربری نمی‌شود؛ در `LedgerEntry` خودش می‌ماند، چون
 * پولی نیست که به کسی تعلق داشته باشد.
 */

import "server-only";

import { type Prisma } from "@/app/generated/prisma/client";

import { db, type WalletEntryKind } from "@/lib/db";

/** موجودی کیف پول — یک `SUM`. */
export async function walletBalance(userId: number): Promise<number> {
  const result = await db.walletEntry.aggregate({
    where: { userId },
    _sum: { amount: true },
  });

  return result._sum.amount ?? 0;
}

/** موجودی‌های چند کاربر در یک کوئری — برای فهرست‌هایی که هر کارت موجودی دارد. */
export async function walletBalances(
  userIds: number[],
): Promise<Map<number, number>> {
  if (userIds.length === 0) return new Map();

  const rows = await db.walletEntry.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds } },
    _sum: { amount: true },
  });

  return new Map(rows.map((row) => [row.userId, row._sum.amount ?? 0]));
}

/**
 * موجودی درون یک تراکنش، با قفل ردیف کاربر.
 *
 * `FOR UPDATE` روی سطرهای دفتر باعث می‌شود دو تراکنش هم‌زمانِ «شارژ و رزرو» به
 * ترتیب برسند و هیچ‌کدام موجودی را بر اساس خواندنِ کهنه حساب نکنند. اگر کاربر
 * هیچ سطری ندارد، سطر قفلی وجود ندارد — و آنجاست که `SERIALIZABLE` (که در
 * جای خودش خطای serialization می‌دهد و اجازه می‌دهد یک‌بار تکرار شود) کار را
 * تمام می‌کند.
 */
export async function balanceInTx(tx: Prisma.TransactionClient, userId: number) {
  // `pg_advisory_xact_lock` مقدار `void` برمی‌گرداند و Prisma نمی‌تواند آن را
  // deserialize کند؛ پس آن را داخل یک SELECT به int تبدیل می‌کنیم.
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(${userId}::bigint)`;

  const result = await tx.walletEntry.aggregate({
    where: { userId },
    _sum: { amount: true },
  });

  return result._sum.amount ?? 0;
}

/** کم‌کردن موجودی؛ اگر کافی نبود پیام مناسب برمی‌گرداند. */
export async function debit(
  tx: Prisma.TransactionClient,
  input: {
    userId: number;
    kind: WalletEntryKind;
    amount: number;
    note?: string;
    reservationId?: number;
    requestId?: number;
  },
) {
  const balance = await balanceInTx(tx, input.userId);
  if (balance < input.amount) {
    throw new WalletError("موجودی کیف پول کافی نیست.");
  }

  return tx.walletEntry.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      amount: -input.amount,
      note: input.note,
      reservationId: input.reservationId,
      requestId: input.requestId,
    },
  });
}

/** اضافه‌کردن به موجودی. */
export async function credit(
  tx: Prisma.TransactionClient,
  input: {
    userId: number;
    kind: WalletEntryKind;
    amount: number;
    note?: string;
    reservationId?: number;
    requestId?: number;
  },
) {
  return tx.walletEntry.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      amount: input.amount,
      note: input.note,
      reservationId: input.reservationId,
      requestId: input.requestId,
    },
  });
}

export class WalletError extends Error {}

export const WALLET_KINDS: Record<
  WalletEntryKind,
  { label: string; tone: "success" | "warn" | "danger" | "neutral" | "brand" | "info" }
> = {
  TOPUP: { label: "شارژ کیف پول", tone: "success" },
  HOLD: { label: "قفل برای رزرو", tone: "warn" },
  RELEASE: { label: "دریافت فروش", tone: "success" },
  REFUND: { label: "بازگشت رزرو", tone: "neutral" },
  WITHDRAWAL: { label: "درخواست برداشت", tone: "warn" },
  WITHDRAWAL_REVERSED: { label: "برگشت برداشت", tone: "neutral" },
  ADJUSTMENT: { label: "اصلاح دستی", tone: "info" },
};