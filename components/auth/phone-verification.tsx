"use client";

import { motion } from "motion/react";
import { Check, Copy, Loader2, RefreshCw, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * تایید شماره با ربات تلگرام.
 *
 * The web app cannot ask Telegram anything directly — only a bot process talking
 * to the Bot API can — so this component has one job: create a claim, show the
 * deep link, and poll until the status flips. The submit button stays disabled
 * until then, which is the only thing that actually enforces the rule on the
 * client; the server checks the same claim again.
 *
 * Polling is deliberate rather than a websocket: it is a 20-second window, two
 * tabs, and a five-line effect. A socket here would be infrastructure with a
 * bug surface.
 */

type Claim = {
  claim: string;
  phone: string;
  botLink: string | null;
  bypass: boolean;
  botUsername: string | null;
};

type Status = "PENDING" | "VERIFIED" | "MISMATCH" | "EXPIRED";

const POLL_MS = 2500;

export function PhoneVerification({
  phone,
  verified,
  onVerified,
}: {
  phone: string;
  /** اگر شماره از قبل تایید شده، مستقیم سبز است. */
  verified: boolean;
  onVerified: (claim: string) => void;
}) {
  const [claim, setClaim] = useState<Claim | null>(null);
  const [status, setStatus] = useState<Status>(verified ? "VERIFIED" : "PENDING");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  async function requestClaim() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/verify/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const body = (await response.json()) as Claim & { error?: string };

      if (!response.ok) {
        setError(body.error ?? "ساخت لینک تایید ناموفق بود.");
        return;
      }

      setClaim(body);
      setStatus("PENDING");

      if (body.bypass) {
        // حالت توسعه: رباتی در کار نیست و تایید رد می‌شود.
        setStatus("VERIFIED");
        onVerified(`dev:${body.claim}`);
      }
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!claim || claim.bypass || status !== "PENDING") return;

    const tick = async () => {
      try {
        const response = await fetch(`/api/verify/status?claim=${claim.claim}`);
        if (!response.ok) return;

        const body = (await response.json()) as { status: Status };
        if (body.status && body.status !== "PENDING") setStatus(body.status);
      } catch {
        // قطعی موقت شبکه: نوبت بعدی دوباره امتحان می‌شود.
      }
    };

    timer.current = window.setInterval(tick, POLL_MS);
    void tick();

    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [claim, status]);

  useEffect(() => {
    if (status === "VERIFIED" && claim) onVerified(claim.claim);
  }, [status, claim, onVerified]);

  if (verified && !claim) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-jade-400/25 bg-jade-400/8 px-4 py-3">
        <Check className="size-4 shrink-0 text-jade-400" />
        <p className="text-[13px] text-ink-soft">شماره‌ات قبلاً تایید شده است.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-ink">تایید شماره با تلگرام</p>
          <p className="mt-1.5 text-[12px] leading-6 text-ink-muted">
            برای اینکه شماره‌ی واردشده مال خودت باشد، باید یک‌بار از ربات تاییدش
            کنی. ربات شماره‌ات را از خود تلگرام می‌گیرد و جایی نمی‌فرستد.
          </p>
        </div>

        <StatusBadge status={status} />
      </div>

      {!claim ? (
        <Button type="button" variant="soft" size="sm" onClick={requestClaim} disabled={busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          ساخت لینک تایید
        </Button>
      ) : (
        <div className="space-y-3">
          {claim.botLink ? (
            <a
              href={claim.botLink}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between gap-3 rounded-xl border border-brand-300/25 bg-brand-400/8 px-4 py-3 transition-colors hover:bg-brand-400/14"
              onClick={() => {
                // لینک در تب جدید باز می‌شود؛ کپی دستی هم در دسترس باشد.
                void navigator.clipboard
                  .writeText(claim.botLink ?? "")
                  .then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  })
                  .catch(() => undefined);
              }}
            >
              <span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-brand-200">
                <Send className="size-4 shrink-0" />
                <span className="truncate">
                  باز کردن ربات {claim.botUsername ? `@${claim.botUsername}` : ""}
                </span>
              </span>
              {copied ? (
                <span className="shrink-0 text-[11px] text-jade-400">کپی شد</span>
              ) : (
                <Copy className="size-4 shrink-0 text-brand-300 transition-colors group-hover:text-brand-200" />
              )}
            </a>
          ) : null}

          {!claim.botLink && !claim.bypass && status === "PENDING" ? (
            <p className="rounded-xl border border-ember-400/25 bg-ember-400/8 px-3 py-2 text-[12px] leading-6 text-ink-muted">
              لینکی ساخته نشد؛ یعنی ربات تلگرام هنوز تنظیم نشده. این حالت در سرور
              واقعی نباید پیش بیاید.
            </p>
          ) : null}

          {status === "PENDING" && claim.botLink ? (
            <p className="flex items-center gap-2 text-[12px] text-ink-muted">
              <Loader2 className="size-3.5 animate-spin text-brand-300" />
              منتظریم تا در تلگرام شماره را بفرستی… این پنجره را باز نگه دار.
            </p>
          ) : null}

          {status === "MISMATCH" ? (
            <p className="rounded-xl border border-rose-warm/25 bg-rose-warm/8 px-3 py-2 text-[12px] leading-6 text-rose-warm">
              شماره‌ای که تلگرام فرستاد با شماره‌ی بالا یکی نبود. اگر اکانت دیگری
              داری، با همان وارد شو — یا شماره‌ی درست را در فرم بنویس و دوباره لینک
              بگیر.
            </p>
          ) : null}

          {status === "EXPIRED" ? (
            <p className="rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 text-[12px] text-ink-muted">
              این لینک منقضی شده. یک لینک تازه بگیر.
            </p>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={requestClaim}
            disabled={busy || status === "PENDING"}
          >
            <RefreshCw className="size-3.5" />
            لینک تازه
          </Button>
        </div>
      )}

      {error ? <p className="text-[12px] text-rose-warm">{error}</p> : null}

      <input type="hidden" name="claim" value={status === "VERIFIED" ? (claim?.claim ?? "") : ""} />
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map = {
    PENDING: { label: "در انتظار", tone: "text-ink-muted", dot: "bg-ink-faint" },
    VERIFIED: { label: "تایید شد", tone: "text-jade-400", dot: "bg-jade-400" },
    MISMATCH: { label: "عدم تطابق", tone: "text-rose-warm", dot: "bg-rose-warm" },
    EXPIRED: { label: "منقضی", tone: "text-ink-faint", dot: "bg-ink-faint" },
  } as const;

  const meta = map[status];

  return (
    <motion.span
      key={status}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold",
        meta.tone,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </motion.span>
  );
}