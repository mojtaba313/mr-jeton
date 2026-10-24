"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, requireUser } from "@/lib/auth";
import { MIN_TOPUP } from "@/lib/config";
import {
  db,
  LedgerKind,
  WalletEntryKind,
  WalletRequestKind,
  WalletRequestStatus,
} from "@/lib/db";
import { notify, notifyAdmins } from "@/lib/notify";
import { balanceInTx, WalletError } from "@/lib/wallet";
import { fieldErrors, topUpSchema, withdrawSchema } from "@/lib/validation";

/**
 * کیف پول — تنها جایی که پول در آن جابه‌جا می‌شود.
 *
 * The buyer pays the platform's card once, from the outside; everything after
 * that is a ledger entry. The admin approves top-ups and marks withdrawals as
 * paid, and never appears in a trade.
 */

export type WalletActionState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
} | null;

/**
 * درخواست شارژ: کارت‌به‌کارت به کارت سایت + بارگذاری رسید.
 *
 * The money is *not* credited here — only after an admin looks at the receipt.
 * Crediting optimistically and clawing back later is how a wallet ends up
 * negative.
 */
export async function requestTopUpAction(
  _prev: WalletActionState,
  formData: FormData,
): Promise<WalletActionState> {
  const user = await requireUser();

  const parsed = topUpSchema.safeParse({
    amount: formData.get("amount"),
    receiptUrl: formData.get("receiptUrl"),
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "اطلاعات شارژ کامل نیست.",
      errors: fieldErrors(parsed.error),
    };
  }

  const pending = await db.walletRequest.count({
    where: { userId: user.id, status: WalletRequestStatus.SUBMITTED },
  });

  if (pending > 0) {
    return {
      ok: false,
      message: "یک درخواست در انتظار بررسی داری؛ تا آن تایید نشده درخواست تازه نفرست.",
      errors: { amount: "درخواست باز داری." },
    };
  }

  await db.walletRequest.create({
    data: {
      userId: user.id,
      kind: WalletRequestKind.TOPUP,
      amount: parsed.data.amount,
      receiptUrl: parsed.data.receiptUrl,
      note: parsed.data.note || null,
    },
  });

  await notifyAdmins({
    title: "درخواست شارژ کیف پول",
    body: `${user.name} درخواست شارژ ${parsed.data.amount.toLocaleString("fa-IR")} تومان داد.`,
    link: "/admin/requests",
  });

  revalidatePath("/wallet");
  revalidatePath("/admin/requests");

  return {
    ok: true,
    message: "درخواستت ثبت شد؛ بعد از واریز و تایید رسید، موجودی اضافه می‌شود.",
  };
}

/**
 * درخواست برداشت موجودی به کارت خود کاربر.
 *
 * Money leaves the wallet *immediately* (it is held), so the balance can never
 * be spent twice while the request waits. A rejected request puts it back.
 */
export async function requestWithdrawAction(
  _prev: WalletActionState,
  formData: FormData,
): Promise<WalletActionState> {
  const user = await requireUser();

  const parsed = withdrawSchema.safeParse({
    amount: formData.get("amount"),
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "اطلاعات برداشت کامل نیست.",
      errors: fieldErrors(parsed.error),
    };
  }

  try {
    await db.$transaction(async (tx) => {
      const balance = await balanceInTx(tx, user.id);
      if (balance < parsed.data.amount) {
        throw new WalletError("موجودی کیف پول کافی نیست.");
      }

      const row = await tx.walletRequest.create({
        data: {
          userId: user.id,
          kind: WalletRequestKind.WITHDRAWAL,
          amount: parsed.data.amount,
          note: parsed.data.note || null,
        },
        select: { id: true },
      });

      await tx.walletEntry.create({
        data: {
          userId: user.id,
          kind: WalletEntryKind.WITHDRAWAL,
          amount: -parsed.data.amount,
          requestId: row.id,
          note: "درخواست برداشت",
        },
      });

      return row;
    });

    await notifyAdmins({
      title: "درخواست برداشت",
      body: `${user.name} درخواست برداشت ${parsed.data.amount.toLocaleString("fa-IR")} تومان داد.`,
      link: "/admin/requests",
    });

    revalidatePath("/wallet");
    revalidatePath("/admin/requests");

    return {
      ok: true,
      message: "درخواست برداشت ثبت شد؛ مبلغ از موجودی کم شد تا پرداخت شود.",
    };
  } catch (error) {
    if (error instanceof WalletError) {
      return { ok: false, message: error.message, errors: { amount: error.message } };
    }
    throw error;
  }
}

