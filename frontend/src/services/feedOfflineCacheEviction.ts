/** Entrée d’index cache feed — type minimal pour tests sans Expo. */
export type OfflineCacheIndexEntry = {
  videoId: string;
  localPath: string;
  remoteUrl: string;
  fileSize: number;
  cachedAt: number;
  watched?: boolean;
};

/** Purge d’abord le pré-cache non regardé ; garde les vidéos vues (Instagram-like). */
export function pickCacheEntriesForEviction(
  entries: OfflineCacheIndexEntry[],
  maxEntries: number,
  maxBytes: number,
): OfflineCacheIndexEntry[] {
  const sorted = [...entries].sort((a, b) => {
    const aw = a.watched ? 1 : 0;
    const bw = b.watched ? 1 : 0;
    if (aw !== bw) return aw - bw;
    return a.cachedAt - b.cachedAt;
  });
  let total = sorted.reduce((t, e) => t + (e.fileSize || 0), 0);
  const toRemove: OfflineCacheIndexEntry[] = [];
  for (const entry of sorted) {
    if (sorted.length - toRemove.length <= maxEntries && total <= maxBytes) break;
    toRemove.push(entry);
    total -= entry.fileSize || 0;
  }
  return toRemove;
}
