import { Clock3, Info, MapPin, TrendingDown } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { SellForm } from "@/components/market/sell-form";
import { Card, CardBody } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/motion-primitives";

import { currentUser } from "@/lib/auth";
import { FEE_PERCENT } from "@/lib/config";
import { formatJalaliShort, toDateInput } from "@/lib/dates";
import { formatNumber } from "@/lib/money";
import { getUpcomingDays } from "@/lib/queries";

/** فروش ژتون اضافه — با انتخاب محل و ساعت تحویل. */
export default function SellPage() {
  return (
    <Suspense fallback={<SellSkeleton />}>
      <SellBlock />
    </Suspense>
  );
}

async function SellBlock() {
  const user = await currentUser();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-ink">
          فروش ژتون اضافه
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-7 text-ink-muted">
          قیمت را خودت تعیین می‌کنی، و محل و ساعت تحویل را هم خودت — هرجا که راحتی.
          خریدار فقط همین سه چیز را می‌بیند تا وقتی رزرو نکند.
        </p>
      </header>

      {!user ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-ink-soft">
            برای گذاشتن آگهی باید وارد حساب خود شوی.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <LinkButton href="/login?next=/sell">ورود</LinkButton>
            <LinkButton href="/register" variant="outline">
              ثبت‌نام
            </LinkButton>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <Card>
            <CardBody>
              <SellFormBlock />
            </CardBody>
          </Card>

          <aside className="space-y-4">
            <Card>
              <CardBody className="space-y-4 text-[13px]">
                <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                  <TrendingDown className="size-4 text-brand-300" />
                  چطور سریع‌تر بفروشم؟
                </h2>
                <ul className="space-y-3 text-ink-muted">
                  <li className="flex gap-2">
                    <span className="text-brand-300">۱.</span>
                    قیمت را نزدیک قیمت سلف بگذار؛ خریدار دنبال ارزان‌ترین است.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-brand-300">۲.</span>
                    محل تحویل را جایی انتخاب کن که پیدا کردنش ساده باشد.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-brand-300">۳.</span>
                    بازه‌ی تحویل را واقعی بگذار؛ هرکس دیرتر بیاید، ژتون را از دست می‌دهد.
                  </li>
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="space-y-3 text-[12px] leading-6 text-ink-muted">
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-brand-300" />
                  روی نقشه، نقطه‌ی تحویل را انتخاب می‌کنی؛ خریدار همان را می‌بیند
                  و روی نقشه به مسیریابی می‌رود.
                </p>
                <p className="flex items-start gap-2">
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-brand-300" />
                  بعد از تحویل، خودت اعلام می‌کنی و خریدار تایید می‌کند؛ پول آن
                  وقتی به کیف پولت می‌آید.
                </p>
                <p className="flex items-start gap-2">
                  <Info className="mt-0.5 size-4 shrink-0 text-brand-300" />
                  سهم سایت {FEE_PERCENT}٪ است و باقی‌اش سهم تو. اگر خواستی، از
                  کیف پول برداشت می‌کنی.
                </p>
              </CardBody>
            </Card>
          </aside>
        </div>
      )}

      <p className="mt-8 text-center text-[12px] text-ink-faint">
        قبل از ثبت آگهی،{" "}
        <Link href="/how-it-works" className="text-brand-300 hover:underline">
          قوانین بازار
        </Link>{" "}
        را بخوان.
      </p>
    </div>
  );
}

async function SellFormBlock() {
  const days = await getUpcomingDays(6);

  return (
    <SellForm
      days={days.map((day) => ({
        id: day.id,
        label: day.title,
        hint: `${formatJalaliShort(day.date)} · ${formatNumber(day.officialPrice)} تومان`,
        dateISO: toDateInput(day.date),
      }))}
      officialPrice={days[0]?.officialPrice ?? 0}
    />
  );
}

function SellSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Skeleton className="h-9 w-64" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <Skeleton className="h-96 rounded-xl2" />
        <Skeleton className="h-72 rounded-xl2" />
      </div>
    </div>
  );
}