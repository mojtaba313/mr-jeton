import { cn } from "@/lib/utils";

/**
 * نشان وضعیت.
 *
 * Every status in the app maps to exactly one of these five tones, and the
 * Persian label is passed in rather than derived here — this file is a presentational
 * primitive, and the mapping from `OrderStatus` to words belongs with the domain.
 */

const TONES = {
  neutral: "border-white/12 bg-white/[0.05] text-ink-soft",
  brand: "border-brand-300/30 bg-brand-400/12 text-brand-200",
  success: "border-jade-400/30 bg-jade-400/12 text-jade-400",
  warn: "border-ember-400/30 bg-ember-400/12 text-ember-400",
  danger: "border-rose-warm/30 bg-rose-warm/12 text-rose-warm",
  info: "border-sky-warm/30 bg-sky-warm/12 text-sky-warm",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({
  tone = "neutral",
  className,
  pulse,
  children,
}: {
  tone?: Tone;
  className?: string;
  pulse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {pulse ? (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-70" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      ) : null}
      {children}
    </span>
  );
}

/** عدد با برچسب، برای آمارهای کوچک داخل کارت. */
export function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-[12px] text-ink-soft",
        className,
      )}
    >
      {children}
    </span>
  );
}