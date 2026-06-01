/** Routes REST et helpers selon fil 1-1 ou groupe CDC (`ConversationGroup`). */

export type DmThreadKind = 'dm' | 'group';

export function parseThreadKind(
  params: Record<string, string | string[] | undefined>,
): DmThreadKind {
  const raw = String(params.kind ?? params.threadKind ?? '').toLowerCase();
  if (raw === 'group' || String(params.isGroup ?? '') === '1') return 'group';
  return 'dm';
}

export type DmThreadApi = {
  kind: DmThreadKind;
  conversationId: string;
  messagesPath: string;
  sendPath: string;
  readPath: string;
  readMethod: 'PUT' | 'POST';
  pinPath: string;
  messageReactionPath: (messageId: string) => string;
  messageDeletePath: (messageId: string) => string;
  messageDeleteForAllPath: (messageId: string) => string;
  messageHideForMePath: (messageId: string) => string;
  messageMetaPath: (messageId: string) => string;
  socketJoin: (socket: { emit: (e: string, p?: unknown) => void }) => void;
  socketLeave: (socket: { emit: (e: string, p?: unknown) => void }) => void;
};

export function createDmThreadApi(conversationId: string, kind: DmThreadKind): DmThreadApi {
  const enc = encodeURIComponent(conversationId);
  if (kind === 'group') {
    return {
      kind: 'group',
      conversationId,
      messagesPath: `/messages/group/${enc}/messages`,
      sendPath: `/messages/group/${enc}/send`,
      readPath: `/messages/group/${enc}/read`,
      readMethod: 'POST',
      pinPath: `/messages/group/${enc}/pin`,
      messageReactionPath: (messageId) =>
        `/messages/group/${enc}/messages/${encodeURIComponent(messageId)}/reaction`,
      messageDeletePath: (messageId) =>
        `/messages/group/${enc}/messages/${encodeURIComponent(messageId)}`,
      messageDeleteForAllPath: (messageId) =>
        `/messages/group/${enc}/messages/${encodeURIComponent(messageId)}`,
      messageHideForMePath: (messageId) =>
        `/messages/group/${enc}/messages/${encodeURIComponent(messageId)}/hide-for-me`,
      messageMetaPath: (messageId) =>
        `/messages/group/${enc}/messages/${encodeURIComponent(messageId)}`,
      socketJoin: (socket) => socket.emit('message:join-group', conversationId),
      socketLeave: (socket) => socket.emit('message:leave-group', conversationId),
    };
  }
  return {
    kind: 'dm',
    conversationId,
    messagesPath: `/messages/${enc}`,
    sendPath: '/messages/send',
    readPath: `/messages/${enc}/read`,
    readMethod: 'PUT',
    pinPath: `/messages/conversations/${enc}/pin`,
    messageReactionPath: (messageId) => `/messages/message/${encodeURIComponent(messageId)}/reaction`,
    messageDeletePath: (messageId) => `/messages/message/${encodeURIComponent(messageId)}`,
    messageDeleteForAllPath: (messageId) =>
      `/messages/message/${encodeURIComponent(messageId)}/delete-for-all`,
    messageHideForMePath: (messageId) =>
      `/messages/message/${encodeURIComponent(messageId)}/hide-for-me`,
    messageMetaPath: (messageId) => `/messages/message/${encodeURIComponent(messageId)}/meta`,
    socketJoin: (socket) => socket.emit('message:join-conversation', conversationId),
    socketLeave: (socket) => socket.emit('message:leave-conversation', conversationId),
  };
}

/** Payload socket groupe : `{ groupId, message }`. */
export function isGroupSocketEnvelope(
  payload: unknown,
): payload is { groupId: string; message: Record<string, unknown> } {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return typeof p.groupId === 'string' && p.message != null && typeof p.message === 'object';
}
