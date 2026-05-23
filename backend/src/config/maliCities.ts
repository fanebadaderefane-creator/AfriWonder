/**
 * CDC Marketplace Mali: Coordonnées des villes prioritaires pour calcul frais livraison
 */
export const MALI_CITIES: Record<string, { lat: number; lng: number }> = {
  Bamako: { lat: 12.6392, lng: -8.0029 },
  Sikasso: { lat: 11.3178, lng: -5.6665 },
  Ségou: { lat: 13.4317, lng: -6.2633 },
  Mopti: { lat: 14.4843, lng: -4.1990 },
  Kayes: { lat: 14.4509, lng: -11.4441 },
  Koulikoro: { lat: 12.8667, lng: -7.5667 },
  Gao: { lat: 16.2667, lng: -0.0500 },
  Tombouctou: { lat: 16.7730, lng: -3.0074 },
};

export function getCityCoords(cityName: string): { lat: number; lng: number } | null {
  const normalized = cityName?.trim();
  if (!normalized) return null;
  const key = Object.keys(MALI_CITIES).find((k) => k.toLowerCase() === normalized.toLowerCase());
  return key ? MALI_CITIES[key] : null;
}

/** Haversine: distance en km entre deux points */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
