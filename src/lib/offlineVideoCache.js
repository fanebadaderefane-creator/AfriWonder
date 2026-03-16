/**
 * CPO 3.32 — Lecture hors ligne : cache des vidéos pour lecture sans réseau
 */
const CACHE_NAME = 'afriwonder-offline-videos';
const FAKE_ORIGIN = 'https://afriwonder-offline.local/';

function cacheKeyUrl(videoId) {
  return FAKE_ORIGIN + 'video-' + videoId;
}

export async function isVideoCached(videoId) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(cacheKeyUrl(videoId));
    return !!res && res.ok;
  } catch {
    return false;
  }
}

export async function getCachedVideoUrl(videoId) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(cacheKeyUrl(videoId));
    if (!res || !res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function cacheVideoForOffline(videoId, videoUrl) {
  if (!videoId || !videoUrl) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(videoUrl, { mode: 'cors' });
    if (!response.ok) return false;
    await cache.put(cacheKeyUrl(videoId), response.clone());
    return true;
  } catch (e) {
    console.warn('Offline cache put failed', e);
    return false;
  }
}

export async function removeCachedVideo(videoId) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(cacheKeyUrl(videoId));
  } catch {}
}
