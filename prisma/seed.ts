/**
 * داده‌ی نمونه برای توسعه.
 *
 * A seed that tells a story beats a seed full of `user1@…`: the marketplace has
 * states (reserved, awaiting confirmation, done, disputed) and the only way to
 * see them working is to have reservations sitting in each one. So this creates
 * users with real wallet balances, meal days, listings spread across the campus
 * map, and reservations spread through the whole lifecycle — including one with a
 * pending top-up so the admin queue has something to approve.
 *
 * Idempotent: it deletes the demo rows it owns before recreating them, so you can
 * run it again after changing the schema.
 */

import { randomBytes } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

import { PrismaClient } from "../app/generated/prisma/client";
import { MAP } from "../lib/config";
import { tehranMidnight } from "../lib/dates";
import { splitAmount } from "../lib/money";
import { normalizePhone } from "../lib/phone";

const FEE_PERCENT = Number.parseInt(process.env.PLATFORM_FEE_PERCENT ?? "5", 10);
const PASSWORD = "demo1234";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function hash(password: string): Promise<string> {
  const { default: bcrypt } = await import("bcryptjs");
  return bcrypt.hash(password, 10);
}

function code(): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTVWXYZ";
  return Array.from(randomBytes(6), (b) => alphabet[b % alphabet.length]!).join("");
}

/** نقطه‌های تحویل پراکنده دور مرکز نقشه — همه داخل شعاع ۳ کیلومتری. */
const PLACES = [
  { label: "بوفه‌ی دانشکده فنی", text: "جلوی بوفه‌ی دانشکده فنی، سمت خیابان اصلی", dLat: 0.0012, dLng: 0.0008 },
  { label: "سلف دانشگاه", text: "ساختمان سلف، باجه شماره ۵", dLat: -0.0009, dLng: 0.0015 },
  { label: "کتابخانه مرکزی", text: "ورودی اصلی کتابخانه، زیر سایبان", dLat: 0.0004, dLng: -0.0011 },
  { label: "حیاط دانشکده علوم", text: "میان حیاط، کنار تخت‌های سنگی", dLat: -0.0015, dLng: -0.0006 },
  { label: "پارکینگ شمالی", text: "ورودی پارکینگ شمالی، کنار گیشه", dLat: 0.0018, dLng: -0.0019 },
];

const USERS = [
  { name: "مدیر سامانه", phone: "09120000001", studentId: null, role: "ADMIN" as const },
  { name: "سارا محمدی", phone: "09121110001", studentId: "401234567", role: "USER" as const },
  { name: "امیر رضایی", phone: "09121110002", studentId: "401234568", role: "USER" as const },
  { name: "نگین کریمی", phone: "09121110003", studentId: "401234569", role: "USER" as const },
  { name: "حسین نوری", phone: "09121110004", studentId: "401234570", role: "USER" as const },
  { name: "مریم صادقی", phone: "09121110005", studentId: null, role: "USER" as const },
];

const MENUS = [
  "جوجه‌کباب زعفرانی، برنج ایرانی، سالاد شیرازی، ماست",
  "قورمه‌سبزی با گوشت گوسفندی، کدو پخته، برنج",
  "پاستای آلفردو، سالاد فصل، نوشابه",
  "زرشک‌پلو با مرغ، ماست خیار، برنک",
];

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000);
}

