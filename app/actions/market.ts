"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { FEE_PERCENT, LISTING_TTL_HOURS } from "@/lib/config";
import { db, ListingStatus, MealDayStatus, ReservationStatus, WalletEntryKind } from "@/lib/db";
import { tehranMidnight } from "@/lib/dates";
import { HELD_RESERVATION_STATUSES } from "@/lib/labels";
import { splitAmount } from "@/lib/money";
import { notify, notifyAdmins } from "@/lib/notify";
import { debit, WalletError } from "@/lib/wallet";
import { disputeSchema, fieldErrors, listingSchema, reserveSchema } from "@/lib/validation";

export type MarketState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
  /** کد رزرو، تا کلاینت بتواند به صفحه‌ی آن برود. */
  code?: string;
} | null;

/**
 * آگهی و رزرو.
 *
 * مدیر در این مسیر نیست: فروشنده خودش نقطه و ساعت تحویل را تعیین می‌کند، خریدار
 * خودش رزرو می‌کند و پول از کیف پول خریدار قفل و به فروشنده آزاد می‌شود.
 */

/** روزهایی که هنوز می‌شود در آن‌ها معامله کرد. */
const TRADEABLE: MealDayStatus[] = [MealDayStatus.OPEN, MealDayStatus.LOCKED];

