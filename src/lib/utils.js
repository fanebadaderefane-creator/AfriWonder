import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { API_URL } from "@/api/expressClient"

function getResolvedApiBase() {
  if (typeof window === 'undefined') return API_URL;
  return API_URL.startsWith('/') ? `${window.location.origin}${API_URL}` : API_URL;
}

function getBackendOrigin() {
  if (typeof window === 'undefined') {
    return API_URL.replace(/\/api\/?$/, '');
  }

  if (API_URL.startsWith('/')) {
    if (import.meta.env.DEV) {
      return `${window.location.protocol}//${window.location.hostname}:3000`;
    }
    return window.location.origin;
  }

  try {
    return new URL(API_URL).origin;
  } catch {
    return window.location.origin;
  }
}

function toAbsoluteBackendUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  const origin = getBackendOrigin();
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

/** Placeholder image pour produits marketplace (cadres vides PWA mobile) */
export const MARKETPLACE_PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';

/**
 * Convertit une URL d'image relative en URL absolue (PWA mobile : évite cadres vides).
 * Les URLs déjà absolues (http/https) ou data: sont renvoyées telles quelles.
 */
export function getAbsoluteImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return toAbsoluteBackendUrl(url);
}

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Détecte mobile (viewport étroit) ou PWA installée (standalone).
 * Utilisé pour adapter l’UX (miniatures vidéo, timeouts, etc.) comme une app native.
 */
export function isMobileOrPWA() {
  if (typeof window === 'undefined') return false;
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches === true
    || window.navigator?.standalone === true;
  const narrow = window.innerWidth < 1024;
  return standalone || narrow;
}

/**
 * Détecte si l'app tourne dans Capacitor (WebView native iOS/Android).
 * Option 3 : permet d'activer des comportements "native-like" (ex: vidéo type TikTok).
 */
export function isCapacitor() {
  if (typeof window === 'undefined') return false;
  return !!(window.Capacitor || window.capacitor);
}

/**
 * Environnement où l'autoplay avec son est bloqué (PWA, mobile, standalone).
 * Pour que la vidéo démarre automatiquement comme TikTok, il faut démarrer en muet.
 */
export function isStrictAutoplayEnvironment() {
  return isMobileOrPWA() || isCapacitor();
}

/**
 * Indique si un utilisateur est un compte "supprimé" (anonymisé côté backend).
 * À utiliser pour ne pas afficher "Compte supprimé" / @deleted_xxx dans les listes.
 */
export function isDeletedUser(user) {
  if (!user) return true;
  const u = user.username ?? user.email ?? '';
  const name = user.full_name ?? '';
  if (typeof u === 'string' && u.startsWith('deleted_')) return true;
  if (typeof u === 'string' && u.includes('@deleted.local')) return true;
  if (name === 'Compte supprimé') return true;
  return false;
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
 * URL média principale pour miniatures / extraction de frame (même ordre que le feed : HLS d’abord).
 * Évite les tuiles vides PWA quand seul hls_url est renseigné.
 */
export function getVideoPrimarySourceUrl(video) {
  if (!video || typeof video !== 'object') return '';
  const raw =
    video.hls_url ||
    video.video_url ||
    video.videoUrl ||
    video.low_quality_url ||
    video.lowQualityUrl ||
    video.hd_url ||
    video.url ||
    '';
  return typeof raw === 'string' ? raw.trim() : '';
}

function buildProxyMediaUrl(absoluteUrl, apiBase) {
  return `${apiBase.replace(/\/$/, '')}/proxy/media?url=${encodeURIComponent(absoluteUrl)}`;
}

/**
 * Liste ordonnée d’URLs à essayer pour la lecture (feed / VideoCard : bascule auto si erreur).
 * - HLS (.m3u8) : URL directe (hls.js).
 * - Prod **site ≠ API** (ex. www.afriwonder.com + onrender.com) : **CDN uniquement** — éviter
 *   /api/proxy/media en masse (N streams → 502 Render, NS_BINDING_ABORTED). R2 sert Range en direct.
 * - Sinon (dev, ou même domaine) : proxy si utile.
 * VITE_FORCE_VIDEO_PROXY / VITE_DIRECT_VIDEO_PLAYBACK : surcharges.
 */
export function getVideoPlaybackUrlCandidates(videoUrl) {
  if (!videoUrl || typeof videoUrl !== 'string') return [];
  const absoluteUrl = toAbsoluteBackendUrl(videoUrl);
  if (!absoluteUrl) return [];

  const apiBase = getResolvedApiBase();
  let u;
  let apiUrl;
  try {
    u = new URL(absoluteUrl);
    apiUrl = new URL(apiBase);
  } catch {
    return [absoluteUrl];
  }

  if (u.origin === apiUrl.origin) return [absoluteUrl];

  const forceProxy =
    import.meta.env.VITE_FORCE_VIDEO_PROXY === 'true' ||
    import.meta.env.VITE_FORCE_VIDEO_PROXY === '1';
  const forceDirect =
    import.meta.env.VITE_DIRECT_VIDEO_PLAYBACK === 'true' ||
    import.meta.env.VITE_DIRECT_VIDEO_PLAYBACK === '1';

  const proxy = buildProxyMediaUrl(absoluteUrl, apiBase);

  if (forceDirect) return [absoluteUrl];
  if (forceProxy) return [proxy];

  const pageOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const apiCrossSite =
    import.meta.env.PROD &&
    !!pageOrigin &&
    apiUrl.origin !== pageOrigin &&
    u.protocol === 'https:' &&
    u.hostname !== apiUrl.hostname;

  const looksLikeHlsMaster = /\.m3u8(\?|#|$)/i.test(absoluteUrl);

  if (looksLikeHlsMaster) return [absoluteUrl];

  // Dev : CDN en premier (latence / débit proches de la prod). Passer tout le flux par le proxy en premier
  // sous Firefox gérait le MIME mais multipliait les allers-retours (5173→3000→CDN) et provoquait chargements
  // très lents ou buffer long. Le proxy reste en 2e position (erreur MIME Firefox, etc.).
  if (import.meta.env.DEV) {
    const out = [absoluteUrl];
    if (!out.includes(proxy)) out.push(proxy);
    return out;
  }

  if (apiCrossSite) {
    // Firefox est strict sur le MIME : un MP4 en application/octet-stream sur R2 échoue en direct
    // alors que Chrome lit. Le proxy force video/mp4 (proxy.routes.ts) sans multiplier le trafic :
    // on ne l’ajoute qu’en 2e position après le CDN, et seulement si Gecko Firefox tente la lecture.
    const out = [absoluteUrl];
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isGeckoFirefox = /firefox/i.test(ua) && !/seamonkey/i.test(ua);
    if (isGeckoFirefox) {
      const p = buildProxyMediaUrl(absoluteUrl, apiBase);
      if (p && p !== absoluteUrl && !out.includes(p)) out.push(p);
    }
    return out;
  }

  return [proxy];
}

/** Première URL candidate (compat miniatures, liens partage, etc.). */
export function getVideoPlaybackUrl(videoUrl) {
  const c = getVideoPlaybackUrlCandidates(videoUrl);
  return c[0] || '';
}
