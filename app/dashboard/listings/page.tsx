import { MapPin, Ticket } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { CloseListingButton } from "@/components/dashboard/close-listing-button";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState, Reveal, Skeleton } from "@/components/ui/motion-primitives";
import { RelativeTime } from "@/components/ui/relative-time";

import { requireUser } from "@/lib/auth";
import { LISTING_STATUS } from "@/lib/labels";
import { toPersianDigits } from "@/lib/dates";
import { formatToman } from "@/lib/money";
import { getMyListings } from "@/lib/queries";

export const metadata = { title: "آگهی‌های من" };

export default async function MyListingsPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">
            آگهی‌های من
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-muted">
            هر آگهی، چند ژتون و چند نفر آن را رزرو کرده‌اند.
          </p>
        </div>
        <LinkButton href="/sell" size="sm">
          آگهی جدید
        </LinkButton>
      </header>

      <Suspense fallback={<ListingsSkeleton />}>
        <ListingsBlock />
      </Suspense>
    </div>
  );
}

async function ListingsBlock() {
  const user = await requireUser();
  const listings = await getMyListings(user.id);

  if (listings.length === 0) {
    return (
      <EmptyState
        icon={<Ticket className="size-6" />}
        title="هنوز آگهی نگذاشته‌ای"
        description="اگر ژتون رزروشده‌ای را استفاده نمی‌کنی، همین الان در بازار بگذارش."
        action={<LinkButton href="/sell">فروش ژتون</LinkButton>}
      />
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((listing, index) => {
        const status = LISTING_STATUS[listing.status as keyof typeof LISTING_STATUS];
        const reserved = listing.reservations.reduce(
          (sum, reservation) => sum + reservation.quantity,
          0,
        );

        return (
          <Reveal key={listing.id} delay={Math.min(index * 0.05, 0.3)}>
            <Card>
              <CardBody className="flex flex-wrap items-center gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-400/12 text-brand-300">
                  <Ticket className="size-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-bold text-ink">
                      {toPersianDigits(listing.quantity)} ژتون — {listing.dayTitle}
                    </h3>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>

                  <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-faint">
                    <MapPin className="size-3.5" />
                    {listing.locationText} · {listing.deliveryDateLabel}
                    {listing.deliveryWindow ? ` · ${listing.deliveryWindow}` : ""}
                  </p>

                  <p className="mt-1 text-[11px] text-ink-faint">
                    <RelativeTime date={listing.createdAtISO} fallback={listing.createdAtLabel} />
                  </p>

                  {listing.reservations.length > 0 ? (
                    <p className="mt-2 text-[12px] text-ink-muted">
                      رزرو شده: {toPersianDigits(reserved)} از{" "}
                      {toPersianDigits(listing.quantity)} ژتون —{" "}
                      <span className="text-brand-300">
                        {listing.reservations
                          .map((reservation) => (
                            <Link
                              key={reservation.id}
                              href={`/dashboard/reservations/${reservation.code}`}
                              className="hover:underline"
                            >
                              {reservation.code}
                            </Link>
                          ))
                          .join("، ")}
                      </span>
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-ink">
                    {formatToman(listing.unitPrice)}
                    <span className="mr-1 text-[11px] font-normal text-ink-muted">
                      هر ژتون
                    </span>
                  </span>
                  <CloseListingButton
                    listingId={listing.id}
                    disabled={
                      listing.status !== "OPEN" || listing.reservations.length > 0
                    }
                  />
                </div>
              </CardBody>
            </Card>
          </Reveal>
        );
      })}
    </div>
  );
}

function ListingsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl2" />
      ))}
    </div>
  );
}