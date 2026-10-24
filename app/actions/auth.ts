"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { currentUser, createSession, destroySession } from "@/lib/auth";
import { db } from "@/lib/db";
import { TELEGRAM } from "@/lib/telegram";
import { normalizePhone } from "@/lib/phone";
import { isPhoneVerified } from "@/lib/verification";
import { fieldErrors, loginSchema, registerSchema } from "@/lib/validation";

/**
 * ورود و ثبت‌نام با **شماره تماس**؛ ایمیل و شماره دانشجویی در این نسخه نقشی
 * ندارند. شماره دانشجویی اختیاری است، شماره تماس اجباری — و تنها چیزی است که
 * هم ورود را ممکن می‌کند و هم مبنای تایید با ربات تلگرام.
 */

export type AuthState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
} | null;

const BCRYPT_ROUNDS = 10;

/** فقط در حالتی که مدیر پنل است، شماره‌اش را از لیست کاربران می‌خواند. */
export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "شماره تماس و رمز عبور را وارد کنید.",
      errors: fieldErrors(parsed.error),
    };
  }

  const phone = normalizePhone(parsed.data.phone);

  const user = await db.user.findUnique({
    where: { phone },
    select: { id: true, passwordHash: true, isBlocked: true },
  });

  // یک پیام واحد برای «کاربر نیست» و «رمز غلط است»: تفاوت این دو، حدس زدن رمزِ
  // یک شماره را ممکن می‌کند.
  const invalid = { ok: false, message: "شماره یا رمز عبور درست نیست." };

  if (!user || user.isBlocked) return invalid;

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return invalid;

  await createSession(user.id);
  revalidatePath("/", "layout");

  redirect("/dashboard");
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    studentId: formData.get("studentId") ?? "",
    phone: formData.get("phone"),
    claim: formData.get("claim"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "لطفاً خطاهای فرم را برطرف کنید.",
      errors: fieldErrors(parsed.error),
    };
  }

  const { name, studentId, claim } = parsed.data;
  const phone = normalizePhone(parsed.data.phone);

  // شماره باید با ربات تایید شده باشد. `TELEGRAM_VERIFICATION_BYPASS` فقط برای
  // توسعه‌ی محلی است و در .env.example هم با همین توضیح آمده.
  if (!TELEGRAM.bypass) {
    const ok =
      claim !== "" &&
      (await isPhoneVerified(phone)) &&
      (await db.phoneVerification.count({
        where: { claim, phone, status: "VERIFIED" },
      })) > 0;

    if (!ok) {
      return {
        ok: false,
        message: "شماره تماس هنوز تایید نشده است.",
        errors: { claim: "تایید شماره با ربات تلگرام کامل نشده." },
      };
    }
  }

  const existing = await db.user.findFirst({
    where: {
      OR: [
        { phone },
        ...(studentId ? [{ studentId }] : []),
      ],
    },
    select: { phone: true, studentId: true },
  });

  if (existing) {
    return {
      ok: false,
      message:
        existing.phone === phone
          ? "این شماره قبلاً ثبت شده است."
          : "این شماره دانشجویی قبلاً ثبت شده است.",
      errors: existing.phone === phone ? { phone: "تکراری است." } : {},
    };
  }

  const user = await db.user.create({
    data: {
      name,
      studentId: studentId || null,
      phone,
      phoneVerifiedAt: new Date(),
      passwordHash: await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS),
    },
    select: { id: true },
  });

  await createSession(user.id);
  revalidatePath("/", "layout");

  redirect("/wallet?welcome=1");
}

export async function logoutAction() {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/");
}

/** برای فرم‌های کوچک داخل داشبورد که نیاز به state ندارند. */
export async function signOut() {
  const user = await currentUser();
  if (user) await destroySession();
  revalidatePath("/", "layout");
  redirect("/");
}