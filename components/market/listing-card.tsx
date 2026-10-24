"use client";

import { motion } from "motion/react";
import { Clock3, MapPin, ShoppingBasket, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { reserveAction, type MarketState } from "@/app/actions/market";
import { MiniMap } from "@/components/map/location";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, SegmentedControl } from "@/components/ui/form";
import { toPersianDigits } from "@/lib/dates";
import { formatCoords } from "@/lib/maps";
import { formatNumber, formatToman, splitAmount } from "@/lib/money";

/**
 * کارت آگهی در بازار.
 *
 * Three things are on the card, and only three: **price, place, time**. The
 * seller's name is not here — the view model this component receives has no
 * name field — and neither is their phone. That is not a styling decision, it is
 * the guarantee that a buyer cannot screen a seller on Telegram before paying.
 * Contact details unlock the moment a reservation exists.
 */

export type ListingView = {
  id: number;
  quantity: number;
  remaining: number;
  unitPrice: number;
  officialPrice: number;
  note: string | null;
  status: string;
  statusLabel: string;
  statusTone: Tone;
  sellerId: number;
  dayTitle: string;
  dayDateLabel: string;
  lat: number;
  lng: number;
  locationText: string;
  placeLabel: string | null;
  deliveryDateLabel: string;
  deliveryWindow: string | null;
  feePercent: number;
};

