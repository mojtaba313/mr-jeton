import "server-only";

import { io } from "next/cache";

import { type Prisma } from "@/app/generated/prisma/client";

import { db, MealDayStatus } from "@/lib/db";
import { formatJalaliShort, formatTimeRange, tehranMidnight } from "@/lib/dates";
import {
  DAY_STATUS,
  HELD_RESERVATION_STATUSES,
  LISTING_STATUS,
  REQUEST_KIND,
  type Tone,
  WALLET_KIND,
  REQUEST_STATUS,
} from "@/lib/labels";
import { walletBalances } from "@/lib/wallet";

/**
 * کوئری‌های خواندنی.
 *
 * Every function here touches the database, so under Cache Components it can
 * only be called from inside a `<Suspense>` boundary. That is not a limitation
 * to work around — it is the contract: these pages are user-specific and change
 * by the second, and pretending otherwise with a cache would be a lie the
 * marketplace tells twice a day.
 *
 * Each one starts with `await io()`. Almost all of them ask the database a
 * question about *now* — "which meal days are still upcoming", "has this listing
 * expired" — and `new Date()` during prerendering is an unstable value that
 * Next.js refuses to bake into a static shell. `io()` is the marker that says:
 * run this at request time.
 */

/** نشانه‌ی «این داده زنده است». هر کوئری که به زمان وابسته است با این شروع می‌شود. */
async function live() {
  await io();
}

/**
 * آگهی‌هایی که در بازار دیده می‌شوند — **یک منبع حقیقت** برای هم شبکه‌ی کارت‌ها
 * و هم شمارنده‌ی چیپ‌های روز.
 *
 * نکته‌ی اصلی این فیلتر: `deliveryDate` یک *روز* است، نه یک لحظه. فرم همان روز
 * را به‌شکل نیمه‌شبِ UTC ذخیره می‌کند (`new Date("۲۰۲۶-۱۰-۲۵")`) و بذر به‌شکل
 * نیمه‌شبِ تهران. اگر با `new Date()` سنجیده شود، هر آگهیِ «همان‌روز» از صبحِ همان
 * روز — یعنی پرتقاضاترین ژتون‌ها — از بازار حذف می‌شود، چون نیمه‌شبِ آن روز
 * قبلاً گذشته است. مرز درست همان چیزی است که بقیه‌ی سیستم هم استفاده می‌کند:
 * نیمه‌شبِ تهران، یعنی «روزِ تحویل هنوز کاملاً نیامده».
 */
function marketableListings(now: Date) {
  return {
    status: { in: ["OPEN", "RESERVED"] },
    expiresAt: { gt: now },
    deliveryDate: { gte: tehranMidnight(now) },
    seller: { isBlocked: false },
  } satisfies Prisma.ListingWhereInput;
}

/* ------------------------------------------------------------------ *
 *  روزهای غذا
 * ------------------------------------------------------------------ */

export type DayView = {
  id: number;
  title: string;
  mealType: string;
  menu: string;
  date: Date;
  officialPrice: number;
  capacity: number;
  status: string;
  statusLabel: string;
  notes: string | null;
  openListings: number;
  availableTokens: number;
};

function toDayView(
  day: {
    id: number;
    title: string;
    mealType: string;
    menu: string;
    date: Date;
    officialPrice: number;
    capacity: number;
    status: MealDayStatus;
    notes: string | null;
    listings?: { quantity: number }[];
    _count?: { listings: number };
  },
  extra: { openListings?: number; availableTokens?: number } = {},
): DayView {
  return {
    id: day.id,
    title: day.title,
    mealType: day.mealType,
    menu: day.menu,
    date: day.date,
    officialPrice: day.officialPrice,
    capacity: day.capacity,
    status: day.status,
    statusLabel: DAY_STATUS[day.status].label,
    notes: day.notes,
    openListings: extra.openListings ?? day._count?.listings ?? 0,
    availableTokens:
      extra.availableTokens ??
      (day.listings ?? []).reduce((sum, listing) => sum + listing.quantity, 0),
  };
}

