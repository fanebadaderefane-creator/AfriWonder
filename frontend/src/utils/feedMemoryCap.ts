/**
 * Limite la liste du fil en mémoire (style TikTok) : scroll long sans garder des centaines
 * de métadonnées + cellules recyclées — réduit les kills Android par OOM.
 */
export const FEED_MAX_VIDEOS_IN_MEMORY = 48;

/** Marge de slides conservées avant/après la lecture active. */
const ANCHOR_MARGIN = 20;

export function capFeedVideosForMemory<T extends { id: string }>(
  list: T[],
  anchorIndex: number,
  maxItems: number = FEED_MAX_VIDEOS_IN_MEMORY,
): { list: T[]; anchorIndex: number } {
  if (!Array.isArray(list) || list.length <= maxItems) {
    const idx = Math.max(0, Math.min(anchorIndex, Math.max(0, list.length - 1)));
    return { list, anchorIndex: idx };
  }
  const safeAnchor = Math.max(0, Math.min(anchorIndex, list.length - 1));
  let start = Math.max(0, safeAnchor - ANCHOR_MARGIN);
  if (start + maxItems > list.length) {
    start = Math.max(0, list.length - maxItems);
  }
  const trimmed = list.slice(start, start + maxItems);
  const newAnchor = Math.max(0, Math.min(safeAnchor - start, trimmed.length - 1));
  return { list: trimmed, anchorIndex: newAnchor };
}

/** Limite la taille d’un Set / Map indexé par id vidéo (polls, analytics, etc.). */
export function trimIdSet(ids: Set<string>, maxSize: number, keepIds: Iterable<string> = []): void {
  if (ids.size <= maxSize) return;
  const keep = new Set(keepIds);
  for (const id of ids) {
    if (ids.size <= maxSize) break;
    if (!keep.has(id)) ids.delete(id);
  }
}

export function trimRecordKeys<T>(record: Record<string, T>, maxKeys: number, keepKeys: Iterable<string> = []): Record<string, T> {
  const keys = Object.keys(record);
  if (keys.length <= maxKeys) return record;
  const keep = new Set(keepKeys);
  const next: Record<string, T> = {};
  for (const k of keys) {
    if (keep.has(k)) next[k] = record[k];
  }
  for (const k of keys) {
    if (Object.keys(next).length >= maxKeys) break;
    if (!(k in next)) next[k] = record[k];
  }
  return next;
}
