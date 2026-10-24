"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { tehranMidnight } from "@/lib/dates";
import { db, LedgerKind, MealDayStatus, Role } from "@/lib/db";
import { notify } from "@/lib/notify";
import { fieldErrors, ledgerSchema, mealDaySchema } from "@/lib/validation";

/**
 * پنل مدیر — عمداً کوچک.
 *
 * مدیر در این بازار معامله نمی‌کند؛ فقط حسابدار است: روزهای غذا را اعلام
 * می‌کند، شارژ و برداشت را بررسی می‌کند و اگر اختلافی جدی شد دخالت می‌کند.
 */

export type AdminState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
} | null;

const fail = (message: string): AdminState => ({ ok: false, message });

const DAY_STATUSES = Object.values(MealDayStatus);

/** ساخت یا ویرایش روز غذا. */
export async function saveMealDayAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const parsed = mealDaySchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    mealType: formData.get("mealType"),
    date: formData.get("date"),
    menu: formData.get("menu"),
    officialPrice: formData.get("officialPrice"),
    capacity: formData.get("capacity") || 0,
    notes: formData.get("notes") ?? "",
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "فرم روز غذا را کامل کنید.",
      errors: fieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  // <input type="date"> مقدار «YYYY-MM-DD» می‌دهد که z.coerce.date آن را نیمه‌شب
  // UTC می‌خواند؛ ذخیره‌ی آن یعنی ناهارِ بیست‌ویکم، بیستم نشان داده می‌شود.
  const dayDate = tehranMidnight(data.date);

  if (data.id) {
    await db.mealDay.update({ where: { id: data.id }, data: { ...dayFields(data), date: dayDate } });
  } else {
    await db.mealDay.create({ data: { ...dayFields(data), date: dayDate } });
  }

  revalidatePath("/admin/days");
  revalidatePath("/market");
  revalidatePath("/");

  return { ok: true, message: data.id ? "روز غذا به‌روزرسانی شد." : "روز غذا ثبت شد." };
}

function dayFields(data: {
  title: string;
  mealType: string;
  menu: string;
  officialPrice: number;
  capacity?: number;
  notes?: string;
  status: MealDayStatus;
}) {
  return {
    title: data.title,
    mealType: data.mealType,
    menu: data.menu,
    officialPrice: data.officialPrice,
    capacity: data.capacity ?? 0,
    notes: data.notes || null,
    status: data.status,
  };
}

export async function setDayStatusAction(
  dayId: number,
  status: MealDayStatus,
): Promise<AdminState> {
  await requireAdmin();

  if (!DAY_STATUSES.includes(status)) return fail("وضعیت نامعتبر است.");

  await db.mealDay.update({ where: { id: dayId }, data: { status } });

  revalidatePath("/admin/days");
  revalidatePath("/market");
  revalidatePath("/");

  return { ok: true, message: "وضعیت روز غذا تغییر کرد." };
}

export async function setUserRoleAction(
  userId: number,
  role: Role,
): Promise<AdminState> {
  const admin = await requireAdmin();

  if (userId === admin.id) return fail("نمی‌توانید نقش خودتان را عوض کنید.");
  if (role !== Role.ADMIN && role !== Role.USER) return fail("نقش نامعتبر است.");

  await db.user.update({ where: { id: userId }, data: { role } });

  revalidatePath("/admin/users");

  return { ok: true, message: "نقش کاربر تغییر کرد." };
}

export async function toggleUserBlockAction(
  userId: number,
  blocked: boolean,
): Promise<AdminState> {
  const admin = await requireAdmin();

  if (userId === admin.id) return fail("نمی‌توانید خودتان را مسدود کنید.");

  await db.user.update({ where: { id: userId }, data: { isBlocked: blocked } });

  revalidatePath("/admin/users");

  return { ok: true, message: blocked ? "کاربر مسدود شد." : "مسدودی برداشته شد." };
}

