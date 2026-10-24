"use client";

import { motion } from "motion/react";
import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * فرم — برچسب، ورودی، خطا.
 *
 * The label is wired with `htmlFor` and the error with `aria-describedby`, so
 * a screen reader announces the problem with the field rather than somewhere
 * else on the page. Client-side validation exists only to avoid a round trip.
 */

const FIELD_BASE =
  "w-full rounded-2xl border border-white/10 bg-canvas-deep/70 px-4 text-sm text-ink placeholder:text-ink-faint transition-[border,box-shadow,background] duration-200 focus:border-brand-300/60 focus:bg-canvas-deep focus:outline-none focus:ring-4 focus:ring-brand-400/12 disabled:opacity-50";

function Wrapper({
  label,
  error,
  hint,
  htmlFor,
  children,
  className,
}: {
  label?: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink-soft">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[12px] font-medium text-rose-warm"
        >
          {error}
        </motion.p>
      ) : hint ? (
        <p className="text-[12px] leading-5 text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  error,
  hint,
  className,
  ...props
}: React.ComponentProps<"input"> & {
  label?: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
}) {
  const id = useId();
  const fieldId = props.id ?? id;

  return (
    <Wrapper label={label} error={error} hint={hint} htmlFor={fieldId} className={className}>
      <input
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={cn(FIELD_BASE, "h-12", error && "border-rose-warm/50")}
        {...props}
      />
    </Wrapper>
  );
}

export function Textarea({
  label,
  error,
  hint,
  className,
  ...props
}: React.ComponentProps<"textarea"> & {
  label?: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
}) {
  const id = useId();
  const fieldId = props.id ?? id;

  return (
    <Wrapper label={label} error={error} hint={hint} htmlFor={fieldId} className={className}>
      <textarea
        id={fieldId}
        aria-invalid={Boolean(error)}
        className={cn(FIELD_BASE, "min-h-28 py-3 leading-7", error && "border-rose-warm/50")}
        {...props}
      />
    </Wrapper>
  );
}

export function Select({
  label,
  error,
  hint,
  options,
  className,
  ...props
}: React.ComponentProps<"select"> & {
  label?: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  const fieldId = props.id ?? id;

  return (
    <Wrapper label={label} error={error} hint={hint} htmlFor={fieldId} className={className}>
      <div className="relative">
        <select
          id={fieldId}
          aria-invalid={Boolean(error)}
          className={cn(
            FIELD_BASE,
            "h-12 cursor-pointer appearance-none pl-10",
            error && "border-rose-warm/50",
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-surface text-ink">
              {option.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Wrapper>
  );
}

/** گروه دکمه‌های رادیویی (مثلاً روش پرداخت) با هایلایت متحرک. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  layoutId,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode }[];
  layoutId: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex gap-1 rounded-2xl border border-white/10 bg-canvas-deep/60 p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex-1 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",
              active ? "text-canvas-deep" : "text-ink-muted hover:text-ink",
            )}
          >
            {active ? (
              <motion.span
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="absolute inset-0 rounded-xl bg-gradient-to-b from-brand-300 to-brand-500"
              />
            ) : null}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}