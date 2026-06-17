/**
 * Mise à jour temps réel de la liste inbox (tri par dernier événement — style WhatsApp).
 */

export type InboxActivityEvent = {
  conversationId: string;
  unread?: number;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMsgType?: string;
  senderId?: string;
};

export type InboxListRow = {
  id: string;
  lastMessage?: string;
  lastMessageAt?: string | null;
  time?: string;
  unread: number;
  lastMsgType?: string;
  isMine?: boolean;
  lastOutgoingRead?: boolean;
};

export function sortInboxByRecency<T extends { lastMessageAt?: string | null }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return tb - ta;
  });
}

/**
 * Applique un événement inbox (message, appel, etc.) sur une ligne existante.
 * Retourne `null` si la conversation est absente (refetch recommandé).
 */
export function applyInboxActivity<T extends InboxListRow>(
  list: T[],
  event: InboxActivityEvent,
  currentUserId: string | undefined,
  formatTimeAgo: (iso: string) => string,
): T[] | null {
  const convId = String(event.conversationId || '').trim();
  if (!convId) return null;

  const idx = list.findIndex((c) => c.id === convId);
  if (idx < 0) return null;

  const updated = [...list];
  const cur = updated[idx];
  const at = event.lastMessageAt || new Date().toISOString();
  const senderId = String(event.senderId || '').trim();
  const derivedMine = Boolean(currentUserId && senderId && senderId === currentUserId);
  const isMine = senderId ? derivedMine : cur.isMine;
  const timeStr = formatTimeAgo(at);

  updated[idx] = {
    ...cur,
    ...(event.lastMessage != null && event.lastMessage !== '' ? { lastMessage: event.lastMessage } : {}),
    lastMessageAt: at,
    time: timeStr,
    ...(event.lastMsgType ? { lastMsgType: event.lastMsgType } : {}),
    isMine,
    lastOutgoingRead: isMine ? false : cur.lastOutgoingRead,
    ...(event.unread != null ? { unread: Math.max(0, Number(event.unread) || 0) } : {}),
  };

  return sortInboxByRecency(updated);
}
