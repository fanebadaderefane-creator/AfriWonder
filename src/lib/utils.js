import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const isIframe = window.self !== window.top;

const API_BASE = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:3000/api';

/**
 * Retourne l'URL de lecture d'une vidéo. Pour les URLs externes (CDN), passe par le proxy
 * backend pour éviter les erreurs CORS (Failed to open media).
 */
export function getVideoPlaybackUrl(videoUrl) {
  if (!videoUrl || typeof videoUrl !== 'string') return videoUrl || '';
  try {
    const u = new URL(videoUrl);
    const apiUrl = new URL(API_BASE);
    if (u.origin === apiUrl.origin) return videoUrl;
  } catch {
    return videoUrl;
  }
  return `${API_BASE.replace(/\/$/, '')}/proxy/media?url=${encodeURIComponent(videoUrl)}`;
}
