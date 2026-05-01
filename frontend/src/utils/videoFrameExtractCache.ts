/**
 * Pistes **Android / iOS** (stores) : `expo-video-thumbnails` + file cache. Le web n’appelle pas l’extraction ici.
 */
import { Platform } from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { runWithThumbnailExtractConcurrency } from './thumbnailExtractConcurrency';

/**
 * Même ressource vidéo, formats d’URL différents (espaces, hash) = cache incohérent côté UI.
 * Ne pas tronquer les query (URLs signées S3 / tokens).
 */
export function normalizeVideoFrameCacheKey(url: string): string {
  return String(url || '')
    .trim()
    .replace(/#.*$/, '');
}

/** Garde seulement contre les **hangs infinis** : si la promesse se résout avant `ms`, rien n’est perdu. */
function withOverallTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('thumb-timeout')), ms);
    void fn().then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      }
    );
  });
}

const URI_CACHE = new Map<string, string>();
const IN_FLIGHT = new Map<string, Promise<string | null>>();
const FAILED = new Set<string>();
const EXTRACT_MAX_CACHE = 32;

const listeners = new Set<() => void>();
let version = 0;

function touch() {
  version += 1;
  for (const l of listeners) l();
}

export function subscribeFrameExtractCache(c: () => void) {
  listeners.add(c);
  return () => {
    listeners.delete(c);
  };
}

export function getFrameExtractCacheVersion() {
  return version;
}

export function getCachedExtractedFrameUri(videoSrc: string): string | undefined {
  return URI_CACHE.get(normalizeVideoFrameCacheKey(videoSrc));
}

function setUri(videoSrc: string, fileUri: string) {
  const k = normalizeVideoFrameCacheKey(videoSrc);
  if (URI_CACHE.size >= EXTRACT_MAX_CACHE) {
    const first = URI_CACHE.keys().next().value;
    if (first) URI_CACHE.delete(first);
  }
  URI_CACHE.set(k, fileUri);
  touch();
}

function markFailed(videoSrc: string) {
  FAILED.add(normalizeVideoFrameCacheKey(videoSrc));
  touch();
}

export function isExtractFailed(videoSrc: string) {
  return FAILED.has(normalizeVideoFrameCacheKey(videoSrc));
}

/**
 * `getThumbnailAsync` par URL (dédupliqué + file d’attente) : 2 instants (Android) ou 3 (iOS),
 * plus garde de temps ; HLS sur Android n’est **pas** décodé ici (stabilité process).
 * Résout toujours : `string` = fichier local, `null` = échec (jamais de rejet).
 */
export function ensureVideoFrameLocalUri(videoSrc: string): Promise<string | null> {
  const key = normalizeVideoFrameCacheKey(videoSrc);
  if (!key) return Promise.resolve(null);
  /**
   * Web : le module `expo-video-thumbnails` n’extrait pas (stub / échec). Le fil Découvrir
   * reste sur `<video>` + poster dans `SmartThumbnail`.
   */
  if (Platform.OS === 'web') {
    return Promise.resolve(null);
  }
  if (FAILED.has(key)) {
    return Promise.resolve(null);
  }
  const hit = URI_CACHE.get(key);
  if (hit) return Promise.resolve(hit);
  const existing = IN_FLIGHT.get(key);
  if (existing) return existing;

  const work = (async (): Promise<string | null> => {
    const pathLower = key.split('?')[0].toLowerCase();
    const hls = pathLower.includes('.m3u8') || pathLower.includes('.mpd') || /(^|[?&])format=m3u8/i.test(key);
    return runWithThumbnailExtractConcurrency(async () => {
      /**
       * HLS (Android) : ne pas appeler le natif `getThumbnail` sur m3u8 — crash / kill process
       * fréquent dans MediaMetadataRetriever. Utiliser `thumbnail_url` côté API.
       * iOS : un essai seulement (garde mémoire).
       */
      if (hls) {
        if (Platform.OS === 'android') {
          markFailed(key);
          return null;
        }
        try {
          const { uri } = await withOverallTimeout(
            () => VideoThumbnails.getThumbnailAsync(key, { time: 1000, quality: 0.45 }),
            16000
          );
          if (uri) {
            setUri(key, uri);
            return uri;
          }
        } catch {
          /* */
        }
        markFailed(key);
        return null;
      }
      const timesMs: number[] = Platform.OS === 'android' ? [0, 800] : [0, 500, 1200];
      const perMs = Platform.OS === 'android' ? 12000 : 15000;
      for (const time of timesMs) {
        try {
          const { uri } = await withOverallTimeout(
            () => VideoThumbnails.getThumbnailAsync(key, { time, quality: 0.45 }),
            perMs
          );
          if (uri) {
            setUri(key, uri);
            return uri;
          }
        } catch {
          /* position suivante */
        }
      }
      markFailed(key);
      return null;
    });
  })();

  IN_FLIGHT.set(key, work);
  work.finally(() => {
    IN_FLIGHT.delete(key);
  });
  return work;
}

/**
 * Découvrir : lance l’extraction dès que la liste est connue, avant/parallèle au mount des cellules
 * (microtask) pour que le cache soit souvent prêt dès l’apparition de la grille.
 */
export function queuePrefetchDiscoverFrames(
  videoUrls: (string | undefined | null)[],
  maxPrefetch: number
): void {
  if (Platform.OS === 'web') {
    return;
  }
  const seen = new Set<string>();
  let n = 0;
  for (const raw of videoUrls) {
    if (n >= maxPrefetch) break;
    const u = (raw || '').trim();
    if (!u) continue;
    const nk = normalizeVideoFrameCacheKey(u);
    if (URI_CACHE.has(nk) || IN_FLIGHT.has(nk) || FAILED.has(nk) || seen.has(nk)) continue;
    seen.add(nk);
    n += 1;
    void ensureVideoFrameLocalUri(u);
  }
}
