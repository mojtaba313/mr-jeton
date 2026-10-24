import { cn } from "@/lib/utils";

/**
 * نشان سایت — یک ژتون کارتونی با تیک.
 *
 * SVG دست‌ساز به‌جای آیکون آماده، چون لوگو باید در اندازه‌ی ۲۴ پیکسل هم خوانا
 * بماند و همان تیک، «تایید شده» را در ذهن بسازد.
 */
export function Logo({
  className,
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <span className={cn("relative inline-flex items-center gap-2.5", className)}>
      <span className="relative grid size-10 place-items-center">
        <span
          className={cn(
            "absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-200 via-brand-400 to-ember-500 shadow-[0_10px_28px_-10px_rgba(251,191,36,0.8)]",
            animated && "animate-pulse-glow",
          )}
        />
        <svg viewBox="0 0 24 24" className="relative size-5 text-canvas-deep" fill="none">
          <path
            d="M12 3.6c-3.1 0-5.6 2-5.6 4.6v5.6c0 .9.7 1.6 1.6 1.6h8c.9 0 1.6-.7 1.6-1.6V8.2c0-2.6-2.5-4.6-5.6-4.6Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M8.2 11.6l2.4 2.3 5-5.2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-black tracking-tight text-ink">
          آقای ژتون
        </span>
        <span className="mt-1 text-[10px] font-medium tracking-wide text-ink-faint">
          بازار ژتون دانشگاه
        </span>
      </span>
    </span>
  );
}