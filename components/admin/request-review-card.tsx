"use client";

import { motion } from "motion/react";
import { Check, Eye, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { reviewRequestAction } from "@/app/actions/wallet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/form";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatPhone } from "@/lib/phone";
import { formatToman } from "@/lib/money";

/**
 * کارت درخواست مالی — تنها چیزی که مدیر در صف کارش می‌بیند.
 *
 * Charge top-ups and mark withdrawals paid. Nothing else about a trade is the
 * admin's business: the money is already in escrow, and the two users have each
 * other's phone number. A 400-pixel-tall card for a receipt is a fair price for
 * that.
 */

export type RequestRow = {
  id: number;
  kind: string;
  kindLabel: string;
  amount: number;
  receiptUrl: string | null;
  note: string | null;
  atISO: string;
  atLabel: string;
  userName: string;
  userPhone: string;
  walletBalance: number;
};

export function RequestReviewCard({
  request,
  index = 0,
}: {
  request: RequestRow;
  index?: number;
}) {
  const [zoom, setZoom] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const isTopUp = request.kind === "TOPUP";

  function review(approve: boolean, message?: string) {
    startTransition(async () => {
      const result = await reviewRequestAction(request.id, approve, message ?? "");
      if (!result) return;
      if (result.ok) {
        toast.success(result.message);
        setRejecting(false);
        setNote("");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.3) }}
        className="glass rounded-xl2 p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={isTopUp ? "brand" : "warn"}>{request.kindLabel}</Badge>
              <span className="text-[12px] text-ink-faint">
                <RelativeTime date={request.atISO} fallback={request.atLabel} />
              </span>
            </div>

            <p className="mt-2 text-[15px] font-bold text-ink">{request.userName}</p>
            <p dir="ltr" className="text-right text-[12px] text-ink-muted">
              {formatPhone(request.userPhone)}
            </p>

            <p className="mt-1 text-[12px] text-ink-faint">
              موجودی فعلی کیف پول: {formatToman(request.walletBalance)}
            </p>

            {request.note ? (
              <p className="mt-2 rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2 text-[12px] leading-6 text-ink-muted">
                {request.note}
              </p>
            ) : null}
          </div>

          <div className="text-left">
            <p className="text-lg font-black text-brand-200">
              {formatToman(request.amount)}
            </p>
            {!isTopUp ? (
              <p className="mt-1 text-[11px] text-ink-faint">از موجودی کم شده</p>
            ) : null}
          </div>
        </div>

        <footer className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/6 pt-3.5">
          {isTopUp ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(true)}
              disabled={!request.receiptUrl}
            >
              <Eye className="size-4" />
              دیدن رسید
            </Button>
          ) : (
            <p className="text-[12px] text-ink-muted">
              مبلغ از کیف پول کاربر کم شده؛ بعد از واریز کارت، تایید کن.
            </p>
          )}

          <div className="flex-1" />

          <Button
            variant="danger"
            size="sm"
            disabled={pending}
            onClick={() => setRejecting(true)}
          >
            <X className="size-4" />
            رد
          </Button>
          <Button
            variant="success"
            size="sm"
            disabled={pending}
            onClick={() => review(true)}
          >
            <Check className="size-4" />
            {pending ? "…" : isTopUp ? "تایید شارژ" : "پرداخت شد"}
          </Button>
        </footer>
      </motion.article>

      <Dialog
        open={zoom}
        onClose={() => setZoom(false)}
        title="رسید شارژ"
        description={`${request.userName} — ${formatPhone(request.userPhone)}`}
        className="max-w-3xl"
      >
        {request.receiptUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={request.receiptUrl}
            alt="رسید"
            className="max-h-[65vh] w-full rounded-2xl border border-white/8 object-contain"
          />
        ) : (
          <p className="py-8 text-center text-[13px] text-ink-muted">
            رسیدی بارگذاری نشده است.
          </p>
        )}
      </Dialog>

      <Dialog
        open={rejecting}
        onClose={() => setRejecting(false)}
        title={isTopUp ? "رد کردن شارژ" : "رد کردن برداشت"}
        description="دلیل برای کاربر نوشته می‌شود؛ واضح بنویس تا بداند چه کند."
      >
        <div className="space-y-4">
          <Textarea
            label="دلیل رد"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              isTopUp
                ? "مثلاً: مبلغ اشتباه است — ۲۰۰ هزار واریز شده نه ۲۰۰ هزار."
                : "مثلاً: شماره کارت مقصد با نام کاربر نمی‌خواند."
            }
            maxLength={280}
          />
          <div className="flex gap-3">
            <Button
              variant="danger"
              className="flex-1"
              disabled={pending}
              onClick={() => review(false, note)}
            >
              {pending ? "…" : "رد کن"}
            </Button>
            <Button variant="outline" onClick={() => setRejecting(false)}>
              انصراف
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}