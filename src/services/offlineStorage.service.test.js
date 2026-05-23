import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const store = new Map();
let getAllReturnsNull = false;

function makeReq(result) {
  const req = { result, onsuccess: null, onerror: null };
  queueMicrotask(() => { if (req.onsuccess) req.onsuccess(); });
  return req;
}

beforeEach(() => {
  store.clear();
  getAllReturnsNull = false;
  vi.resetModules();
  const mockDB = {
    transaction: (storeName, mode) => ({
      objectStore: () => ({
        put: (record) => {
          const rec = { ...record, downloadedAt: record.downloadedAt ?? Date.now() };
          store.set(record.id, rec);
          return makeReq(rec);
        },
        get: (key) => makeReq(store.get(key) ?? null),
        getAll: () => makeReq(getAllReturnsNull ? null : Array.from(store.values())),
        delete: (key) => {
          store.delete(key);
          return makeReq();
        },
        index: () => ({
          get: (key) => makeReq(Array.from(store.values()).find((r) => r.mediaUrl === key) ?? null),
        }),
      }),
    }),
    objectStoreNames: { contains: () => false },
    createObjectStore: () => ({ createIndex: () => {} }),
  };
  const mockOpen = (name, version) => {
    const req = { result: null, onupgradeneeded: null, onsuccess: null, onerror: null };
    queueMicrotask(() => {
      req.result = mockDB;
      if (req.onupgradeneeded) req.onupgradeneeded({ target: { result: mockDB } });
      if (req.onsuccess) req.onsuccess();
    });
    return req;
  };
  global.indexedDB = { open: mockOpen, deleteDatabase: vi.fn(() => ({ onsuccess: null })) };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('offlineStorage.service', () => {
  it('getStorageQuota returns fallback when navigator.storage missing', async () => {
    const orig = navigator.storage;
    delete navigator.storage;
    const { getStorageQuota } = await import('./offlineStorage.service.js');
    const result = await getStorageQuota();
    expect(result).toEqual({ quota: null, usage: null, usageDetails: null });
    if (orig) navigator.storage = orig;
  });

  it('getStorageQuota returns estimate when navigator.storage.estimate exists', async () => {
    const orig = navigator.storage;
    navigator.storage = { estimate: vi.fn().mockResolvedValue({ quota: 1000, usage: 100, usageDetails: {} }) };
    const { getStorageQuota } = await import('./offlineStorage.service.js');
    const result = await getStorageQuota();
    expect(result).toEqual({ quota: 1000, usage: 100, usageDetails: {} });
    navigator.storage = orig;
  });

  it('getStorageQuota returns usageDetails null when estimate omits it', async () => {
    const orig = navigator.storage;
    navigator.storage = { estimate: vi.fn().mockResolvedValue({ quota: 1000, usage: 50 }) };
    const { getStorageQuota } = await import('./offlineStorage.service.js');
    const result = await getStorageQuota();
    expect(result).toEqual({ quota: 1000, usage: 50, usageDetails: null });
    navigator.storage = orig;
  });

  it('getStorageQuota returns fallback when estimate rejects', async () => {
    const orig = navigator.storage;
    navigator.storage = { estimate: vi.fn().mockRejectedValue(new Error('Quota exceeded')) };
    const { getStorageQuota } = await import('./offlineStorage.service.js');
    const result = await getStorageQuota();
    expect(result).toEqual({ quota: null, usage: null, usageDetails: null });
    navigator.storage = orig;
  });

  it('addDownloadMeta and listDownloads roundtrip', async () => {
    const { addDownloadMeta, listDownloads } = await import('./offlineStorage.service.js');
    const meta = { id: 'id1', mediaUrl: 'https://example.com/v.mp4', title: 'Test', creator: 'Me' };
    await addDownloadMeta(meta);
    const list = await listDownloads();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('id1');
    expect(list[0].mediaUrl).toBe(meta.mediaUrl);
    expect(list[0].downloadedAt).toBeDefined();
  });

  it('removeDownloadMeta removes entry', async () => {
    const { addDownloadMeta, removeDownloadMeta, listDownloads } = await import('./offlineStorage.service.js');
    await addDownloadMeta({ id: 'id2', mediaUrl: 'https://ex.com/v2.mp4', title: 'T2' });
    await removeDownloadMeta('id2');
    const list = await listDownloads();
    expect(list.length).toBe(0);
  });

  it('getTotalStorageUsed sums sizeBytes', async () => {
    const { addDownloadMeta, getTotalStorageUsed } = await import('./offlineStorage.service.js');
    await addDownloadMeta({ id: 'a', mediaUrl: 'u1', title: 'A', sizeBytes: 100 });
    await addDownloadMeta({ id: 'b', mediaUrl: 'u2', title: 'B', sizeBytes: 200 });
    const total = await getTotalStorageUsed();
    expect(total).toBe(300);
  });

  it('getTotalStorageUsed treats missing sizeBytes as 0', async () => {
    const { addDownloadMeta, getTotalStorageUsed } = await import('./offlineStorage.service.js');
    await addDownloadMeta({ id: 'noSize', mediaUrl: 'u3', title: 'No size' });
    const total = await getTotalStorageUsed();
    expect(total).toBe(0);
  });

  it('getDownloadByUrl returns record by mediaUrl', async () => {
    const { addDownloadMeta, getDownloadByUrl } = await import('./offlineStorage.service.js');
    await addDownloadMeta({ id: 'x', mediaUrl: 'https://cdn.com/v.mp4', title: 'V' });
    const found = await getDownloadByUrl('https://cdn.com/v.mp4');
    expect(found).toBeDefined();
    expect(found.id).toBe('x');
  });

  it('getDownloadByUrl returns null when no match', async () => {
    const { getDownloadByUrl } = await import('./offlineStorage.service.js');
    const found = await getDownloadByUrl('https://nonexistent.example.com/v.mp4');
    expect(found).toBeNull();
  });

  it('listDownloads returns empty array when store empty', async () => {
    const { listDownloads } = await import('./offlineStorage.service.js');
    const list = await listDownloads();
    expect(list).toEqual([]);
  });

  it('listDownloads returns [] when getAll result is null (branch 57)', async () => {
    getAllReturnsNull = true;
    const { listDownloads } = await import('./offlineStorage.service.js');
    const list = await listDownloads();
    expect(list).toEqual([]);
  });
});
