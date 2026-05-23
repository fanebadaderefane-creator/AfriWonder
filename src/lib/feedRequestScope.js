/**
 * Scope pour param `afwScope` sur GET personnalisés — isole le cache SW NetworkFirst (clé URL sans JWT).
 * Valeur réseau : hash opaque (pas l’UUID en clair : logs Referer / WAF / partage d’URL).
 * Flutter : même principe (ex. SHA-256 tronquée du userId + salt app).
 */
let scope = 'guest';
/** @type {string | null} null = à recalculer après changement de compte */
let scopeParamCache = null;

export function setFeedRequestScope(userId) {
  scope = userId != null && String(userId).trim() !== '' ? String(userId) : 'guest';
  scopeParamCache = null;
}

export function getFeedRequestScope() {
  return scope;
}

/**
 * Paramètre query `afwScope` : `guest` ou empreinte stable par compte (pas d’identifiant lisible).
 */
export async function getAfwScopeParamForRequest() {
  if (scope === 'guest') return 'guest';
  if (scopeParamCache != null) return scopeParamCache;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
      const enc = new TextEncoder().encode(`afw|${scope}|v1`);
      const buf = await crypto.subtle.digest('SHA-256', enc);
      const hex = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
      scopeParamCache = `h${hex.slice(0, 24)}`;
      return scopeParamCache;
    }
  } catch {
    /* navigateur / contexte restreint */
  }
  scopeParamCache = scope;
  return scopeParamCache;
}

/** Chemin relatif stable (sans query/hash) pour matcher les règles ci-dessous. */
export function normalizeRequestPathForScope(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) {
    try {
      const p = new URL(s).pathname.replace(/\/$/, '');
      return p || '/';
    } catch {
      return '';
    }
  }
  const noQ = s.split('?')[0].split('#')[0];
  const p = noQ.replace(/\/$/, '');
  return p || '/';
}

/**
 * GET dont la réponse peut varier selon le compte — évite de servir le cache SW d’un autre utilisateur.
 * Important : le Cache API clé ≈ URL seule (pas le JWT) → /auth/me et listes « me » doivent inclure afwScope.
 */
export function shouldAttachAfwScopeToGetPath(pathname) {
  const p = pathname || '';
  if (p === '/feed' || p === '/videos' || p === '/posts' || p === '/auth/me') return true;
  if (p === '/cart' || p.startsWith('/cart/')) return true;
  if (p.startsWith('/me/')) return true;
  if (p.startsWith('/recommendations/videos')) return true;
  if (p.startsWith('/notifications')) return true;
  if (p === '/early-access/waitlist') return true;
  if (p.startsWith('/ride-share/me')) return true;
  if (p.startsWith('/products/alerts/me') || p.startsWith('/products/preorders/me')) return true;
  if (p === '/creator-dashboard') return true;
  if (p.startsWith('/referrals/')) return true;
  if (p.startsWith('/viral-bonuses/')) return true;
  if (p === '/creator-subscription/me' || p.startsWith('/creator-subscription/me/')) return true;
  if (p === '/seller-profile/me' || p.startsWith('/seller-profile/me/')) return true;
  if (p === '/seller-subscription/active') return true;
  if (p.startsWith('/support/tickets') || p.startsWith('/support/admin')) return true;
  if (p === '/commissions' || p.startsWith('/commissions/')) return true;
  if (p === '/refunds/my' || p.startsWith('/refunds/my/')) return true;
  if (p === '/returns' || p.startsWith('/returns/')) return true;
  if (p === '/addresses' || p.startsWith('/addresses/')) return true;
  if (p === '/disputes' || p.startsWith('/disputes/')) return true;
  if (p === '/orders' || p.startsWith('/orders/')) return true;
  if (p.startsWith('/seller/analytics')) return true;
  if (p === '/search' || p.startsWith('/search/')) return true;
  if (p.startsWith('/ads/campaigns')) return true;
  if (p === '/admin' || p.startsWith('/admin/')) return true;
  // Grille Discover : `/users?page=…` sans id dans le chemin — même URL, contenu selon JWT.
  if (p === '/users') return true;
  // Lives : discovery `followed`, recommandations, etc. (URL identique entre comptes sans scope).
  if (p === '/live' || p.startsWith('/live/')) return true;
  return false;
}
