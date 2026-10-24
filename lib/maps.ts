/**
 * کمک‌کننده‌های نقشه.
 *
 * Two things the UI needs and neither Leaflet nor a tile server should be asked
 * for: a human-readable label for coordinates (so a listing still reads sensibly
 * if the map fails to load — which it will, if the campus blocks tiles), and a
 * way out to a real map app for navigation.
 */

/** «۳۶٫۲۵۶۵، ۵۱٫۳۹۰۲» — برای نمایش و کپی کردن. */
export function formatCoords(lat: number, lng: number): string {
  const fa = (value: number, digits: number) =>
    value.toLocaleString("fa-IR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });

  return `${fa(lat, 5)}، ${fa(lng, 5)}`;
}

/**
 * لینک به نقشه‌ی عمومی برای مسیریابی.
 *
 * OpenStreetMap is the default because it needs no key; set
 * `NEXT_PUBLIC_MAP_LINK_TEMPLATE` to point at Mapbox/Google/داخلی دانشگاه instead.
 */
export function externalMapLink(lat: number, lng: number, label?: string | null): string {
  const template =
    process.env.NEXT_PUBLIC_MAP_LINK_TEMPLATE ??
    "https://www.openstreetmap.org/?mlat={lat}&mlon={lng}#map=18/{lat}/{lng}";

  const url = template
    .replaceAll("{lat}", String(lat))
    .replaceAll("{lng}", String(lng));

  return label ? `${url}` : url;
}