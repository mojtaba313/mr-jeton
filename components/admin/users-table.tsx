"use client";

import { motion } from "motion/react";
import { Ban, CheckCircle2, ShieldCheck, User2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { setUserRoleAction, toggleUserBlockAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/button";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatPhone } from "@/lib/phone";
import { formatToman } from "@/lib/money";
import { initials } from "@/lib/utils";

/**
 * جدول کاربران.
 *
 * Role changes and blocks are two icon buttons rather than a dropdown: they are
 * the only two actions that exist, and each is guarded server-side by
 * `requireAdmin` — the UI just makes the consequence visible (a block is
 * irreversible from this screen, so it asks first).
 */

export type UserRow = {
  id: number;
  name: string;
  phone: string;
  studentId: string | null;
  role: "USER" | "ADMIN";
  isBlocked: boolean;
  verified: boolean;
  atISO: string;
  atLabel: string;
  balance: number;
  listings: number;
  reservations: number;
};

export function UsersTable({
  users,
  selfId,
}: {
  users: UserRow[];
  selfId: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; message: string } | null>) =>
    startTransition(async () => {
      const result = await action();
      if (!result) return;
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-right">
        <thead>
          <tr className="border-b border-white/8 text-[11px] text-ink-faint">
            <th className="p-3 font-medium">کاربر</th>
            <th className="p-3 font-medium">شماره تماس</th>
            <th className="p-3 font-medium">کیف پول</th>
            <th className="p-3 font-medium">فعالیت</th>
            <th className="p-3 font-medium">نقش</th>
            <th className="p-3 font-medium">وضعیت</th>
            <th className="p-3 text-left font-medium">اقدام</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user, index) => {
            const isSelf = user.id === selfId;

            return (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.3) }}
                className="border-b border-white/5 last:border-0"
              >
                <td className="p-3">
                  <span className="flex items-center gap-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-300/80 to-ember-500/80 text-[11px] font-black text-canvas-deep">
                      {initials(user.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-ink">
                        {user.name}
                      </span>
                      <span className="block text-[11px] text-ink-faint">
                        <RelativeTime date={user.atISO} fallback={user.atLabel} />
                      </span>
                    </span>
                  </span>
                </td>

                <td className="p-3">
                  <span dir="ltr" className="text-[13px] text-ink-muted">
                    {formatPhone(user.phone)}
                  </span>
                  {user.studentId ? (
                    <span className="block text-[11px] text-ink-faint">
                      دانشجویی: {user.studentId}
                    </span>
                  ) : null}
                  {!user.verified ? (
                    <span className="block text-[11px] text-ember-400">تایید نشده</span>
                  ) : null}
                </td>

                <td className="p-3 text-[12px] font-semibold text-ink-soft">
                  {formatToman(user.balance)}
                </td>

                <td className="p-3 text-[12px] text-ink-muted">
                  {user.listings} آگهی · {user.reservations} رزرو
                </td>

                <td className="p-3">
                  {user.role === "ADMIN" ? (
                    <Badge tone="brand">
                      <ShieldCheck className="size-3" />
                      مدیر
                    </Badge>
                  ) : (
                    <Badge tone="neutral">
                      <User2 className="size-3" />
                      کاربر
                    </Badge>
                  )}
                </td>

                <td className="p-3">
                  {user.isBlocked ? (
                    <Badge tone="danger">مسدود</Badge>
                  ) : (
                    <Badge tone="success">فعال</Badge>
                  )}
                </td>

                <td className="p-3">
                  <span className="flex justify-end gap-2">
                    <IconButton
                      label={user.role === "ADMIN" ? "تبدیل به کاربر" : "ارتقا به مدیر"}
                      disabled={isSelf || pending}
                      onClick={() =>
                        run(() =>
                          setUserRoleAction(
                            user.id,
                            user.role === "ADMIN" ? "USER" : "ADMIN",
                          ),
                        )
                      }
                    >
                      <CheckCircle2 className="size-4" />
                    </IconButton>

                    <IconButton
                      label={user.isBlocked ? "رفع مسدودی" : "مسدود کردن"}
                      disabled={isSelf || pending}
                      className={
                        user.isBlocked
                          ? "border-jade-400/30 text-jade-400"
                          : "border-rose-warm/30 text-rose-warm"
                      }
                      onClick={() => {
                        const next = !user.isBlocked;
                        if (
                          next &&
                          !window.confirm(
                            `کاربر «${user.name}» مسدود شود؟ دسترسی‌اش به بازار بسته می‌شود.`,
                          )
                        ) {
                          return;
                        }
                        run(() => toggleUserBlockAction(user.id, next));
                      }}
                    >
                      <Ban className="size-4" />
                    </IconButton>
                  </span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}