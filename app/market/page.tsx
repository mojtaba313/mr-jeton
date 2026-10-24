import { Ticket } from "lucide-react";
import { Suspense } from "react";
import Link from "next/link";

import { MarketFilters } from "@/components/market/market-filters";
import { ListingCard } from "@/components/market/listing-card";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, SkeletonCard } from "@/components/ui/motion-primitives";

import { currentUser } from "@/lib/auth";
import { FEE_PERCENT } from "@/lib/config";
import { formatJalaliShort } from "@/lib/dates";
import { parseToman } from "@/lib/money";
import { getMarketListings, getUpcomingDays } from "@/lib/queries";
import { walletBalance } from "@/lib/wallet";

/** بازار ژتون — قیمت، محل و ساعت تحویل. بدون اسم و شماره‌ی فروشنده. */
export default async function MarketPage({ searchParams }: PageProps<"/market">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-ink">بازار ژتون</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-7 text-ink-muted">
          هر ژتون، با قیمتِ فروشنده و محل و ساعتی که خودش تعیین کرده. رزرو کن، سر
          وقت برو سراغش. پول تا تحویل در کیف پول سایت می‌ماند.
        </p>
      </header>

      <Suspense fallback={<div className="skeleton h-28 w-full rounded-xl2" />}>
        <MarketBrowser searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function MarketBrowser({
  searchParams,
}: Pick<PageProps<"/market">, "searchParams">) {
  const params = await searchParams;

  const dayParam = typeof params.day === "string" ? params.day : undefined;
  const sortParam = typeof params.sort === "string" ? params.sort : undefined;
  const maxParam = typeof params.max === "string" ? params.max : undefined;

  const dayId = dayParam ? Number.parseInt(dayParam, 10) : undefined;
  const sort =
    sortParam === "cheapest" || sortParam === "expensive" ? sortParam : "newest";
  const maxPrice = maxParam ? (parseToman(maxParam) ?? undefined) : undefined;

  const [listings, days, user] = await Promise.all([
    getMarketListings({
      ...(Number.isFinite(dayId) ? { dayId: dayId! } : {}),
      sort,
      ...(maxPrice ? { maxPrice } : {}),
    }),
    getUpcomingDays(8),
    currentUser(),
  ]);

  const balance = user ? await walletBalance(user.id) : null;
  const userId = user?.id ?? -1;
  const prices = listings.map((listing) => listing.unitPrice);

  return (
    <div className="space-y-6">
      <MarketFilters
        days={days.map((day) => ({
          id: day.id,
          label: formatJalaliShort(day.date),
          tokens: day.availableTokens,
        }))}
        stats={{
          count: listings.length,
          minPrice: prices.length ? Math.min(...prices) : 0,
          maxPrice: prices.length ? Math.max(...prices) : 0,
        }}
      />

      {listings.length === 0 ? (
        <EmptyState
          icon={<Ticket className="size-6" />}
          title="آگهی‌ای با این فیلترها پیدا نشد"
          description="فیلترها را باز کن، یا خودت اولین آگهی را بگذار."
          action={<LinkButton href="/sell">فروش ژتون</LinkButton>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing, index) => (
            <ListingCard
              key={listing.id}
              listing={{ ...listing, feePercent: FEE_PERCENT }}
              index={index}
              isOwner={listing.sellerId === userId}
              isSignedIn={Boolean(user)}
              balance={balance}
            />
          ))}
        </div>
      )}

      <p className="pt-2 text-center text-[12px] text-ink-faint">
        قیمت‌ها به تومان است.{" "}
        <Link href="/how-it-works" className="text-brand-300 hover:underline">
          روند کار چطور است؟
        </Link>
      </p>
    </div>
  );
}

export function MarketSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}