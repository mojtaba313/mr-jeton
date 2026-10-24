"use client";

import { motion } from "motion/react";
import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  Phone,
  Send,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  cancelReservationAction,
  confirmHandoverAction,
  disputeReservationAction,
  markHandoverAction,
} from "@/app/actions/market";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/form";
import { formatToman } from "@/lib/money";

/**
 * کنش‌های رزرو — تحویل و تسویه.
 *
 * The rule that shapes this whole file: **the seller cannot declare themselves
 * paid**. They can say "I handed the token over", and only the buyer can say "I
 * got it" — and that second click is what moves the money. Without it, escrow
 * is just a delayed payment with no protection on the buyer's side.
 */

export type ReservationActionsProps = {
  code: string;
  status: string;
  role: "buyer" | "seller";
  counterpartyName: string;
  counterpartyPhone: string;
  grossAmount: number;
  sellerAmount: number;
  meetPoint: string | null;
  meetText: string;
  disputeReason: string | null;
};

export function ReservationActions(props: ReservationActionsProps) {
  const { code, status, role } = props;
  const isBuyer = role === "buyer";

  return (
    <div className="space-y-3">
      {status === "RESERVED" ? (
        <Notice
          tone="brand"
          icon={<Send className="size-4" />}
          title={
            isBuyer ? "رزرو قطعی است" : "ژتون را سر وقت تحویل بده"
          }
          body={
            isBuyer
              ? `پول از کیف پولت قفل شده و بعد از تحویل به ${props.counterpartyName} می‌رسد. اگر نرسیدی، رزرو را لغو کن تا پولت برگردد.`
              : `وقتی ژتون را دادی، دکمه‌ی زیر را بزن. ${props.counterpartyName} باید تایید کند تا پول آزاد شود.`
          }
        >
          {isBuyer ? null : <HandoverButton code={code} />}
        </Notice>
      ) : null}

      {status === "AWAITING_BUYER" && isBuyer ? (
        <Notice
          tone="warn"
          icon={<Loader2 className="size-4" />}
          title="فروشنده می‌گوید ژتون را داده"
          body="اگر ژتون را گرفته‌ای، تایید کن تا پول فروشنده آزاد شود. اگر نگرفته‌ای، همین‌جا به او زنگ بزن."
        >
          <ConfirmButton code={code} />
        </Notice>
      ) : null}

      {status === "AWAITING_BUYER" && !isBuyer ? (
        <Notice
          tone="info"
          icon={<Loader2 className="size-4" />}
          title="منتظر تایید خریدار"
          body={`${props.counterpartyName} باید دریافت ژتون را تایید کند. تا آن وقت پول نزد سایت است.`}
        />
      ) : null}

      {status === "COMPLETED" ? (
        <Notice
          tone="success"
          icon={<CheckCircle2 className="size-4" />}
          title="تمام شد"
          body={
            isBuyer
              ? `پول از کیف پولت رفت به کیف پول ${props.counterpartyName}. اگر چیزی نگرفتت، می‌توانی اعتراض کنی.`
              : `${props.counterpartyName} تحویل را تایید کرد و مبلغ به کیف پولت اضافه شد.`
          }
        />
      ) : null}

      {status === "CANCELLED" ? (
        <Notice
          tone="neutral"
          icon={<Undo2 className="size-4" />}
          title="این رزرو لغو شد"
          body={
            isBuyer
              ? `${formatToman(props.grossAmount)} به کیف پولت برگشت.`
              : "ژتون‌ها به آگهی‌ات برگشتند."
          }
        />
      ) : null}

      {status === "DISPUTED" ? (
        <Notice
          tone="danger"
          icon={<MessageCircle className="size-4" />}
          title="این رزرو اعتراض شده"
          body={`مدیر پیگیری می‌کند و تعیین تکلیف می‌کند. تا آن وقت پول نزد سایت است.${
            props.disputeReason ? ` دلیل ثبت‌شده: «${props.disputeReason}»` : ""
          }`}
        />
      ) : null}

      <ContactRow
        name={props.counterpartyName}
        phone={props.counterpartyPhone}
        role={isBuyer ? "فروشنده" : "خریدار"}
      />

      {status === "RESERVED" && isBuyer ? (
        <CancelButton code={code} />
      ) : null}

      {status === "RESERVED" || status === "AWAITING_BUYER" ? (
        <DisputeButton code={code} isBuyer={isBuyer} other={props.counterpartyName} />
      ) : null}
    </div>
  );
}

