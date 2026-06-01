import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { pinDmMediaFile } from './dmNativeMediaQueue';

export type StoredFailedMessage = {
  id: string;
  text: string;
  isMine: boolean;
  time: string;
  status: 'failed';
  type: 'text' | 'image' | 'voice' | 'document' | 'audio' | 'video' | 'location' | 'contact' | 'file';
  imageUri?: string;
  thumbnailUri?: string;
  voiceDuration?: string;
  retryMeta?: {
    kind: 'voice' | 'audio' | 'image' | 'video' | 'document';
    localUri: string;
    fileName?: string;
    mimeType?: string;
    durationSec?: number;
  };
};

function storageKey(conversationId: string): string {
  return `afw_dm_failed_${conversationId}`;
}

export async function loadFailedOutbound(conversationId: string): Promise<StoredFailedMessage[]> {
  if (!conversationId) return [];
  try {
    const raw = await AsyncStorage.getItem(storageKey(conversationId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is StoredFailedMessage =>
        m != null &&
        typeof m === 'object' &&
        typeof (m as StoredFailedMessage).id === 'string' &&
        (m as StoredFailedMessage).status === 'failed' &&
        !!(m as StoredFailedMessage).retryMeta?.localUri,
    );
  } catch {
    return [];
  }
}

async function persist(conversationId: string, list: StoredFailedMessage[]): Promise<void> {
  if (!conversationId) return;
  if (list.length === 0) {
    await AsyncStorage.removeItem(storageKey(conversationId));
    return;
  }
  await AsyncStorage.setItem(storageKey(conversationId), JSON.stringify(list.slice(-40)));
}

export async function upsertFailedOutbound(conversationId: string, message: StoredFailedMessage): Promise<void> {
  let stored = message;
  if (Platform.OS !== 'web' && message.retryMeta?.localUri) {
    try {
      const pinned = await pinDmMediaFile({
        sourceUri: message.retryMeta.localUri,
        messageId: message.id,
        kind: message.retryMeta.kind,
        fileName: message.retryMeta.fileName,
        mimeType: message.retryMeta.mimeType,
      });
      stored = {
        ...message,
        imageUri: pinned.uri,
        retryMeta: {
          ...message.retryMeta,
          localUri: pinned.uri,
          fileName: pinned.fileName,
          mimeType: pinned.mimeType,
        },
      };
    } catch {
      /* conserve l’URI d’origine */
    }
  }
  const existing = await loadFailedOutbound(conversationId);
  const next = [...existing.filter((m) => m.id !== stored.id), stored];
  await persist(conversationId, next);
}

export async function removeFailedOutbound(conversationId: string, messageId: string): Promise<void> {
  const existing = await loadFailedOutbound(conversationId);
  await persist(
    conversationId,
    existing.filter((m) => m.id !== messageId),
  );
}
