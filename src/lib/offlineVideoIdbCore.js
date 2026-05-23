/**
 * Noyau IndexedDB partagé (client + service worker) pour les blobs vidéo hors-ligne.
 * Ne dépend pas de window / URL.createObjectURL.
 */

export const OFFLINE_VIDEO_DB_NAME = 'afw-offline-video-v1';
/** v2 : index sourceUrlNorm pour le service worker (recherche par URL média) */
export const OFFLINE_VIDEO_DB_VERSION = 2;
export const OFFLINE_VIDEO_STORE = 'entries';
/** Limite produit : nombre max de vidéos en cache */
export const OFFLINE_VIDEO_CACHE_MAX_ENTRIES = 20;
/** Garde-fou taille totale (secondaire après le nombre d’entrées) */
export const OFFLINE_VIDEO_CACHE_MAX_BYTES = 450 * 1024 * 1024;

/** @type {Promise<IDBDatabase> | null} */
let dbPromise = null;

export function normalizeMediaUrl(href) {
  if (!href || typeof href !== 'string') return '';
  try {
    const x = new URL(href);
    return `${x.origin}${x.pathname}${x.search}`;
  } catch {
    return String(href).split('#')[0];
  }
}

export function openOfflineVideoIdb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(OFFLINE_VIDEO_DB_NAME, OFFLINE_VIDEO_DB_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = /** @type {IDBDatabase} */ (ev.target.result);
      const from = ev.oldVersion;
      if (!db.objectStoreNames.contains(OFFLINE_VIDEO_STORE)) {
        const os = db.createObjectStore(OFFLINE_VIDEO_STORE, { keyPath: 'id' });
        os.createIndex('lastAccess', 'lastAccess', { unique: false });
        os.createIndex('sourceUrlNorm', 'sourceUrlNorm', { unique: false });
        return;
      }
      if (from < 2) {
        const tx = /** @type {IDBTransaction} */ (ev.target.transaction);
        const st = tx.objectStore(OFFLINE_VIDEO_STORE);
        if (!st.indexNames.contains('sourceUrlNorm')) {
          st.createIndex('sourceUrlNorm', 'sourceUrlNorm', { unique: false });
        }
        st.openCursor().onsuccess = (e) => {
          const cur = /** @type {IDBCursorWithValue | null} */ (e.target.result);
          if (!cur) return;
          const v = { ...cur.value };
          v.sourceUrlNorm = normalizeMediaUrl(v.sourceUrl || '');
          cur.update(v);
          cur.continue();
        };
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/**
 * @param {Request} request
 * @returns {Promise<Response | null>}
 */
async function findRowByUrlNorm(db, urlNorm) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_VIDEO_STORE, 'readonly');
    const st = tx.objectStore(OFFLINE_VIDEO_STORE);
    if (st.indexNames.contains('sourceUrlNorm')) {
      const rq = st.index('sourceUrlNorm').getAll(urlNorm);
      rq.onsuccess = () => {
        const list = rq.result;
        resolve(Array.isArray(list) && list.length ? list[0] : null);
      };
      rq.onerror = () => reject(rq.error);
      return;
    }
    const r = st.getAll();
    r.onsuccess = () => {
      const all = r.result || [];
      const hit = all.find(
        (x) => (x.sourceUrlNorm || normalizeMediaUrl(x.sourceUrl || '')) === urlNorm
      );
      resolve(hit || null);
    };
    r.onerror = () => reject(r.error);
  });
}

export async function getOfflineVideoResponseForRequest(request) {
  const urlNorm = normalizeMediaUrl(request.url);
  if (!urlNorm) return null;
  try {
    const db = await openOfflineVideoIdb();
    const row = await findRowByUrlNorm(db, urlNorm);
    if (!row?.blob) return null;
    const mime = row.mimeType || 'video/mp4';
    await touchEntryLastAccess(db, String(row.id));
    return buildVideoResponseFromBlob(request, row.blob, mime);
  } catch {
    return null;
  }
}

/**
 * @param {IDBDatabase} db
 * @param {string} id
 */
function touchEntryLastAccess(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_VIDEO_STORE, 'readwrite');
    const st = tx.objectStore(OFFLINE_VIDEO_STORE);
    const g = st.get(id);
    g.onsuccess = () => {
      const rec = g.result;
      if (!rec) {
        resolve();
        return;
      }
      rec.lastAccess = Date.now();
      const p = st.put(rec);
      p.onsuccess = () => resolve();
      p.onerror = () => reject(p.error);
    };
    g.onerror = () => reject(g.error);
  });
}

/**
 * Support basique Range pour <video> (bytes=start-).
 * @param {Request} request
 * @param {Blob} blob
 * @param {string} mimeType
 */
export function buildVideoResponseFromBlob(request, blob, mimeType = 'video/mp4') {
  const size = blob.size;
  const range = request.headers.get('range');
  if (range) {
    const m = /^bytes=(\d+)-(\d*)$/i.exec(range.trim());
    if (m) {
      const start = parseInt(m[1], 10);
      let end = m[2] === '' ? size - 1 : parseInt(m[2], 10);
      if (Number.isNaN(start) || start >= size || start < 0) {
        return new Response(null, { status: 416, statusText: 'Range Not Satisfiable' });
      }
      if (end >= size) end = size - 1;
      if (end < start) {
        return new Response(null, { status: 416, statusText: 'Range Not Satisfiable' });
      }
      const sliced = blob.slice(start, end + 1);
      return new Response(sliced, {
        status: 206,
        statusText: 'Partial Content',
        headers: {
          'Content-Length': String(sliced.size),
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
        },
      });
    }
  }
  return new Response(blob, {
    status: 200,
    headers: {
      'Content-Length': String(size),
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
    },
  });
}
