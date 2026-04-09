/**
 * Préchargement disque des prochaines vidéos du feed (MP4 progressif uniquement),
 * avec reprises, file limitée et respect des préférences réseau.
 * Réseau faible : petit délai entre fichiers pour ne pas saturer la liaison (Mali / 2G–3G).
 */

import { getVideoPrefetchFetchUrl } from '@/lib/utils';
import { loadPreferences } from '@/lib/preferences';
import { isEffectiveConnectionSlow } from '@/lib/networkHints.js';
import { fetchMediaWithTimeout } from '@/lib/mediaFetchTimeout.js';
import {
  hasCachedEntry,
  putCachedVideo,
  evictDownToBudget,
} from '@/lib/offlineVideoCache';

/** @type {Set<string>} */
const inFlightIds = new Set();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function isProbablyCellularNetwork() {
  if (typeof navigator === 'undefined') return false;
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!c) return false;
  if (c.type === 'cellular') return true;
  return false;
}

/**
 * @param {object} prefs
 * @param {boolean} prefs.feedPrefetchWifiOnly
 * @param {boolean} prefs.feedPrefetchOnMobileData
 * @param {boolean} isOnline
 */
export function shouldRunBackgroundVideoPrefetch(prefs, isOnline) {
  if (!isOnline || typeof window === 'undefined') return false;
  const safe = prefs && typeof prefs === 'object' ? prefs : loadPreferences();
  if (safe.feedPrefetchWifiOnly) {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (c && typeof c.type === 'string') {
      const t = c.type.toLowerCase();
      if (t === 'cellular') return false;
    }
  }
  if (safe.feedPrefetchOnMobileData === false && isProbablyCellularNetwork()) {
    return false;
  }
  return true;
}

/**
 * Choisit une URL MP4 (pas de master HLS entier — segments non gérés ici).
 * @param {any} video
 * @param {boolean} isSlowConnection
 * @returns {string | null}
 */
export function pickProgressiveVideoUrl(video, isSlowConnection) {
  if (!video || typeof video !== 'object') return null;
  const preferLow = !!isSlowConnection;
  const candidates = preferLow
    ? [
        video.low_quality_playback_url,
        video.low_quality_url,
        video.playback_url,
        video.video_url,
        video.hd_playback_url,
        video.hd_url,
      ]
    : [
        video.playback_url,
        video.video_url,
        video.low_quality_playback_url,
        video.low_quality_url,
        video.hd_playback_url,
        video.hd_url,
      ];
  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    if (/\.m3u8(\?|$)/i.test(raw)) continue;
    const abs = getVideoPrefetchFetchUrl(raw);
    if (abs && !/\.m3u8(\?|$)/i.test(abs)) return abs;
  }
  return null;
}

function snapshotVideoMeta(video, asset = null) {
  if (!video || typeof video !== 'object') return {};
  const base = {
    id: video.id,
    title: video.title,
    description: video.description,
    thumbnail_url: video.thumbnail_url,
    video_url: video.video_url,
    playback_url: video.playback_url,
    low_quality_url: video.low_quality_url,
    low_quality_playback_url: video.low_quality_playback_url,
    hls_url: video.hls_url,
    hls_playback_url: video.hls_playback_url,
    hd_url: video.hd_url,
    hd_playback_url: video.hd_playback_url,
    creator_id: video.creator_id,
    creator_name: video.creator_name,
    creator_username: video.creator_username,
    creator_avatar: video.creator_avatar,
    media_type: video.media_type || 'video',
    duration_seconds: video.duration_seconds,
    hashtags: video.hashtags,
    reaction_counts: video.reaction_counts,
    likes: video.likes,
    media_quality: video.media_quality,
    visibility: video.visibility,
  };
  if (asset && typeof asset === 'object') {
    if (asset.posterUrl) base.thumbnail_url = base.thumbnail_url || asset.posterUrl;
    if (asset.title) base.title = base.title || asset.title;
    if (asset.creatorName) base.creator_name = base.creator_name || asset.creatorName;
    if (asset.creatorAvatar) base.creator_avatar = base.creator_avatar || asset.creatorAvatar;
  }
  return base;
}

