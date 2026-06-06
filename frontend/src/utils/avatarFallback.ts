import { toAbsoluteMediaUrl } from './absoluteMediaUrl';

function looksLikeUuid(s: string): boolean {
  const t = s.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t);
}

/**
 * Préfère nom + pseudo pour l’initiale (jamais un id) — à passer en 2e arg de `profileAvatarUri`.
 */
export function avatarSeedFromUserFields(opts: {
  full_name?: string | null;
  username?: string | null;
  displayName?: string | null;
  fallbackLabel?: string;
}): string {
  const a = String(opts.displayName ?? '').trim();
  if (a) return a.slice(0, 40);
  const b = String(opts.full_name ?? '').trim();
  if (b) return b.slice(0, 40);
  const c = String(opts.username ?? '')
    .replace(/^@+/, '')
    .trim();
  if (c) return c.slice(0, 40);
  return (opts.fallbackLabel || 'User').trim().slice(0, 40) || 'User';
}

/** Avatar générique (initiales) — évite picsum / pravatar en prod. */
export function uiAvatarFromSeed(seed: string): string {
  const raw = String(seed || 'U').trim();
  const safe = looksLikeUuid(raw) ? 'User' : raw;
  const q = encodeURIComponent(safe.slice(0, 40) || 'U');
  return `https://ui-avatars.com/api/?name=${q}&background=333333&color=ffffff&size=128`;
}

/** URL d’avatar profil : absolu si chemin relatif / URL, sinon initiales. */
export function profileAvatarUri(raw: string | null | undefined, fallbackSeed?: string): string {
  const trimmed = String(raw ?? '').trim();
  if (trimmed && !looksLikeUuid(trimmed)) {
    const abs = toAbsoluteMediaUrl(trimmed).trim();
    if (abs) return abs;
  }
  const seed = String(fallbackSeed || 'User').trim();
  const safe = looksLikeUuid(seed) ? 'User' : seed;
  return uiAvatarFromSeed(safe);
}
