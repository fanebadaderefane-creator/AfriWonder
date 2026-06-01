import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import NetInfo from '@react-native-community/netinfo';
import { OfflineStorage } from '../utils/offlineStorage';
import { isProgressiveVideoUrl, pickProgressivePlaybackUrl } from '../utils/pickProgressivePlaybackUrl';
import { devLog } from '../utils/devLog';
import {
  getOfflineAutoWarmAhead,
  getOfflineAutoWarmBehind,
  getOfflineAutoWarmPageCap,
} from '../config/mobileDataPolicy';
import { pickCacheEntriesForEviction } from './feedOfflineCacheEviction';

const CACHE_DIR = `${FileSystem.documentDirectory ?? ''}afriwonder_feed_cache/`;
const INDEX_KEY = 'afriwonder_feed_cache_index_v1';
const SNAPSHOT_PREFIX = 'feed_snapshot_v1_';

/** Budget cache auto (distinct des téléchargements manuels 2 Go). */
const MAX_CACHE_BYTES = 320 * 1024 * 1024;
const MAX_ENTRIES = 48;
const FEED_SNAPSHOT_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type FeedTabKey = 'following' | 'foryou' | 'apprendre' | 'diversified';

export type FeedSnapshotVideo = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isSaved: boolean;
  hashtags: string[];
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    username?: string;
    isFollowing: boolean;
    isSelf?: boolean;
  };
  music: string;
  isSponsored?: boolean;
  trimStartSec?: number | null;
  trimEndSec?: number | null;
  dataSaverLowQuality?: boolean;
  reactionCounts?: Record<string, number> | null;
  myReaction?: string | null;
  commentsDisabled?: boolean;
  remixCreditName?: string | null;
  remixKind?: string | null;
  mediaType?: 'video' | 'photo';
  offlineCached?: boolean;
  /** URL MP4 utilisée pour le cache disque (peut différer de videoUrl HLS en ligne). */
  progressiveCacheUrl?: string;
};

export type FeedSnapshot = {
  tab: FeedTabKey;
  videos: FeedSnapshotVideo[];
  page: number;
  hasMore: boolean;
  savedAt: number;
};

type CacheIndexEntry = {
  videoId: string;
  localPath: string;
  remoteUrl: string;
  fileSize: number;
  cachedAt: number;
  /** Lecture ≥ seuil — conservé en priorité hors ligne (style Instagram). */
  watched?: boolean;
};

type DownloadQueueItem = {
  videoId: string;
  url: string;
  watched?: boolean;
};

type CacheIndex = Record<string, CacheIndexEntry>;

export type WarmFeedItem = { id: string; progressiveUrl: string };

class FeedVideoOfflineCacheService {
  private index: CacheIndex | null = null;
  private indexLoadPromise: Promise<CacheIndex> | null = null;
  private inFlight = new Set<string>();
  private downloadQueue: DownloadQueueItem[] = [];
  private processingQueue = false;