/** کاربر خودش درخواست بازش را می‌پس گیرد (تا قبل از بررسی مدیر). */
export async function cancelRequestAction(requestId: number): Promise<WalletActionState> {
  const user = await requireUser();

  const request = await db.walletRequest.findUnique({
    where: { id: requestId },
    select: { id: true, userId: true, kind: true, amount: true, status: true },
  });

  if (!request || request.userId !== user.id) {
    return { ok: false, message: "این درخواست مال تو نیست." };
  }

  if (request.status !== WalletRequestStatus.SUBMITTED) {
    return { ok: false, message: "این درخواست بررسی شده است." };
  }

  await db.$transaction(async (tx) => {
    await tx.walletRequest.update({
      where: { id: request.id },
      data: { status: WalletRequestStatus.REJECTED, reviewNote: "لغو شده توسط کاربر" },
    });

    // فقط برداشت پولی از کیف پول کم کرده بود؛ برگشتش لازم است.
    if (request.kind === WalletRequestKind.WITHDRAWAL) {
      await tx.walletEntry.create({
        data: {
          userId: user.id,
          kind: WalletEntryKind.WITHDRAWAL_REVERSED,
          amount: request.amount,
          requestId: request.id,
          note: "لغو درخواست برداشت",
        },
      });
    }
  });

  revalidatePath("/wallet");
  revalidatePath("/admin/requests");

  return { ok: true, message: "درخواست لغو شد." };
}

/**
 * تایید یا رد یک درخواست مالی توسط مدیر.
 *
 * Approving a top-up is what credits the wallet; approving a withdrawal records
 * the money leaving the platform. Both write their ledger rows inside the same
 * transaction as the status change, so the admin panel can never show a number
 * that disagrees with the ledger.
 */
export async function reviewRequestAction(
  requestId: number,
  approve: boolean,
  note: string,
): Promise<WalletActionState> {
  const admin = await requireAdmin();

  const request = await db.walletRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      userId: true,
      kind: true,
      amount: true,
      status: true,
    },
  });

  if (!request) return { ok: false, message: "این درخواست پیدا نشد." };
  if (request.status !== WalletRequestStatus.SUBMITTED) {
    return { ok: false, message: "این درخواست قبلاً بررسی شده است." };
  }

  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.walletRequest.update({
      where: { id: request.id },
      data: {
        status: approve ? WalletRequestStatus.APPROVED : WalletRequestStatus.REJECTED,
        reviewedAt: now,
        reviewerId: admin.id,
        reviewNote: note || null,
      },
    });

    if (approve && request.kind === WalletRequestKind.TOPUP) {
      await tx.walletEntry.create({
        data: {
          userId: request.userId,
          kind: WalletEntryKind.TOPUP,
          amount: request.amount,
          requestId: request.id,
          note: "شارژ کیف پول",
        },
      });
    }

    if (!approve && request.kind === WalletRequestKind.WITHDRAWAL) {
      // برداشت از موجودی کم شده بود؛ رد کردن یعنی پس دادنش.
      await tx.walletEntry.create({
        data: {
          userId: request.userId,
          kind: WalletEntryKind.WITHDRAWAL_REVERSED,
          amount: request.amount,
          requestId: request.id,
          note: "رد درخواست برداشت",
        },
      });
    }

    if (approve && request.kind === WalletRequestKind.WITHDRAWAL) {
      await tx.ledgerEntry.create({
        data: {
          kind: LedgerKind.WITHDRAWAL_PAID,
          amount: -request.amount,
          requestId: request.id,
          actorId: admin.id,
          note: "پرداخت برداشت به کاربر",
        },
      });
    }
  });

  await notify(request.userId, {
    title: approve ? "درخواستت تایید شد" : "درخواستت تایید نشد",
    body:
      request.kind === WalletRequestKind.TOPUP
        ? approve
          ? `${request.amount.toLocaleString("fa-IR")} تومان به کیف پولت اضافه شد.`
          : `شارژ کیف پول تایید نشد. ${note || ""}`
        : approve
          ? `برداشت انجام شد. مبلغ به کارتی که اعلام کردی واریز می‌شود.`
          : `درخواست برداشت رد شد و مبلغ به کیف پولت برگشت. ${note || ""}`,
    link: "/wallet",
  });

  revalidatePath("/admin/requests");
  revalidatePath("/admin");
  revalidatePath("/wallet");

  return { ok: true, message: approve ? "تایید شد." : "رد شد." };
}

/** حداقل شارژ — برای نمایش در فرم. */
export async function topUpMinimum() {
  return MIN_TOPUP;
}