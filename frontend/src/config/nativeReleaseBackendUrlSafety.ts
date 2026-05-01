/**
 * Garde-fou APK / Play Store : une URL de dev (LAN, localhost, HTTP) dans un build natif release
 * fait échouer la connexion sans diagnostic clair. Détection pure pour tests Vitest.
 */

function ipv4Octets(host: string): number[] | null {
  const parts = host.split('.');
  if (parts.length !== 4) return null;
  const n = parts.map((p) => Number(p));
  if (n.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return null;
  return n;
}

/** true si l'hôte est une boucle locale IPv4 (127/8). */
export function isLoopbackIpv4Host(host: string): boolean {
  const n = ipv4Octets(host);
  return !!n && n[0] === 127;
}

/** RFC1918 + lien-local (169.254) — hors LAN/WAN réelle pour APK distribués. */
export function isPrivateOrLinkLocalIpv4Host(host: string): boolean {
  const n = ipv4Octets(host);
  if (!n) return false;
  const [a, b] = n;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function unwrapIpv6Brackets(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, '');
}

/**
 * Origine backend jugée **non prod** pour un APK/iOS release (HTTPS public obligatoire).
 * Retourne une courte raison pour logs / Sentry, ou `null` si acceptable.
 */
export function unsafeBackendOriginReasonForNativeRelease(origin: string): string | null {
  const trimmed = origin.trim();
  if (!trimmed) return 'empty_origin';

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return 'invalid_url';
  }

  const proto = u.protocol.toLowerCase();
  if (proto !== 'https:') {
    return `non_https_protocol:${proto || 'missing'}`;
  }

  const hostRaw = unwrapIpv6Brackets(u.hostname || '').trim();
  const hostNorm = hostRaw.toLowerCase();
  if (!hostNorm) return 'missing_hostname';

  if (hostNorm === 'localhost' || hostNorm.endsWith('.localhost')) {
    return 'localhost_hostname';
  }
  if (hostNorm === '127.0.0.1' || hostNorm === '[::1]' || hostNorm === '::1') {
    return 'loopback_hostname';
  }

  if (isLoopbackIpv4Host(hostRaw)) {
    return 'loopback_ipv4';
  }
  if (isPrivateOrLinkLocalIpv4Host(hostRaw)) {
    return 'private_or_link_local_ipv4';
  }

  // IPv6 ULA fc00::/7 — distributions APK ne doivent pas cibler ça non plus.
  if (hostNorm.startsWith('fc') || hostNorm.startsWith('fd')) {
    const hex = hostNorm.replace(/^fd|^fc/, '');
    if (/^[0-9a-f:]+$/.test(hex)) {
      return 'ipv6_ula_or_similar';
    }
  }

  return null;
}
