import { getBackendOrigin } from './backendBase';
import { stripTrailingSlash, stripApiSuffix } from '../utils/urlNormalize';

/**
 * Si l’API est sur Render et la PWA sur Vercel, définir `EXPO_PUBLIC_PUBLIC_WEB_ORIGIN`
 * pour que les liens partagés ouvrent la vraie page web (même format que la PWA : `/VideoView?id=`).
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

export function getPublicWebOrigin(): string {
  const explicit = process.env.EXPO_PUBLIC_PUBLIC_WEB_ORIGIN?.trim();
  if (explicit) return normalizeWebOrigin(explicit);

  const api = (getBackendOrigin() || '').trim();
  if (api && !isLocalDevOrigin(api)) {
    return normalizeWebOrigin(api);
  }

  const fallbackEnv = process.env.EXPO_PUBLIC_SHARE_FALLBACK_ORIGIN?.trim();
  if (fallbackEnv) return normalizeWebOrigin(fallbackEnv);

  return normalizeWebOrigin(DEFAULT_SHARE_WEB_ORIGIN_FALLBACK);
}

/** Lien page vidéo web (équivalent PWA `createPageUrl('VideoView') + ?id=`). */
export function getVideoSharePageUrl(videoId: string): string {
  const base = getPublicWebOrigin();
  return `${base}/VideoView?id=${encodeURIComponent(videoId)}`;
}

/** Utilitaire testable : origine déjà connue. */
export function buildVideoSharePageUrl(origin: string, videoId: string): string {
  return `${normalizeWebOrigin(origin)}/VideoView?id=${encodeURIComponent(videoId)}`;
}
