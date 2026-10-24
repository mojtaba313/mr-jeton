import { ArrowRight, Hash, MapPin, Phone, Ticket } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { MiniMap } from "@/components/map/location";
import { ReservationActions } from "@/components/dashboard/reservation-actions";
import { ReservationStepper } from "@/components/dashboard/reservation-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/motion-primitives";
import { RelativeTime } from "@/components/ui/relative-time";

import { requireUser } from "@/lib/auth";
import { toPersianDigits } from "@/lib/dates";
import { formatToman } from "@/lib/money";
import { RESERVATION_STATUS } from "@/lib/labels";
import { getReservationByCode } from "@/lib/queries";
import { formatCoords } from "@/lib/maps";

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/reservations/[code]">) {
  const { code } = await params;
  return { title: `رزرو ${code}` };
}

/** جزئیات رزرو — نقطه‌ی تحویل، تماس طرفین، و کاری که مانده. */
export default async function ReservationPage({
  params,
}: PageProps<"/dashboard/reservations/[code]">) {
  const { code } = await params;
  await requireUser();

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard/reservations"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowRight className="size-4" />
        بازگشت به رزروها
      </Link>

      <Suspense fallback={<ReservationSkeleton />}>
        <ReservationBlock code={code} />
      </Suspense>
    </div>
  );
}

async function ReservationBlock({ code }: { code: string }) {
  const user = await requireUser();
  const reservation = await getReservationByCode(code, user.id);

  if (!reservation) notFound();

  const status = RESERVATION_STATUS[reservation.status as keyof typeof RESERVATION_STATUS];
  const isBuyer = reservation.role === "buyer";

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">
            رزرو {toPersianDigits(reservation.quantity)} ژتون
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-muted">
            {reservation.dayTitle} · {reservation.deliveryDateLabel}
            {reservation.deliveryWindow ? ` · ${reservation.deliveryWindow}` : ""}
          </p>
        </div>
        <Badge tone={status.tone} pulse={reservation.status === "AWAITING_BUYER"}>
          {status.label}
        </Badge>
      </header>

      <ReservationStepper status={reservation.status} />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="چه کاری از من مانده؟" />
            <CardBody>
              <ReservationActions
                code={reservation.code}
                status={reservation.status}
                role={reservation.role}
                counterpartyName={reservation.counterpartyName}
                counterpartyPhone={reservation.counterpartyPhone}
                grossAmount={reservation.grossAmount}
                sellerAmount={reservation.sellerAmount}
                meetPoint={reservation.meetPoint}
                meetText={reservation.meetText}
                disputeReason={reservation.disputeReason}
              />
              <p className="mt-3 text-[12px] leading-6 text-ink-faint">{status.hint}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="محل تحویل"
              description={`${reservation.deliveryDateLabel}${reservation.deliveryWindow ? ` · ${reservation.deliveryWindow}` : ""}`}
            />
            <CardBody className="space-y-4">
              <MiniMap
                lat={reservation.lat}
                lng={reservation.lng}
                label={reservation.meetPoint}
                className="h-52"
              />

              <p className="flex items-start gap-2 text-[13px] leading-7 text-ink-soft">
                <MapPin className="mt-1 size-4 shrink-0 text-brand-300" />
                {reservation.meetText}
              </p>

              <p className="text-[11px] text-ink-faint">
                مختصات: <span dir="ltr">{formatCoords(reservation.lat, reservation.lng)}</span>
              </p>
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card>
            <CardHeader title="جزئیات" />
            <CardBody className="space-y-3.5 text-[13px]">
              <Row icon={Ticket} label="تعداد ژتون">
                {toPersianDigits(reservation.quantity)}
              </Row>
              <Row label="قیمت هر ژتون">{formatToman(reservation.unitPrice)}</Row>
              <Row label="جمع کل">{formatToman(reservation.grossAmount)}</Row>
              <Row label="سهم سایت">{formatToman(reservation.feeAmount)}</Row>
              <div className="rule-glow my-1" />
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-ink-muted">
                  {isBuyer ? "کسرشده از کیف پول تو" : "دریافتی تو"}
                </span>
                <span className="text-lg font-black text-brand-200">
                  {formatToman(isBuyer ? reservation.grossAmount : reservation.sellerAmount)}
                </span>
              </div>
              <div className="rule-glow my-1" />
              <Row icon={Hash} label="کد رزرو">
                <span dir="ltr" className="font-black tracking-widest text-ink">
                  {reservation.code}
                </span>
              </Row>
              <Row icon={Phone} label="زمان ثبت">
                <RelativeTime
                  date={reservation.createdAtISO}
                  fallback={reservation.createdAtLabel}
                />
              </Row>
            </CardBody>
          </Card>

          <Card className="border-white/8 bg-white/[0.02]">
            <CardBody className="text-[12px] leading-7 text-ink-muted">
              <p className="font-semibold text-ink">چطور پیدایش کنم؟</p>
              <p className="mt-1.5">
                روی نقشه بالا روی فلش کوچک بزن تا مسیریابی باز شود، یا از شماره‌ی
                طرف مقابل استفاده کن. اگر هر دو نرسیدید، رزرو را لغو کن تا پولت
                برگردد.
              </p>
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon?: typeof Ticket;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-ink-muted">
        {Icon ? <Icon className="size-3.5" /> : null}
        {label}
      </span>
      <span className="font-medium text-ink-soft">{children}</span>
    </div>
  );
}

function ReservationSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-16 rounded-2xl" />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <Skeleton className="h-48 rounded-xl2" />
          <Skeleton className="h-72 rounded-xl2" />
        </div>
        <Skeleton className="h-80 rounded-xl2" />
      </div>
    </div>
  );
}