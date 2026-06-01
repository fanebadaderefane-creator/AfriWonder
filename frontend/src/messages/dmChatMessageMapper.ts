/** Transforme un message API (DM ou groupe) en ligne UI du fil `messages/[id]`. */

import { mapApiMessageStatus } from './dmReadReceipt';
import {
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
  status: 'read' | 'delivered' | 'sent' | 'failed' | 'sending';
  type: 'text' | 'image' | 'video' | 'audio' | 'voice' | 'file' | 'location' | 'contact' | 'call';
  imageUri?: string;
  thumbnailUri?: string;
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
  callLogIcon?: 'call' | 'videocam' | 'call-outline';
  callLogTint?: string;
};

function formatMsgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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
      return {
        id: String(m.id),
        text: formatCallLogTitle(callLog, currentUserId),
        isMine: false,
        time: formatMsgTime(createdAt),
        status: 'read',
        type: 'call',
        callLog,
        callLogTitle: formatCallLogTitle(callLog, currentUserId),
        callLogSubtitle: formatCallLogSubtitle(callLog, createdAt),
        callLogIcon: callLogIconName(callLog),
        callLogTint: callLogTint(callLog),
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

  return {
    id: String(m.id),
    text: isDeleted ? 'Ce message a été supprimé' : String(m.content || ''),
    isMine,
    time: formatMsgTime(String(m.created_at || new Date().toISOString())),
    status: mapApiMessageStatus(m.status),
    type: uiType,
    imageUri: hasMedia ? mediaUrl : undefined,
    thumbnailUri: thumbUrl || undefined,
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
