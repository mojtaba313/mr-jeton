"use client";

import { motion } from "motion/react";
import { Gavel, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { resolveDisputeAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/form";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatToman } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { RESERVATION_STATUS } from "@/lib/labels";

/**
 * ردیف رزرو در پنل مدیر.
 *
 * The dispute button only appears on `DISPUTED` rows — the whole point of the
 * design is that an admin should have nothing to click in a normal week.
 */

export type AdminReservation = {
  id: number;
  code: string;
  quantity: number;
  grossAmount: number;
  status: string;
  buyerName: string;
  buyerPhone: string;
  sellerName: string;
  sellerPhone: string;
  dayTitle: string;
  deliveryDateLabel: string;
  deliveryWindow: string | null;
  meetPoint: string | null;
  /** دلیلی که طرفین برای اعتراض نوشته‌اند — پایه‌ی داوری مدیر. */
  disputeReason: string | null;
  createdAtISO: string;
  createdAtLabel: string;
};

export function AdminReservationRow({
  reservation,
  index = 0,
}: {
  reservation: AdminReservation;
  index?: number;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const status = RESERVATION_STATUS[reservation.status as keyof typeof RESERVATION_STATUS];
  const disputed = reservation.status === "DISPUTED";

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }}
        className={`glass rounded-xl2 p-4 ${disputed ? "border-rose-warm/30" : ""}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={status.tone}>{status.label}</Badge>
              <span dir="ltr" className="text-[11px] font-bold tracking-widest text-ink-muted">
                {reservation.code}
              </span>
            </div>

            <p className="mt-2 text-[13px] text-ink-soft">
              <span className="font-semibold text-ink">{reservation.buyerName}</span>{" "}
              ← {reservation.sellerName} · {reservation.quantity} ژتون{" "}
              {reservation.dayTitle}
            </p>

            <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-faint">
              <MapPin className="size-3.3" />
              {reservation.meetPoint ?? "—"} · {reservation.deliveryDateLabel}
              {reservation.deliveryWindow ? ` · ${reservation.deliveryWindow}` : ""}
            </p>

            {reservation.disputeReason ? (
              <p className="mt-2 rounded-xl border border-rose-warm/25 bg-rose-warm/6 p-2.5 text-[12px] leading-6 text-ink-soft">
                <span className="font-semibold text-rose-warm">دلیل اعتراض: </span>
                {reservation.disputeReason}
              </p>
            ) : null}

            <p className="mt-1 text-[11px] text-ink-faint">
              خریدار {formatPhone(reservation.buyerPhone)} · فروشنده{" "}
              {formatPhone(reservation.sellerPhone)} ·{" "}
              <RelativeTime
                date={reservation.createdAtISO}
                fallback={reservation.createdAtLabel}
              />
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[15px] font-black text-ink">
              {formatToman(reservation.grossAmount)}
            </span>
            {disputed ? (
              <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
                <Gavel className="size-4" />
                حل اختلاف
              </Button>
            ) : null}
          </div>
        </div>
      </motion.article>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="حل اختلاف"
        description="پول الان در کیف پول سایت است و هنوز به کسی نرسیده. یک طرف را انتخاب کن."
        footer={
          <Button variant="outline" onClick={() => setOpen(false)}>
            انصراف
          </Button>
        }
      >
        <div className="space-y-4">
          <Textarea
            label="دلیل تصمیم (برای هر دو طرف ارسال می‌شود)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={280}
            placeholder="مثلاً: خریدار رسید تحویل را دارد، تحویل انجام شده."
          />

          <div className="flex gap-3">
            <Button
              className="flex-1"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await resolveDisputeAction(
                    reservation.code,
                    "seller",
                    note,
                  );
                  if (result?.ok) {
                    toast.success(result.message);
                    setOpen(false);
                    router.refresh();
                  } else if (result) {
                    toast.error(result.message);
                  }
                })
              }
            >
              پول به فروشنده
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await resolveDisputeAction(
                    reservation.code,
                    "buyer",
                    note,
                  );
                  if (result?.ok) {
                    toast.success(result.message);
                    setOpen(false);
                    router.refresh();
                  } else if (result) {
                    toast.error(result.message);
                  }
                })
              }
            >
              بازگشت به خریدار
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}