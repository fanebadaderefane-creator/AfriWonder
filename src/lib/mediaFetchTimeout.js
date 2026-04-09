/**
 * Fetch long-courrier pour blobs vidéo (MP4) : évite les requêtes bloquées sur 3G instable (Mali).
 * Partagé : préchargement feed + téléchargement manuel offline.
 * Flutter : appliquer un timeout équivalent sur les téléchargements média + annulation propre.
 */

/** 4 min — assez pour un fichier volumineux sur liaison lente, pas infini. */
export const MEDIA_FETCH_TIMEOUT_MS = 240_000;

/**
 * @param {string} url
 * @param {RequestInit} [init]
 * @returns {Promise<Response>}
 */
export function fetchMediaWithTimeout(url, init = {}) {
  if (typeof fetch !== 'function') {
    return Promise.reject(new Error('fetch unavailable'));
  }
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return fetch(url, {
      ...init,
      signal: AbortSignal.timeout(MEDIA_FETCH_TIMEOUT_MS),
    });
  }
  const c = new AbortController();
  const t = setTimeout(
    () => c.abort(new DOMException('media-fetch-timeout', 'AbortError')),
    MEDIA_FETCH_TIMEOUT_MS
  );
  return fetch(url, { ...init, signal: c.signal }).finally(() => clearTimeout(t));
}
