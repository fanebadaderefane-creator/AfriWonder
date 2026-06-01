import { profileAvatarUri } from '../utils/avatarFallback';

export type InboxRow = {
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
  otherUserId?: string;
};

function previewFromGroupLast(text: string | null | undefined): string {
  const t = String(text || '').trim();
  return t || 'Groupe créé';
}

/** Mappe `GET /messages/groups` → ligne inbox. */
export function mapApiGroupToInboxRow(
  g: {
    id: string;
    name?: string | null;
    avatar_url?: string | null;
    last_message_at?: string | null;
    last_message_text?: string | null;
    created_at?: string | null;
    unread_count?: number;
    members_count?: number;
    last_message_sender_id?: string | null;
  },
  formatTimeAgo: (iso: string) => string,
  currentUserId?: string,
): InboxRow {
  const displayName = String(g.name || '').trim() || 'Groupe';
  const lastAt = g.last_message_at || g.created_at || null;
  const lastSender = String(g.last_message_sender_id || '').trim();
  const isMine = Boolean(currentUserId && lastSender && lastSender === currentUserId);
  return {
    id: g.id,
    name: displayName,
    avatar: profileAvatarUri(g.avatar_url, displayName),
    lastMessage: previewFromGroupLast(g.last_message_text),
    lastMessageAt: lastAt,
    time: lastAt ? formatTimeAgo(lastAt) : '',
    unread: Math.max(0, Number(g.unread_count) || 0),
    online: false,
    isTyping: false,
    lastMsgType: 'text',
    lastOutgoingRead: false,
    isMine,
    isGroup: true,
    groupMembers: g.members_count,
  };
}

/** Fusionne discussions 1-1 et groupes CDC (sans écraser un DM homonyme). */
export function mergeInboxDmAndGroups(
  dmRows: InboxRow[],
  groupRows: InboxRow[],
): InboxRow[] {
  const byId = new Map<string, InboxRow>();
  for (const row of dmRows) {
    byId.set(row.id, row);
  }
  for (const g of groupRows) {
    const existing = byId.get(g.id);
    if (existing && !existing.isGroup) continue;
    byId.set(g.id, { ...g, isGroup: true });
  }
  return [...byId.values()];
}
