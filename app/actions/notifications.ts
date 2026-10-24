"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function markNotificationsReadAction(): Promise<void> {
  const user = await requireUser();

  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/dashboard");
}

export async function markNotificationReadAction(id: number): Promise<void> {
  const user = await requireUser();

  await db.notification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/dashboard");
}

/** اعلام «ژتون را تحویل دادم» — همان دکمه‌ی فروشنده در صفحه‌ی رزرو. */
export async function reportHandoverAction(reservationId: number): Promise<void> {
  const user = await requireUser();

  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    select: { sellerId: true },
  });

  if (reservation?.sellerId !== user.id) return;

  revalidatePath("/dashboard/reservations");
}