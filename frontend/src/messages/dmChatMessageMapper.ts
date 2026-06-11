/** Transforme un message API (DM ou groupe) en ligne UI du fil `messages/[id]`. */

import { mapApiMessageStatus } from './dmReadReceipt';
import {
  callLogBubbleIsMine,
  callLogIconName,
  callLogTint,
  formatCallLogSubtitle,
  formatCallLogTitle,
  parseCallLogContent,
  type CallLogMeta,
} from './callLogDisplay';

export type ChatUiMessage = {
  id: string;
  text: string;
  isMine: boolean;
  time: string;
  /** ISO — tri et fusion cache / pagination. */
  createdAt?: string;
  status: 'read' | 'delivered' | 'sent' | 'failed' | 'sending';
  type: 'text' | 'image' | 'video' | 'audio' | 'voice' | 'file' | 'document' | 'location' | 'contact' | 'call';
  imageUri?: string;
  thumbnailUri?: string;
  voiceDuration?: string;
  replyTo?: { id: string; name: string; text: string };
  forwarded?: boolean;
  edited?: boolean;
  deleted?: boolean;
  locationLat?: number;
  locationLng?: number;
  locationLabel?: string;
  contactShareLine?: string;
  senderLabel?: string;
  callLog?: CallLogMeta;
  callLogTitle?: string;
  callLogSubtitle?: string;
  callLogIcon?: 'call' | 'videocam' | 'call-outline' | 'arrow-redo';
  callLogTint?: string;
};

function formatMsgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function parseVoiceDurationLabel(content: string): string | undefined {
  const match = content.trim().match(/^Vocal\s+(.+)$/i);
  return match?.[1]?.trim() || undefined;
}

export function isThreadDateSeparator(msg: { id: string }): boolean {
  return msg.id.startsWith('date-');
}

/** Retire les séparateurs de date avant fusion / tri. */
export function stripThreadDateSeparators<T extends { id: string }>(messages: T[]): T[] {
  return messages.filter((m) => !isThreadDateSeparator(m));
}

/** Fusionne par id ; entrées ultérieures écrasent les champs (serveur > cache). */
export function mergeThreadMessagesById<T extends { id: string; createdAt?: string }>(
  ...lists: T[][]
): T[] {
  const byId = new Map<string, T>();
  for (const list of lists) {
    for (const m of list) {
      if (!m?.id || isThreadDateSeparator(m)) continue;
      const prev = byId.get(m.id);
      byId.set(m.id, prev ? { ...prev, ...m } : m);
    }
  }
  const sortKey = (m: T) => {
    const t = Date.parse(m.createdAt || '');
    return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
  };
  return [...byId.values()].sort((a, b) => {
    const ta = sortKey(a);
    const tb = sortKey(b);
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });
}

/** Réinjecte les pastilles de date après fusion ou chargement paginé. */
export function injectDateSeparators<T extends ChatUiMessage>(
  messages: T[],
  formatDateLabel: (date: Date) => string,
): ThreadMessageWithDate[] {
  const out: ThreadMessageWithDate[] = [];
  let lastDate = '';
  for (const msg of messages) {
    const iso = msg.createdAt || new Date().toISOString();
    const dateStr = formatDateLabel(new Date(iso));
    if (dateStr !== lastDate) {
      out.push({
        id: `date-${msg.id}`,
        text: '',
        isMine: false,
        time: '',
        status: 'read',
        type: 'text',
        date: dateStr,
      });
      lastDate = dateStr;
    }
    out.push(msg);
  }
  return out;
}

function mapLocationFields(m: Record<string, unknown>) {
  const msgType = String(m.type || 'text').toLowerCase();
  const latRaw = m.location_lat;
  const lngRaw = m.location_lng;
  const lat =
    latRaw == null || latRaw === ''
      ? undefined
      : typeof latRaw === 'number'
        ? latRaw
        : Number(latRaw);
  const lng =
    lngRaw == null || lngRaw === ''
      ? undefined
      : typeof lngRaw === 'number'
        ? lngRaw
        : Number(lngRaw);
  if (msgType !== 'location' || lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return {};
  }
  return {
    locationLat: lat,
    locationLng: lng,
    locationLabel: typeof m.location_label === 'string' ? m.location_label : undefined,
  };
}

export type ThreadMessageWithDate = ChatUiMessage & { date?: string };

