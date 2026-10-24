"use client";

import { Loader2, MessageCircle } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { loginAction, registerAction, type AuthState } from "@/app/actions/auth";
import { PhoneVerification } from "@/components/auth/phone-verification";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form";
import { normalizePhone } from "@/lib/phone";

/**
 * فرم‌های ورود و ثبت‌نام — با شماره تماس.
 *
 * Registration is two steps in one form: the phone is written first, the Telegram
 * bot confirms it, and only then does the submit button unlock. The server
 * re-checks the same claim, so this is presentation, not security.
 */
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const action = isRegister ? registerAction : loginAction;

  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    null,
  );

  const [phone, setPhone] = useState("");
  const [claim, setClaim] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (state && !state.ok) toast.error(state.message);
  }, [state]);

  const phoneValid = /^9\d{9}$/.test(normalizePhone(phone));
  const canSubmit = isRegister ? phoneValid && verified && claim !== "" : phoneValid;

  return (
    <form action={formAction} className="space-y-4">
      {isRegister ? (
        <Field
          label="نام و نام خانوادگی"
          name="name"
          autoComplete="name"
          required
          placeholder="مثلاً: سارا محمدی"
          error={state?.errors?.name}
        />
      ) : null}

      <Field
        label="شماره تماس"
        name="phone"
        inputMode="tel"
        dir="ltr"
        required
        autoComplete="tel"
        placeholder="۰۹۱۲۳۴۵۶۷۸۹"
        value={phone}
        onChange={(event) => {
          setPhone(event.target.value);
          setVerified(false);
          setClaim("");
        }}
        error={state?.errors?.phone}
        hint={
          isRegister
            ? "با همین شماره وارد می‌شوی و طرف معامله همین را می‌بیند."
            : undefined
        }
      />

      {isRegister ? (
        <>
          <Field
            label="شماره دانشجویی (اختیاری)"
            name="studentId"
            inputMode="numeric"
            dir="ltr"
            placeholder="۴۰۱۲۳۴۵۶۷"
            error={state?.errors?.studentId}
            hint="برای احراز هویت لازم نیست؛ فقط اگر دوست داری ثبتش کن."
          />

          {phoneValid ? (
            <PhoneVerification
              phone={phone}
              verified={verified}
              onVerified={(token) => {
                setClaim(token);
                setVerified(true);
              }}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-3 text-[12px] leading-6 text-ink-faint">
              اول شماره‌ات را بنویس تا لینک تایید تلگرام ساخته شود.
            </p>
          )}

          {state?.errors?.claim ? (
            <p className="text-[12px] font-medium text-rose-warm">{state.errors.claim}</p>
          ) : null}
        </>
      ) : null}

      <Field
        label="رمز عبور"
        name="password"
        type="password"
        required
        dir="ltr"
        autoComplete={isRegister ? "new-password" : "current-password"}
        placeholder="••••••••"
        hint={isRegister ? "حداقل ۸ نویسه." : undefined}
        error={state?.errors?.password}
      />

      {isRegister ? (
        <Field
          label="تکرار رمز عبور"
          name="confirmPassword"
          type="password"
          required
          dir="ltr"
          autoComplete="new-password"
          placeholder="••••••••"
          error={state?.errors?.confirmPassword}
        />
      ) : null}

      {state && !state.ok ? (
        <p
          role="alert"
          className="rounded-xl border border-rose-warm/25 bg-rose-warm/8 px-3.5 py-2.5 text-[13px] text-rose-warm"
        >
          {state.message}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending || !canSubmit}
        className="w-full"
        size="lg"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            لطفاً صبر کن…
          </>
        ) : isRegister ? (
          "ساخت حساب"
        ) : (
          "ورود"
        )}
      </Button>

      {!canSubmit && !pending ? (
        <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-ink-faint">
          {isRegister && !verified ? (
            <>
              <MessageCircle className="size-3.5" />
              اول شماره‌ات را با ربات تلگرام تایید کن
            </>
          ) : (
            "شماره تماس را کامل بنویس"
          )}
        </p>
      ) : null}
    </form>
  );
}