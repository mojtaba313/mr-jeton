import { Ticket } from "lucide-react";
import { Suspense } from "react";

import { AdminReservationRow } from "@/components/admin/reservation-row";
import { EmptyState, Skeleton } from "@/components/ui/motion-primitives";

import { requireAdmin } from "@/lib/auth";
import { getAllReservations } from "@/lib/queries";

export const metadata = { title: "رزروها" };

/** همه‌ی رزروها — فقط برای پیگیری، با دکمه‌ی حل اختلاف در صورت نیاز. */
export default async function AdminReservationsPage() {
  await requireAdmin();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">رزروها</h1>
        <p className="mt-1.5 text-[13px] leading-6 text-ink-muted">
          مدیر در معامله دخالتی ندارد؛ این صف فقط برای پیگیری است، و وقتی یکی از
          طرفین اعتراض کند، از همین‌جاست.
        </p>
      </header>

      <Suspense fallback={<ReservationsSkeleton />}>
        <ReservationsBlock />
      </Suspense>
    </div>
  );
}

async function ReservationsBlock() {
  await requireAdmin();
  const reservations = await getAllReservations();

  if (reservations.length === 0) {
    return (
      <EmptyState
        icon={<Ticket className="size-6" />}
        title="رزروی ثبت نشده"
        description="اولین معامله‌ای که در بازار انجام شود اینجا دیده می‌شود."
      />
    );
  }

  return (
    <div className="space-y-3">
      {reservations.map((reservation, index) => (
        <AdminReservationRow
          key={reservation.id}
          reservation={reservation}
          index={index}
        />
      ))}
    </div>
  );
}

function ReservationsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl2" />
      ))}
    </div>
  );
}