export async function createListingAction(
  _prev: MarketState,
  formData: FormData,
): Promise<MarketState> {
  const user = await requireUser();

  const parsed = listingSchema.safeParse({
    mealDayId: formData.get("mealDayId"),
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
    note: formData.get("note") ?? "",
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    locationText: formData.get("locationText"),
    placeLabel: formData.get("placeLabel") ?? "",
    deliveryDate: formData.get("deliveryDate"),
    deliveryFrom: formData.get("deliveryFrom"),
    deliveryTo: formData.get("deliveryTo"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "فرم آگهی را کامل کنید.",
      errors: fieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const day = await db.mealDay.findUnique({ where: { id: data.mealDayId } });
  // روز غذا در نیمه‌شب تهران ذخیره می‌شود (۲۰:۳۰ UTC روز قبل)، پس «گذشته»
  // باید با همان مرز سنجیده شود — وگرنه ناهار امروز از ظهر به بعد غیرقابل‌فروش
  // می‌شد.
  if (!day || !TRADEABLE.includes(day.status) || day.date < tehranMidnight()) {
    return { ok: false, message: "برای این روز غذا نمی‌شود آگهی گذاشت." };
  }

  // یک آگهی فعال برای هر روز غذا: بدون این سقف، یک نفر می‌تواند صبح ده آگهی
  // بگذارد و صفحه را پر کند.
  const openListings = await db.listing.count({
    where: { sellerId: user.id, mealDayId: data.mealDayId, status: ListingStatus.OPEN },
  });

  if (openListings > 0) {
    return {
      ok: false,
      message: "برای این روز غذا قبلاً آگهی فعال داری.",
      errors: { mealDayId: "یک آگهی فعال داری؛ اول آن را ببند." },
    };
  }

  await db.listing.create({
    data: {
      sellerId: user.id,
      mealDayId: data.mealDayId,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      note: data.note || null,
      lat: data.lat,
      lng: data.lng,
      locationText: data.locationText,
      placeLabel: data.placeLabel || null,
      deliveryDate: data.deliveryDate,
      deliveryFrom: data.deliveryFrom,
      deliveryTo: data.deliveryTo,
      expiresAt: new Date(Date.now() + LISTING_TTL_HOURS * 3600e3),
    },
  });

  revalidatePath("/market");
  revalidatePath("/sell");
  revalidatePath("/dashboard/listings");

  return { ok: true, message: "آگهی‌ات ثبت شد و در بازار دیده می‌شود." };
}

export async function closeListingAction(listingId: number): Promise<MarketState> {
  const user = await requireUser();

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { sellerId: true, status: true },
  });

  if (!listing || listing.sellerId !== user.id) {
    return { ok: false, message: "این آگهی مال تو نیست." };
  }

  const reserved = await db.reservation.count({
    where: { listingId, status: { not: ReservationStatus.CANCELLED } },
  });

  if (reserved > 0) {
    return { ok: false, message: "این آگهی رزرو دارد؛ اول با خریدار هماهنگ کن." };
  }

  await db.listing.update({
    where: { id: listingId },
    data: { status: ListingStatus.CANCELLED },
  });

  revalidatePath("/market");
  revalidatePath("/dashboard/listings");

  return { ok: true, message: "آگهی بسته شد." };
}

/**
 * رزرو ژتون — و قفل کردن پول خریدار.
 *
 * The whole read-check-write runs in one SERIALIZABLE transaction with an
 * advisory lock on the buyer's wallet. Two things make this the only place that
 * needs both: the buyer's balance can be spent by another tab at the same
 * moment, and two buyers can grab the last token at the same moment. The second
 * case is not an edge case on a campus — it is a Tuesday.
 */
export async function reserveAction(
  listingId: number,
  quantity: number,
): Promise<MarketState> {
  const user = await requireUser();

  const parsed = reserveSchema.safeParse({ listingId, quantity });
  if (!parsed.success) return { ok: false, message: "تعداد رزرو درست نیست." };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await db.$transaction(
        async (tx) => {
          const listing = await tx.listing.findUnique({
            where: { id: parsed.data.listingId },
            include: { mealDay: true },
          });

          if (!listing) throw new MarketError("NOT_FOUND");
          if (listing.status !== ListingStatus.OPEN) throw new MarketError("CLOSED");
          if (!TRADEABLE.includes(listing.mealDay.status)) throw new MarketError("DAY_CLOSED");
          if (listing.sellerId === user.id) throw new MarketError("OWN");

          const taken = await tx.reservation.aggregate({
            where: {
              listingId: listing.id,
              status: { in: HELD_RESERVATION_STATUSES },
            },
            _sum: { quantity: true },
          });

          const remaining = listing.quantity - (taken._sum.quantity ?? 0);
          if (parsed.data.quantity > remaining) throw new MarketError("TAKEN");

          const gross = parsed.data.quantity * listing.unitPrice;
          const { fee, seller } = splitAmount(gross, FEE_PERCENT);
          const code = humanCode();

          const reservation = await tx.reservation.create({
            data: {
              code,
              listingId: listing.id,
              buyerId: user.id,
              sellerId: listing.sellerId,
              mealDayId: listing.mealDayId,
              quantity: parsed.data.quantity,
              unitPrice: listing.unitPrice,
              grossAmount: gross,
              feeAmount: fee,
              sellerAmount: seller,
              deliveryDate: listing.deliveryDate,
              meetPoint: listing.placeLabel,
              meetText: listing.locationText,
              lat: listing.lat,
              lng: listing.lng,
              deliveryFrom: listing.deliveryFrom,
              deliveryTo: listing.deliveryTo,
              status: ReservationStatus.RESERVED,
            },
            select: { id: true, code: true, sellerId: true, quantity: true },
          });

          // پول خریدار همین‌جا قفل می‌شود: اگر موجودی کم باشد، تراکنش برمی‌گردد.
          await debit(tx, {
            userId: user.id,
            kind: WalletEntryKind.HOLD,
            amount: gross,
            reservationId: reservation.id,
            note: `رزرو ${parsed.data.quantity} ژتون — کد ${code}`,
          });

          if (remaining - parsed.data.quantity <= 0) {
            await tx.listing.update({
              where: { id: listing.id },
              data: { status: ListingStatus.RESERVED },
            });
          }

          return reservation;
        },
        { isolationLevel: "Serializable" },
      );

      await notify(result.sellerId, {
        title: "ژتونت رزرو شد",
        body: `${user.name} ${result.quantity} ژتون از آگهی‌ات را رزرو کرد. شماره‌اش در همین صفحه است؛ سر وقت سر نقطه‌ی تحویل حرف بزنید.`,
        link: `/dashboard/reservations/${result.code}`,
      });

      revalidatePath("/market");
      revalidatePath("/dashboard/reservations");
      revalidatePath("/wallet");

      return {
        ok: true,
        code: result.code,
        message: "رزرو شد. اطلاعات فروشنده برای هماهنگی آزاد است.",
      };
    } catch (error) {
      // serialization failure = two actions raced; retry once with fresh data.
      if (isRetryable(error) && attempt === 0) continue;

      if (error instanceof WalletError) {
        return { ok: false, message: error.message, code: "INSUFFICIENT" };
      }

      const reason = error instanceof MarketError ? error.message : "";
      const messages: Record<string, string> = {
        NOT_FOUND: "این آگهی پیدا نشد.",
        CLOSED: "این آگهی بسته شده است.",
        DAY_CLOSED: "برای این روز غذا معامله ممکن نیست.",
        OWN: "نمی‌شود آگهی خودت را بخری.",
        TAKEN: "همین الان ژتون‌های دیگری از این آگهی رزرو شد.",
      };

      return { ok: false, message: messages[reason] ?? "رزرو انجام نشد." };
    }
  }

  return { ok: false, message: "رزرو انجام نشد؛ دوباره تلاش کن." };
}

