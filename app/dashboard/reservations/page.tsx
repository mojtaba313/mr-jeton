import { Ticket } from "lucide-react";
import { Suspense } from "react";

import { ReservationCard } from "@/components/dashboard/reservation-card";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/motion-primitives";

import { requireUser } from "@/lib/auth";
import { getMyReservations } from "@/lib/queries";

export const metadata = { title: "رزروهای من" };

/** رزروهای من — هم خریدها، هم فروش‌ها. */
export default async function ReservationsPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">رزروها</h1>
        <p className="mt-1.5 text-[13px] leading-6 text-ink-muted">
          هر رزرو، یک نقطه‌ی تحویل، یک بازه‌ی زمانی و یک شماره تماس. سر وقت برو و
          ببین چه کسی منتظر توست.
        </p>
      </header>

      <Suspense fallback={<ReservationsSkeleton />}>
        <ReservationsBlock />
      </Suspense>
    </div>
  );
}

async function ReservationsBlock() {
  const user = await requireUser();
  const reservations = await getMyReservations(user.id);

  if (reservations.length === 0) {
    return (
      <EmptyState
        icon={<Ticket className="size-6" />}
        title="هنوز رزروی نداری"
        description="از بازار یک ژتون رزرو کن، یا آگهی بگذار تا فروش برود."
        action={<LinkButton href="/market">رفتن به بازار</LinkButton>}
      />
    );
  }

  return (
    <div className="space-y-3">
      {reservations.map((reservation, index) => (
        <ReservationCard
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
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="skeleton h-44 rounded-xl2" />
      ))}
    </div>
  );
}