export function ListingCard({
  listing,
  isOwner,
  isSignedIn,
  balance,
  index = 0,
}: {
  listing: ListingView;
  isOwner: boolean;
  isSignedIn: boolean;
  /** موجودی خریدار — برای اینکه بدانیم رزرو ممکن است یا نه. */
  balance: number | null;
  index?: number;
}) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const soldOut = listing.remaining <= 0;
  const cheaper = listing.officialPrice > 0 && listing.unitPrice < listing.officialPrice;
  const pricier = listing.officialPrice > 0 && listing.unitPrice > listing.officialPrice;
  const diffPercent =
    listing.officialPrice > 0
      ? Math.round(((listing.officialPrice - listing.unitPrice) / listing.officialPrice) * 100)
      : 0;

  const gross = listing.unitPrice * quantity;
  const { seller } = splitAmount(gross, listing.feePercent);
  // سهم صفر یعنی سکرو خاموش است: پول سرِ نقطه‌ی تحویل بین دو طرف رد و بدل می‌شود،
  // پس رزرو به شارژ کیف پول نیاز ندارد و موجودی هم شرط نیست.
  const escrow = listing.feePercent > 0;
  const affordable = !escrow || balance === null || balance >= gross;

  function reserve() {
    startTransition(async () => {
      const result: MarketState = await reserveAction(listing.id, quantity);
      if (!result) return;

      if (result.ok && result.code) {
        toast.success("رزرو شد", { description: result.message });
        setOpen(false);
        router.push(`/dashboard/reservations/${result.code}`);
        return;
      }

      if (result.message.includes("موجودی")) {
        toast.error("کیف پولت کافی نیست", {
          description: "اول کیف پولت را شارژ کن تا بتوانی رزرو کنی.",
          action: { label: "شارژ", onClick: () => router.push("/wallet") },
        });
        setOpen(false);
        return;
      }

      toast.error("رزرو نشد", { description: result.message });
    });
  }

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          // تأخیر پلکانی: هر کارت کمی دیرتر از قبلی می‌آید، ولی سقف ۲۴۰ms —
          // بیشتر از آن حس «صف» می‌دهد نه حس «انیمیشن».
          delay: Math.min(index * 0.045, 0.24),
          ease: [0.22, 1, 0.36, 1],
        }}
        whileHover={{ y: -4 }}
        className="glass group relative flex flex-col overflow-hidden rounded-xl2 transition-colors hover:border-brand-300/30"
      >
        <div className="pointer-events-none absolute -left-10 -top-10 size-28 rounded-full bg-brand-400/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

        <div className="flex items-start justify-between gap-3 p-5 pb-0">
          <div className="min-w-0">
            <p className="text-[11px] text-brand-300">{listing.dayTitle}</p>
            <h3 className="mt-1 text-[15px] font-bold text-ink">
              {toPersianDigits(listing.quantity)} ژتون · {listing.dayDateLabel}
            </h3>
          </div>
          <Badge tone={listing.statusTone} pulse={listing.status === "OPEN"}>
            {listing.statusLabel}
          </Badge>
        </div>

        <div className="px-5 pt-4">
          <MiniMap
            lat={listing.lat}
            lng={listing.lng}
            label={listing.placeLabel ?? listing.locationText}
            className="h-28"
          />
          <p dir="ltr" className="mt-1.5 text-center text-[10px] text-ink-faint">
            {formatCoords(listing.lat, listing.lng)}
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="space-y-2">
            <p className="flex items-start gap-2 text-[13px] leading-6 text-ink-soft">
              <MapPin className="mt-1 size-3.5 shrink-0 text-brand-300" />
              <span>{listing.locationText}</span>
            </p>
            <p className="flex items-center gap-2 text-[13px] text-ink-soft">
              <Clock3 className="size-3.5 shrink-0 text-brand-300" />
              <span>
                {listing.deliveryDateLabel}
                {listing.deliveryWindow ? ` · ${listing.deliveryWindow}` : ""}
              </span>
            </p>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-2xl font-black tracking-tight text-ink">
                {formatNumber(listing.unitPrice)}
                <span className="mr-1.5 text-[13px] font-medium text-ink-muted">تومان</span>
              </p>
              {listing.officialPrice > 0 ? (
                <p
                  className={`mt-1 flex items-center gap-1 text-[12px] ${
                    cheaper ? "text-jade-400" : pricier ? "text-ember-400" : "text-ink-faint"
                  }`}
                >
                  {cheaper ? <TrendingDown className="size-3.5" /> : null}
                  {pricier ? <TrendingUp className="size-3.5" /> : null}
                  قیمت سلف: {formatNumber(listing.officialPrice)}
                  {cheaper || pricier
                    ? ` (${toPersianDigits(Math.abs(diffPercent))}٪ ${
                        cheaper ? "ارزان‌تر" : "گران‌تر"
                      })`
                    : ""}
                </p>
              ) : null}
            </div>

            <div className="text-left">
              <p className="text-[11px] text-ink-faint">باقی‌مانده</p>
              <p className="text-lg font-bold text-brand-200">
                {toPersianDigits(listing.remaining)}
                <span className="mr-1 text-[12px] font-normal text-ink-muted">
                  از {toPersianDigits(listing.quantity)}
                </span>
              </p>
            </div>
          </div>

          {listing.note ? (
            <p className="line-clamp-2 rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2 text-[12px] leading-6 text-ink-muted">
              {listing.note}
            </p>
          ) : null}

          <footer className="mt-auto flex items-center gap-2 pt-1">
            {isOwner ? (
              <div className="flex h-11 w-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-[13px] text-ink-faint">
                آگهی خودت است
              </div>
            ) : (
              <>
                <Button
                  size="sm"
                  className="h-10 flex-1"
                  disabled={soldOut || listing.status !== "OPEN"}
                  onClick={() => setOpen(true)}
                >
                  <ShoppingBasket className="size-4" />
                  {soldOut ? "تمام شد" : "رزرو ژتون"}
                </Button>
                {balance !== null ? (
                  <span className="flex h-10 items-center gap-1.5 rounded-xl border border-white/8 px-3 text-[12px] text-ink-muted">
                    <Wallet className="size-3.5" />
                    کیف پول: {formatNumber(balance)}
                  </span>
                ) : null}
              </>
            )}
          </footer>
        </div>
      </motion.article>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="رزرو ژتون"
        description={`${toPersianDigits(listing.quantity)} ژتون برای «${listing.dayTitle}»`}
        footer={
          <>
            <Button onClick={reserve} disabled={pending} className="flex-1">
              {pending ? "در حال رزرو…" : `رزرو با ${formatToman(gross)}`}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              انصراف
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <MiniMap
            lat={listing.lat}
            lng={listing.lng}
            label={listing.locationText}
            className="h-36"
          />

          <p className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-[12px] leading-6 text-ink-muted">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-brand-300" />
            {listing.locationText}
          </p>

          <div className="space-y-3">
            <p className="text-[13px] text-ink-muted">
              چند ژتون می‌خواهی؟ حداکثر {toPersianDigits(listing.remaining)} ژتون باقی مانده.
            </p>
            <SegmentedControl
              layoutId="reserve-quantity"
              value={String(quantity)}
              onChange={(value) => setQuantity(Number(value))}
              options={Array.from({ length: Math.min(listing.remaining, 6) }, (_, i) => ({
                value: String(i + 1),
                label: toPersianDigits(i + 1),
              }))}
            />
          </div>

          <div className="glass space-y-2.5 rounded-2xl p-4 text-[13px]">
            <Row label={`قیمت هر ژتون × ${toPersianDigits(quantity)}`}>
              {formatToman(gross)}
            </Row>
            {escrow ? (
              <>
                <div className="rule-glow my-1" />
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-ink">از کیف پولت کم می‌شود</span>
                  <span className="text-base font-black text-brand-200">{formatToman(gross)}</span>
                </div>
                <Row label={`سهم فروشنده (${toPersianDigits(listing.feePercent)}٪ کم می‌شود)`}>
                  {formatToman(seller)}
                </Row>
              </>
            ) : (
              <>
                <div className="rule-glow my-1" />
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-ink">پرداخت سرِ نقطه‌ی تحویل</span>
                  <span className="text-base font-black text-brand-200">{formatToman(gross)}</span>
                </div>
                <Row label="سهم سایت">رایگان</Row>
              </>
            )}
          </div>

          {!affordable && balance !== null ? (
            <p className="rounded-xl border border-ember-400/25 bg-ember-400/8 px-3 py-2 text-[12px] text-ember-400">
              موجودی کیف پولت {formatToman(balance)} است و برای این رزرو کافی نیست.
              رزرو ممکن نیست تا شارژ کنی.
            </p>
          ) : null}

          <Field
            readOnly
            value={
              escrow
                ? "پول در کیف پول سایت تا تایید تحویل نگه داشته می‌شود"
                : "پول را موقع تحویل مستقیماً به فروشنده می‌دهی"
            }
            label="بعد از رزرو چه می‌شود؟"
            hint={
              escrow
                ? "اطلاعات تماس فروشنده همین‌جا باز می‌شود تا سر وقت هماهنگ کنید. اگر تا روز تحویل منصرف شوی، پول به کیف پولت برمی‌گردد."
                : "اطلاعات تماس فروشنده همین‌جا باز می‌شود تا سر وقت هماهنگ کنید. پول را همان‌جا و مستقیم به او می‌دهی؛ سایت نقشی در پول ندارد."
            }
          />

          {!isSignedIn ? (
            <p className="rounded-xl border border-brand-300/25 bg-brand-400/8 px-3 py-2 text-[12px] text-brand-200">
              برای رزرو ابتدا وارد حساب خود شوید.
            </p>
          ) : null}
        </div>
      </Dialog>
    </>
  );
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink-soft">{children}</span>
    </div>
  );
}