import { Platform } from 'react-native';
import { getBackendOrigin } from '../config/backendBase';

/**
 * Origine pour préfixer les chemins `/uploads/...` (même logique que la PWA `getAbsoluteImageUrl`).
 */
function mediaOrigin(): string {
  const o = getBackendOrigin().replace(/\/$/, '');
  if (o) return o;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return '';
}

/**
 * URL absolue pour afficher une image backend (profil, miniature…) dans Expo / RN Web.
 */
export function toAbsoluteMediaUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  const origin = mediaOrigin();
  if (!origin) return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}
