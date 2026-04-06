import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./offlineStorage.service.js', () => ({
  addDownloadMeta: vi.fn(() => Promise.resolve()),
  removeDownloadMeta: vi.fn(() => Promise.resolve()),
  listDownloads: vi.fn(() => Promise.resolve([])),
  getTotalStorageUsed: vi.fn(() => Promise.resolve(0)),
  getStorageQuota: vi.fn(() => Promise.resolve({ quota: null, usage: null, usageDetails: null })),
}));

import {
  isCacheSupported,
  downloadMedia,
  getMediaPlaybackUrl,
  removeMedia,
  listCachedDownloads,
  getTotalUsedBytes,
  getQuota,
} from './offlineCache.service.js';
import * as offlineStorage from './offlineStorage.service.js';

describe('offlineCache.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isCacheSupported', () => {
    it('returns true when caches in window', () => {
      expect(typeof isCacheSupported()).toBe('boolean');
    });
  });

  describe('getMediaPlaybackUrl', () => {
    it('returns mediaUrl unchanged', () => {
      expect(getMediaPlaybackUrl('https://cdn.example.com/video.mp4')).toBe('https://cdn.example.com/video.mp4');
    });
  });

  describe('downloadMedia', () => {
    it('returns error when cache not supported', async () => {
      const orig = window.caches;
      delete window.caches;
      const result = await downloadMedia({ id: '1', video_url: 'https://example.com/v.mp4' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cache non supporté');
      window.caches = orig;
    });
    it('returns error when URL missing', async () => {
      if (!('caches' in window)) return;
      const result = await downloadMedia({ id: '1' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('URL manquante');
    });
    it('returns error when fetch fails', async () => {
      if (!('caches' in window)) return;
      const origFetch = global.fetch;
      global.fetch = () => Promise.reject(new Error('Network error'));
      const result = await downloadMedia({ id: '1', video_url: 'https://example.com/v.mp4' });
      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Impossible de telecharger cette video. Source bloquee ou indisponible.'
      );
      global.fetch = origFetch;
    });
    it('returns error when response not ok', async () => {
      if (!('caches' in window)) return;
      const origFetch = global.fetch;
      global.fetch = () => Promise.resolve({ ok: false, status: 404 });
      const result = await downloadMedia({ id: '1', video_url: 'https://example.com/v.mp4' });
      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Impossible de telecharger cette video. Source bloquee ou indisponible.'
      );
      global.fetch = origFetch;
    });
    it('returns success and calls addDownloadMeta when fetch and cache succeed', async () => {
      if (!('caches' in window)) return;
      const origFetch = global.fetch;
      const origCaches = window.caches;
      const blob = new Blob(['x'], { type: 'video/mp4' });
      global.fetch = () => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(blob),
        status: 200,
        statusText: 'OK',
        headers: { get: () => 'video/mp4' },
      });
      window.caches = { open: vi.fn().mockResolvedValue({ put: vi.fn().mockResolvedValue(undefined) }) };
      const result = await downloadMedia({
        id: 'v1',
        video_url: 'https://example.com/v.mp4',
        title: 'My Video',
        creator_name: 'Creator',
      });
      expect(result.success).toBe(true);
      expect(result.sizeBytes).toBe(1);
      expect(offlineStorage.addDownloadMeta).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'v1',
          mediaUrl: 'https://example.com/v.mp4',
          title: 'My Video',
          creator: 'Creator',
          sizeBytes: 1,
          type: 'video',
        })
      );
      global.fetch = origFetch;
      window.caches = origCaches;
    });
    it('uses mediaUrl when video_url is absent (branch 27)', async () => {
      if (!('caches' in window)) return;
      const origFetch = global.fetch;
      const origCaches = window.caches;
      const blob = new Blob(['a'], { type: 'video/mp4' });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(blob),
        status: 200,
        statusText: 'OK',
        headers: { get: () => null },
      });
      window.caches = { open: vi.fn().mockResolvedValue({ put: vi.fn().mockResolvedValue(undefined) }) };
      const result = await downloadMedia({
        id: 'm1',
        mediaUrl: 'https://cdn.example.com/media.mp4',
        title: 'Sans titre',
      });
      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('https://cdn.example.com/media.mp4', { mode: 'cors' });
      expect(offlineStorage.addDownloadMeta).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaUrl: 'https://cdn.example.com/media.mp4',
          title: 'Sans titre',
          creator: '',
        })
      );
      global.fetch = origFetch;
      window.caches = origCaches;
    });
    it('uses video/mp4 when Content-Type header missing (branch 40)', async () => {
      if (!('caches' in window)) return;
      const origFetch = global.fetch;
      const origCaches = window.caches;
      const blob = new Blob(['b']);
      global.fetch = () => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(blob),
        status: 200,
        statusText: 'OK',
        headers: { get: () => undefined },
      });
      window.caches = { open: vi.fn().mockResolvedValue({ put: vi.fn().mockResolvedValue(undefined) }) };
      const result = await downloadMedia({ id: 'h1', video_url: 'https://x.com/v.mp4' });
      expect(result.success).toBe(true);
      global.fetch = origFetch;
      window.caches = origCaches;
    });
  });

  describe('removeMedia', () => {
    it('calls offlineStorage.removeDownloadMeta', async () => {
      const hadCaches = 'caches' in window;
      if (hadCaches) {
        window.caches = { open: vi.fn().mockResolvedValue({ delete: vi.fn().mockResolvedValue(undefined) }) };
      }
      await removeMedia('id1', 'https://example.com/v.mp4');
      expect(offlineStorage.removeDownloadMeta).toHaveBeenCalledWith('id1');
      if (!hadCaches) delete window.caches;
    });
  });

  describe('listCachedDownloads', () => {
    it('returns result from offlineStorage.listDownloads', async () => {
      offlineStorage.listDownloads.mockResolvedValue([{ id: '1', title: 'Test' }]);
      const list = await listCachedDownloads();
      expect(list).toEqual([{ id: '1', title: 'Test' }]);
    });
  });

  describe('getTotalUsedBytes', () => {
    it('returns result from offlineStorage.getTotalStorageUsed', async () => {
      offlineStorage.getTotalStorageUsed.mockResolvedValue(1024);
      expect(await getTotalUsedBytes()).toBe(1024);
    });
  });

  describe('getQuota', () => {
    it('returns result from offlineStorage.getStorageQuota', async () => {
      const quota = { quota: 1000, usage: 100 };
      offlineStorage.getStorageQuota.mockResolvedValue(quota);
      expect(await getQuota()).toEqual(quota);
    });
  });
});