function HandoverButton({ code }: { code: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await markHandoverAction(code);
          if (result?.ok) {
            toast.success(result.message);
            router.refresh();
          } else if (result) {
            toast.error(result.message);
          }
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
      ژتون را تحویل دادم
    </Button>
  );
}

function ConfirmButton({ code }: { code: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="success"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await confirmHandoverAction(code);
          if (result?.ok) {
            toast.success(result.message);
            router.refresh();
          } else if (result) {
            toast.error(result.message);
          }
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
      ژتون را گرفتم — تایید می‌کنم
    </Button>
  );
}

function CancelButton({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        انصراف از رزرو
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="از رزرو منصرف شوی؟"
        description="مبلغ به کیف پولت برمی‌گردد و ژتون‌ها دوباره در آگهی فروشنده می‌آیند."
      >
        <div className="flex gap-3">
          <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
            <Button
              variant="danger"
              className="w-full"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await cancelReservationAction(code);
                  setOpen(false);
                  if (result?.ok) {
                    toast.success(result.message);
                    router.refresh();
                  } else if (result) {
                    toast.error(result.message);
                  }
                })
              }
            >
              {pending ? "…" : "بله، رزرو را لغو کن"}
            </Button>
          </motion.div>
          <Button variant="outline" onClick={() => setOpen(false)}>
            بی‌خیال
          </Button>
        </div>
      </Dialog>
    </>
  );
}

/**
 * اعتراض — راه سوم، وقتی نه لغو جواب می‌دهد نه تایید.
 *
 * خریداری که ژتون را نگرفته و فروشنده‌ای که خریدار تایید نمی‌کند، هر دو با
 * «بی‌خیال» یک‌طرفه از بازی خارج می‌شوند. اعتراض رزرو را قفل می‌کند تا مدیر
 * داوری کند.
 */
function DisputeButton({
  code,
  isBuyer,
  other,
}: {
  code: string;
  isBuyer: boolean;
  other: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <MessageCircle className="size-4" />
        اعتراض به این رزرو
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="به این رزرو اعتراض داری"
        description="پول و ژتون هر دو تا تعیین تکلیف مدیر قفل می‌مانند. دلیلت را بنویس تا داوری سریع‌تر باشد."
        footer={
          <Button variant="outline" onClick={() => setOpen(false)}>
            انصراف
          </Button>
        }
      >
        <div className="space-y-4">
          <Textarea
            label="دلیل اعتراض"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={400}
            placeholder={
              isBuyer
                ? `مثلاً: ${other} گفت ژتون را داد ولی چیزی به دستم نرسید.`
                : `مثلاً: ${other} ژتون را تحویل گرفت ولی تایید نمی‌کند.`
            }
          />

          <Button
            variant="danger"
            className="w-full"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await disputeReservationAction(code, reason);
                if (result?.ok) {
                  setOpen(false);
                  toast.success(result.message);
                  router.refresh();
                } else if (result) {
                  toast.error(result.message);
                }
              })
            }
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
            ثبت اعتراض
          </Button>
        </div>
      </Dialog>
    </>
  );
}

/** اطلاعات تماس — این‌ها فقط بعد از رزرو وجود دارند. */
function ContactRow({
  name,
  phone,
  role,
}: {
  name: string;
  phone: string;
  role: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="min-w-0">
        <p className="text-[12px] text-ink-muted">{role}</p>
        <p className="mt-0.5 truncate text-[14px] font-bold text-ink">{name}</p>
      </div>

      <a
        href={`tel:${phone}`}
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-brand-400/12 px-3.5 text-[13px] font-semibold text-brand-200 transition-colors hover:bg-brand-400/20"
      >
        <Phone className="size-4" />
        <span dir="ltr">{phone}</span>
      </a>
    </div>
  );
}

function Notice({
  tone,
  icon,
  title,
  body,
  children,
}: {
  tone: "brand" | "success" | "warn" | "info" | "neutral" | "danger";
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const tones = {
    brand: "border-brand-300/25 bg-brand-400/6",
    success: "border-jade-400/25 bg-jade-400/6",
    warn: "border-ember-400/25 bg-ember-400/6",
    info: "border-sky-warm/25 bg-sky-warm/6",
    neutral: "border-white/10 bg-white/[0.03]",
    danger: "border-rose-warm/25 bg-rose-warm/6",
  } as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 ${tones[tone]}`}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 text-brand-200">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink">{title}</p>
          <p className="mt-1.5 text-[12px] leading-6 text-ink-muted">{body}</p>
          {children ? <div className="mt-3 flex flex-wrap gap-2">{children}</div> : null}
        </div>
      </div>
    </motion.div>
  );
}
