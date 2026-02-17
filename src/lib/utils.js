import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { API_URL } from "@/api/expressClient"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const isIframe = window.self !== window.top;

/**
 * Retourne l'URL de lecture d'une vidéo. Pour les URLs externes (CDN), passe par le proxy
 * backend pour éviter les erreurs CORS (Failed to open media).
 */
export function getVideoPlaybackUrl(videoUrl) {
  if (!videoUrl || typeof videoUrl !== 'string') return videoUrl || '';
  try {
    const u = new URL(videoUrl);
    const apiUrl = new URL(API_URL.startsWith('/') ? window.location.origin + API_URL : API_URL);
    if (u.origin === apiUrl.origin) return videoUrl;
  } catch {
    return videoUrl;
  }
  const base = API_URL.startsWith('/') ? window.location.origin + API_URL : API_URL;
  return `${base.replace(/\/$/, '')}/proxy/media?url=${encodeURIComponent(videoUrl)}`;
}
