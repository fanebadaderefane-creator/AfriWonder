/**
 * Service cache hors-ligne — Cache Storage
 * Téléchargement réel des médias en cache, lecture offline.
 */

const MEDIA_CACHE_NAME = 'afriwonder-media-v1';

import * as offlineStorage from './offlineStorage.service.js';

/**
 * Vérifier que le Cache API est disponible
 */
export function isCacheSupported() {
  return 'caches' in window;
}

/**
 * Télécharger une vidéo (ou autre média) et la stocker en Cache Storage + métadonnées IndexedDB
 * @param {{ id: string, video_url: string, title?: string, creator_name?: string }} video
 * @returns {{ success: boolean, sizeBytes?: number, error?: string }}
 */
export async function downloadMedia(video) {
  if (!isCacheSupported()) {
    return { success: false, error: 'Cache non supporté' };
  }
  const url = video.video_url || video.mediaUrl;
  const id = video.id || `media-${Date.now()}`;
  if (!url) return { success: false, error: 'URL manquante' };

  try {
    let response;
    let requestUrl = url;

    try {
      response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (directError) {
      const proxyUrl = `/api/proxy/media?url=${encodeURIComponent(url)}`;
      response = await fetch(proxyUrl, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      requestUrl = proxyUrl;
      console.warn('offlineCache.downloadMedia: fallback proxy used', directError);
    }

    const blob = await response.blob();
    const sizeBytes = blob.size;

    const cache = await caches.open(MEDIA_CACHE_NAME);
    await cache.put(requestUrl, new Response(blob, {
      status: response.status,
      statusText: response.statusText,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'video/mp4' },
    }));

    await offlineStorage.addDownloadMeta({
      id,
      mediaUrl: requestUrl,
      title: video.title || 'Sans titre',
      creator: video.creator_name || video.creator || '',
      sizeBytes,
      type: 'video',
    });

    return { success: true, sizeBytes };
  } catch (e) {
    console.error('offlineCache.downloadMedia', e);
    return {
      success: false,
      error: 'Impossible de telecharger cette video. Source bloquee ou indisponible.',
    };
  }
}

/**
 * Récupérer l’URL à utiliser pour lire un média (en ligne = URL d’origine, offline = depuis le cache)
 * En lecture, la page fait une requête vers la même URL ; le Service Worker sert depuis le cache si présent.
 */
export function getMediaPlaybackUrl(mediaUrl) {
  return mediaUrl;
}

/**
 * Supprimer un média du cache et des métadonnées
 */
export async function removeMedia(id, mediaUrl) {
  if (isCacheSupported()) {
    const cache = await caches.open(MEDIA_CACHE_NAME);
    await cache.delete(mediaUrl);
  }
  await offlineStorage.removeDownloadMeta(id);
}

/**
 * Liste des contenus en cache (depuis IndexedDB)
 */
export async function listCachedDownloads() {
  return offlineStorage.listDownloads();
}

/**
 * Taille totale utilisée (IndexedDB)
 */
export async function getTotalUsedBytes() {
  return offlineStorage.getTotalStorageUsed();
}

/**
 * Quota stockage
 */
export async function getQuota() {
  return offlineStorage.getStorageQuota();
}

export default {
  isCacheSupported,
  downloadMedia,
  getMediaPlaybackUrl,
  removeMedia,
  listCachedDownloads,
  getTotalUsedBytes,
  getQuota,
};