/* ------------------------------------------------------------------ *
 *  تحویل و پایان کار
 * ------------------------------------------------------------------ */

/** فروشنده اعلام می‌کند ژتون را تحویل داده است. */
export async function markHandoverAction(
  reservationCode: string,
): Promise<MarketState> {
  const user = await requireUser();

  const reservation = await db.reservation.findUnique({
    where: { code: reservationCode },
    select: { id: true, code: true, sellerId: true, buyerId: true, status: true },
  });

  if (!reservation) return { ok: false, message: "رزرو پیدا نشد." };
  if (reservation.sellerId !== user.id && user.role !== "ADMIN") {
    return { ok: false, message: "فقط فروشنده این کار را می‌کند." };
  }
  if (reservation.status !== ReservationStatus.RESERVED) {
    return { ok: false, message: "این رزرو در وضعیت تحویل نیست." };
  }

  await db.reservation.update({
    where: { id: reservation.id },
    data: { status: ReservationStatus.AWAITING_BUYER, sellerHandedAt: new Date() },
  });

  await notify(reservation.buyerId, {
    title: "ژتون آماده‌ی تحویل است",
    body: `فروشنده اعلام کرد ژتون رزرو ${reservation.code} را تحویل داده. اگر گرفته‌ای تایید کن تا پولش آزاد شود.`,
    link: `/dashboard/reservations/${reservation.code}`,
  });

  revalidatePath(`/dashboard/reservations/${reservationCode}`);
  revalidatePath("/dashboard/reservations");

  return { ok: true, message: "ثبت شد؛ منتظر تایید خریدار می‌مانیم." };
}

/**
 * خریدار تحویل را تایید می‌کند و پول آزاد می‌شود.
 *
 * Release happens here and only here: the seller cannot mark themselves paid,
 * which is the whole reason the buyer has the last word.
 */
export async function confirmHandoverAction(
  reservationCode: string,
): Promise<MarketState> {
  const user = await requireUser();

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
    },
  });

  if (!reservation || reservation.buyerId !== user.id) {
    return { ok: false, message: "این رزرو مال تو نیست." };
  }

  if (reservation.status !== ReservationStatus.AWAITING_BUYER) {
    return { ok: false, message: "فروشنده هنوز اعلام نکرده ژتون را داده." };
  }

  await db.$transaction(async (tx) => {
    await tx.reservation.update({
      where: { id: reservation.id },
      data: {
        status: ReservationStatus.COMPLETED,
        buyerConfirmedAt: new Date(),
        completedAt: new Date(),
      },
    });

    // سهم فروشنده از پول قفل‌شده‌ی خریدار جدا می‌شود و به کیف پول او می‌رود؛
    // سهم سایت همان‌جا می‌ماند و وارد دفتر هیچ کاربری نمی‌شود.
    await tx.walletEntry.create({
      data: {
        userId: reservation.sellerId,
        kind: WalletEntryKind.RELEASE,
        amount: reservation.sellerAmount,
        reservationId: reservation.id,
        note: `فروش رزرو ${reservation.code}`,
      },
    });

    await tx.ledgerEntry.create({
      data: {
        kind: "FEE",
        amount: reservation.feeAmount,
        reservationId: reservation.id,
        note: `سهم سایت از رزرو ${reservation.code}`,
      },
    });
  });

  await notify(reservation.sellerId, {
    title: "پولت آزاد شد",
    body: `خریدار رزرو ${reservation.code} را تایید کرد؛ مبلغ به کیف پولت اضافه شد.`,
    link: "/wallet",
  });

  revalidatePath(`/dashboard/reservations/${reservationCode}`);
  revalidatePath("/dashboard/reservations");
  revalidatePath("/wallet");

  return { ok: true, message: "تایید شد؛ پول فروشنده آزاد شد." };
}

