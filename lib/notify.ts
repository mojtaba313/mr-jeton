import "server-only";

import { db } from "@/lib/db";

/**
 * اعلان‌ها — کاربر باید بفهمد چه خبر است، بدون اینکه صفحه را رفرش کند.
 *
 * Notifications are rows, not emails: for a campus marketplace the audience is
 * a few hundred people who live on the same campus and check their phone. The
 * alternative — an email for "your receipt was verified" — gets ignored.
 */

export async function notify(
  userId: number,
  input: { title: string; body?: string; link?: string },
) {
  await db.notification.create({
    data: {
      userId,
      title: input.title,
      body: input.body,
      link: input.link,
    },
  });
}

/** اعلان برای همه‌ی مدیرها — رسیدهای در انتظار بررسی. */
export async function notifyAdmins(input: {
  title: string;
  body?: string;
  link?: string;
}) {
  const admins = await db.user.findMany({
    where: { role: "ADMIN", isBlocked: false },
    select: { id: true },
  });

  if (admins.length === 0) return;

  await db.notification.createMany({
    data: admins.map((admin) => ({ userId: admin.id, ...input })),
  });
}

export async function unreadCount(userId: number): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null } });
}