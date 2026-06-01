import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'afw-dm-hidden:';
const MAX_IDS_PER_CONVERSATION = 500;

function storageKey(conversationId: string): string {
  return `${KEY_PREFIX}${conversationId}`;
}

/** Masque un message reçu « pour moi » (persisté sur l’appareil). */
export async function hideDmMessageForMe(conversationId: string, messageId: string): Promise<void> {
  if (!conversationId || !messageId) return;
  const key = storageKey(conversationId);
  const raw = await AsyncStorage.getItem(key);
  const ids: string[] = raw ? (JSON.parse(raw) as string[]) : [];
  if (ids.includes(messageId)) return;
  const next = [...ids, messageId].slice(-MAX_IDS_PER_CONVERSATION);
  await AsyncStorage.setItem(key, JSON.stringify(next));
}

export async function loadHiddenDmMessageIds(conversationId: string): Promise<Set<string>> {
  if (!conversationId) return new Set();
  try {
    const raw = await AsyncStorage.getItem(storageKey(conversationId));
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as string[];
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

export function filterOutHiddenDmMessages<T extends { id: string }>(
  items: T[],
  hidden: Set<string>,
): T[] {
  if (!hidden.size) return items;
  return items.filter((m) => !hidden.has(m.id));
}
