"use client";

import { motion } from "motion/react";
import { Bell, ChevronLeft } from "lucide-react";
import Link from "next/link";

import { RelativeTime } from "@/components/ui/relative-time";
import { toPersianDigits } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * فهرست اعلان‌ها.
 *
 * Unread items get a warm dot and a slightly brighter surface; read ones fade
 * back. Staggering the entrance by index keeps a list of twenty notifications
 * from appearing as one block of text.
 */
export function NotificationsList({
  items,
}: {
  items: {
    id: number;
    title: string;
    body: string | null;
    link: string | null;
    atISO: string;
    atLabel: string;
    read: boolean;
  }[];
}) {
  return (
    <ul className="divide-y divide-white/5">
      {items.map((item, index) => {
        const content = (
          <div className="flex items-start gap-3 px-5 py-4">
            <span
              className={cn(
                "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl transition-colors",
                item.read
                  ? "bg-white/[0.05] text-ink-faint"
                  : "bg-brand-400/12 text-brand-300",
              )}
            >
              <Bell className="size-4" />
            </span>

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-[14px] font-semibold",
                  item.read ? "text-ink-muted" : "text-ink",
                )}
              >
                {item.title}
              </p>
              {item.body ? (
                <p className="mt-1 text-[13px] leading-6 text-ink-muted">
                  {item.body}
                </p>
              ) : null}
              <p className="mt-1.5 text-[11px] text-ink-faint">
                <RelativeTime date={item.atISO} fallback={item.atLabel} />
              </p>
            </div>

            {item.link ? (
              <ChevronLeft className="mt-1 size-4 shrink-0 text-ink-faint" />
            ) : null}
          </div>
        );

        return (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4) }}
            className={cn(
              "transition-colors",
              !item.read && "bg-brand-400/[0.04]",
            )}
          >
            {item.link ? (
              <Link href={item.link} className="block hover:bg-white/[0.03]">
                {content}
              </Link>
            ) : (
              content
            )}
          </motion.li>
        );
      })}
    </ul>
  );
}

/** شمارنده‌ی کوچک برای هدر. */
export function UnreadDot({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="grid min-w-4.5 place-items-center rounded-full bg-brand-400 px-1 text-[10px] font-bold text-canvas-deep">
      {toPersianDigits(count)}
    </span>
  );
}