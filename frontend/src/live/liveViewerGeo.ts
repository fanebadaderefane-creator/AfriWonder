import * as Location from 'expo-location';

export type LiveJoinGeo = {
  country?: string;
  city?: string;
};

/**
 * Pays + ville pour `POST /live/:id/join` (analytics). Échoue silencieusement si refus GPS.
 */
export async function resolveLiveJoinGeo(): Promise<LiveJoinGeo> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return {};
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const places = await Location.reverseGeocodeAsync({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
    const p = places[0];
    if (!p) return {};
    const country = (p.isoCountryCode || p.region || '').trim().slice(0, 16) || undefined;
    const city = (p.city || p.subregion || p.district || p.name || '').trim().slice(0, 80) || undefined;
    return { country, city };
  } catch {
    return {};
  }
}
