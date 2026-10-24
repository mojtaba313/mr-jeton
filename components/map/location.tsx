"use client";

import { Navigation, ZoomIn } from "lucide-react";

import { MapCanvas } from "@/components/map/map-canvas";
import { MAP } from "@/lib/config";
import { formatCoords } from "@/lib/maps";
import { cn } from "@/lib/utils";

/**
 * نقشه‌ی نقطه‌ی تحویل — دو حالت:
 *
 *  ۱. **نمایشی** (`MiniMap`): یک پین روی نقشه‌ی دانشگاه، برای خریداری که می‌خواهد
 *     بداند کجا باید برود.
 *  ۲. **انتخاب‌گر** (`LocationPicker`): فروشنده روی نقشه کلیک می‌کند و نقطه‌ی
 *     تحویل را انتخاب می‌کند.
 *
 * The Leaflet module itself lives behind `<MapCanvas ssr:false>`; see
 * `map-canvas.tsx` for why that indirection is mandatory and not cosmetic.
 */

export function MiniMap({
  lat,
  lng,
  label,
  className,
  zoom = 16,
}: {
  lat: number;
  lng: number;
  label?: string | null;
  className?: string;
  zoom?: number;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10",
        className ?? "h-40",
      )}
    >
      <MapCanvas lat={lat} lng={lng} zoom={zoom} interactive={false} />

      <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
        <span className="rounded-lg bg-canvas-deep/85 px-2 py-1 text-[11px] text-ink-soft backdrop-blur">
          {label ?? formatCoords(lat, lng)}
        </span>
        <a
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto grid size-8 place-items-center rounded-lg bg-canvas-deep/85 text-ink-soft backdrop-blur transition-colors hover:text-brand-200"
          aria-label="باز کردن در نقشه"
        >
          <Navigation className="size-3.5" />
        </a>
      </div>
    </div>
  );
}

/**
 * انتخاب‌گر نقطه‌ی تحویل.
 *
 * The click sets the pin and two hidden inputs carry the coordinates into the
 * form. There is deliberately no text field for coordinates: nobody types
 * "۳۶٫۲۵۶۵", and the server-side distance check catches a wild pin anyway.
 */
export function LocationPicker({
  lat,
  lng,
  onChange,
  className,
}: {
  lat: number;
  lng: number;
  onChange: (next: { lat: number; lng: number }) => void;
  className?: string;
}) {
  // مختصات والد، حتی پس از کلیک کاربر، منبع حقیقت است؛ پس مقدار داخلی نگه
  // نمی‌داریم و «برگرد به مرکز» کار خودش والد را صدا می‌زند.
  const setPosition = (next: [number, number]) =>
    onChange({ lat: next[0], lng: next[1] });

  return (
    <div className={cn("space-y-2", className)}>
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />

      <div className="h-64 w-full overflow-hidden rounded-2xl border border-white/10">
        <MapCanvas lat={lat} lng={lng} onPick={setPosition} />
      </div>

      <p className="flex items-center gap-1.5 text-[12px] text-ink-muted">
        <ZoomIn className="size-3.5 text-brand-300" />
        روی نقشه کلیک کن تا محل تحویل انتخاب شود — همان‌جایی که خودت راحتی. (مرکز
        نقشه: {formatCoords(MAP.lat, MAP.lng)})
      </p>
    </div>
  );
}