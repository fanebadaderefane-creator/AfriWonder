import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'afw_recently_viewed_videos_v1';
const MAX_ITEMS = 200;

export type RecentlyViewedEntry = { id: string; ts: number };

async function readAll(): Promise<RecentlyViewedEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x: any) => ({
        id: typeof x?.id === 'string' ? x.id : '',
        ts: typeof x?.ts === 'number' && Number.isFinite(x.ts) ? x.ts : 0,
      }))
      .filter((e) => Boolean(e.id) && e.ts > 0);
  } catch {
    return [];
  }
}

async function writeAll(list: RecentlyViewedEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
  } catch {
    /* ignore */
  }
}

/** Ajoute une vidéo à l’historique (dé-dup + en tête). */
export async function addRecentlyViewedVideo(videoId: string): Promise<void> {
  const id = String(videoId || '').trim();
  if (!id) return;
  const ts = Date.now();
  const prev = await readAll();
  const next = [{ id, ts }, ...prev.filter((e) => e.id !== id)].slice(0, MAX_ITEMS);
  await writeAll(next);
}

/** IDs triés du plus récent au plus ancien. */
export async function getRecentlyViewedVideoIds(limit = 60): Promise<string[]> {
  const list = await readAll();
  const n = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), MAX_ITEMS) : 60;
  return list.slice(0, n).map((e) => e.id);
}

/** Map id → timestamp, utile pour trier une sous-liste. */
export async function getRecentlyViewedVideoTsMap(): Promise<Map<string, number>> {
  const list = await readAll();
  return new Map(list.map((e) => [e.id, e.ts]));
}

