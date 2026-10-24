"use client";

import { useActionState, useEffect } from "react";
import { Loader2, ScrollText } from "lucide-react";
import { toast } from "sonner";

import { addLedgerAction, type AdminState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/form";

/** سند دستی در دفتر مالی. */
export function LedgerForm() {
  const [state, action, pending] = useActionState<AdminState, FormData>(
    addLedgerAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) toast.success(state.message);
    else if (state && !state.ok) toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="نوع سند"
          name="kind"
          defaultValue="ADJUSTMENT"
          options={[
            { value: "ADJUSTMENT", label: "اصلاح دستی (ورودی)" },
            { value: "REFUND", label: "بازگشت وجه" },
          ]}
        />
        <Field
          label="مبلغ (تومان)"
          name="amount"
          inputMode="numeric"
          dir="ltr"
          required
          placeholder="۵۰۰۰۰"
          error={state?.errors?.amount}
        />
      </div>

      <Field
        label="شرح"
        name="note"
        required
        placeholder="مثلاً: هزینه چاپ رسید — آبان ۱۴۰۵"
        error={state?.errors?.note}
      />

      <Button type="submit" disabled={pending} size="sm">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <ScrollText className="size-4" />}
        ثبت سند
      </Button>
    </form>
  );
}