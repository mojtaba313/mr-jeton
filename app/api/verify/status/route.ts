import { NextResponse } from "next/server";

import { claimStatus } from "@/lib/verification-core";

/**
 * وضعیت ادعای تایید شماره — چیزی که فرم ثبت‌نام هر دو ثانیه می‌پرسد.
 *
 * Read-only by design: the *bot* is the only writer of `status`. Even if a
 * stranger could call this endpoint, all they could do is learn whether a claim
 * they already hold is verified — which they are about to find out anyway.
 */
export async function GET(request: Request) {
  const claim = new URL(request.url).searchParams.get("claim") ?? "";

  if (claim.length < 16 || claim.length > 64) {
    return NextResponse.json({ status: null }, { status: 400 });
  }

  const row = await claimStatus(claim);
  if (!row) return NextResponse.json({ status: null }, { status: 404 });

  return NextResponse.json({
    status: row.status,
    username: row.telegramUsername ?? null,
  });
}