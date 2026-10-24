"use client";

import dynamic from "next/dynamic";

/**
 * دروازه‌ی نقشه.
 *
 * `ssr: false` تنها دلیل وجود این فایل است: Leaflet در سطح ماژول به `window`
 * دست می‌زند، و بدون این، رندر سروری با «window is not defined» می‌میرد. اینجا
 * صفر کیلوبایت کد نقشه به سرور می‌رسد و فقط جای بارگذاری را رندر می‌کند.
 */
export const MapCanvas = dynamic(
  () => import("./leaflet-map").then((module) => module.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="grid size-full place-items-center bg-canvas-deep/60 text-[12px] text-ink-faint">
        در حال بارگذاری نقشه…
      </div>
    ),
  },
);
