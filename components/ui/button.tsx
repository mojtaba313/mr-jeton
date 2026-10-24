"use client";

import Link from "next/link";
import { motion, type HTMLMotionProps } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * دکمه — یک پایه، سه رنگ، و یک اسپرینگ کوچک روی انگشت.
 *
 * The press feedback is a scale spring rather than a CSS `active:` style
 * because the spring carries the release: a button that snaps back tells you
 * the click was received faster than a colour change does.
 */

const VARIANTS = {
  primary:
    "bg-gradient-to-b from-brand-300 to-brand-500 text-canvas-deep font-bold shadow-[0_10px_30px_-10px_rgba(251,191,36,0.65)] hover:shadow-[0_14px_40px_-10px_rgba(251,191,36,0.8)]",
  soft: "bg-brand-400/12 text-brand-100 border border-brand-300/25 hover:bg-brand-400/20 hover:border-brand-300/45",
  outline:
    "border border-white/12 bg-white/[0.03] text-ink-soft hover:border-brand-300/40 hover:text-ink",
  ghost: "text-ink-muted hover:bg-white/[0.06] hover:text-ink",
  danger:
    "border border-rose-warm/30 bg-rose-warm/10 text-rose-warm hover:bg-rose-warm/20",
  success:
    "bg-gradient-to-b from-jade-400 to-jade-500 text-canvas-deep font-bold shadow-[0_10px_30px_-12px_rgba(16,185,129,0.7)]",
} as const;

const SIZES = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-xl",
  md: "h-11 px-5 text-sm gap-2 rounded-2xl",
  lg: "h-13 px-7 text-base gap-2.5 rounded-2xl",
} as const;

type Variant = keyof typeof VARIANTS;
type Size = keyof typeof SIZES;

const base =
  "relative inline-flex select-none items-center justify-center whitespace-nowrap transition-[background,border,color,box-shadow] duration-200 disabled:pointer-events-none disabled:opacity-45";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children?: React.ReactNode;
};

export type ButtonProps = CommonProps &
  Omit<HTMLMotionProps<"button">, "children" | "className" | "ref">;

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ y: -1.5 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      className={cn(base, VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}

type LinkButtonProps = CommonProps & {
  href: string;
  prefetch?: boolean;
  scroll?: boolean;
};

/** همان ظاهر دکمه، برای لینک‌ها — تا CTAها همگی یک زبان بصری داشته باشند. */
export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <motion.span
      className={cn(base, VARIANTS[variant], SIZES[size], className)}
      whileHover={{ y: -1.5 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
    >
      <Link href={href} className="flex h-full w-full items-center justify-center gap-2" {...rest}>
        {children}
      </Link>
    </motion.span>
  );
}

/** دکمه‌ی آیکونی گرد، برای نوار ابزارها و کارت‌ها. */
export function IconButton({
  className,
  children,
  label,
  ...props
}: Omit<ButtonProps, "size"> & { label: string }) {
  return (
    <motion.button
      aria-label={label}
      title={label}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 24 }}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-ink-soft transition-colors hover:border-brand-300/40 hover:text-brand-200 disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}