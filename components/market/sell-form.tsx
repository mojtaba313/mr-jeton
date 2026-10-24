"use client";

import { ChevronDown, Crosshair, Info, Sparkles } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { createListingAction, type MarketState } from "@/app/actions/market";
import { LocationPicker } from "@/components/map/location";
import { Button } from "@/components/ui/button";
import { Field, SegmentedControl, Textarea } from "@/components/ui/form";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { MAP } from "@/lib/config";
import { toPersianDigits } from "@/lib/dates";
import { parseToman, roundToThousand } from "@/lib/money";
import { formatCoords } from "@/lib/maps";

/**
 * فرم فروش ژتون.
 *
 * The map is the interesting field, so it sits in the middle of the form where
 * the eye lands after the price, and the text description sits right under it —
 * a pin without words is useless to someone who has never seen the spot.
 */
export function SellForm({
  days,
  defaultDateISO,
  minDateISO,
  maxDateISO,
}: {
  days: {
    id: number;
    label: string;
    hint: string;
    dateISO: string;
    /** قیمت رسمیِ همان روز — با تغییر انتخاب، پیشنهاد قیمت هم عوض می‌شود. */
    officialPrice: number;
  }[];
  /** روز پیشنهادی و بازه‌ی مجاز تحویل — سمت سرور حساب می‌شوند، به‌وقت تهران. */
  defaultDateISO: string;
  minDateISO: string;
  maxDateISO: string;
}) {
  const [state, action, pending] = useActionState<MarketState, FormData>(
    createListingAction,
    null,
  );

  const [quantity, setQuantity] = useState("1");
  const [point, setPoint] = useState({ lat: MAP.lat, lng: MAP.lng });
  const [dayId, setDayId] = useState(days[0] ? String(days[0].id) : "");
  const [touched, setTouched] = useState(false); // قیمت دستی، قیمت پیشنهادی را قطع می‌کند

  // قیمت سلف و پیشنهاد قیمت از روزِ انتخاب‌شده می‌آیند، نه از اولِ فهرست —
  // وگرنه با عوض کردن روز، راهنمای قیمت روز قبلی می‌ماند.
  const selectedDay = days.find((day) => String(day.id) === dayId) ?? days[0];
  const officialPrice = selectedDay?.officialPrice ?? 0;
  const suggestedPrice =
    officialPrice > 0 ? toPersianDigits(roundToThousand(officialPrice * 0.95)) : "";
  const [price, setPrice] = useState(suggestedPrice);

  useEffect(() => {
    if (state?.ok) toast.success("آگهی ثبت شد", { description: state.message });
    else if (state && !state.ok) toast.error("ثبت نشد", { description: state.message });
  }, [state]);

  const parsedPrice = parseToman(price) ?? 0;
  const diffPercent =
    officialPrice > 0 ? Math.round(((officialPrice - parsedPrice) / officialPrice) * 100) : 0;

  return (
    <form action={action} className="space-y-5">
      {/* دور این فیلد عمداً label نیست: label، کلیک روی select را دو بار فعال
          می‌کند و در بعضی مرورگرها فهرست باز و بلافاصله بسته می‌شود — همان
          چیزی که «انتخاب کار نمی‌کند» به نظر می‌رسد. */}
      <div className="space-y-2">
        <label
          htmlFor="mealDayId"
          className="block text-[13px] font-medium text-ink-soft"
        >
          برای کدام روز غذا ژتون رزرو کرده‌ای؟
        </label>
        <div className="relative">
          <select
            id="mealDayId"
            name="mealDayId"
            value={dayId}
            onChange={(event) => {
              const next = event.target.value;
              setDayId(next);
              // تا وقتی کاربر خودش قیمت را دست نزده، پیشنهاد با روز جدید می‌آید.
              if (!touched) {
                const day = days.find((item) => String(item.id) === next);
                setPrice(
                  day && day.officialPrice > 0
                    ? toPersianDigits(roundToThousand(day.officialPrice * 0.95))
                    : "",
                );
              }
            }}
            required
            className="h-12 w-full cursor-pointer appearance-none rounded-2xl border border-white/10 bg-canvas-deep/70 pe-10 ps-4 text-sm text-ink outline-none transition-colors focus:border-brand-300/60"
          >
            {days.map((day) => (
              <option key={day.id} value={day.id} className="bg-surface text-ink">
                {day.label} — {day.hint}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        </div>
        {state?.errors?.mealDayId ? (
          <span className="block text-[12px] font-medium text-rose-warm">
            {state.errors.mealDayId}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <span className="block text-[13px] font-medium text-ink-soft">
            چند ژتون اضافه داری؟
          </span>
          <input type="hidden" name="quantity" value={quantity} />
          <SegmentedControl
            layoutId="sell-quantity"
            value={quantity}
            onChange={setQuantity}
            options={[1, 2, 3, 4, 5, 6].map((n) => ({
              value: String(n),
              label: toPersianDigits(n),
            }))}
          />
        </div>

        <Field
          label="قیمت هر ژتون (تومان)"
          name="unitPrice"
          inputMode="numeric"
          dir="ltr"
          required
          value={price}
          onChange={(event) => {
            setTouched(true);
            setPrice(event.target.value);
          }}
          onBlur={() =>
            setPrice((value) => {
              const parsed = parseToman(value);
              return parsed ? toPersianDigits(roundToThousand(parsed)) : value;
            })
          }
          placeholder="۱۲۰۰۰۰"
          error={state?.errors?.unitPrice}
          hint={
            officialPrice > 0
              ? `قیمت سلف ${officialPrice.toLocaleString("fa-IR")} تومان است.`
              : undefined
          }
        />
      </div>

      <div className="space-y-3">
        <p className="text-[13px] font-medium text-ink-soft">محل و ساعت تحویل</p>
        <p className="text-[12px] leading-6 text-ink-muted">
          جایی را انتخاب کن که خودت راحتی — جلوی سلف، بوفه‌ی دانشکده، یا هرجای
          نزدیک. خریدار فقط همین نقطه را می‌بیند و سر وقت می‌آید.
        </p>

        <LocationPicker lat={point.lat} lng={point.lng} onChange={setPoint} />

        <Button
          type="button"
          variant="soft"
          size="sm"
          onClick={() => setPoint({ lat: MAP.lat, lng: MAP.lng })}
        >
          <Crosshair className="size-3.5" />
          برگرد به مرکز {MAP.label}
          <span className="mr-1 text-[11px] opacity-70">
            {formatCoords(MAP.lat, MAP.lng)}
          </span>
        </Button>

        <Field
          label="توضیح محل (به فارسی)"
          name="locationText"
          required
          placeholder="مثلاً: جلوی بوفه‌ی دانشکده فنی، سمت خیابان اصلی"
          error={state?.errors?.locationText}
          hint="چیزی بنویس که یک آدم غریبه هم بتواند پیدایش کند."
        />

        <Field
          label="برچسب کوتاه محل (اختیاری)"
          name="placeLabel"
          placeholder="مثلاً: بوفه‌ی دانشکده فنی"
          maxLength={60}
          error={state?.errors?.placeLabel}
        />

        {state?.errors?.lat ? (
          <p className="text-[12px] font-medium text-rose-warm">{state.errors.lat}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* تقویم شمسی: کاربر «۲۵ مهر» را می‌بیند، فرم همان روزِ میلادی را
            می‌فرستد — قرارداد اعتبارسنجی سرور عوض نمی‌شود. */}
        <div className="space-y-2">
          <span className="block text-[13px] font-medium text-ink-soft">روز تحویل</span>
          <JalaliDatePicker
            name="deliveryDate"
            defaultValue={defaultDateISO}
            minISO={minDateISO}
            maxISO={maxDateISO}
            error={state?.errors?.deliveryDate}
          />
        </div>
        <Field
          label="از ساعت"
          name="deliveryFrom"
          type="time"
          required
          dir="ltr"
          defaultValue="12:00"
          error={state?.errors?.deliveryFrom}
        />
        <Field
          label="تا ساعت"
          name="deliveryTo"
          type="time"
          required
          dir="ltr"
          defaultValue="13:30"
          error={state?.errors?.deliveryTo}
        />
      </div>

      <p className="-mt-1 text-[12px] leading-5 text-ink-faint">
        روز و ساعت‌ها به وقت تهران است؛ خریدار همان بازه را می‌بیند و سر وقت می‌آید.
      </p>

      <Textarea
        label="توضیح دیگر (اختیاری)"
        name="note"
        placeholder="مثلاً: اگر زودتر رسیدی زنگ بزن، معمولاً سریع تحویل می‌دهم."
        maxLength={280}
        error={state?.errors?.note}
      />

      {officialPrice > 0 && parsedPrice > 0 ? (
        <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-[13px]">
          <span className="text-ink-muted">
            قیمت سلف {officialPrice.toLocaleString("fa-IR")} تومان
          </span>
          <span
            className={`font-bold ${
              parsedPrice < officialPrice ? "text-jade-400" : "text-ember-400"
            }`}
          >
            {toPersianDigits(Math.abs(diffPercent))}٪{" "}
            {parsedPrice < officialPrice ? "ارزان‌تر" : "گران‌تر"}
          </span>
        </div>
      ) : null}

      <div className="flex items-start gap-2.5 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-[12px] leading-6 text-ink-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-brand-300" />
        <p>
          تا وقتی ژتونی رزرو نشده، خریدار فقط قیمت و محل و ساعت تحویل را می‌بیند؛
          شماره‌ات بعد از رزرو باز می‌شود. پول هم تا تایید تحویل در کیف پول سایت
          می‌ماند.
        </p>
      </div>

      <Button type="submit" disabled={pending || days.length === 0} className="w-full">
        {pending ? "در حال ثبت…" : "ثبت آگهی"}
        <Sparkles className="size-4" />
      </Button>

      {days.length === 0 ? (
        <p className="text-center text-[12px] text-ink-faint">
          الان روز غذای بازی وجود ندارد. به‌محض اینکه مدیر روز جدید ثبت کند، می‌توانی
          آگهی بگذاری.
        </p>
      ) : null}
    </form>
  );
}