export async function getUpcomingDays(
  limit = 6,
  /** اگر خالی باشد، همه‌ی وضعیت‌ها جز «لغو شده» برمی‌گردند. */
  statuses: MealDayStatus[] = [],
): Promise<DayView[]> {
  await live();

  const now = new Date();

  const days = await db.mealDay.findMany({
    where: {
      // مرز «گذشته» نیمه‌شب تهران است، نه لحظه‌ی اکنون: روز غذا هم دقیقاً
      // همان نیمه‌شب ذخیره شده، یعنی در UTC ساعت ۲۰:۳۰ روز قبل. مقایسه با
      // `new Date()` روزِ امروز را از اول صبح از بازار و فرم فروش حذف می‌کرد.
      date: { gte: tehranMidnight() },
      status: statuses.length > 0 ? { in: statuses } : { not: "CANCELLED" },
    },
    orderBy: { date: "asc" },
    take: limit,
    include: {
      listings: {
        // همان فیلترِ شبکه‌ی بازار، تا عددِ روی چیپ همان چیزی باشد که شبکه نشان
        // می‌دهد — وگرنه چیپ «۱ ژتون» می‌گفت ولی شبکه خالی بود.
        where: marketableListings(now),
        select: { quantity: true },
      },
      _count: { select: { listings: true } },
    },
  });

  return days.map((day) => toDayView(day));
}

export async function getAllDays(take = 40) {
  await live();

  const days = await db.mealDay.findMany({
    orderBy: { date: "desc" },
    take,
    include: {
      _count: { select: { listings: true, reservations: true } },
      listings: {
        where: { status: { in: ["OPEN", "RESERVED"] } },
        select: { quantity: true },
      },
    },
  });

  return days.map((day) => ({
    ...toDayView(day),
    listingsCount: day._count.listings,
    reservationsCount: day._count.reservations,
  }));
}

/* ------------------------------------------------------------------ *
 *  بازار
 * ------------------------------------------------------------------ */

export type ListingView = {
  id: number;
  quantity: number;
  remaining: number;
  unitPrice: number;
  officialPrice: number;
  note: string | null;
  status: string;
  statusLabel: string;
  statusTone: Tone;
  sellerId: number;
  dayId: number;
  dayTitle: string;
  dayDateLabel: string;
  /** نقطه‌ی تحویل — همان چیزی که خریدار می‌بیند. */
  lat: number;
  lng: number;
  locationText: string;
  placeLabel: string | null;
  deliveryDateLabel: string;
  deliveryWindow: string | null;
  expiresLabel: string;
  createdAtISO: string;
  createdAtLabel: string;
  /** اسم فروشنده فقط وقتی خریدار رزرو کرده باشد پر می‌شود. */
  sellerName: string | null;
};

/**
 * `include` مشترک کوئری لیست — هم کوئری بازار از آن استفاده می‌کند و هم نوعِ
 * `ListingRow` از رویش ساخته می‌شود، پس «ژتون رزروشده» در هر دو یکی می‌ماند.
 *
 * این شکل عمداً بیرون از `Prisma.ListingGetPayload<{...}>` نوشته شده: آنجا بافت
 * *تایپ* است و ارجاع به یک مقدار (مثل `HELD_RESERVATION_STATUSES`) آنجا مجاز
 * نیست.
 */
const listingInclude = {
  mealDay: { select: { id: true, title: true, date: true, officialPrice: true } },
  reservations: {
    where: { status: { in: HELD_RESERVATION_STATUSES } },
    select: { quantity: true },
  },
} satisfies Prisma.ListingInclude;

type ListingRow = Prisma.ListingGetPayload<{ include: typeof listingInclude }>;