async function fetchWholeWithRetry(url, retries = 3) {
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new Error('offline');
    }
    try {
      const res = await fetchMediaWithTimeout(url, { mode: 'cors', credentials: 'omit' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      lastErr = e;
      if (attempt < retries - 1) {
        await sleep(800 * 2 ** attempt);
      }
    }
  }
  throw lastErr;
}

/**
 * Télécharge et stocke une vidéo si pas déjà en cache.
 * @returns {Promise<boolean>}
 */
export async function prefetchVideoToDisk(video, isSlowConnection, asset = null) {
  const id = String(video?.id || '');
  if (!id || inFlightIds.has(id)) return false;
  const url = pickProgressiveVideoUrl(video, isSlowConnection);
  if (!url) return false;
  try {
    if (await hasCachedEntry(id)) return true;
  } catch {
    return false;
  }

  inFlightIds.add(id);
  try {
    if (await hasCachedEntry(id)) return true;
    const res = await fetchWholeWithRetry(url, 3);
    const blob = await res.blob();
    if (!blob?.size) return false;
    const ok = await putCachedVideo({
      id,
      blob,
      mimeType: blob.type || 'video/mp4',
      size: blob.size,
      sourceUrl: url,
      videoMeta: snapshotVideoMeta(video, asset),
    });
    await evictDownToBudget();
    return ok;
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[feedVideoPrefetch]', id, e?.message || e);
    return false;
  } finally {
    inFlightIds.delete(id);
  }
}

/**
 * @param {any[]} assets — même forme que feedWarmAssets (video, posterUrl, …)
 * @param {object} options
 */
/**
 * Dès qu’une position du feed est « active » : télécharger les `count` vidéos suivantes (MP4).
 * @param {any[]} activeFeedVideos
 * @param {number} startIndex — index de la vidéo chargée / regardée
 * @param {number} count — ex. 15
 */
export function schedulePrefetchNextVideos(activeFeedVideos, startIndex, count, options) {
  const n = Math.max(0, Number(count) || 15);
  const slice = Array.isArray(activeFeedVideos)
    ? activeFeedVideos.slice(Number(startIndex) + 1, Number(startIndex) + 1 + n)
    : [];
  const assets = slice
    .filter(Boolean)
    .map((video) => ({
      id: String(video?.id || ''),
      video,
    }))
    .filter((a) => a.id && a.video);
  scheduleFeedDiskPrefetch(assets, { ...options, maxItems: n });
}

export function scheduleFeedDiskPrefetch(assets, options) {
  const {
    isSlowConnection = false,
    isOnline = true,
    prefs = loadPreferences(),
    maxItems = 18,
  } = options || {};

  if (!shouldRunBackgroundVideoPrefetch(prefs, isOnline)) return;
  const list = Array.isArray(assets) ? assets.slice(0, maxItems) : [];

  const throttleAfterEach =
    isSlowConnection ||
    (typeof navigator !== 'undefined' && isEffectiveConnectionSlow());

  const run = async () => {
    for (const asset of list) {
      if (!shouldRunBackgroundVideoPrefetch(loadPreferences(), navigator.onLine)) break;
      const video = asset?.video;
      if (!video?.id) continue;
      try {
        await prefetchVideoToDisk(video, isSlowConnection, asset);
        // Bas débit / save-data : espacer les GET pour ne pas monopoliser la liaison
        if (throttleAfterEach) await sleep(820);
      } catch {
        // une vidéo ne doit pas bloquer les suivantes
      }
    }
  };

  try {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => void run(), { timeout: 8000 });
    } else {
      setTimeout(() => void run(), 400);
    }
  } catch {
    void run();
  }
}

/**
 * Pendant la lecture en ligne : tente de remplir le cache (dédupliqué).
 */
export function scheduleActiveVideoMirrorToCache(video, isSlowConnection) {
  const prefs = loadPreferences();
  if (!shouldRunBackgroundVideoPrefetch(prefs, true)) return;
  if (!video?.id) return;
  void prefetchVideoToDisk(video, isSlowConnection, null);
}
