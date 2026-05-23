import { createPageUrl } from '@/utils';

export function getConversationPeerId(conversation, currentUserId) {
  if (!conversation) return null;
  const other = conversation.other;
  if (other?.id) return other.id;
  if (conversation.user1_id && conversation.user2_id && currentUserId) {
    return String(conversation.user1_id) === String(currentUserId)
      ? conversation.user2_id
      : conversation.user1_id;
  }
  return conversation.user2?.id || conversation.user1?.id || null;
}

export function buildChatSearchParams({ userId, conversationId, source } = {}) {
  const params = new URLSearchParams();
  if (userId) params.set('_userId', String(userId));
  if (conversationId) params.set('conversationId', String(conversationId));
  if (source) params.set('source', String(source));
  return params;
}

export function buildChatPath({ userId, conversationId, source } = {}) {
  const params = buildChatSearchParams({ userId, conversationId, source });
  const qs = params.toString();
  return `${createPageUrl('Chat')}${qs ? `?${qs}` : ''}`;
}

export function buildChatPathFromConversation(conversation, currentUserId, source) {
  return buildChatPath({
    userId: getConversationPeerId(conversation, currentUserId),
    conversationId: conversation?.id,
    source,
  });
}

export function getChatSearchIdentifiers(searchParams) {
  return {
    userId: searchParams.get('userId') || searchParams.get('_userId') || null,
    conversationId: searchParams.get('conversationId') || null,
  };
}
