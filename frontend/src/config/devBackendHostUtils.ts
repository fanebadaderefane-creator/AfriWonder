/**
 * Parsing d’hôtes LAN pour joindre l’API Express (:3000) depuis Expo / émulateurs Android.
 * Ne pas simplifier ni réordonner sans lire `.cursor/rules/mobile-android-backend-url.mdc`.
 */

/** IPv4 RFC1918 / link-local — seules cibles acceptées pour dériver l’API depuis le packager. */
export function isPrivateUseIpv4(host: string): boolean {
  const parts = host.split('.');
  if (parts.length !== 4) return false;
  const n = parts.map((p) => Number(p));
  if (n.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return false;
  const [a, b] = n;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

export function parseHostFromDevConnectionString(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const withScheme = /^[a-z][a-z+.-]*:\/\//i.test(s) ? s : `fake://${s}`;
  try {
    const u = new URL(withScheme.replace(/^exp\+/, 'exp').replace(/^exp:/i, 'http:'));
    const host = u.hostname.replace(/^\[|\]$/g, '');
    if (!host) return null;
    const h = host.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return null;
    return host;
  } catch {
    const beforeSlash = s.split(/[/?#]/)[0];
    const hostPort = beforeSlash.includes('@') ? beforeSlash.split('@').pop() || beforeSlash : beforeSlash;
    const host = hostPort.split(':')[0]?.replace(/^\[|\]$/g, '') || '';
    if (!host) return null;
    const h = host.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return null;
    return host;
  }
}

/** Déduplique et conserve l’ordre d’apparition (priorité = scriptURL en premier côté appelant). */
export function orderedPrivateLanHostsFromStrings(strings: string[]): string[] {
  const hosts: string[] = [];
  const seen = new Set<string>();
  for (const raw of strings) {
    const h = parseHostFromDevConnectionString(raw);
    if (!h || !isPrivateUseIpv4(h)) continue;
    const key = h.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    hosts.push(h);
  }
  return hosts;
}