/** رزروی که خریدار از آن پشیمان است، تا وقتی تحویل نشده. */
export async function cancelReservationAction(
  reservationCode: string,
): Promise<MarketState> {
  const user = await requireUser();

  const reservation = await db.reservation.findUnique({
    where: { code: reservationCode },
    select: {
      id: true,
      code: true,
      buyerId: true,
      sellerId: true,
      listingId: true,
      status: true,
      grossAmount: true,
      quantity: true,
    },
  });

  if (!reservation || reservation.buyerId !== user.id) {
    return { ok: false, message: "این رزرو مال تو نیست." };
  }

  if (reservation.status !== ReservationStatus.RESERVED) {
    return { ok: false, message: "بعد از تحویل دیگر نمی‌شود رزرو را لغو کرد." };
  }

  await db.$transaction(async (tx) => {
    await tx.reservation.update({
      where: { id: reservation.id },
      data: { status: ReservationStatus.CANCELLED, cancelledAt: new Date() },
    });

    await tx.walletEntry.create({
      data: {
        userId: reservation.buyerId,
        kind: WalletEntryKind.REFUND,
        amount: reservation.grossAmount,
        reservationId: reservation.id,
        note: `بازگشت رزرو ${reservation.code}`,
      },
    });

    // اگر این تنها رزرو بود، آگهی دوباره باز می‌شود.
    const active = await tx.reservation.count({
      where: {
        listingId: reservation.listingId,
        status: { in: HELD_RESERVATION_STATUSES },
      },
    });

    if (active === 0) {
      await tx.listing.update({
        where: { id: reservation.listingId },
        data: { status: ListingStatus.OPEN },
      });
    }
  });

  await notify(reservation.sellerId, {
    title: "یک رزرو لغو شد",
    body: `خریدار رزرو ${reservation.code} را لغو کرد؛ ژتون‌ها به آگهی برگشت.`,
    link: "/dashboard/reservations",
  });

  revalidatePath(`/dashboard/reservations/${reservationCode}`);
  revalidatePath("/dashboard/reservations");
  revalidatePath("/market");
  revalidatePath("/wallet");

  return { ok: true, message: "رزرو لغو شد و پول به کیف پولت برگشت." };
}

/**
 * اعتراض یکی از طرفین به یک رزروِ باز.
 *
 * رزرو «قفل» می‌شود: نه پولی آزاد می‌شود، نه ژتونی به آگهی برمی‌گردد، تا مدیر
 * داوری کند. این تنها راهی است که خریدارِ «ژتون را نگرفتم» و فروشنده‌ی «خریدار
 * تایید نمی‌کند» هر دو یک راه دارند: اعتراض با دلیل، نه پول دادن از دست دادن.
 */
export async function disputeReservationAction(
  reservationCode: string,
  reason: string,
): Promise<MarketState> {
  const user = await requireUser();

  const parsed = disputeSchema.safeParse({ reason });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "دلیل اعتراض نامعتبر است." };
  }

  const reservation = await db.reservation.findUnique({
    where: { code: reservationCode },
    select: { id: true, code: true, buyerId: true, sellerId: true, status: true },
  });

  if (!reservation) return { ok: false, message: "این رزرو پیدا نشد." };

  const isBuyer = reservation.buyerId === user.id;
  const isSeller = reservation.sellerId === user.id;
  if (!isBuyer && !isSeller) {
    return { ok: false, message: "این رزرو مال تو نیست." };
  }

  if (
    reservation.status !== ReservationStatus.RESERVED &&
    reservation.status !== ReservationStatus.AWAITING_BUYER
  ) {
    return { ok: false, message: "فقط رزروی که هنوز باز است قابل اعتراض است." };
  }

  await db.reservation.update({
    where: { id: reservation.id },
    data: {
      status: ReservationStatus.DISPUTED,
      disputeReason: parsed.data.reason,
      disputedAt: new Date(),
    },
  });

  const other = isBuyer ? reservation.sellerId : reservation.buyerId;
  const who = isBuyer ? "خریدار" : "فروشنده";

  await notify(other, {
    title: "رزرو اعتراض شد",
    body: `${who} رزرو ${reservation.code} را اعتراض کرد؛ مدیر تعیین تکلیف می‌کند.`,
    link: `/dashboard/reservations/${reservation.code}`,
  });

  // اعتراض بی‌صدا می‌ماند مگر مدیر خبردار شود؛ پول یک نفر تا داوری بلوکه است.
  await notifyAdmins({
    title: `اعتراض روی رزرو ${reservation.code}`,
    body: parsed.data.reason,
    link: "/admin/reservations",
  });

  revalidatePath(`/dashboard/reservations/${reservationCode}`);
  revalidatePath("/dashboard/reservations");
  revalidatePath("/market");
  revalidatePath("/admin");

  return {
    ok: true,
    message: "اعتراض ثبت شد؛ مدیر پیگیری می‌کند و پول تا آن وقت نزد سایت می‌ماند.",
  };
}

/* ------------------------------------------------------------------ *
 *  کمکی‌ها
 * ------------------------------------------------------------------ */

class MarketError extends Error {}

function isRetryable(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: string }).code === "P2034"
  );
}

function humanCode(length = 6): string {
  // بدون I/O/U/0 تا کد را نشود با اشتباه تایپ کرد.
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTVWXYZ";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]!).join("");
}