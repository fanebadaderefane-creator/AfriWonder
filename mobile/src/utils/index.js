import { API_URL } from '../api/client';

/**
 * Nom d'écran pour la navigation React Native (équivalent PWA createPageUrl).
 * En PWA createPageUrl('Marketplace') => '/Marketplace'. En RN on utilise le nom d'écran.
 */
export function createPageUrl(pageName) {
  return (pageName || '').replace(/ /g, '-');
}

/** Placeholder image pour produits marketplace (même que PWA). */
export const MARKETPLACE_PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';

/**
 * URL absolue pour une image (relative ou déjà absolue).
 * En RN pas de window.location : on utilise API_URL pour la base.
 */
export function getAbsoluteImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed;
  if (!API_URL) return trimmed;
  const origin = API_URL.replace(/\/api\/?$/, '');
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

export function isDeletedUser(user) {
  if (!user) return true;
  const u = user.username ?? user.email ?? '';
  const name = user.full_name ?? '';
  if (typeof u === 'string' && u.startsWith('deleted_')) return true;
  if (typeof u === 'string' && u.includes('@deleted.local')) return true;
  if (name === 'Compte supprimé') return true;
  return false;
}