function toListingView(row: ListingRow): ListingView {
  const status = LISTING_STATUS[row.status];
  const taken = row.reservations.reduce((sum, item) => sum + item.quantity, 0);

  return {
    id: row.id,
    quantity: row.quantity,
    remaining: row.quantity - taken,
    unitPrice: row.unitPrice,
    officialPrice: row.mealDay.officialPrice,
    note: row.note,
    status: row.status,
    statusLabel: status.label,
    statusTone: status.tone,
    sellerId: row.sellerId,
    dayId: row.mealDay.id,
    dayTitle: row.mealDay.title,
    dayDateLabel: formatJalaliShort(row.mealDay.date),
    lat: row.lat,
    lng: row.lng,
    locationText: row.locationText,
    placeLabel: row.placeLabel,
    deliveryDateLabel: formatJalaliShort(row.deliveryDate),
    deliveryWindow: formatTimeRange(`${row.deliveryFrom} تا ${row.deliveryTo}`),
    expiresLabel: formatJalaliShort(row.expiresAt),
    createdAtISO: row.createdAt.toISOString(),
    createdAtLabel: formatJalaliShort(row.createdAt),
    sellerName: null,
  };
}

export type MarketFilters = {
  dayId?: number;
  sort?: "cheapest" | "expensive" | "newest";
  maxPrice?: number;
};

/**
 * بازار: ژتون‌های رزرونشده‌ی روزهای پیش‌رو.
 *
 * Note what is *not* selected: the seller's name and phone. The view model has
 * no field for them, so there is no code path — and no future refactor — that can
 * leak a seller's identity into a public query.
 */
