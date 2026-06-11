import AsyncStorage from '@react-native-async-storage/async-storage';

/** Ancienne clé globale (fuite cross-compte) — supprimée au chargement. */
const LEGACY_STORAGE_KEY = 'afw_dm_inbox_conversations';
const STORAGE_KEY_PREFIX = 'afw_dm_inbox_conversations_v2';
const MAX_CONVERSATIONS = 120;

export type CachedInboxConversation = {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageAt?: string | null;
  time: string;
  unread: number;
  online: boolean;
  isTyping: boolean;
  lastMsgType: string;
  lastOutgoingRead: boolean;
  isMine: boolean;
  isGroup?: boolean;
  groupMembers?: number;
  voiceDuration?: string;
  otherUserId?: string;
};

function storageKeyForUser(userId: string | null | undefined): string | null {
  const id = typeof userId === 'string' ? userId.trim() : '';
  if (!id) return null;
  return `${STORAGE_KEY_PREFIX}:${id}`;
}

/** Purge l’ancien cache partagé entre comptes (migration one-shot). */
export async function clearLegacyInboxConversationsCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export async function loadInboxConversationsCache(
  userId: string | null | undefined,
): Promise<CachedInboxConversation[]> {
  const key = storageKeyForUser(userId);
  if (!key) return [];
  try {
    await clearLegacyInboxConversationsCache();
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is CachedInboxConversation =>
        c != null &&
        typeof c === 'object' &&
        typeof (c as CachedInboxConversation).id === 'string' &&
        typeof (c as CachedInboxConversation).name === 'string',
    );
  } catch {
    return [];
  }
}

export type SaveInboxCacheOptions = {
  /** true seulement si l’utilisateur a vraiment zéro discussion (pas une réponse API vide erronée). */
  allowClear?: boolean;
};

export async function saveInboxConversationsCache(
  list: CachedInboxConversation[],
  userId: string | null | undefined,
  options?: SaveInboxCacheOptions,
): Promise<void> {
  const key = storageKeyForUser(userId);
  if (!key) return;
  if (list.length === 0) {
    if (options?.allowClear) {
      await AsyncStorage.removeItem(key);
    }
    return;
  }
  await AsyncStorage.setItem(key, JSON.stringify(list.slice(0, MAX_CONVERSATIONS)));
}

export async function clearInboxConversationsCache(userId?: string | null): Promise<void> {
  try {
    if (userId) {
      const key = storageKeyForUser(userId);
      if (key) await AsyncStorage.removeItem(key);
    }
    await clearLegacyInboxConversationsCache();
  } catch {
    /* ignore */
  }
}
