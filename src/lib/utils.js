import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { API_URL } from "@/api/expressClient"

/** Placeholder image pour produits marketplace (cadres vides PWA mobile) */
export const MARKETPLACE_PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';

/**
 * Convertit une URL d'image relative en URL absolue (PWA mobile : évite cadres vides).
 * Les URLs déjà absolues (http/https) ou data: sont renvoyées telles quelles.
 */
export function getAbsoluteImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed;
  const base = API_URL.startsWith('/') ? window.location.origin + API_URL : API_URL;
  const origin = base.replace(/\/api\/?$/, '');
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/** Placeholder neutre (gris + play) pour vidéos sans miniature — évite toute ressemblance avec logos tiers */
export const VIDEO_PLACEHOLDER_IMG = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" fill="%23374151">' +
  '<rect width="300" height="400" fill="%23374151"/>' +
  '<path d="M120 100v200l120-100z" fill="%239ca3af" opacity="0.8"/>' +
  '</svg>'
);

/** Extensions vidéo : si thumbnail_url pointe vers une vidéo, ce n'est pas une vraie miniature. */
const VIDEO_EXT = /\.(mp4|webm|mov|m3u8|m4v|avi|mkv)(\?|$)/i;

/**
 * Indique si thumbnail_url est une vraie image (miniature) et non une URL vidéo.
 * Le backend peut stocker video_url comme thumbnail_url quand aucune miniature n'est fournie ;
 * Chrome/mobile n'affichent pas de frame avec poster=videoUrl.
 */
export function isValidThumbnailUrl(thumbnailUrl, videoUrl) {
  if (!thumbnailUrl || typeof thumbnailUrl !== 'string') return false;
  if (thumbnailUrl === videoUrl) return false;
  if (VIDEO_EXT.test(thumbnailUrl)) return false;
  return true;
}

/**
 * Retourne l'URL de lecture d'une vidéo. Pour les URLs externes (CDN), passe par le proxy
 * backend pour éviter les erreurs CORS (Failed to open media).
 */
export function getVideoPlaybackUrl(videoUrl) {
  if (!videoUrl || typeof videoUrl !== 'string') return videoUrl || '';
  try {
    const u = new URL(videoUrl);
    const apiUrl = new URL(API_URL.startsWith('/') ? window.location.origin + API_URL : API_URL);
    const host = (u.hostname || '').toLowerCase();
    const directHosts = ['cdn.afriwonder.com', 'cdn.afriwonder.com'];
    if (directHosts.some((h) => host === h || host.endsWith('.' + h))) return videoUrl;
    if (u.origin === apiUrl.origin) return videoUrl;
  } catch {
    return videoUrl;
  }
  const base = API_URL.startsWith('/') ? window.location.origin + API_URL : API_URL;
  return `${base.replace(/\/$/, '')}/proxy/media?url=${encodeURIComponent(videoUrl)}`;
}