  async isDeviceOffline(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected === false || state.isInternetReachable === false;
    } catch {
      return false;
    }
  }

  snapshotKey(tab: FeedTabKey): string {
    return `${SNAPSHOT_PREFIX}${tab}`;
  }

  async saveFeedSnapshot(
    tab: FeedTabKey,
    videos: FeedSnapshotVideo[],
    page: number,
    hasMore: boolean,
  ): Promise<void> {
    if (Platform.OS === 'web') return;
    const payload: FeedSnapshot = {
      tab,
      videos,
      page,
      hasMore,
      savedAt: Date.now(),
    };
    await OfflineStorage.set(this.snapshotKey(tab), payload, FEED_SNAPSHOT_TTL_MS);
  }

  async loadFeedSnapshot(tab: FeedTabKey): Promise<FeedSnapshot | null> {
    if (Platform.OS === 'web') return null;
    const cached = await OfflineStorage.get<FeedSnapshot>(this.snapshotKey(tab));
    if (!cached.data?.videos?.length) return null;
    return cached.data;
  }

  progressiveUrlFromApiRow(v: Record<string, unknown>): string {
    return pickProgressivePlaybackUrl(v, true);
  }

  async hydrateLocalPlaybackUrls<T extends FeedSnapshotVideo>(videos: T[]): Promise<T[]> {
    if (Platform.OS === 'web' || videos.length === 0) return videos;
    const index = await this.loadIndex();
    const out: T[] = [];
    for (const v of videos) {
      const entry = index[v.id];
      if (!entry) {
        out.push(v);
        continue;
      }
      try {
        const info = await FileSystem.getInfoAsync(entry.localPath);
        if (!info.exists) {
          await this.removeIndexEntry(v.id);
          out.push(v);
          continue;
        }
        out.push({
          ...v,
          videoUrl: entry.localPath,
          offlineCached: true,
        });
      } catch {
        out.push(v);
      }
    }
    return out;
  }

  /** Vidéos effectivement lisibles sans réseau (fichier local présent). */
  async filterOfflinePlayable<T extends FeedSnapshotVideo>(videos: T[]): Promise<T[]> {
    const hydrated = await this.hydrateLocalPlaybackUrls(videos);
    return hydrated.filter((v) => v.offlineCached && Boolean(v.videoUrl));
  }

  async countOfflinePlayable(videoIds: string[]): Promise<number> {
    if (Platform.OS === 'web' || videoIds.length === 0) return 0;
    const index = await this.loadIndex();
    let n = 0;
    for (const id of videoIds) {
      const entry = index[id];
      if (!entry) continue;
      try {
        const info = await FileSystem.getInfoAsync(entry.localPath);
        if (info.exists) n += 1;
      } catch {
        /* ignore */
      }
    }
    return n;
  }

  /**
   * Cache une vidéo **après lecture** (modèle Instagram) — MP4 bas débit.
   * Prioritaire dans la file : relecture hors ligne sans retélécharger tout le feed.
   */
  cacheWatchedVideo(videoId: string, progressiveUrl: string): void {
    if (Platform.OS === 'web') return;
    const url = progressiveUrl.trim();
    if (!videoId || !url || !isProgressiveVideoUrl(url)) return;
    void this.loadIndex().then(async (index) => {
      const existing = index[videoId];
      if (existing) {
        if (!existing.watched) {
          existing.watched = true;
          await this.persistIndex(index);
        }
        return;
      }
      this.enqueueDownload(videoId, url, { watched: true, priority: true });
    });
  }

  /**
   * Pré-cache silencieux : slide active + voisines (fluidité swipe).
   * N’utilise que des MP4 progressifs — pas de segments HLS.
   */
  warmVideos(
    items: WarmFeedItem[],
    focusIndex: number,
    opts?: { ahead?: number; behind?: number },
  ): void {
    if (Platform.OS === 'web' || items.length === 0) return;
    const ahead = Math.max(0, opts?.ahead ?? 3);
    const behind = Math.max(0, opts?.behind ?? 1);
    const start = Math.max(0, focusIndex - behind);
    const end = Math.min(items.length - 1, focusIndex + ahead);
    for (let i = start; i <= end; i += 1) {
      this.enqueueWarmItem(items[i]);
    }
  }

  /**
   * Pré-cache automatique d’une page entière : priorité à la vidéo active, puis le reste
   * (sans aucune action utilisateur — comportement TikTok).
   */
  warmFeedPage(
    items: WarmFeedItem[],
    focusIndex: number,
    opts?: {
      ahead?: number;
      behind?: number;
      maxItems?: number;
      effectiveDataSaver?: boolean;
      isOnCellular?: boolean;
    },
  ): void {
    if (Platform.OS === 'web' || items.length === 0) return;
    const effectiveDataSaver = opts?.effectiveDataSaver ?? false;
    const isOnCellular = opts?.isOnCellular ?? false;
    const ahead = opts?.ahead ?? getOfflineAutoWarmAhead(effectiveDataSaver, isOnCellular);
    const behind = opts?.behind ?? getOfflineAutoWarmBehind(isOnCellular);
    const maxItems = Math.min(
      items.length,
      opts?.maxItems ?? getOfflineAutoWarmPageCap(effectiveDataSaver, isOnCellular),
    );

    const priority = new Set<number>();
    const start = Math.max(0, focusIndex - behind);
    const end = Math.min(items.length - 1, focusIndex + ahead);
    for (let i = start; i <= end; i += 1) priority.add(i);

    for (let i = start; i <= end; i += 1) {
      this.enqueueWarmItem(items[i]);
    }

    let extra = priority.size;
    for (let i = 0; i < items.length && extra < maxItems; i += 1) {
      if (priority.has(i)) continue;
      this.enqueueWarmItem(items[i]);
      extra += 1;
    }
  }

  /** Au lancement (online) : reprend le pré-cache du dernier fil sans ouvrir l’écran Accueil. */
  async bootstrapOfflineCacheOnLaunch(
    effectiveDataSaver = false,
    isOnCellular = false,
  ): Promise<void> {
    if (Platform.OS === 'web') return;
    if (await this.isDeviceOffline()) return;
    const tabs: FeedTabKey[] = ['foryou', 'following', 'apprendre'];
    for (const tab of tabs) {
      const snap = await this.loadFeedSnapshot(tab);
      if (!snap?.videos?.length) continue;
      const items: WarmFeedItem[] = snap.videos.map((v) => ({
        id: v.id,
        progressiveUrl: (v.progressiveCacheUrl || '').trim(),
      }));
      this.warmFeedPage(items, 0, {
        effectiveDataSaver,
        isOnCellular,
        maxItems: Math.min(items.length, getOfflineAutoWarmPageCap(effectiveDataSaver, isOnCellular)),
      });
    }
  }

  private enqueueWarmItem(item: WarmFeedItem | undefined): void {
    const url = (item?.progressiveUrl || '').trim();
    if (!item?.id || !url || !isProgressiveVideoUrl(url)) return;
    this.enqueueDownload(item.id, url);
  }

  async clearAll(): Promise<void> {
    if (Platform.OS === 'web') return;
    this.inFlight.clear();
    this.downloadQueue = [];
    this.index = {};
    await OfflineStorage.remove(INDEX_KEY);
    try {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    } catch {
      /* ignore */
    }
    await this.ensureDirectory();
  }

  async getStorageUsedBytes(): Promise<number> {
    const index = await this.loadIndex();
    return Object.values(index).reduce((t, e) => t + (e.fileSize || 0), 0);
  }

  private async ensureDirectory(): Promise<void> {
    if (Platform.OS === 'web' || !FileSystem.documentDirectory) return;
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
  }

  private async loadIndex(): Promise<CacheIndex> {
    if (this.index) return this.index;
    if (!this.indexLoadPromise) {
      this.indexLoadPromise = (async () => {
        try {
          const raw = await OfflineStorage.get<CacheIndex>(INDEX_KEY);
          const data = raw.data && typeof raw.data === 'object' ? raw.data : {};
          this.index = data;
          return data;
        } catch {
          this.index = {};
          return {};
        } finally {
          this.indexLoadPromise = null;
        }
      })();
    }
    return this.indexLoadPromise;
  }

  private async persistIndex(index: CacheIndex): Promise<void> {
    this.index = index;
    await OfflineStorage.set(INDEX_KEY, index, FEED_SNAPSHOT_TTL_MS);
  }

  private enqueueDownload(
    videoId: string,
    url: string,
    opts?: { watched?: boolean; priority?: boolean },
  ): void {
    if (this.inFlight.has(videoId)) return;
    if (this.downloadQueue.some((q) => q.videoId === videoId)) return;
    void this.loadIndex().then((index) => {
      if (index[videoId]) return;
      const item: DownloadQueueItem = { videoId, url, watched: opts?.watched };
      if (opts?.priority) {
        this.downloadQueue.unshift(item);
      } else {
        this.downloadQueue.push(item);
      }
      void this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue) return;
    this.processingQueue = true;
    await this.ensureDirectory();
    while (this.downloadQueue.length > 0) {
      const item = this.downloadQueue.shift()!;
      if (this.inFlight.has(item.videoId)) continue;
      const index = await this.loadIndex();
      if (index[item.videoId]) continue;
      this.inFlight.add(item.videoId);
      try {
        await this.downloadOne(item.videoId, item.url, item.watched);
      } catch (e) {
        devLog('[FeedOfflineCache] download failed', item.videoId, e);
      } finally {
        this.inFlight.delete(item.videoId);
      }
    }
    this.processingQueue = false;
  }

  private localPathFor(videoId: string, url: string): string {
    const extMatch = url.split('?')[0].match(/\.(mp4|mov|m4v|webm)$/i);
    const ext = extMatch ? extMatch[0].toLowerCase() : '.mp4';
    const safeId = videoId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${CACHE_DIR}${safeId}${ext}`;
  }

  private async downloadOne(videoId: string, url: string, watched = false): Promise<void> {
    const localPath = this.localPathFor(videoId, url);
    const result = await FileSystem.downloadAsync(url, localPath);
    if (result.status !== 200) {
      try {
        await FileSystem.deleteAsync(localPath, { idempotent: true });
      } catch {
        /* ignore */
      }
      throw new Error(`HTTP ${result.status}`);
    }
    const info = await FileSystem.getInfoAsync(localPath);
    const fileSize =
      info.exists && 'size' in info && typeof info.size === 'number' ? info.size : 0;
    const index = await this.loadIndex();
    index[videoId] = {
      videoId,
      localPath,
      remoteUrl: url,
      fileSize,
      cachedAt: Date.now(),
      watched: watched || undefined,
    };
    await this.persistIndex(index);
    await this.enforceBudget();
  }

  private async enforceBudget(): Promise<void> {
    const index = await this.loadIndex();
    const toRemove = pickCacheEntriesForEviction(Object.values(index), MAX_ENTRIES, MAX_CACHE_BYTES);
    if (toRemove.length === 0) return;
    const next: CacheIndex = { ...index };
    for (const entry of toRemove) {
      delete next[entry.videoId];
      try {
        await FileSystem.deleteAsync(entry.localPath, { idempotent: true });
      } catch {
        /* ignore */
      }
    }
    await this.persistIndex(next);
  }

  private async removeIndexEntry(videoId: string): Promise<void> {
    const index = await this.loadIndex();
    if (!index[videoId]) return;
    const entry = index[videoId];
    delete index[videoId];
    await this.persistIndex(index);
    try {
      await FileSystem.deleteAsync(entry.localPath, { idempotent: true });
    } catch {
      /* ignore */
    }
  }
}

/** Purge d’abord le pré-cache non regardé ; garde les vidéos vues (Instagram-like). */
export { pickCacheEntriesForEviction } from './feedOfflineCacheEviction';

export const feedVideoOfflineCache = new FeedVideoOfflineCacheService();
export default feedVideoOfflineCache;
