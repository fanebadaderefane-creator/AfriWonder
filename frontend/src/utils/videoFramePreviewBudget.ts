/**
 * Limite le nombre de lecteurs `expo-video` montés en même temps (grilles : Discover, etc.)
 * afin d'éviter OOM / kill process sur Android.
 *
 * Un même `id` peut être "refcounté" (ex. remount React) sans compter 2 places distinctes.
 */

const idToRefCount = new Map<string, number>();
const activeIdSet = new Set<string>();

function readMaxSlots(): number {
  const raw = process.env.EXPO_PUBLIC_VIDEO_FRAME_PREVIEW_BUDGET?.trim();
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(n) && n > 0) return Math.min(64, Math.floor(n));
  return 12;
}

const MAX_SLOTS = readMaxSlots();

export function tryAcquireVideoFrameSlot(id: string): boolean {
  const key = String(id || '').trim();
  if (!key) {
    // Pas d'ID stable : on laisse tomber (évite d'ouvrir N slots "anon" identiques)
    return false;
  }
  const cur = idToRefCount.get(key) || 0;
  if (cur > 0) {
    idToRefCount.set(key, cur + 1);
    return true;
  }
  if (activeIdSet.size >= MAX_SLOTS) {
    return false;
  }
  idToRefCount.set(key, 1);
  activeIdSet.add(key);
  return true;
}

export function releaseVideoFrameSlot(id: string): void {
  const key = String(id || '').trim();
  if (!key) return;
  const cur = idToRefCount.get(key) || 0;
  if (cur <= 0) return;
  const next = cur - 1;
  if (next <= 0) {
    idToRefCount.delete(key);
    activeIdSet.delete(key);
  } else {
    idToRefCount.set(key, next);
  }
}