/** سطر دستی در دفتر مالی — برای اصلاحات و هزینه‌های پنهان. */
export async function addLedgerAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const admin = await requireAdmin();

  const parsed = ledgerSchema.safeParse({
    kind: formData.get("kind"),
    amount: formData.get("amount"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { ok: false, message: "اطلاعات سند کامل نیست.", errors: fieldErrors(parsed.error) };
  }

  const { kind, amount, note } = parsed.data;

  await db.ledgerEntry.create({
    data: {
      kind,
      amount: kind === LedgerKind.REFUND ? -amount : amount,
      note,
      actorId: admin.id,
    },
  });

  revalidatePath("/admin/ledger");
  revalidatePath("/admin");

  return { ok: true, message: "سند ثبت شد." };
}

/**
 * دخالت در اختلاف: رزرو را به نفع یک طرف می‌بندد.
 *
 * The only place an admin touches a trade. It exists because "both parties say
 * the other didn't show up" has no other resolution, and a market with no
 * escape hatch for that is a market where nobody trusts the escrow.
 */
export async function resolveDisputeAction(
  reservationCode: string,
  outcome: "buyer" | "seller",
  note: string,
): Promise<AdminState> {
  const admin = await requireAdmin();

  const reservation = await db.reservation.findUnique({
    where: { code: reservationCode },
    select: {
      id: true,
      code: true,
      buyerId: true,
      sellerId: true,
      status: true,
      sellerAmount: true,
      feeAmount: true,
      grossAmount: true,
    },
  });

  if (!reservation) return fail("این رزرو پیدا نشد.");

  if (reservation.status !== "DISPUTED") {
    return fail("فقط رزروی که اعتراض شده قابل حل است.");
  }

  await db.$transaction(async (tx) => {
    if (outcome === "seller") {
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      await tx.walletEntry.create({
        data: {
          userId: reservation.sellerId,
          kind: "RELEASE",
          amount: reservation.sellerAmount,
          reservationId: reservation.id,
          note: `حل اختلاف به نفع فروشنده — ${reservation.code}`,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          kind: LedgerKind.FEE,
          amount: reservation.feeAmount,
          reservationId: reservation.id,
          actorId: admin.id,
          note: `سهم سایت از رزرو ${reservation.code}`,
        },
      });
    } else {
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });

      await tx.walletEntry.create({
        data: {
          userId: reservation.buyerId,
          kind: "REFUND",
          amount: reservation.grossAmount,
          reservationId: reservation.id,
          note: `حل اختلاف به نفع خریدار — ${reservation.code}`,
        },
      });
    }
  });

  await notify(reservation.buyerId, {
    title: "اختلاف رزرو حل شد",
    body: `${reservation.code}: ${note || (outcome === "seller" ? "پول به فروشنده داده شد." : "پول به کیف پولت برگشت.")}`,
    link: `/dashboard/reservations/${reservation.code}`,
  });

  await notify(reservation.sellerId, {
    title: "اختلاف رزرو حل شد",
    body: `${reservation.code}: ${note || (outcome === "seller" ? "پول به کیف پولت اضافه شد." : "پول به خریدار برگشت.")}`,
    link: `/dashboard/reservations/${reservation.code}`,
  });

  revalidatePath("/admin/reservations");
  revalidatePath("/dashboard/reservations");
  revalidatePath("/wallet");

  return { ok: true, message: "اختلاف حل شد." };
}

/** یادآوری روز تحویل به خریدار و فروشنده‌ی هر رزروی باز. */
export async function remindHandoverAction(dayId: number): Promise<AdminState> {
  await requireAdmin();

  const reservations = await db.reservation.findMany({
    where: { mealDayId: dayId, status: { in: ["RESERVED", "AWAITING_BUYER"] } },
    select: { id: true, code: true, buyerId: true, sellerId: true },
  });

  if (reservations.length === 0) {
    return fail("رزروی در انتظار تحویل برای این روز نیست.");
  }

  await Promise.all(
    reservations.flatMap((reservation) => [
      notify(reservation.buyerId, {
        title: "امروز روز تحویل است",
        body: `نقطه و ساعت تحویل رزرو ${reservation.code} را ببین و سر وقت حاضر باش.`,
        link: `/dashboard/reservations/${reservation.code}`,
      }),
      notify(reservation.sellerId, {
        title: "امروز روز تحویل است",
        body: `برای رزرو ${reservation.code} ژتون را آماده کن و بعد از تحویل، اعلام کن.`,
        link: `/dashboard/reservations/${reservation.code}`,
      }),
    ]),
  );

  return {
    ok: true,
    message: `به ${reservations.length * 2} نفر یادآوری داده شد.`,
  };
}