export async function getMarketListings(
  filters: MarketFilters = {},
): Promise<ListingView[]> {
  await live();

  const orderBy: Prisma.ListingOrderByWithRelationInput[] =
    filters.sort === "cheapest"
      ? [{ unitPrice: "asc" }, { createdAt: "desc" }]
      : filters.sort === "expensive"
        ? [{ unitPrice: "desc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];

  const now = new Date();

  const rows = await db.listing.findMany({
    where: {
      ...marketableListings(now),
      mealDay: {
        date: { gte: tehranMidnight() },
        status: { in: ["OPEN", "LOCKED"] },
        ...(filters.dayId ? { id: filters.dayId } : {}),
      },
      ...(filters.maxPrice ? { unitPrice: { lte: filters.maxPrice } } : {}),
    },
    include: listingInclude,
    orderBy,
    take: 60,
  });

  return rows.map((row) => toListingView(row));
}

/** آمارهای صفحه‌ی اصل. */
export async function getMarketStats() {
  await live();

  const [users, openListings, tokens, completed, fees, days] = await Promise.all([
    db.user.count({ where: { isBlocked: false } }),
    db.listing.count({ where: { status: { in: ["OPEN", "RESERVED"] } } }),
    db.listing.aggregate({
      where: { status: { in: ["OPEN", "RESERVED"] } },
      _sum: { quantity: true },
    }),
    db.reservation.count({ where: { status: "COMPLETED" } }),
    db.ledgerEntry.aggregate({ where: { kind: "FEE" }, _sum: { amount: true } }),
    db.mealDay.count({ where: { date: { gte: tehranMidnight() } } }),
  ]);

  return {
    users,
    openListings,
    tokens: tokens._sum.quantity ?? 0,
    completed,
    profit: fees._sum.amount ?? 0,
    days,
  };
}

/** آخرین فروش‌های انجام‌شده — برای نوار «زنده» صفحه‌ی اصل. */
export async function getRecentSales(take = 6) {
  await live();

  const reservations = await db.reservation.findMany({
    where: { status: "COMPLETED" },
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      quantity: true,
      updatedAt: true,
      seller: { select: { name: true } },
      mealDay: { select: { title: true } },
    },
  });

  return reservations.map((reservation) => ({
    id: reservation.id,
    quantity: reservation.quantity,
    atISO: reservation.updatedAt.toISOString(),
    atLabel: formatJalaliShort(reservation.updatedAt),
    seller: reservation.seller.name,
    day: reservation.mealDay.title,
  }));
}

/* ------------------------------------------------------------------ *
 *  کیف پول
 * ------------------------------------------------------------------ */

export type WalletView = {
  balance: number;
  /** موجودی‌ای که در رزروهای باز قفل است. */
  held: number;
  entries: {
    id: number;
    kind: string;
    label: string;
    tone: Tone;
    amount: number;
    note: string | null;
    atISO: string;
    atLabel: string;
  }[];
  requests: {
    id: number;
    kind: string;
    kindLabel: string;
    status: string;
    statusLabel: string;
    statusTone: Tone;
    amount: number;
    atISO: string;
    atLabel: string;
    reviewNote: string | null;
    receiptUrl: string | null;
  }[];
};

export async function getWalletView(userId: number): Promise<WalletView> {
  await live();

  const [entries, requests, held] = await Promise.all([
    db.walletEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    db.walletRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    // فقط رزروهای باز قفل‌شده‌اند؛ جمعِ همه‌ی `HOLD`های تاریخی عدد را
    // بی‌نهایت بزرگ می‌کرد، چون هیچ سطر «رفع قفل» به همان کاربر اضافه نمی‌شود.
    db.walletEntry.aggregate({
      where: {
        userId,
        kind: "HOLD",
        reservation: { status: { in: HELD_RESERVATION_STATUSES } },
      },
      _sum: { amount: true },
    }),
  ]);

  // ۴۰ سطر آخر فقط برای نمایش است؛ موجودی از *همه*‌ی سطرها می‌آید، وگرنه کاربر
  // قدیمی عددی می‌دید که با دفترش نمی‌خواند.
  const total = await db.walletEntry.aggregate({
    where: { userId },
    _sum: { amount: true },
  });

  return {
    balance: total._sum.amount ?? 0,
    held: Math.abs(held._sum.amount ?? 0),
    entries: entries.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      label: WALLET_KIND[entry.kind].label,
      tone: WALLET_KIND[entry.kind].tone,
      amount: entry.amount,
      note: entry.note,
      atISO: entry.createdAt.toISOString(),
      atLabel: formatJalaliShort(entry.createdAt),
    })),
    requests: requests.map((request) => ({
      id: request.id,
      kind: request.kind,
      kindLabel: REQUEST_KIND[request.kind].label,
      status: request.status,
      statusLabel: REQUEST_STATUS[request.status].label,
      statusTone: REQUEST_STATUS[request.status].tone,
      amount: request.amount,
      atISO: request.createdAt.toISOString(),
      atLabel: formatJalaliShort(request.createdAt),
      reviewNote: request.reviewNote,
      receiptUrl: request.receiptUrl,
    })),
  };
}

/* ------------------------------------------------------------------ *
 *  داشبورد کاربر
 * ------------------------------------------------------------------ */

export type ReservationRow = {
  id: number;
  code: string;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  feeAmount: number;
  sellerAmount: number;
  status: string;
  role: "buyer" | "seller";
  /** فقط وقتی طرف مقابل را می‌شناسی: خریدار نام فروشنده را می‌بیند و برعکس. */
  counterpartyName: string;
  counterpartyPhone: string;
  dayTitle: string;
  dayDateLabel: string;
  meetPoint: string | null;
  meetText: string;
  lat: number;
  lng: number;
  deliveryDateLabel: string;
  deliveryWindow: string | null;
  createdAtISO: string;
  createdAtLabel: string;
  sellerHanded: boolean;
  buyerConfirmed: boolean;
  /** دلیلی که طرفین برای اعتراض نوشته‌اند؛ فقط مدیر و خودِ دو طرف می‌بینند. */
  disputeReason: string | null;
};

type ReservationFull = Prisma.ReservationGetPayload<{
  include: {
    buyer: { select: { name: true; phone: true } };
    seller: { select: { name: true; phone: true } };
    mealDay: { select: { title: true } };
  };
}>;

function toReservationRow(row: ReservationFull, viewerId: number): ReservationRow {
  const isBuyer = row.buyerId === viewerId;
  const other = isBuyer ? row.seller : row.buyer;

  return {
    id: row.id,
    code: row.code,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    grossAmount: row.grossAmount,
    feeAmount: row.feeAmount,
    sellerAmount: row.sellerAmount,
    status: row.status,
    role: isBuyer ? "buyer" : "seller",
    counterpartyName: other.name,
    counterpartyPhone: other.phone,
    dayTitle: row.mealDay.title,
    dayDateLabel: formatJalaliShort(row.deliveryDate),
    meetPoint: row.meetPoint,
    meetText: row.meetText,
    lat: row.lat,
    lng: row.lng,
    deliveryDateLabel: formatJalaliShort(row.deliveryDate),
    deliveryWindow: formatTimeRange(`${row.deliveryFrom} تا ${row.deliveryTo}`),
    createdAtISO: row.createdAt.toISOString(),
    createdAtLabel: formatJalaliShort(row.createdAt),
    sellerHanded: row.sellerHandedAt !== null,
    buyerConfirmed: row.buyerConfirmedAt !== null,
    disputeReason: row.disputeReason,
  };
}

const reservationInclude = {
  buyer: { select: { name: true, phone: true } },
  seller: { select: { name: true, phone: true } },
  mealDay: { select: { title: true } },
} as const;

export async function getMyReservations(userId: number, take = 40) {
  await live();

  const rows = await db.reservation.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    orderBy: { createdAt: "desc" },
    take,
    include: reservationInclude,
  });

  return rows.map((row) => toReservationRow(row, userId));
}

export async function getReservationByCode(code: string, userId: number) {
  await live();

  const row = await db.reservation.findFirst({
    where: { code, OR: [{ buyerId: userId }, { sellerId: userId }] },
    include: reservationInclude,
  });

  return row ? toReservationRow(row, userId) : null;
}

export async function getMyListings(userId: number) {
  await live();

  const rows = await db.listing.findMany({
    where: { sellerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      mealDay: { select: { id: true, title: true, date: true, officialPrice: true } },
      reservations: {
        where: { status: { in: HELD_RESERVATION_STATUSES } },
        select: { id: true, quantity: true, code: true, status: true },
      },
    },
    take: 40,
  });

  return rows.map((row) => ({
    ...toListingView(row),
    reservations: row.reservations,
  }));
}

export async function getDashboardSummary(userId: number) {
  await live();

  const [rows, openListings, unread, balance] = await Promise.all([
    db.reservation.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: reservationInclude,
    }),
    db.listing.count({ where: { sellerId: userId, status: "OPEN" } }),
    db.notification.count({ where: { userId, readAt: null } }),
    db.walletEntry.aggregate({ where: { userId }, _sum: { amount: true } }),
  ]);

  return {
    recent: rows.map((row) => toReservationRow(row, userId)),
    openListings,
    unread,
    balance: balance._sum.amount ?? 0,
    buyingTotal: rows.filter((row) => row.buyerId === userId).length,
    sellingTotal: rows.filter((row) => row.sellerId === userId).length,
  };
}

export async function getNotifications(userId: number, take = 30) {
  await live();

  const rows = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });

  return rows.map((row) => ({
    ...row,
    atISO: row.createdAt.toISOString(),
    atLabel: formatJalaliShort(row.createdAt),
  }));
}

/* ------------------------------------------------------------------ *
 *  پنل مدیر
 * ------------------------------------------------------------------ */

