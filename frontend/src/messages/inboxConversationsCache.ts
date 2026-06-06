import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'afw_dm_inbox_conversations';
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

export async function loadInboxConversationsCache(): Promise<CachedInboxConversation[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
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
  options?: SaveInboxCacheOptions,
): Promise<void> {
  if (list.length === 0) {
    if (options?.allowClear) {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_CONVERSATIONS)));
}
