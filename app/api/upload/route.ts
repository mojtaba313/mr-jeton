import { NextResponse } from "next/server";

import { currentUser } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, UPLOAD_KINDS, type UploadKind } from "@/lib/config";
import { BucketError, storeImage } from "@/lib/storage";

/**
 * آپلود تصویر — رسید کارت‌به‌کارت، آواتار، عکس منو.
 *
 * چرا روت‌هندر و نه اکشن سرور: فایل چند مگابایتی است و در سرور اکشن به رشته‌ی
 * base64 تبدیل می‌شود و کل payload دو بار در حافظه می‌ماند. اینجا فایل مستقیم
 * به باکت می‌رود و فقط مسیرش برمی‌گردد.
 *
 * The token never leaves the server: the browser talks to this route, this route
 * talks to GitHub.
 */

/** پوشه‌ی هر نوع فایل در باکت. */
const SUBDIR: Record<UploadKind, string> = {
  receipt: "receipts",
  avatar: "avatars",
};

/** بزرگ‌ترین حجم برای آپلودهای غیرحساس. */
const KIND_MAX: Record<UploadKind, number> = {
  receipt: MAX_UPLOAD_BYTES,
  avatar: 512 * 1024,
};

/**
 * بررسی مبدأ درخواست.
 *
 * Server Actions have a built-in Origin check; a Route Handler does not. Without
 * this, any site on the internet could POST a file to this endpoint with the
 * victim's cookies attached.
 */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // مرورگرها همیشه می‌فرستند؛ نبودش یعنی کلاینت غیرمرورگری

  const host = request.headers.get("host");
  return origin === `http://${host}` || origin === `https://${host}`;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "مبدأ درخواست مجاز نیست." }, { status: 403 });
  }

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "وارد حساب خود شوید." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }

  const file = formData.get("file");
  const kind = String(formData.get("kind") ?? "");

  if (!UPLOAD_KINDS.includes(kind as UploadKind)) {
    return NextResponse.json({ error: "نوع فایل نامعتبر است." }, { status: 400 });
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "فایلی انتخاب نشده است." }, { status: 400 });
  }

  const uploadKind = kind as UploadKind;

  try {
    const stored = await storeImage(file, {
      subdir: SUBDIR[uploadKind],
      maxBytes: KIND_MAX[uploadKind],
    });

    return NextResponse.json({
      ok: true,
      path: stored.path,
      url: stored.url,
      size: stored.size,
    });
  } catch (error) {
    if (error instanceof BucketError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.local ? 400 : (error.status ?? 502) },
      );
    }

    return NextResponse.json({ error: "آپلود انجام نشد." }, { status: 500 });
  }
}