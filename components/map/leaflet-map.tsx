"use client";

// استایل پایه‌ی Leaflet اجباری است: بدون آن `.leaflet-pane` ها `static` می‌مانند و
// نقشه به‌جای لایه‌های روی‌هم، در جریان عادی صفحه روی هم تلنبار می‌شود.
import "leaflet/dist/leaflet.css";

import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useEffect, useState } from "react";

import { MAP } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * لایه‌ی واقعی نقشه — فقط با Leaflet.
 *
 * This file is only ever imported through `map-canvas.tsx` with
 * `ssr: false`. Leaflet touches `window` at module scope, so a plain dynamic
 * `import()` inside an effect is not enough: Turbopack still evaluates the
 * module on the server while preloading the chunk, and the render dies with
 * "window is not defined". `ssr: false` is the only thing that guarantees the
 * module is never evaluated there.
 */

const pinIcon = {
  // در Leaflet 1.9 کلید `html` است، نه `iconHtml` — با `iconHtml` آیکون بی‌صدا
  // رندر می‌شود: کلاس می‌خورد ولی هیچ HTMLی داخلش نمی‌ماند.
  html: '<div class="mr-jeton-pin"><span></span></div>',
  className: "mr-jeton-pin-wrap",
  iconSize: [26, 26] as [number, number],
  // پین ما یک نقطه است، نه قطره‌ی آویزان؛ پس لنگر روی مرکز دایره می‌نشیند تا خودِ
  // نقطه دقیقاً روی مختصات بیفتد (با anchor پایین، نقطه ۲۶ پیکسل بالاتر می‌افتد).
  iconAnchor: [13, 13] as [number, number],
};

type LeafletModule = typeof import("leaflet");

function useLeaflet(): LeafletModule | null {
  const [leaflet, setLeaflet] = useState<LeafletModule | null>(null);

  useEffect(() => {
    let active = true;
    void import("leaflet").then((module) => {
      if (active) setLeaflet(() => module);
    });
    return () => {
      active = false;
    };
  }, []);

  return leaflet;
}

export function MapCanvas({
  lat,
  lng,
  zoom,
  interactive = true,
  onPick,
  className,
}: {
  lat: number;
  lng: number;
  zoom?: number;
  interactive?: boolean;
  onPick?: (position: [number, number]) => void;
  className?: string;
}) {
  const leaflet = useLeaflet();
  if (!leaflet) return <div className={cn("skeleton size-full", className)} />;

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={zoom ?? MAP.zoom}
      scrollWheelZoom={interactive}
      zoomControl={interactive}
      attributionControl={false}
      dragging={interactive}
      className={cn("size-full", className)}
    >
      <TileLayer url={MAP.tileUrl} attribution={MAP.attribution} />
      <Marker position={[lat, lng]} icon={leaflet.divIcon(pinIcon)} />
      {/* Leaflet اندازه‌ی کانتینر را در لحظه‌ی ساخت می‌خواند؛ اگر آن لحظه هنوز
          layout انجام نشده باشد، پین جای اشتباه می‌افتد. invalidateSize این را
          یک‌بار بعد از mount درست می‌کند. */}
      <ResizeFix />
      {onPick ? <ClickHandler onPick={onPick} /> : null}
    </MapContainer>
  );
}

function ResizeFix() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
}

/** `useMapEvents` فقط داخل `MapContainer` کار می‌کند، پس یک جزء جدا لازم است. */
function ClickHandler({
  onPick,
}: {
  onPick: (position: [number, number]) => void;
}) {
  useMapEvents({
    click(event) {
      onPick([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
}
