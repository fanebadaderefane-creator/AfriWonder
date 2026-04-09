/**
 * Base URL axios (`.../api`). En production, si `VITE_API_URL` est absent au build,
 * charge `/config.json` (déployé à côté du bundle) pour éviter une reconstruction d’image.
 * Flutter : même fichier public — clés lues : `apiBaseUrl` | `api_url` | `VITE_API_URL` (voir normalizeRawToApiBase).
 * Le SW met en cache NetworkFirst `/config.json` pour repli hors ligne après premier succès.
 */
function normalizeRawToApiBase(raw) {
  const s = String(raw || '').trim();
  if (!s) return '/api';
  const withApi = `${s.replace(/\/api\/?$/, '')}/api`;
  return withApi;
}

function fromEnvSync() {
  const raw = import.meta.env.VITE_API_URL;
  if (raw) return normalizeRawToApiBase(raw);
  return '/api';
}

/** Mutée après `initApiBaseFromPublicConfig` ; binding live pour les imports. */
export let API_URL = fromEnvSync();

const CONFIG_FETCH_TIMEOUT_MS = 8000;

function fetchConfigWithTimeout(path) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return fetch(path, { cache: 'no-store', signal: AbortSignal.timeout(CONFIG_FETCH_TIMEOUT_MS) });
  }
  const c = new AbortController();
  const t = setTimeout(
    () => c.abort(new DOMException('config-timeout', 'AbortError')),
    CONFIG_FETCH_TIMEOUT_MS
  );
  return fetch(path, { cache: 'no-store', signal: c.signal }).finally(() => clearTimeout(t));
}

/**
 * À appeler une fois au démarrage (main.jsx) avant le rendu React en prod sans VITE_API_URL.
 */
export async function initApiBaseFromPublicConfig() {
  if (import.meta.env.VITE_API_URL) return API_URL;
  if (import.meta.env.DEV) return API_URL;
  try {
    const path =
      typeof import.meta.env.BASE_URL === 'string' && import.meta.env.BASE_URL !== '/'
        ? `${import.meta.env.BASE_URL.replace(/\/$/, '')}/config.json`
        : '/config.json';
    // Réseau instable : ne pas bloquer le bootstrap trop longtemps
    const r = await fetchConfigWithTimeout(path);
    if (!r.ok) return API_URL;
    const j = await r.json();
    const u = j.apiBaseUrl ?? j.api_url ?? j.VITE_API_URL;
    if (typeof u === 'string' && u.trim()) {
      API_URL = normalizeRawToApiBase(u.trim());
    }
  } catch {
    /* garder /api ou valeur build */
  }
  return API_URL;
}
