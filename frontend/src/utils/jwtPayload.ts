/**
 * Lecture minimale du payload JWT (expiration) sans dépendance — uploads multipart / refresh proactif.
 */

export function getJwtExpSeconds(accessToken: string): number | null {
  const parts = accessToken.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1];
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const atobFn = typeof globalThis.atob === 'function' ? globalThis.atob.bind(globalThis) : null;
    if (!atobFn) return null;
    const json = JSON.parse(atobFn(b64 + pad)) as { exp?: unknown };
    return typeof json.exp === 'number' && Number.isFinite(json.exp) ? json.exp : null;
  } catch {
    return null;
  }
}

/** `true` si pas de jeton, pas d'exp lisible, ou expiration dans moins de `minRemainingSeconds`. */
export function accessTokenExpiresWithin(
  accessToken: string | null | undefined,
  minRemainingSeconds: number
): boolean {
  if (!accessToken?.trim()) return true;
  const exp = getJwtExpSeconds(accessToken.trim());
  if (exp == null) return true;
  const nowSec = Math.floor(Date.now() / 1000);
  return exp - nowSec < minRemainingSeconds;
}
