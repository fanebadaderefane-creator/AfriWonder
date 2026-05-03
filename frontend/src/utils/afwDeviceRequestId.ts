import Constants from 'expo-constants';

/**
 * Identifiant envoyé en `X-AFW-Device-Id` — requis pour que le backend exempte les clients
 * Expo / RN des faux positifs CSRF (cookies tiers + Origin exotique) quand l’auth reste JWT.
 */
let cachedDeviceRequestId: string | null = null;

export function getAfriDeviceIdForRequestHeader(): string {
  if (cachedDeviceRequestId) return cachedDeviceRequestId;
  const fromConstants = Constants.installationId || Constants.sessionId;
  if (typeof fromConstants === 'string' && fromConstants.trim().length >= 8) {
    cachedDeviceRequestId = fromConstants.trim().slice(0, 128);
    return cachedDeviceRequestId;
  }
  const synthetic = `afw-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
  cachedDeviceRequestId = synthetic.slice(0, 128);
  return cachedDeviceRequestId;
}

/**
 * À utiliser pour tout `fetch` / `axios` **hors** `apiClient` / `mobileClient` (ex. refresh token),
 * afin de conserver la même exemption CSRF côté API que les intercepteurs axios.
 */
export function withAfriDeviceTrustHeaders(
  headers: Record<string, string> = {}
): Record<string, string> {
  return {
    ...headers,
    'X-AFW-Device-Id': getAfriDeviceIdForRequestHeader(),
  };
}

/**
 * Même garantie que `withAfriDeviceTrustHeaders` pour l’API `fetch` native (RN / Expo).
 * À utiliser pour tout `fetch` vers `{backend}/api/...` hors `apiClient` / `mobileApiClient`.
 * Ne modifie pas une valeur `X-AFW-Device-Id` déjà fournie (tests / override).
 */
export function applyAfriDeviceTrustToFetchInit(init?: RequestInit): RequestInit {
  const deviceId = getAfriDeviceIdForRequestHeader();
  const base = init ? { ...init } : {};
  const headers = new Headers(base.headers as HeadersInit | undefined);
  if (!headers.has('X-AFW-Device-Id') && !headers.has('x-afw-device-id')) {
    headers.set('X-AFW-Device-Id', deviceId);
  }
  return { ...base, headers };
}
