import {
  LedgerKind,
  ListingStatus,
  MealDayStatus,
  ReservationStatus,
  VerificationStatus,
  WalletEntryKind,
  WalletRequestKind,
  WalletRequestStatus,
} from "@/app/generated/prisma/enums";

/**
 * برچسب‌های فارسی وضعیت‌ها.
 *
 * Deliberately shared by server and client components: the same status appears
 * in the market, the dashboard, the admin table and a toast, and three copies of
 * this mapping would drift within a week. It imports only the generated enum
 * constants (plain objects, no client runtime), so it stays safe on the client.
 */

export type Tone =
  | "neutral"
  | "brand"
  | "success"
  | "warn"
  | "danger"
  | "info";

export const RESERVATION_STATUS: Record<
  ReservationStatus,
  { label: string; tone: Tone; hint: string }
> = {
  [ReservationStatus.RESERVED]: {
    label: "رزرو شده",
    tone: "warn",
    hint: "پول از کیف پولت قفل شده. سر وقت، سرِ نقطه‌ی تحویل با فروشنده حرف بزن.",
  },
  [ReservationStatus.AWAITING_BUYER]: {
    label: "تحویل شد — تایید تو",
    tone: "brand",
    hint: "فروشنده ژتون را تحویل داده. اگر گرفته‌ای، تایید کن تا پولش آزاد شود.",
  },
  [ReservationStatus.COMPLETED]: {
    label: "تمام شد",
    tone: "success",
    hint: "پول به کیف پول فروشنده اضافه شد.",
  },
  [ReservationStatus.CANCELLED]: {
    label: "لغو شد",
    tone: "neutral",
    hint: "پول به کیف پولت برگشت.",
  },
  [ReservationStatus.DISPUTED]: {
    label: "اختلاف",
    tone: "danger",
    hint: "یکی از طرفین اعتراض کرده. مدیر پیگیری می‌کند.",
  },
};

export const LISTING_STATUS: Record<ListingStatus, { label: string; tone: Tone }> = {
  [ListingStatus.OPEN]: { label: "باز", tone: "brand" },
  [ListingStatus.RESERVED]: { label: "رزرو شد", tone: "warn" },
  [ListingStatus.COMPLETED]: { label: "تحویل شد", tone: "success" },
  [ListingStatus.CANCELLED]: { label: "بسته", tone: "neutral" },
  [ListingStatus.EXPIRED]: { label: "منقضی", tone: "neutral" },
};

export const DAY_STATUS: Record<MealDayStatus, { label: string; tone: Tone }> = {
  [MealDayStatus.OPEN]: { label: "باز", tone: "brand" },
  [MealDayStatus.LOCKED]: { label: "قفل معامله", tone: "warn" },
  [MealDayStatus.CLOSED]: { label: "بسته", tone: "neutral" },
  [MealDayStatus.DONE]: { label: "تمام شد", tone: "success" },
  [MealDayStatus.CANCELLED]: { label: "لغو شد", tone: "danger" },
};

export const REQUEST_STATUS: Record<WalletRequestStatus, { label: string; tone: Tone }> = {
  [WalletRequestStatus.SUBMITTED]: { label: "در انتظار بررسی", tone: "warn" },
  [WalletRequestStatus.APPROVED]: { label: "تایید شد", tone: "success" },
  [WalletRequestStatus.REJECTED]: { label: "رد شد", tone: "danger" },
};

export const REQUEST_KIND: Record<WalletRequestKind, { label: string; tone: Tone }> = {
  [WalletRequestKind.TOPUP]: { label: "شارژ کیف پول", tone: "brand" },
  [WalletRequestKind.WITHDRAWAL]: { label: "برداشت", tone: "warn" },
};

export const WALLET_KIND: Record<WalletEntryKind, { label: string; tone: Tone }> = {
  [WalletEntryKind.TOPUP]: { label: "شارژ کیف پول", tone: "success" },
  [WalletEntryKind.HOLD]: { label: "قفل برای رزرو", tone: "warn" },
  [WalletEntryKind.RELEASE]: { label: "دریافت فروش", tone: "success" },
  [WalletEntryKind.REFUND]: { label: "بازگشت رزرو", tone: "neutral" },
  [WalletEntryKind.WITHDRAWAL]: { label: "درخواست برداشت", tone: "warn" },
  [WalletEntryKind.WITHDRAWAL_REVERSED]: { label: "برگشت برداشت", tone: "neutral" },
  [WalletEntryKind.ADJUSTMENT]: { label: "اصلاح دستی", tone: "info" },
};

export const LEDGER_KIND: Record<LedgerKind, { label: string; tone: Tone }> = {
  [LedgerKind.FEE]: { label: "سهم سایت", tone: "success" },
  [LedgerKind.WITHDRAWAL_PAID]: { label: "پرداخت برداشت", tone: "warn" },
  [LedgerKind.REFUND]: { label: "بازگشت وجه", tone: "danger" },
  [LedgerKind.ADJUSTMENT]: { label: "اصلاح دستی", tone: "info" },
};

export const VERIFICATION_STATUS: Record<VerificationStatus, { label: string; tone: Tone }> = {
  [VerificationStatus.PENDING]: { label: "در انتظار", tone: "warn" },
  [VerificationStatus.VERIFIED]: { label: "تایید شد", tone: "success" },
  [VerificationStatus.MISMATCH]: { label: "عدم تطابق", tone: "danger" },
  [VerificationStatus.EXPIRED]: { label: "منقضی", tone: "neutral" },
};

export const MEAL_TYPES = ["صبحانه", "ناهار", "شام"] as const;

/**
 * رزروهایی که پولشان هنوز نزد سیستم قفل است.
 *
 * این فهرست باید بین « موجودی قفل‌شده » و « ژتونهای رزروشده » یکی باشد: تا وقتی
 * اعتراض باز است پول و ژتون هر دو باید قفل بمانند، وگرنه مدیر برای داوری هم
 * ژتونی ندارد که تحویل بدهد.
 */
export const HELD_RESERVATION_STATUSES: ReservationStatus[] = [
  ReservationStatus.RESERVED,
  ReservationStatus.AWAITING_BUYER,
  ReservationStatus.DISPUTED,
];

/** ترتیب مراحل یک رزرو، برای نوار وضعیت. */
export const RESERVATION_STEPS = [
  { status: ReservationStatus.RESERVED, label: "رزرو" },
  { status: ReservationStatus.AWAITING_BUYER, label: "تحویل ژتون" },
  { status: ReservationStatus.COMPLETED, label: "تمام" },
] as const;