async function main() {
  const passwordHash = await hash(PASSWORD);

  console.log("· پاکسازی داده‌ی نمونه");
  await db.notification.deleteMany({});
  await db.ledgerEntry.deleteMany({});
  await db.walletEntry.deleteMany({});
  await db.walletRequest.deleteMany({});
  await db.reservation.deleteMany({});
  await db.phoneVerification.deleteMany({});
  await db.listing.deleteMany({});
  await db.mealDay.deleteMany({});
  await db.user.deleteMany({});

  console.log("· کاربران");
  const users: Awaited<ReturnType<typeof db.user.create>>[] = [];
  for (const user of USERS) {
    users.push(
      await db.user.create({
        data: {
          name: user.name,
          studentId: user.studentId,
          phone: normalizePhone(user.phone),
          phoneVerifiedAt: new Date(),
          passwordHash,
          role: user.role,
        },
      }),
    );
  }

  const [admin, sara, amir, negin, hossein, maryam] = users as [
    typeof users[number],
    typeof users[number],
    typeof users[number],
    typeof users[number],
    typeof users[number],
    typeof users[number],
  ];

  console.log("· روزهای غذا");
  const today = tehranMidnight();

  const dayPast = await db.mealDay.create({
    data: {
      title: "ناهار سه‌شنبه",
      mealType: "ناهار",
      date: addDays(today, -2),
      menu: MENUS[0]!,
      officialPrice: 125000,
      capacity: 3000,
      status: "DONE",
    },
  });

  const dayToday = await db.mealDay.create({
    data: {
      title: "ناهار چهارشنبه",
      mealType: "ناهار",
      date: addDays(today, 1),
      menu: MENUS[1]!,
      officialPrice: 130000,
      capacity: 3200,
      status: "OPEN",
    },
  });

  const dayNext = await db.mealDay.create({
    data: {
      title: "ناهار پنج‌شنبه",
      mealType: "ناهار",
      date: addDays(today, 2),
      menu: MENUS[2]!,
      officialPrice: 130000,
      capacity: 3000,
      status: "OPEN",
    },
  });

  const dayLater = await db.mealDay.create({
    data: {
      title: "شام پنج‌شنبه",
      mealType: "شام",
      date: addDays(today, 3),
      menu: MENUS[3]!,
      officialPrice: 95000,
      capacity: 2000,
      status: "OPEN",
    },
  });

  console.log("· آگهی‌ها");

  const listingSpec: {
    seller: typeof users[number];
    dayId: number;
    quantity: number;
    unitPrice: number;
    note: string | null;
    place: number;
    status: "OPEN" | "RESERVED" | "COMPLETED";
    deliveryInDays: number;
    from: string;
    to: string;
  }[] = [
    { seller: sara, dayId: dayNext.id, quantity: 2, unitPrice: 118000, note: "جلسه‌ی پایان ترم دارم، نمی‌رسم برم سلف.", place: 0, status: "OPEN", deliveryInDays: 2, from: "12:00", to: "13:30" },
    { seller: amir, dayId: dayNext.id, quantity: 3, unitPrice: 112000, note: null, place: 1, status: "OPEN", deliveryInDays: 2, from: "12:30", to: "14:00" },
    { seller: negin, dayId: dayNext.id, quantity: 1, unitPrice: 128000, note: "فقط به قیمت بالا — هر وقت نرسیدم بفروش.", place: 2, status: "OPEN", deliveryInDays: 2, from: "11:30", to: "12:30" },
    { seller: hossein, dayId: dayLater.id, quantity: 4, unitPrice: 85000, note: "شام کم می‌خورم، چهار تا اضافه.", place: 3, status: "OPEN", deliveryInDays: 3, from: "19:00", to: "20:00" },
    { seller: maryam, dayId: dayToday.id, quantity: 2, unitPrice: 125000, note: null, place: 4, status: "OPEN", deliveryInDays: 1, from: "12:00", to: "13:00" },
    { seller: sara, dayId: dayToday.id, quantity: 2, unitPrice: 122000, note: null, place: 0, status: "RESERVED", deliveryInDays: 1, from: "12:00", to: "13:30" },
    { seller: amir, dayId: dayPast.id, quantity: 3, unitPrice: 120000, note: null, place: 1, status: "COMPLETED", deliveryInDays: -2, from: "12:00", to: "13:30" },
  ];

  const listings = [];
  for (const spec of listingSpec) {
    const place = PLACES[spec.place % PLACES.length]!;
    const createdAt = new Date(Date.now() - Math.random() * 20 * 3600e3);

    listings.push(
      await db.listing.create({
        data: {
          sellerId: spec.seller.id,
          mealDayId: spec.dayId,
          quantity: spec.quantity,
          unitPrice: spec.unitPrice,
          note: spec.note,
          lat: MAP.lat + place.dLat,
          lng: MAP.lng + place.dLng,
          locationText: place.text,
          placeLabel: place.label,
          deliveryDate: addDays(today, spec.deliveryInDays),
          deliveryFrom: spec.from,
          deliveryTo: spec.to,
          status: spec.status,
          expiresAt: addDays(today, spec.deliveryInDays),
          createdAt,
        },
      }),
    );
  }

  console.log("· کیف پول‌ها");
  const topUp = async (user: typeof users[number], amount: number) => {
    await db.walletEntry.create({
      data: {
        userId: user.id,
        kind: "TOPUP",
        amount,
        note: "شارژ کیف پول",
      },
    });
  };

  await topUp(sara, 400_000);
  await topUp(amir, 500_000);
  await topUp(negin, 300_000);
  await topUp(hossein, 350_000);
  await topUp(maryam, 250_000);

  console.log("· رزروها");

  type Spec = {
    listing: (typeof listings)[number];
    buyer: typeof users[number];
    quantity: number;
    status: "RESERVED" | "AWAITING_BUYER" | "COMPLETED" | "DISPUTED";
    sellerHanded?: boolean;
  };

  const orderSpec: Spec[] = [
    { listing: listings[0]!, buyer: maryam, quantity: 1, status: "RESERVED" },
    { listing: listings[1]!, buyer: hossein, quantity: 2, status: "AWAITING_BUYER", sellerHanded: true },
    { listing: listings[5]!, buyer: negin, quantity: 2, status: "RESERVED" },
    { listing: listings[6]!, buyer: amir, quantity: 3, status: "COMPLETED", sellerHanded: true },
    { listing: listings[4]!, buyer: sara, quantity: 1, status: "DISPUTED" },
  ];

  for (const spec of orderSpec) {
    const listing = spec.listing;
    const gross = spec.quantity * listing.unitPrice;
    const { fee, seller } = splitAmount(gross, FEE_PERCENT);
    const reservationCode = code();
    const createdAt = new Date(Date.now() - Math.random() * 30 * 3600e3);

    const reservation = await db.reservation.create({
      data: {
        code: reservationCode,
        listingId: listing.id,
        buyerId: spec.buyer.id,
        sellerId: listing.sellerId,
        mealDayId: listing.mealDayId,
        quantity: spec.quantity,
        unitPrice: listing.unitPrice,
        grossAmount: gross,
        feeAmount: fee,
        sellerAmount: seller,
        status: spec.status,
        lat: listing.lat,
        lng: listing.lng,
        meetPoint: listing.placeLabel,
        meetText: listing.locationText,
        deliveryDate: listing.deliveryDate,
        deliveryFrom: listing.deliveryFrom,
        deliveryTo: listing.deliveryTo,
        sellerHandedAt: spec.sellerHanded ? createdAt : null,
        buyerConfirmedAt: spec.status === "COMPLETED" ? createdAt : null,
        completedAt: spec.status === "COMPLETED" ? createdAt : null,
        createdAt,
      },
    });

    await db.walletEntry.createMany({
      data: [
        {
          userId: spec.buyer.id,
          kind: "HOLD",
          amount: -gross,
          reservationId: reservation.id,
          note: `رزرو ${spec.quantity} ژتون — کد ${reservationCode}`,
          createdAt,
        },
        ...(spec.status === "COMPLETED"
          ? [
              {
                userId: listing.sellerId,
                kind: "RELEASE" as const,
                amount: seller,
                reservationId: reservation.id,
                note: `فروش رزرو ${reservationCode}`,
                createdAt,
              },
            ]
          : []),
      ],
    });

    if (spec.status === "COMPLETED") {
      await db.ledgerEntry.create({
        data: {
          kind: "FEE",
          amount: fee,
          reservationId: reservation.id,
          actorId: admin.id,
          note: `سهم سایت از رزرو ${reservationCode}`,
          createdAt,
        },
      });
    }

    await db.notification.createMany({
      data: [
        {
          userId: spec.buyer.id,
          title:
            spec.status === "AWAITING_BUYER"
              ? "ژتون آماده‌ی تحویل است"
              : spec.status === "DISPUTED"
                ? "رزروت اعتراض شده"
                : "رزرو ثبت شد",
          body: `${reservationCode} — ${spec.quantity} ژتون برای ${listing.mealDayId ? "" : ""}روز غذا.`,
          link: `/dashboard/reservations/${reservationCode}`,
          createdAt,
        },
        {
          userId: listing.sellerId,
          title: "وضعیت رزرو تغییر کرد",
          body: `رزرو ${reservationCode}`,
          link: `/dashboard/reservations/${reservationCode}`,
          createdAt,
        },
      ],
    });
  }

  console.log("· درخواست‌های مالی");
  await db.walletRequest.create({
    data: {
      userId: hossein.id,
      kind: "TOPUP",
      amount: 200_000,
      status: "SUBMITTED",
      receiptUrl: null,
      note: "ساعت ۱۱:۲۰ واریز شد.",
    },
  });

  await db.walletRequest.create({
    data: {
      userId: sara.id,
      kind: "WITHDRAWAL",
      amount: 100_000,
      status: "SUBMITTED",
      note: "کارت به نام خودم.",
    },
  });

  await db.walletEntry.create({
    data: {
      userId: sara.id,
      kind: "WITHDRAWAL",
      amount: -100_000,
      note: "درخواست برداشت",
    },
  });

  await db.notification.createMany({
    data: [
      { userId: admin.id, title: "درخواست شارژ جدید", body: "حسین نوری ۲۰۰٬۰۰۰ تومان.", link: "/admin/requests" },
      { userId: admin.id, title: "درخواست برداشت جدید", body: "سارا محمدی ۱۰۰٬۰۰۰ تومان.", link: "/admin/requests" },
      { userId: negin.id, title: "پول خریدار تایید شد", body: "سر وقت سر نقطه‌ی تحویل باش." },
    ],
  });

  console.log(`
✔ داده‌ی نمونه ساخته شد.

  ورود به حساب مدیر:
    شماره تماس   ۰۹۱۲۰۰۰۰۰۰۱
    رمز عبور     ${PASSWORD}

  یک کاربر عادی:
    شماره تماس   ۰۹۱۲۱۱۱۰۰۰۱ (سارا)
    رمز عبور     ${PASSWORD}

  نقشه‌ی دانشگاه روی مرکز ${MAP.lat}, ${MAP.lng} تنظیم شده؛
  برای دانشگاه خودت NEXT_PUBLIC_MAP_LAT / NEXT_PUBLIC_MAP_LNG را عوض کن.
`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });