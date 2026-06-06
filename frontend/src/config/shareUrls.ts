import { getBackendOrigin } from './backendBase';
import { stripTrailingSlash, stripApiSuffix } from '../utils/urlNormalize';

/**
 * Liens partagés depuis l’app mobile → origine **PWA** (pas l’API Render seule).
 * Définir `EXPO_PUBLIC_PUBLIC_WEB_ORIGIN` en build EAS si le domaine public diffère.
 */
const DEFAULT_SHARE_WEB_ORIGIN_FALLBACK = 'https://afri-wonder.vercel.app';

function normalizeWebOrigin(origin: string): string {
  return stripTrailingSlash(stripApiSuffix(origin.trim()));
}

function isLocalDevOrigin(origin: string): boolean {
  const o = origin.trim().toLowerCase();
  if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(o)) return true;
  if (/^https?:\/\/(10\.0\.2\.2|10\.0\.3\.2)(:\d+)?$/i.test(o)) return true;
  return false;
}

/** Hôte API sans interface web (ex. Render) — ne doit jamais servir de lien de partage. */
export function isApiOnlyShareHost(origin: string): boolean {
  try {
    const host = new URL(normalizeWebOrigin(origin)).hostname.toLowerCase();
    return host.endsWith('.onrender.com') || host === 'onrender.com';
  } catch {
    return false;
  }
}

export function getPublicWebOrigin(): string {
  const explicit = process.env.EXPO_PUBLIC_PUBLIC_WEB_ORIGIN?.trim();
  if (explicit) return normalizeWebOrigin(explicit);

  const api = (getBackendOrigin() || '').trim();
  const apiOrigin = api ? normalizeWebOrigin(api) : '';
  if (apiOrigin && !isLocalDevOrigin(apiOrigin) && !isApiOnlyShareHost(apiOrigin)) {
    return apiOrigin;
  }

  const fallbackEnv = process.env.EXPO_PUBLIC_SHARE_FALLBACK_ORIGIN?.trim();
  if (fallbackEnv) return normalizeWebOrigin(fallbackEnv);

  return normalizeWebOrigin(DEFAULT_SHARE_WEB_ORIGIN_FALLBACK);
}

/** Lien canonique partage vidéo — `/watch/:id` (deep link mobile + PWA). */
export function getVideoSharePageUrl(videoId: string): string {
  const base = getPublicWebOrigin();
  const id = encodeURIComponent(String(videoId || '').trim());
  return `${base}/watch/${id}`;
}

/** Utilitaire testable : origine déjà connue. */
export function buildVideoSharePageUrl(origin: string, videoId: string): string {
  const id = encodeURIComponent(String(videoId || '').trim());
  return `${normalizeWebOrigin(origin)}/watch/${id}`;
}
