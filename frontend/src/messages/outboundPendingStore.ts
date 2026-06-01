import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { pinDmMediaFile } from './dmNativeMediaQueue';
import type { StoredFailedMessage } from './outboundFailedStore';

/** Envoi DM en cours (fermeture de l’écran avant fin upload) — reprise au prochain focus. */
export type StoredPendingMessage = Omit<StoredFailedMessage, 'status'> & { status: 'pending' };

function storageKey(conversationId: string): string {
  return `afw_dm_pending_${conversationId}`;
}

export async function loadPendingOutbound(conversationId: string): Promise<StoredPendingMessage[]> {
  if (!conversationId) return [];
  try {
    const raw = await AsyncStorage.getItem(storageKey(conversationId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is StoredPendingMessage =>
        m != null &&
        typeof m === 'object' &&
        typeof (m as StoredPendingMessage).id === 'string' &&
        (m as StoredPendingMessage).status === 'pending' &&
        !!(m as StoredPendingMessage).retryMeta?.localUri,
    );
  } catch {
    return [];
  }
}

async function persist(conversationId: string, list: StoredPendingMessage[]): Promise<void> {
  if (!conversationId) return;
  if (list.length === 0) {
    await AsyncStorage.removeItem(storageKey(conversationId));
    return;
  }
  await AsyncStorage.setItem(storageKey(conversationId), JSON.stringify(list.slice(-20)));
}

export async function upsertPendingOutbound(
  conversationId: string,
  message: StoredPendingMessage,
): Promise<void> {
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
  const existing = await loadPendingOutbound(conversationId);
  const next = [...existing.filter((m) => m.id !== stored.id), stored];
  await persist(conversationId, next);
}

export async function removePendingOutbound(conversationId: string, messageId: string): Promise<void> {
  const existing = await loadPendingOutbound(conversationId);
  await persist(
    conversationId,
    existing.filter((m) => m.id !== messageId),
  );
}
