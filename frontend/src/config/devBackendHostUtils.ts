import { stripTrailingSlash } from '../utils/urlNormalize';

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

/** `EXPO_PUBLIC_WEB_USE_REMOTE_BACKEND=true` — garder Render/staging depuis le navigateur (appels WebRTC / TURN). */
export function webUseRemoteBackendFromEnv(): boolean {
  const v = (process.env.EXPO_PUBLIC_WEB_USE_REMOTE_BACKEND || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function normalizeOriginUrl(raw: string): URL | null {
  const c = raw.trim();
  if (!c) return null;
  try {
    return new URL(/^[a-z][a-z+.-]*:\/\//i.test(c) ? c : `http://${c}`);
  } catch {
    return null;
  }
}

function isSameBackendOrigin(configured: URL, localBackend: URL): boolean {
  const ch = configured.hostname.toLowerCase();
  const lh = localBackend.hostname.toLowerCase();
  const sameHost =
    ch === lh
    || (ch === 'localhost' && lh === '127.0.0.1')
    || (ch === '127.0.0.1' && lh === 'localhost');
  if (!sameHost) return false;
  const cp = configured.port || (configured.protocol === 'https:' ? '443' : '80');
  const lp = localBackend.port || (localBackend.protocol === 'https:' ? '443' : '80');
  return cp === lp;
}

/**
 * Expo web en dev : la page est souvent `http://localhost:3001` alors que `.env` pointe vers l’IP LAN
 * (`http://192.168.x.x:3000`) ou Render (`https://afriwonder.onrender.com`) pour le téléphone.
 * Firefox / Chrome appellent alors une autre origine : CORS ou connexion peuvent échouer.
 * Sur navigateur « localhost », on préfère l’API locale sauf `EXPO_PUBLIC_WEB_USE_REMOTE_BACKEND`.
 */
export function preferLocalhostBackendWhenWebDevOnLocalhost(
  configuredOrigin: string,
  pageHostname: string | undefined,
  localhostBackendOrigin: string,
  options?: { useRemoteBackend?: boolean },
): string {
  const c = configuredOrigin.trim();
  if (!c) return '';
  const ph = (pageHostname || '').toLowerCase();
  if (ph !== 'localhost' && ph !== '127.0.0.1') return c;
  if (options?.useRemoteBackend ?? webUseRemoteBackendFromEnv()) return c;

  const configuredUrl = normalizeOriginUrl(c);
  const localUrl = normalizeOriginUrl(localhostBackendOrigin);
  if (!configuredUrl || !localUrl) return c;
  if (isSameBackendOrigin(configuredUrl, localUrl)) return c;

  if (isPrivateUseIpv4(configuredUrl.hostname)) {
    return stripTrailingSlash(localhostBackendOrigin);
  }

  // Render / staging HTTPS depuis localhost web → API locale (pas de CORS, feed instantané).
  return stripTrailingSlash(localhostBackendOrigin);
}

/**
 * Origines « dev » qui changent selon le réseau (maison / école / café) : l’app peut re-profiler
 * via `/health` au lieu de garder une IP LAN figée dans `.env`.
 * Non éphémère : HTTPS vers un hôte public (staging / prod) — on ne remplace pas par une IP Metro.
 */
export function isLikelyEphemeralDevBackendOrigin(origin: string): boolean {
  const raw = origin.trim();
  if (!raw) return false;
  try {
    const withScheme = /^[a-z][a-z+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`;
    const u = new URL(withScheme);
    const host = u.hostname.replace(/^\[|\]$/g, '');
    const h = host.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
    if (isPrivateUseIpv4(host)) return true;
    if (u.protocol === 'https:') return false;
    return false;
  } catch {
    return false;
  }
}
