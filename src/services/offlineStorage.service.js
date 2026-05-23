/**
 * Service de stockage hors-ligne — IndexedDB
 * Métadonnées des téléchargements, quota, suppression propre.
 */

const DB_NAME = 'afriwonder-offline';
const DB_VERSION = 1;
const STORE_DOWNLOADS = 'downloads';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_DOWNLOADS)) {
        const store = db.createObjectStore(STORE_DOWNLOADS, { keyPath: 'id' });
        store.createIndex('downloadedAt', 'downloadedAt', { unique: false });
        store.createIndex('mediaUrl', 'mediaUrl', { unique: true });
      }
    };
  });
  return dbPromise;
}

/**
 * Enregistrer un téléchargement (métadonnées)
 * @param {{ id: string, mediaUrl: string, title: string, creator?: string, sizeBytes?: number, type?: string }} meta
 */
export async function addDownloadMeta(meta) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOWNLOADS, 'readwrite');
    const store = tx.objectStore(STORE_DOWNLOADS);
    const record = {
      ...meta,
      downloadedAt: Date.now(),
    };
    const req = store.put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Liste des téléchargements
 */
export async function listDownloads() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOWNLOADS, 'readonly');
    const req = tx.objectStore(STORE_DOWNLOADS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Supprimer une entrée (métadonnées seulement — le cache doit être vidé côté offlineCache.service)
 */
export async function removeDownloadMeta(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOWNLOADS, 'readwrite');
    const req = tx.objectStore(STORE_DOWNLOADS).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Récupérer une entrée par URL média
 */
export async function getDownloadByUrl(mediaUrl) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOWNLOADS, 'readonly');
    const index = tx.objectStore(STORE_DOWNLOADS).index('mediaUrl');
    const req = index.get(mediaUrl);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Taille totale utilisée (somme des sizeBytes enregistrés)
 */
export async function getTotalStorageUsed() {
  const list = await listDownloads();
  return list.reduce((acc, item) => acc + (item.sizeBytes || 0), 0);
}

/**
 * Vérification du quota de stockage (Storage Manager API si dispo)
 */
export async function getStorageQuota() {
  if (!navigator.storage || !navigator.storage.estimate) {
    return { quota: null, usage: null, usageDetails: null };
  }
  try {
    const estimate = await navigator.storage.estimate();
    return {
      quota: estimate.quota,
      usage: estimate.usage,
      usageDetails: estimate.usageDetails || null,
    };
  } catch (e) {
    return { quota: null, usage: null, usageDetails: null };
  }
}

export default {
  addDownloadMeta,
  listDownloads,
  removeDownloadMeta,
  getDownloadByUrl,
  getTotalStorageUsed,
  getStorageQuota,
};
