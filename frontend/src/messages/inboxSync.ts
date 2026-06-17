/**
 * Synchronise la liste inbox (`messages/index`) après envoi depuis un fil (`messages/[id]`).
 */

export type InboxConversationPatch = {
  conversationId: string;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMsgType?: 'text' | 'image' | 'video' | 'voice' | 'file' | 'audio' | 'call';
  isMine?: boolean;
  /** Statut du dernier message sortant (accusé de lecture). */
  lastOutgoingStatus?: 'sent' | 'delivered' | 'read';
};

type Listener = (patch: InboxConversationPatch) => void;

const listeners = new Set<Listener>();

export function subscribeInboxConversationPatch(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function patchInboxConversation(patch: InboxConversationPatch): void {
  for (const fn of listeners) {
    try {
      fn(patch);
    } catch {
      /* ignore listener errors */
    }
  }
}
