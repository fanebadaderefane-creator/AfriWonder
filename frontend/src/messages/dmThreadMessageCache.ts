import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'afw_dm_thread_cache:';
const MAX_MESSAGES = 80;

/** Message fil DM sérialisable (sans retryMeta / URIs locales éphémères). */
export type CachedThreadMessage = {
  id: string;
  text: string;
  isMine: boolean;
  time: string;
  status: 'read' | 'delivered' | 'sent' | 'failed' | 'sending';
  type: string;
  imageUri?: string;
  thumbnailUri?: string;
  voiceDuration?: string;
  date?: string;
  replyTo?: { id: string; name: string; text: string };
  forwarded?: boolean;
  edited?: boolean;
  deleted?: boolean;
  locationLat?: number;
  locationLng?: number;
  locationLabel?: string;
  contactShareLine?: string;
  senderLabel?: string;
};

function storageKey(conversationId: string): string {
  return `${KEY_PREFIX}${conversationId}`;
}

function isPersistableMediaUri(uri: string | undefined): boolean {
  if (!uri) return true;
  return /^https?:\/\//i.test(uri);
}

/** Exclut envois en cours / échec et médias blob: ou file: (non rechargables). */
export function isCacheableThreadMessage(msg: {
  id?: string;
  status?: string;
  imageUri?: string;
  thumbnailUri?: string;
  retryMeta?: unknown;
}): boolean {
  if (!msg.id) return false;
  if (msg.status === 'sending' || msg.status === 'failed') return false;
  if (msg.retryMeta) return false;
  if (msg.imageUri && !isPersistableMediaUri(msg.imageUri)) return false;
  if (msg.thumbnailUri && !isPersistableMediaUri(msg.thumbnailUri)) return false;
  return true;
}

export async function loadThreadMessageCache(conversationId: string): Promise<CachedThreadMessage[]> {
  if (!conversationId) return [];
  try {
    const raw = await AsyncStorage.getItem(storageKey(conversationId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is CachedThreadMessage =>
        m != null &&
        typeof m === 'object' &&
        typeof (m as CachedThreadMessage).id === 'string' &&
        isCacheableThreadMessage(m as CachedThreadMessage),
    );
  } catch {
    return [];
  }
}

export async function saveThreadMessageCache(
  conversationId: string,
  messages: CachedThreadMessage[],
): Promise<void> {
  if (!conversationId) return;
  const cacheable = messages.filter(isCacheableThreadMessage).slice(-MAX_MESSAGES);
  if (cacheable.length === 0) {
    await AsyncStorage.removeItem(storageKey(conversationId));
    return;
  }
  await AsyncStorage.setItem(storageKey(conversationId), JSON.stringify(cacheable));
}

export type ThreadMergeRow = { id: string; status?: string };

export function mergeThreadWithLocalOutbound(
  base: ThreadMergeRow[],
  pending: ThreadMergeRow[],
  failed: ThreadMergeRow[],
): ThreadMergeRow[] {
  const merged: ThreadMergeRow[] = [...base];
  for (const local of [...pending, ...failed]) {
    if (merged.some((m) => m.id === local.id)) continue;
    const nextStatus = local.status === 'pending' ? 'sending' : 'failed';
    merged.push({ ...local, status: nextStatus });
  }
  return merged;
}
