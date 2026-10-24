import { Suspense } from "react";

import { Hero } from "@/components/marketing/hero";
import {
  HowItWorks,
  LiveFeed,
  ScrollProgress,
  TrustBar,
  UpcomingDays,
} from "@/components/marketing/sections";
import { ListingCard } from "@/components/market/listing-card";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, Reveal, SkeletonCard } from "@/components/ui/motion-primitives";
import { SectionHeading } from "@/components/marketing/sections";

import { currentUser } from "@/lib/auth";
import { FEE_PERCENT } from "@/lib/config";
import { formatJalaliShort } from "@/lib/dates";
import {
  getMarketListings,
  getMarketStats,
  getRecentSales,
  getUpcomingDays,
} from "@/lib/queries";
import { walletBalance } from "@/lib/wallet";

/**
 * صفحه‌ی اصل.
 *
 * Static shell (hero + how it works) renders at build time; every number and
 * every listing streams in behind `<Suspense>`. That split is why the first
 * paint is instant on a phone with two bars of signal, while the live counts
 * still come from Postgres on every visit.
 */

export default function HomePage() {
  return (
    <>
      <ScrollProgress />
      <Suspense fallback={<HeroSkeleton />}>
        <HeroBlock />
      </Suspense>

      <Suspense fallback={<TrustBarSkeleton />}>
        <TrustBarBlock />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <UpcomingDaysBlock />
      </Suspense>

      <HowItWorks />

      <Suspense fallback={<SectionSkeleton />}>
        <LiveMarketBlock />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <LiveFeedBlock />
      </Suspense>

      <FinalCta />
    </>
  );
}

async function HeroBlock() {
  const [stats, days] = await Promise.all([getMarketStats(), getUpcomingDays(1)]);
  const next = days[0];

  return (
    <Hero
      stats={stats}
      nextDay={
        next ? { title: next.title, dateLabel: formatJalaliShort(next.date), tokens: next.availableTokens } : null
      }
    />
  );
}

async function TrustBarBlock() {
  const stats = await getMarketStats();
  return <TrustBar profit={stats.profit} completed={stats.completed} />;
}

async function UpcomingDaysBlock() {
  const days = await getUpcomingDays(6);
  return (
    <UpcomingDays
      days={days.map((day) => ({
        id: day.id,
        title: day.title,
        mealType: day.mealType,
        menu: day.menu,
        dateLabel: formatJalaliShort(day.date),
        officialPrice: day.officialPrice,
        statusLabel: day.statusLabel,
        openListings: day.openListings,
        availableTokens: day.availableTokens,
      }))}
    />
  );
}

async function LiveMarketBlock() {
  const [listings, user] = await Promise.all([getMarketListings({}), currentUser()]);
  const balance = user ? await walletBalance(user.id) : null;
  const userId = user?.id ?? -1;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            align="start"
            eyebrow="همین حالا"
            title="ژتون‌های آماده‌ی فروش"
            description="قیمت و محل و ساعت — همین‌هایی که خریدار می‌بیند."
          />
          <LinkButton href="/market" variant="ghost" size="sm">
            دیدن همه
          </LinkButton>
        </div>
      </Reveal>

      {listings.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="الان ژتونی برای فروش نیست"
          description="اگر ژتون اضافه داری، اولین آگهی را بگذار تا بازار راه بیفتد."
          action={<LinkButton href="/sell">فروش ژتون</LinkButton>}
        />
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {listings.slice(0, 3).map((listing, index) => (
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
    </section>
  );
}

async function LiveFeedBlock() {
  const items = await getRecentSales(5);
  return <LiveFeed items={items} />;
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <Reveal>
        <div className="glass-strong aura relative overflow-hidden rounded-[2rem] px-6 py-14 text-center">
          <h2 className="mx-auto max-w-2xl text-[clamp(1.5rem,3.6vw,2.4rem)] font-black leading-tight tracking-tight text-ink">
            ژتونی که امروز بی‌استفاده می‌ماند،
            <br />
            فردا ناهار یک نفر دیگر است.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[14px] leading-8 text-ink-muted">
            ثبت‌نام با شماره تماس و تاییدشده با تلگرام، بدون ایمیل و بدون
            فرم‌های طولانی. پول تا لحظه‌ی تحویل امن می‌ماند.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <LinkButton href="/register" size="lg">
              ساخت حساب
            </LinkButton>
            <LinkButton href="/how-it-works" variant="outline" size="lg">
              قوانین و روند
            </LinkButton>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ----------------------------- اسکلت‌ها ----------------------------- */

function HeroSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6">
      <div className="skeleton h-7 w-64 rounded-full" />
      <div className="mt-6 space-y-3">
        <div className="skeleton h-12 w-80 max-w-full" />
        <div className="skeleton h-12 w-56" />
      </div>
      <div className="mt-6 max-w-xl space-y-2">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-11/12" />
        <div className="skeleton h-4 w-9/12" />
      </div>
      <div className="mt-9 flex gap-3">
        <div className="skeleton h-13 w-44 rounded-2xl" />
        <div className="skeleton h-13 w-40 rounded-2xl" />
      </div>
    </div>
  );
}

function TrustBarSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="skeleton h-32 w-full rounded-xl2" />
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-xl space-y-3">
        <div className="skeleton mx-auto h-6 w-32 rounded-full" />
        <div className="skeleton mx-auto h-9 w-72" />
        <div className="skeleton mx-auto h-4 w-full" />
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}