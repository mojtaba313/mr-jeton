"use client";

import { ArrowDownLeft, ArrowUpRight, CreditCard, Loader2, Receipt } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  requestTopUpAction,
  requestWithdrawAction,
  type WalletActionState,
} from "@/app/actions/wallet";
import { ReceiptUpload, type UploadState } from "@/components/market/receipt-upload";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, SegmentedControl, Textarea } from "@/components/ui/form";
import { PAYMENT } from "@/lib/config";
import { toPersianDigits } from "@/lib/dates";
import { formatToman, parseToman } from "@/lib/money";

/**
 * کیف پول — شارژ و برداشت.
 *
 * Both actions open a dialog rather than sitting inline: each needs a card
 * number, a receipt and an amount, and a wallet page with three forms on it
 * reads like a bank statement. One dialog, one action, is easier to reason about
 * than three.
 */

export function WalletActions({
  balance,
  minTopUp,
  minWithdrawal,
}: {
  balance: number;
  minTopUp: number;
  minWithdrawal: number;
}) {
  const [dialog, setDialog] = useState<"topup" | "withdraw" | null>(null);

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => setDialog("topup")}>
        <CreditCard className="size-4" />
        شارژ کیف پول
      </Button>

      <Button
        variant="outline"
        onClick={() => setDialog("withdraw")}
        disabled={balance < minWithdrawal}
      >
        <ArrowUpRight className="size-4" />
        درخواست برداشت
      </Button>

      {balance < minWithdrawal ? (
        <p className="w-full text-[12px] text-ink-faint">
          حداقل مبلغ برداشت {formatToman(minWithdrawal)} است.
        </p>
      ) : null}

      <TopUpDialog
        open={dialog === "topup"}
        onClose={() => setDialog(null)}
        minTopUp={minTopUp}
      />
      <WithdrawDialog
        open={dialog === "withdraw"}
        onClose={() => setDialog(null)}
        balance={balance}
        minWithdrawal={minWithdrawal}
      />
    </div>
  );
}

/* ------------------------------ شارژ ------------------------------ */

function TopUpDialog({
  open,
  onClose,
  minTopUp,
}: {
  open: boolean;
  onClose: () => void;
  minTopUp: number;
}) {
  const [amount, setAmount] = useState("");
  const [upload, setUpload] = useState<UploadState>({ path: null, url: null, name: null });
  const [copied, setCopied] = useState(false);
  const [state, action, pending] = useActionState<WalletActionState, FormData>(
    requestTopUpAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      // پنجره خودش بسته می‌شود چون `open` به `state.ok` هم وابسته است؛ بستنش از
      // داخل افکت یعنی setState در افکت.
      toast.success("درخواست ثبت شد", { description: state.message });
    } else if (state && !state.ok) {
      toast.error("ثبت نشد", { description: state.message });
    }
  }, [state]);

  const parsed = parseToman(amount) ?? 0;
  const quick = [100_000, 200_000, 300_000, 500_000];

  return (
    <Dialog
      open={open && !state?.ok}
      onClose={onClose}
      title="شارژ کیف پول"
      description="مبلغ را کارت‌به‌کارت واریز کن و رسیدش را بفرست. موجودی بعد از تایید اضافه می‌شود."
    >
      <form action={action} className="space-y-5">
        <Field
          label="مبلغ واریز (تومان)"
          name="amount"
          inputMode="numeric"
          dir="ltr"
          required
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="۲۰۰۰۰۰"
          error={state?.errors?.amount}
          hint={`حداقل ${formatToman(minTopUp)}`}
        />

        <SegmentedControl
          layoutId="topup-quick"
          value={String(parsed)}
          onChange={(value) => setAmount(value)}
          options={quick.map((value) => ({
            value: String(value),
            label: `${toPersianDigits(value / 1000)}`,
          }))}
        />

        <div className="rounded-2xl border border-brand-300/20 bg-brand-400/6 p-4">
          <p className="text-[12px] text-ink-muted">شماره کارت سایت</p>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <code
              dir="ltr"
              className="select-all text-lg font-black tracking-widest text-ink"
            >
              {PAYMENT.cardNumber || "—"}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                void navigator.clipboard
                  .writeText(PAYMENT.cardNumber.replaceAll(" ", "").replaceAll("-", ""))
                  .then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  })
                  .catch(() => toast.error("کپی نشد"));
              }}
            >
              {copied ? "کپی شد" : "کپی"}
            </Button>
          </div>
          {PAYMENT.cardHolder ? (
            <p className="mt-1.5 text-[12px] text-ink-faint">
              به نام {PAYMENT.cardHolder}
            </p>
          ) : null}
        </div>

        <ReceiptUpload
          kind="receipt"
          value={upload}
          onChange={setUpload}
          error={state?.errors?.receiptUrl}
          hint="شماره پیگیری یا چهار رقم آخر کارت مبدا باید خوانا باشد."
        />

        <Textarea
          label="توضیح (اختیاری)"
          name="note"
          maxLength={280}
          placeholder="مثلاً: ساعت ۱۴:۳۰ واریز شد."
        />

        <Button type="submit" disabled={pending || !upload.path} className="w-full">
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Receipt className="size-4" />
          )}
          ارسال رسید برای بررسی
        </Button>
      </form>
    </Dialog>
  );
}

/* ----------------------------- برداشت ----------------------------- */

function WithdrawDialog({
  open,
  onClose,
  balance,
  minWithdrawal,
}: {
  open: boolean;
  onClose: () => void;
  balance: number;
  minWithdrawal: number;
}) {
  const [amount, setAmount] = useState("");
  const [state, action, pending] = useActionState<WalletActionState, FormData>(
    requestWithdrawAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("درخواست برداشت ثبت شد", { description: state.message });
    } else if (state && !state.ok) {
      toast.error("ثبت نشد", { description: state.message });
    }
  }, [state]);

  const parsed = parseToman(amount) ?? 0;

  return (
    <Dialog
      open={open && !state?.ok}
      onClose={onClose}
      title="درخواست برداشت"
      description="مبلغ به کارتی که اعلام می‌کنی واریز می‌شود. تا تایید، از موجودی کم می‌ماند."
      footer={
        <>
          <Button
            form="withdraw-form"
            type="submit"
            disabled={pending || parsed <= 0}
            className="flex-1"
          >
            {pending ? "در حال ثبت…" : `درخواست ${formatToman(parsed || 0)}`}
          </Button>
          <Button variant="outline" onClick={onClose}>
            انصراف
          </Button>
        </>
      }
    >
      <form id="withdraw-form" action={action} className="space-y-5">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[12px] text-ink-muted">موجودی قابل برداشت</p>
          <p className="mt-1 text-xl font-black text-ink">{formatToman(balance)}</p>
        </div>

        <Field
          label="مبلغ برداشت (تومان)"
          name="amount"
          inputMode="numeric"
          dir="ltr"
          required
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="۲۰۰۰۰۰"
          error={state?.errors?.amount}
          hint={`حداقل ${formatToman(minWithdrawal)}`}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant="soft"
            size="sm"
            onClick={() => setAmount(String(balance))}
          >
            <ArrowDownLeft className="size-3.5" />
            همه‌ی موجودی
          </Button>
        </div>

        <Textarea
          label="شماره کارت مقصد (اختیاری)"
          name="note"
          maxLength={280}
          placeholder="مثلاً: کارت به نام خودم."
        />
      </form>
    </Dialog>
  );
}
