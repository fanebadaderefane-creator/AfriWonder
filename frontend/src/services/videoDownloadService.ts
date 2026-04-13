import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DOWNLOADS_DIR = `${FileSystem.documentDirectory ?? ''}afriwonder_videos/`;
const META_KEY = 'afriwonder_download_meta';
const MAX_STORAGE_BYTES = 2 * 1024 * 1024 * 1024; // 2 Go

export interface DownloadedVideo {
  id: string;
  title: string;
  thumbnailUrl: string;
  localPath: string;
  fileSize: number;
  downloadedAt: number;
  duration: number;
  creatorName: string;
  creatorAvatar: string;
}

export interface DownloadProgress {
  videoId: string;
  progress: number;
  status: 'queued' | 'downloading' | 'completed' | 'failed' | 'paused';
  error?: string;
}

type DownloadListener = (progress: DownloadProgress) => void;

type DownloadMeta = Omit<DownloadedVideo, 'localPath' | 'fileSize' | 'downloadedAt'>;

class VideoDownloadManager {
  private downloads = new Map<string, FileSystem.DownloadResumable>();
  private queue: Array<{ videoId: string; url: string; meta: DownloadMeta }> = [];
  private listeners = new Set<DownloadListener>();
  private processing = false;

  subscribe(listener: DownloadListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(progress: DownloadProgress) {
    this.listeners.forEach((l) => l(progress));
  }

  private async ensureDirectory(): Promise<void> {
    if (Platform.OS === 'web' || !FileSystem.documentDirectory) return;
    const info = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
    }
  }

  async getDownloadedVideos(): Promise<DownloadedVideo[]> {
    try {
      const raw = await AsyncStorage.getItem(META_KEY);
      return raw ? (JSON.parse(raw) as DownloadedVideo[]) : [];
    } catch {
      return [];
    }
  }

  private async saveMeta(videos: DownloadedVideo[]) {
    await AsyncStorage.setItem(META_KEY, JSON.stringify(videos));
  }

  async isDownloaded(videoId: string): Promise<boolean> {
    const videos = await this.getDownloadedVideos();
    const found = videos.find((v) => v.id === videoId);
    if (!found) return false;
    const info = await FileSystem.getInfoAsync(found.localPath);
    return info.exists;
  }

  async getStorageUsed(): Promise<number> {
    const videos = await this.getDownloadedVideos();
    return videos.reduce((total, v) => total + (v.fileSize || 0), 0);
  }

  async getStorageInfo(): Promise<{ used: number; max: number; count: number }> {
    const videos = await this.getDownloadedVideos();
    return {
      used: videos.reduce((t, v) => t + (v.fileSize || 0), 0),
      max: MAX_STORAGE_BYTES,
      count: videos.length,
    };
  }

  async enqueueDownload(videoId: string, videoUrl: string, meta: DownloadMeta) {
    if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
      this.notify({
        videoId,
        progress: 0,
        status: 'failed',
        error: 'Téléchargement hors-ligne indisponible sur le web.',
      });
      return;
    }

    if (await this.isDownloaded(videoId)) return;

    const storageUsed = await this.getStorageUsed();
    if (storageUsed >= MAX_STORAGE_BYTES) {
      await this.cleanupOldest(1);
    }

