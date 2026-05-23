/**
 * Cache vidéo disque (IndexedDB) côté client : blob URLs + éviction LRU.
 * Schéma / ouverture DB : offlineVideoIdbCore (partagé avec le service worker).
 */

import {
  openOfflineVideoIdb,
  normalizeMediaUrl,
  OFFLINE_VIDEO_STORE as STORE,
  OFFLINE_VIDEO_CACHE_MAX_BYTES,
  OFFLINE_VIDEO_CACHE_MAX_ENTRIES,
} from './offlineVideoIdbCore.js';
import { APP_EVENTS } from '@/lib/persistence-registry.js';
import { fetchMediaWithTimeout } from '@/lib/mediaFetchTimeout.js';

export { OFFLINE_VIDEO_CACHE_MAX_BYTES, OFFLINE_VIDEO_CACHE_MAX_ENTRIES };

/** @type {Map<string, string>} */
const objectUrlById = new Map();

function broadcastCached(id) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(APP_EVENTS.OFFLINE_VIDEO_CACHED, { detail: { id: String(id) } }));
  } catch {
    // ignore
  }
}

export function openOfflineVideoDb() {
  return openOfflineVideoIdb();
}

/**
 * @param {string} id
 */
export async function hasCachedEntry(id) {
  try {
    const db = await openOfflineVideoIdb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).get(String(id));
      r.onsuccess = () => resolve(!!r.result);
      r.onerror = () => reject(r.error);
    });
  } catch {
    return false;
  }
}

/** Alias : VideoView / téléchargement manuel hors ligne */
export { hasCachedEntry as isVideoCached };

/** @returns {Promise<Set<string>>} */
export async function listCachedVideoIds() {
  try {
    const db = await openOfflineVideoIdb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).getAllKeys();
      r.onsuccess = () => {
        const keys = r.result || [];
        resolve(new Set(keys.map((k) => String(k))));
      };
      r.onerror = () => reject(r.error);
    });
  } catch {
    return new Set();
  }
}

/**
 * @param {string} id
 */
export async function touchCachedEntry(id) {
  try {
    const db = await openOfflineVideoIdb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const st = tx.objectStore(STORE);
      const g = st.get(String(id));
      g.onsuccess = () => {
        const row = g.result;
        if (!row) {
          resolve(null);
          return;
        }
        row.lastAccess = Date.now();
        const p = st.put(row);
        p.onsuccess = () => resolve(null);
        p.onerror = () => reject(p.error);
      };
      g.onerror = () => reject(g.error);
    });
  } catch {
    // ignore
  }
}

/**
 * @param {object} row
 * @param {string} row.id
 * @param {Blob} row.blob
 * @param {string} [row.mimeType]
 * @param {number} row.size
 * @param {string} [row.sourceUrl]
 * @param {object} [row.videoMeta]
 */
export async function putCachedVideo(row) {
  const id = String(row.id || '');
  if (!id || !(row.blob instanceof Blob)) return false;
  const size = typeof row.size === 'number' ? row.size : row.blob.size;
  const now = Date.now();
  const sourceUrl = row.sourceUrl || '';
  const record = {
    id,
    blob: row.blob,
    mimeType: row.mimeType || row.blob.type || 'video/mp4',
    size,
    lastAccess: now,
    sourceUrl,
    sourceUrlNorm: normalizeMediaUrl(sourceUrl),
    videoMeta: row.videoMeta && typeof row.videoMeta === 'object' ? row.videoMeta : {},
  };
  try {
    const db = await openOfflineVideoIdb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const p = tx.objectStore(STORE).put(record);
      p.onsuccess = () => resolve(null);
      p.onerror = () => reject(p.error);
    });
    revokeCachedBlobObjectUrl(id);
    await evictDownToBudget();
    broadcastCached(id);
    return true;
  } catch (e) {
    if (import.meta.env?.DEV) console.warn('[offlineVideoCache] put failed', e);
    return false;
  }
}