export async function getAdminStats() {
  await live();

  const [fees, paidOut, users, pendingRequests, openReservations, settled] =
    await Promise.all([
      db.ledgerEntry.aggregate({
        where: { kind: "FEE" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      db.ledgerEntry.aggregate({
        where: { kind: "WITHDRAWAL_PAID" },
        _sum: { amount: true },
      }),
      db.user.count(),
      db.walletRequest.count({ where: { status: "SUBMITTED" } }),
      db.reservation.count({
        where: { status: { in: ["RESERVED", "AWAITING_BUYER"] } },
      }),
      db.reservation.count({ where: { status: "COMPLETED" } }),
    ]);

  // موجودی کل کیف پول‌ها = پولی که هنوز داخل سیستم است و کسی نتوانسته
  // به‌عنوان درآمد از آن برداشت کند.
  const walletTotal = await db.walletEntry.aggregate({ _sum: { amount: true } });
  // پولِ در قفل: فقط رزروهای باز. پولِ رزرو تمام‌شده به فروشنده و کارمزد رفته و
  // پولِ رزرو لغوشده برگشته، پس دیگر «نزد سیستم» نیست.
  const heldTotal = await db.walletEntry.aggregate({
    where: {
      kind: "HOLD",
      reservation: { status: { in: HELD_RESERVATION_STATUSES } },
    },
    _sum: { amount: true },
  });

  return {
    profit: fees._sum.amount ?? 0,
    deals: fees._count._all,
    paidOut: Math.abs(paidOut._sum.amount ?? 0),
    users,
    pendingRequests,
    openReservations,
    settled,
    walletTotal: walletTotal._sum.amount ?? 0,
    heldTotal: Math.abs(heldTotal._sum.amount ?? 0),
  };
}

export type RequestRow = {
  id: number;
  kind: string;
  kindLabel: string;
  status: string;
  amount: number;
  receiptUrl: string | null;
  note: string | null;
  atISO: string;
  atLabel: string;
  userName: string;
  userPhone: string;
  walletBalance: number;
};

export async function getPendingRequests(): Promise<RequestRow[]> {
  await live();

  const rows = await db.walletRequest.findMany({
    where: { status: "SUBMITTED" },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true, phone: true } } },
    take: 40,
  });

  const balances = await walletBalances(rows.map((row) => row.userId));
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    kindLabel: REQUEST_KIND[row.kind].label,
    status: row.status,
    amount: row.amount,
    receiptUrl: row.receiptUrl,
    note: row.note,
    atISO: row.createdAt.toISOString(),
    atLabel: formatJalaliShort(row.createdAt),
    userName: row.user.name,
    userPhone: row.user.phone,
    walletBalance: balances.get(row.userId) ?? 0,
  }));
}

export async function getAllReservations(take = 60) {
  await live();

  const rows = await db.reservation.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: reservationInclude,
  });

  // در پنل مدیر هر دو طرف دیده می‌شوند (viewerId صفر یعنی «هیچ‌کس»).
  return rows.map((row) => ({
    ...toReservationRow(row, -1),
    role: "buyer" as const,
    buyerName: row.buyer.name,
    buyerPhone: row.buyer.phone,
    sellerName: row.seller.name,
    sellerPhone: row.seller.phone,
  }));
}

export async function getLedger(take = 60) {
  await live();

  return db.ledgerEntry.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: {
      actor: { select: { name: true } },
      reservation: { select: { code: true } },
    },
  });
}

export async function getUsers(take = 80) {
  await live();

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: {
      _count: { select: { listings: true, reservations: true } },
    },
  });

  const balances = await walletBalances(users.map((user) => user.id));

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    phone: user.phone,
    studentId: user.studentId,
    role: user.role,
    isBlocked: user.isBlocked,
    verified: user.phoneVerifiedAt !== null,
    atISO: user.createdAt.toISOString(),
    atLabel: formatJalaliShort(user.createdAt),
    balance: balances.get(user.id) ?? 0,
    listings: user._count.listings,
    reservations: user._count.reservations,
  }));
}