    this.queue.push({ videoId, url: videoUrl, meta });
    this.notify({ videoId, progress: 0, status: 'queued' });
    void this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    await this.ensureDirectory();

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      try {
        await this.downloadVideo(item.videoId, item.url, item.meta);
      } catch (e) {
        this.notify({
          videoId: item.videoId,
          progress: 0,
          status: 'failed',
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    this.processing = false;
  }

  private async downloadVideo(videoId: string, url: string, meta: DownloadMeta): Promise<void> {
    const ext = url.includes('.m3u8') ? '.m3u8' : '.mp4';
    const localPath = `${DOWNLOADS_DIR}${videoId}${ext}`;
    this.notify({ videoId, progress: 0, status: 'downloading' });

    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      localPath,
      {},
      (downloadProgress) => {
        const total = downloadProgress.totalBytesExpectedToWrite;
        const written = downloadProgress.totalBytesWritten;
        const progress =
          total > 0 ? Math.min(1, Math.max(0, written / total)) : written > 0 ? 0.5 : 0;
        this.notify({ videoId, progress, status: 'downloading' });
      },
    );

    this.downloads.set(videoId, downloadResumable);

    try {
      const result = await downloadResumable.downloadAsync();
      if (!result?.uri) throw new Error('Téléchargement sans URI');

      const fileInfo = await FileSystem.getInfoAsync(localPath);
      const fileSize =
        fileInfo.exists && 'size' in fileInfo && typeof fileInfo.size === 'number'
          ? fileInfo.size
          : 0;

      const downloadedVideo: DownloadedVideo = {
        ...meta,
        localPath,
        fileSize,
        downloadedAt: Date.now(),
      };

      const videos = await this.getDownloadedVideos();
      videos.push(downloadedVideo);
      await this.saveMeta(videos);

      this.notify({ videoId, progress: 1, status: 'completed' });
    } finally {
      this.downloads.delete(videoId);
    }
  }

  async pauseDownload(videoId: string) {
    const download = this.downloads.get(videoId);
    if (download) {
      await download.pauseAsync();
      this.notify({ videoId, progress: 0, status: 'paused' });
    }
  }

  async resumeDownload(videoId: string) {
    const download = this.downloads.get(videoId);
    if (download) {
      this.notify({ videoId, progress: 0, status: 'downloading' });
      await download.resumeAsync();
    }
  }

  async cancelDownload(videoId: string) {
    const download = this.downloads.get(videoId);
    if (download) {
      try {
        await download.cancelAsync();
      } catch {
        /* ignore */
      }
      this.downloads.delete(videoId);
    }
    this.queue = this.queue.filter((q) => q.videoId !== videoId);
  }

  async deleteVideo(videoId: string) {
    const videos = await this.getDownloadedVideos();
    const video = videos.find((v) => v.id === videoId);
    if (video) {
      try {
        await FileSystem.deleteAsync(video.localPath, { idempotent: true });
      } catch {
        /* ignore */
      }
    }
    await this.saveMeta(videos.filter((v) => v.id !== videoId));
  }

  async cleanupOldest(count: number = 5) {
    const videos = await this.getDownloadedVideos();
    const sorted = [...videos].sort((a, b) => a.downloadedAt - b.downloadedAt);
    const toRemove = sorted.slice(0, count);
    for (const v of toRemove) {
      try {
        await FileSystem.deleteAsync(v.localPath, { idempotent: true });
      } catch {
        /* ignore */
      }
    }
    const remaining = videos.filter((v) => !toRemove.find((r) => r.id === v.id));
    await this.saveMeta(remaining);
  }

  async clearAll() {
    const videos = await this.getDownloadedVideos();
    for (const v of videos) {
      try {
        await FileSystem.deleteAsync(v.localPath, { idempotent: true });
      } catch {
        /* ignore */
      }
    }
    await this.saveMeta([]);
    if (Platform.OS !== 'web' && FileSystem.documentDirectory) {
      try {
        await FileSystem.deleteAsync(DOWNLOADS_DIR, { idempotent: true });
      } catch {
        /* ignore */
      }
      await this.ensureDirectory();
    }
  }
}

export const videoDownloadManager = new VideoDownloadManager();

export function useVideoDownload(videoId: string) {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  useEffect(() => {
    void videoDownloadManager.isDownloaded(videoId).then(setIsDownloaded);
    const unsub = videoDownloadManager.subscribe((p) => {
      if (p.videoId === videoId) {
        setProgress(p);
        if (p.status === 'completed') setIsDownloaded(true);
      }
    });
    return unsub;
  }, [videoId]);

  const download = useCallback(
    async (url: string, meta: DownloadMeta) => {
      await videoDownloadManager.enqueueDownload(videoId, url, meta);
    },
    [videoId],
  );

  const remove = useCallback(async () => {
    await videoDownloadManager.deleteVideo(videoId);
    setIsDownloaded(false);
    setProgress(null);
  }, [videoId]);

  return { isDownloaded, progress, download, remove };
}

export function useDownloadedVideos() {
  const [videos, setVideos] = useState<DownloadedVideo[]>([]);
  const [storageInfo, setStorageInfo] = useState({ used: 0, max: MAX_STORAGE_BYTES, count: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [vids, info] = await Promise.all([
      videoDownloadManager.getDownloadedVideos(),
      videoDownloadManager.getStorageInfo(),
    ]);
    setVideos(vids);
    setStorageInfo(info);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    videos,
    storageInfo,
    loading,
    refresh,
    clearAll: () => videoDownloadManager.clearAll(),
  };
}