/** État UI après suppression pour tous (y compris journal d’appels). */
export function applyDeletedForAllUi<T extends ChatUiMessage>(msg: T): T {
  return {
    ...msg,
    text: 'Ce message a été supprimé',
    deleted: true,
    type: msg.type === 'call' ? 'text' : msg.type,
    callLog: undefined,
    callLogTitle: undefined,
    callLogSubtitle: undefined,
    callLogIcon: undefined,
    callLogTint: undefined,
    imageUri: undefined,
    thumbnailUri: undefined,
  };
}

/** Liste API → bulles UI avec séparateurs de date (DM ou groupe). */
export function buildThreadMessageList(
  backendMsgs: Record<string, unknown>[],
  currentUserId: string,
  peerDisplayName: string,
  formatDateLabel: (date: Date) => string,
  opts?: { isGroup?: boolean },
): ThreadMessageWithDate[] {
  const out: ThreadMessageWithDate[] = [];
  let lastDate = '';
  for (const raw of backendMsgs) {
    const msgDate = new Date(String(raw.created_at || new Date().toISOString()));
    const dateStr = formatDateLabel(msgDate);
    if (dateStr !== lastDate) {
      out.push({
        id: `date-${String(raw.id)}`,
        text: '',
        isMine: false,
        time: '',
        status: 'read',
        type: 'text',
        date: dateStr,
      });
      lastDate = dateStr;
    }
    out.push(mapApiMessageToChatUi(raw, currentUserId, peerDisplayName, opts));
  }
  return out;
}

export function mapApiMessageToChatUi(
  m: Record<string, unknown>,
  currentUserId: string,
  peerDisplayName: string,
  opts?: { isGroup?: boolean },
): ChatUiMessage {
  const isDeleted = Boolean(m.is_deleted) || Boolean(m.deleted_for_all_at);
  const msgType = String(m.type || 'text').toLowerCase();
  const createdAt = String(m.created_at || new Date().toISOString());

  if (msgType === 'call' && !isDeleted) {
    const callLog = parseCallLogContent(String(m.content || ''));
    if (callLog) {
      const isMine = callLogBubbleIsMine(callLog, currentUserId);
      return {
        id: String(m.id),
        text: formatCallLogTitle(callLog, currentUserId),
        isMine,
        time: formatMsgTime(createdAt),
        createdAt,
        status: 'read',
        type: 'call',
        callLog,
        callLogTitle: formatCallLogTitle(callLog, currentUserId),
        callLogSubtitle: formatCallLogSubtitle(callLog, currentUserId),
        callLogIcon: callLogIconName(callLog, currentUserId),
        callLogTint: callLogTint(callLog, currentUserId),
      };
    }
  }

  const mediaUrl = typeof m.media_url === 'string' ? m.media_url.trim() : '';
  const thumbUrl = typeof m.thumbnail_url === 'string' ? m.thumbnail_url.trim() : '';
  const uiType: ChatUiMessage['type'] =
    msgType === 'voice' ? 'audio' : (msgType as ChatUiMessage['type']);
  const hasMedia = Boolean(mediaUrl) && ['image', 'video', 'audio', 'voice', 'file'].includes(msgType);
  const senderId = String(m.sender_id || '');
  const isMine = Boolean(currentUserId && senderId && senderId === currentUserId);
  const rt = m.reply_to as Record<string, unknown> | undefined;
  const replySender = rt?.sender as Record<string, unknown> | undefined;
  const replyName =
    String(replySender?.full_name || replySender?.username || '').trim() ||
    (String(rt?.sender_id || '') === currentUserId ? 'Vous' : peerDisplayName);
  const sender = m.sender as Record<string, unknown> | undefined;
  const senderLabel = opts?.isGroup && !isMine
    ? String(sender?.full_name || sender?.username || sender?.group_tag || 'Membre')
    : undefined;

  const content = isDeleted ? 'Ce message a été supprimé' : String(m.content || '');

  return {
    id: String(m.id),
    text: content,
    isMine,
    time: formatMsgTime(createdAt),
    createdAt,
    status: mapApiMessageStatus(m.status),
    type: uiType,
    imageUri: hasMedia ? mediaUrl : undefined,
    thumbnailUri: thumbUrl || undefined,
    ...(uiType === 'audio' && !isDeleted ? { voiceDuration: parseVoiceDurationLabel(content) } : {}),
    replyTo: rt
      ? {
          id: String(rt.id),
          name: replyName,
          text: String(rt.content || ''),
        }
      : undefined,
    forwarded: Boolean(m.forwarded_from_message_id || m.forwarded_from),
    edited: Boolean(m.is_edited),
    deleted: isDeleted,
    ...(msgType === 'contact'
      ? { contactShareLine: typeof m.contact_name === 'string' ? m.contact_name : undefined }
      : {}),
    ...mapLocationFields(m),
    senderLabel,
  };
}
