/**
 * Normalise les URL reçues par Linking (Expo dev : préfixe exp://…/--/…)
 * puis les convertit en `afriwonder://…` pour GET /api/mobile/resolve-deeplink.
 */

function isTrustedWebDeepLinkHost(hostname: string): boolean {
  const h = String(hostname || '').toLowerCase();
  if (!h) return false;
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h.includes('afriwonder')) return true;
  if (h.endsWith('.vercel.app')) return true;
  return false;
}

export function normalizeIncomingMobileUrl(raw: string): string {
  let s = String(raw || '').trim();
  const marker = '/--/';
  const idx = s.indexOf(marker);
  if (idx !== -1) {
    s = s.slice(idx + marker.length);
  }
  return s;
}

/** Retourne une URL utilisable par resolve-deeplink, ou null si non géré. */
export function toAfriwonderResolveUrl(normalized: string): string | null {
  const n = String(normalized || '').trim();
  if (!n) return null;

  if (/^afriwonder:\/\//i.test(n)) {
    return n;
  }

  let m = n.match(/^\/?watch\/([^/?#]+)\/?$/i);
  if (m) return `afriwonder://video/${m[1]}`;
  m = n.match(/^\/?video\/([^/?#]+)\/?$/i);
  if (m) return `afriwonder://video/${m[1]}`;
  if (/^\/?VideoView/i.test(n)) {
    const qIdx = n.indexOf('?');
    if (qIdx !== -1) {
      const params = new URLSearchParams(n.slice(qIdx + 1));
      const id = params.get('id') || params.get('_videoId');
      if (id) return `afriwonder://video/${id}`;
    }
  }

  try {
    const u = new URL(n);
    if (!/^https?:$/i.test(u.protocol)) return null;
    if (!isTrustedWebDeepLinkHost(u.hostname)) return null;

    const path = u.pathname || '';
    const pathMatch = path.match(/\/(?:watch|video)\/([^/?#]+)\/?$/i);
    if (pathMatch) return `afriwonder://video/${pathMatch[1]}`;

    if (/\/VideoView\/?$/i.test(path)) {
      const legacyId = u.searchParams.get('id') || u.searchParams.get('_videoId');
      if (legacyId) return `afriwonder://video/${legacyId}`;
    }

    const userMatch = path.match(/\/(?:user|u|profile)\/([^/?#]+)\/?$/i);
    if (userMatch) return `afriwonder://user/${userMatch[1]}`;

    const hashMatch = path.match(/\/(?:hashtag|tag)\/([^/?#]+)\/?$/i);
    if (hashMatch) return `afriwonder://hashtag/${encodeURIComponent(hashMatch[1].replace(/^#+/, ''))}`;
  } catch {
    /* ignore */
  }

  return null;
}