export function revokeCachedBlobObjectUrl(id) {
  const sid = String(id);
  const u = objectUrlById.get(sid);
  if (u) {
    try {
      URL.revokeObjectURL(u);
    } catch {
      // ignore
    }
    objectUrlById.delete(sid);
  }
}

/**
 * @returns {Promise<string | null>} blob: URL pour <video src>
 */
export async function getPlaybackObjectUrl(id) {
  const sid = String(id || '');
  if (!sid) return null;
  await touchCachedEntry(sid);
  const existing = objectUrlById.get(sid);
  if (existing) return existing;
  try {
    const db = await openOfflineVideoIdb();
    const row = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).get(sid);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => reject(r.error);
    });
    if (!row?.blob) return null;
    const url = URL.createObjectURL(row.blob);
    objectUrlById.set(sid, url);
    return url;
  } catch {
    return null;
  }
}

async function listRowsForEviction() {
  const db = await openOfflineVideoIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const st = tx.objectStore(STORE);
    const r = st.getAll();
    r.onsuccess = () => resolve(Array.isArray(r.result) ? r.result : []);
    r.onerror = () => reject(r.error);
  });
}

async function deleteRowId(rawId) {
  const id = String(rawId);
  revokeCachedBlobObjectUrl(id);
  const db = await openOfflineVideoIdb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const p = tx.objectStore(STORE).delete(id);
    p.onsuccess = () => resolve(null);
    p.onerror = () => reject(p.error);
  });
}

export async function evictDownToBudget() {
  let rows = await listRowsForEviction();
  if (rows.length === 0) return;
  let total = rows.reduce((s, x) => s + (Number(x.size) || 0), 0);
  rows.sort((a, b) => (Number(a.lastAccess) || 0) - (Number(b.lastAccess) || 0));

  while (
    rows.length > OFFLINE_VIDEO_CACHE_MAX_ENTRIES
    || total > OFFLINE_VIDEO_CACHE_MAX_BYTES
  ) {
    const victim = rows.shift();
    if (!victim?.id) break;
    await deleteRowId(victim.id);
    total -= Number(victim.size) || 0;
  }
}

/**
 * @returns {Promise<any[]>}
 */
export async function listOfflineFeedVideos() {
  try {
    let rows = await listRowsForEviction();
    rows = rows.filter((r) => r?.videoMeta && r?.id);
    rows.sort((a, b) => (Number(b.lastAccess) || 0) - (Number(a.lastAccess) || 0));
    return rows.map((r) => ({ ...r.videoMeta, id: r.videoMeta.id || r.id }));
  } catch {
    return [];
  }
}

export async function getCachedMeta(id) {
  try {
    const db = await openOfflineVideoIdb();
    const row = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).get(String(id));
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => reject(r.error);
    });
    return row?.videoMeta || null;
  } catch {
    return null;
  }
}

/**
 * Téléchargement manuel (ex. VideoView) : une entrée MP4 dans IndexedDB.
 * @param {string} videoId
 * @param {string} mediaUrl — URL directe (MP4 de préférence)
 * @param {object} [videoMeta]
 * @returns {Promise<boolean>}
 */
export async function cacheVideoForOffline(videoId, mediaUrl, videoMeta = null) {
  const id = String(videoId || '');
  if (!id || !mediaUrl || typeof mediaUrl !== 'string') return false;
  try {
    if (await hasCachedEntry(id)) return true;
    const res = await fetchMediaWithTimeout(mediaUrl, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) return false;
    const blob = await res.blob();
    if (!blob?.size) return false;
    const meta =
      videoMeta && typeof videoMeta === 'object'
        ? { ...videoMeta, id: videoMeta.id || id }
        : { id };
    return await putCachedVideo({
      id,
      blob,
      mimeType: blob.type || 'video/mp4',
      size: blob.size,
      sourceUrl: mediaUrl,
      videoMeta: meta,
    });
  } catch {
    return false;
  }
}
