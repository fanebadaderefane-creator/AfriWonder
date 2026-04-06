// AfriWonder full review PR - CodeRabbit
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import messageService from '../services/message.service.js';
import * as messageGroupService from '../services/messageGroup.service.js';
import e2eeService from '../services/e2ee.service.js';
import { logger } from '../utils/logger.js';
import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';
import {
  messagesConversationArchiveSchema,
  messagesConversationDraftSchema,
  messagesConversationNotificationsSchema,
  messagesEditContentSchema,
  messagesGroupCreateSchema,
  messagesGroupDisplayTagSchema,
  messagesGroupInviteJoinSchema,
  messagesGroupMembersSchema,
  messagesGroupMessageEditSchema,
  messagesGroupNotificationsSchema,
  messagesGroupPatchSchema,
  messagesGroupSendSchema,
  messagesMetaSchema,
  messagesPollVoteSchema,
  messagesReactionSchema,
  messagesSendSchema,
} from '../schemas/highRiskBodies.js';

const router = Router();

const PAGE_MIN = 1;
const LIMIT_MIN = 1;
const LIMIT_MAX = 50;

function parsePageLimit(query: Record<string, unknown>, defaultLimit: number): { page: number; limit: number } {
  const page = Math.max(PAGE_MIN, parseInt(String(query.page || 1), 10) || PAGE_MIN);
  const limit = Math.min(
    LIMIT_MAX,
    Math.max(LIMIT_MIN, parseInt(String(query.limit || defaultLimit), 10) || defaultLimit)
  );
  return { page, limit };
}

const sendLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 20,
  message: { success: false, error: 'Trop de messages. Réessayez dans 10 secondes.' },
  standardHeaders: true,
});

// GET /api/messages/presence/:userId
router.get('/presence/:userId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await messageService.getPresence(param(req, 'userId'));
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/messages/starred
router.get('/starred', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await messageService.getStarredMessages(req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/messages/scheduled — messages programmés (DM + groupes), must be before /:conversationId
router.get('/scheduled', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const [dm, group] = await Promise.all([
      messageService.listScheduledDmForUser(req.user!.id),
      messageGroupService.listScheduledGroupMessagesForUser(req.user!.id),
    ]);
    const items = [...dm, ...group].sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );
    res.json({ success: true, data: { items } });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/messages/unread/count — must be before /:conversationId
router.get('/unread/count', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const [dm, groupUnread] = await Promise.all([
      messageService.getUnreadCount(req.user!.id),
      messageGroupService.getTotalUnreadGroupMessagesForUser(req.user!.id),
    ]);
    res.json({ success: true, data: { count: dm.count + groupUnread } });
  } catch (error: unknown) {
    logger.error('messages/unread/count failed', error as Error, { userId: req.user?.id });
    res.json({ success: true, data: { count: 0 } });
  }
});

// GET /api/messages/export — sauvegarde cloud (export conversations + messages, hors éphémères expirés)
router.get('/export', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const q = req.query as Record<string, unknown>;
    const raw = q.conversationId;
    const conversationId = typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
    const result = await messageService.exportConversations(req.user!.id, { conversationId });
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/messages/conversations
router.get('/conversations', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { page, limit } = parsePageLimit(req.query as Record<string, unknown>, 20);
    const includeArchived = req.query.includeArchived === 'true';
    const result = await messageService.getConversations(req.user!.id, page, limit, includeArchived);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/messages/conversation/:userId
router.get('/conversation/:userId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const conversation = await messageService.getOrCreateConversation(req.user!.id, param(req, 'userId'), req.user!.id);
    res.json({ success: true, data: conversation });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/messages/conversations/id/:conversationId
router.get('/conversations/id/:conversationId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const conversation = await messageService.getConversationById(param(req, 'conversationId'), req.user!.id);
    res.json({ success: true, data: conversation });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/messages/:conversationId/search?q=terme
router.get('/:conversationId/search', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const q = req.query?.q;
    const result = await messageService.searchConversationMessages(
      param(req, 'conversationId'),
      req.user!.id,
      typeof q === 'string' ? q : ''
    );
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// PATCH /api/messages/conversations/:conversationId/archive — archiver / désarchiver (body: archived boolean)
router.patch('/conversations/:conversationId/archive', authenticate, validateBody(messagesConversationArchiveSchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await messageService.setConversationArchived(
      param(req, 'conversationId'),
      req.user!.id,
      req.body?.archived === true
    );
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/messages/conversations/:conversationId/draft
router.get('/conversations/:conversationId/draft', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await messageService.getConversationDraft(param(req, 'conversationId'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// PUT /api/messages/conversations/:conversationId/draft — body: content (string, vide pour effacer)
router.put('/conversations/:conversationId/draft', authenticate, validateBody(messagesConversationDraftSchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await messageService.setConversationDraft(
      param(req, 'conversationId'),
      req.user!.id,
      req.body?.content ?? null
    );
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// PATCH /api/messages/conversations/:conversationId/notifications — body: { muted: boolean } (CPO 4.39)
router.patch('/conversations/:conversationId/notifications', authenticate, validateBody(messagesConversationNotificationsSchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await messageService.setConversationMuted(
      param(req, 'conversationId'),
      req.user!.id,
      req.body?.muted === true
    );
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/conversations/:conversationId/clear-me — effacer l’historique pour moi (style WhatsApp)
router.post('/conversations/:conversationId/clear-me', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await messageService.clearConversationHistoryForUser(param(req, 'conversationId'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/send
router.post('/send', authenticate, validateBody(messagesSendSchema), sendLimiter, async (req: AuthRequest, res, next) => {
  try {
    const {
      recipientId,
      content,
      type,
      media_url,
      thumbnail_url,
      reply_to_message_id,
      is_ephemeral,
      expires_at,
      scheduled_at,
      location_lat,
      location_lng,
      location_label,
      contact_user_id,
      contact_name,
      sticker_url,
      poll_options,
      event_id,
      e2ee_envelope,
    } = req.body;
    const message = await messageService.sendMessage(
      req.user!.id,
      recipientId,
      content ?? '',
      type || 'text',
      {
        media_url,
        thumbnail_url,
        reply_to_message_id,
        is_ephemeral,
        expires_at,
        scheduled_at,
        location_lat,
        location_lng,
        location_label,
        contact_user_id,
        contact_name,
        sticker_url,
        poll_options,
        event_id,
      }
    );

    if (e2ee_envelope && typeof e2ee_envelope === 'object') {
      try {
        await e2eeService.storeEnvelope(req.user!.id, {
          ...e2ee_envelope,
          conversationId: message.conversation_id,
          messageId: message.id,
        });
      } catch (e) {
        logger.warn('E2EE envelope store failed on DM send', { err: e, messageId: message.id });
      }
    }
    res.json({ success: true, data: message });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/message/:messageId/poll-vote — sondage 1-1
router.post('/message/:messageId/poll-vote', authenticate, validateBody(messagesPollVoteSchema), async (req: AuthRequest, res, next) => {
  try {
    const { option_index: optionIndex } = req.body || {};
    const data = await messageService.voteDmPoll(param(req, 'messageId'), req.user!.id, optionIndex);
    res.json({ success: true, data });
  } catch (error: unknown) {
    next(error);
  }
});

// PATCH /api/messages/message/:messageId/meta
router.patch('/message/:messageId/meta', authenticate, validateBody(messagesMetaSchema), async (req: AuthRequest, res, next) => {
  try {
    const { is_pinned, is_important } = req.body || {};
    const result = await messageService.updateMessageMeta(param(req, 'messageId'), req.user!.id, {
      is_pinned,
      is_important,
    });
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// PATCH /api/messages/message/:messageId/content — édition texte (< 15 min, expéditeur)
router.patch('/message/:messageId/content', authenticate, validateBody(messagesEditContentSchema), sendLimiter, async (req: AuthRequest, res, next) => {
  try {
    const content = req.body?.content;
    const result = await messageService.editMessageContent(param(req, 'messageId'), req.user!.id, content);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/message/:messageId/reaction
router.post('/message/:messageId/reaction', authenticate, validateBody(messagesReactionSchema), async (req: AuthRequest, res, next) => {
  try {
    const { emoji } = req.body || {};
    const result = await messageService.setMessageReaction(param(req, 'messageId'), req.user!.id, emoji);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// DELETE /api/messages/message/:messageId/reaction
router.delete('/message/:messageId/reaction', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await messageService.setMessageReaction(param(req, 'messageId'), req.user!.id, null);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/messages/message/:messageId/reactions-detail — qui a réagi avec quel emoji
router.get('/message/:messageId/reactions-detail', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await messageService.getMessageReactionsDetail(param(req, 'messageId'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/message/:messageId/transcribe — vocal 1-1 (Whisper, expéditeur)
router.post('/message/:messageId/transcribe', authenticate, sendLimiter, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await messageService.transcribeVoiceMessage(param(req, 'messageId'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// ========== Group messaging (CDC) ==========
// GET /api/messages/groups/export — export JSON agrégé de tous les groupes du membre (plafonné côté service)
router.get('/groups/export', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await messageGroupService.exportAllUserGroupConversations(req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/groups — create group
router.post('/groups', authenticate, validateBody(messagesGroupCreateSchema), sendLimiter, async (req: AuthRequest, res, next) => {
  try {
    const { name, memberIds } = req.body || {};
    const result = await messageGroupService.createGroup(req.user!.id, name || 'Groupe', memberIds || []);
    res.status(201).json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/messages/groups — list my groups
router.get('/groups', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { page, limit } = parsePageLimit(req.query as Record<string, unknown>, 50);
    const result = await messageGroupService.listMyGroups(req.user!.id, page, limit);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/group-invite/join — rejoindre un groupe via lien d'invitation
router.post('/group-invite/join', authenticate, validateBody(messagesGroupInviteJoinSchema), async (req: AuthRequest, res, next) => {
  try {
    const token = (req.body as { token?: string })?.token;
    const result = await messageGroupService.joinGroupByInviteToken(token ?? '', req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/messages/group/:groupId — group info
router.get('/group/:groupId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await messageGroupService.getGroup(param(req, 'groupId'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// PATCH /api/messages/group/:groupId — nom / avatar / description (admin)
router.patch('/group/:groupId', authenticate, validateBody(messagesGroupPatchSchema), async (req: AuthRequest, res, next) => {
  try {
    const body = (req.body || {}) as { name?: string | null; avatar_url?: string | null; description?: string | null };
    const result = await messageGroupService.updateGroup(param(req, 'groupId'), req.user!.id, {
      name: body.name,
      avatar_url: body.avatar_url,
      description: body.description,
    });
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// PATCH /api/messages/group/:groupId/notifications — sourdine notifications (membre courant)
router.patch('/group/:groupId/notifications', authenticate, validateBody(messagesGroupNotificationsSchema), async (req: AuthRequest, res, next) => {
  try {
    const { muted } = req.body;
    const result = await messageGroupService.setGroupNotificationsMuted(param(req, 'groupId'), req.user!.id, muted);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// PATCH /api/messages/group/:groupId/me/display-tag — libellé visible dans le groupe (CDC)
router.patch('/group/:groupId/me/display-tag', authenticate, validateBody(messagesGroupDisplayTagSchema), async (req: AuthRequest, res, next) => {
  try {
    const tag = (req.body as { group_display_tag?: unknown })?.group_display_tag;
    const result = await messageGroupService.setMyGroupDisplayTag(param(req, 'groupId'), req.user!.id, tag ?? null);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/messages/group/:groupId/export — export JSON du fil (membre uniquement)
router.get('/group/:groupId/export', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await messageGroupService.exportGroupMessages(param(req, 'groupId'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/messages/group/:groupId/messages — group messages (cursor pagination)
router.get('/group/:groupId/messages', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const cursor = (req.query.cursor as string) || null;
    const { limit } = parsePageLimit(req.query as Record<string, unknown>, 30);
    const result = await messageGroupService.getGroupMessages(param(req, 'groupId'), req.user!.id, cursor, limit);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/group/:groupId/read — marquer le fil groupe comme lu (curseur membre)
router.post('/group/:groupId/read', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await messageGroupService.markGroupAsRead(param(req, 'groupId'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/group/:groupId/pin — body: { messageId }
router.post('/group/:groupId/pin', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const messageId = (req.body as { messageId?: string })?.messageId;
    if (!messageId || !String(messageId).trim()) {
      res.status(400).json({ success: false, error: { message: 'messageId requis' } });
      return;
    }
    const result = await messageGroupService.pinGroupMessage(param(req, 'groupId'), String(messageId).trim(), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// DELETE /api/messages/group/:groupId/pin — désépingler
router.delete('/group/:groupId/pin', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await messageGroupService.unpinGroupMessage(param(req, 'groupId'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/group/:groupId/send — send message to group
router.post('/group/:groupId/send', authenticate, validateBody(messagesGroupSendSchema), sendLimiter, async (req: AuthRequest, res, next) => {
  try {
    const {
      content,
      type,
      media_url,
      thumbnail_url,
      reply_to_id,
      poll_options,
      event_id,
      scheduled_at,
      forward_from_message_id,
      e2ee_envelope,
      e2ee_envelopes,
    } = req.body || {};
    const result = await messageGroupService.sendGroupMessage(
      param(req, 'groupId'),
      req.user!.id,
      content ?? '',
      {
        type,
        media_url,
        thumbnail_url,
        reply_to_id,
        poll_options,
        event_id,
        scheduled_at,
        forward_from_message_id,
      }
    );

    if (e2ee_envelope && typeof e2ee_envelope === 'object') {
      try {
        await e2eeService.storeEnvelope(req.user!.id, {
          ...e2ee_envelope,
          groupId: param(req, 'groupId'),
          groupMessageId: result.id,
        });
      } catch (e) {
        logger.warn('E2EE envelope store failed on group send', { err: e, messageId: result.id });
      }
    }
    if (Array.isArray(e2ee_envelopes) && e2ee_envelopes.length > 0) {
      for (const env of e2ee_envelopes) {
        if (!env || typeof env !== 'object') continue;
        try {
          await e2eeService.storeEnvelope(req.user!.id, {
            ...env,
            groupId: param(req, 'groupId'),
            groupMessageId: result.id,
          });
        } catch (e) {
          logger.warn('E2EE envelope store failed for one group recipient', { err: e, messageId: result.id });
        }
      }
    }
    res.status(201).json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/group/:groupId/messages/:messageId/reaction
router.post('/group/:groupId/messages/:messageId/reaction', authenticate, validateBody(messagesReactionSchema), async (req: AuthRequest, res, next) => {
  try {
    const { emoji } = req.body || {};
    const updated = await messageGroupService.setGroupMessageReaction(
      param(req, 'groupId'),
      param(req, 'messageId'),
      req.user!.id,
      emoji
    );
    res.json({ success: true, data: { id: updated.id, reactions: updated.reactions } });
  } catch (error: unknown) {
    next(error);
  }
});

// DELETE /api/messages/group/:groupId/messages/:messageId/reaction
router.delete('/group/:groupId/messages/:messageId/reaction', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const updated = await messageGroupService.setGroupMessageReaction(
      param(req, 'groupId'),
      param(req, 'messageId'),
      req.user!.id,
      null
    );
    res.json({ success: true, data: { id: updated.id, reactions: updated.reactions } });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/group/:groupId/messages/:messageId/poll-vote
router.post('/group/:groupId/messages/:messageId/poll-vote', authenticate, validateBody(messagesPollVoteSchema), async (req: AuthRequest, res, next) => {
  try {
    const { option_index: optionIndex } = req.body || {};
    const data = await messageGroupService.voteGroupPoll(
      param(req, 'groupId'),
      param(req, 'messageId'),
      req.user!.id,
      optionIndex
    );
    res.json({ success: true, data });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/messages/group/:groupId/messages/:messageId/reactions-detail
router.get('/group/:groupId/messages/:messageId/reactions-detail', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await messageGroupService.getGroupMessageReactionsDetail(
      param(req, 'groupId'),
      param(req, 'messageId'),
      req.user!.id
    );
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// PATCH /api/messages/group/:groupId/messages/:messageId — éditer message (expéditeur, 15 min)
router.patch('/group/:groupId/messages/:messageId', authenticate, validateBody(messagesGroupMessageEditSchema), async (req: AuthRequest, res, next) => {
  try {
    const { content } = req.body;
    const result = await messageGroupService.editGroupMessage(
      param(req, 'groupId'),
      param(req, 'messageId'),
      req.user!.id,
      content
    );
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/group/:groupId/messages/:messageId/transcribe — vocal groupe (expéditeur)
router.post('/group/:groupId/messages/:messageId/transcribe', authenticate, sendLimiter, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await messageGroupService.transcribeGroupVoiceMessage(
      param(req, 'groupId'),
      param(req, 'messageId'),
      req.user!.id
    );
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// DELETE /api/messages/group/:groupId/messages/:messageId — soft delete (expéditeur)
router.delete('/group/:groupId/messages/:messageId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await messageGroupService.deleteGroupMessage(
      param(req, 'groupId'),
      param(req, 'messageId'),
      req.user!.id
    );
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/group/:groupId/members — add members (admin only)
router.post('/group/:groupId/members', authenticate, validateBody(messagesGroupMembersSchema), async (req: AuthRequest, res, next) => {
  try {
    const { userIds } = req.body;
    const result = await messageGroupService.addGroupMembers(param(req, 'groupId'), req.user!.id, userIds);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// PATCH /api/messages/group/:groupId/members/:userId/role — promote / demote (admin only)
router.patch('/group/:groupId/members/:userId/role', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const role = (req.body as { role?: string })?.role;
    if (role !== 'admin' && role !== 'member') {
      res.status(400).json({ success: false, error: { message: 'role requis : admin ou member' } });
      return;
    }
    const result = await messageGroupService.setGroupMemberRole(
      param(req, 'groupId'),
      req.user!.id,
      param(req, 'userId'),
      role
    );
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// DELETE /api/messages/group/:groupId/members/:userId — remove member or leave
router.delete('/group/:groupId/members/:userId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await messageGroupService.removeGroupMember(
      param(req, 'groupId'),
      req.user!.id,
      param(req, 'userId')
    );
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/group/:groupId/invite-link — générer lien d'invitation (admin)
router.post('/group/:groupId/invite-link', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await messageGroupService.generateGroupInviteToken(param(req, 'groupId'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// DELETE /api/messages/group/:groupId/invite-link — révoquer lien (admin)
router.delete('/group/:groupId/invite-link', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await messageGroupService.revokeGroupInviteToken(param(req, 'groupId'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/group/:groupId/leave — leave group
router.post('/group/:groupId/leave', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await messageGroupService.leaveGroup(param(req, 'groupId'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/messages/:conversationId — cursor-based pagination (user must be participant)
router.get('/:conversationId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const cursor = (req.query.cursor as string) || null;
    const { limit } = parsePageLimit(req.query as Record<string, unknown>, 30);
    const result = await messageService.getMessages(param(req, 'conversationId'), cursor, limit, req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// PUT /api/messages/:conversationId/delivered
router.put('/:conversationId/delivered', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await messageService.markAsDelivered(param(req, 'conversationId'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// PUT /api/messages/:conversationId/read
router.put('/:conversationId/read', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await messageService.markAsRead(param(req, 'conversationId'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// DELETE /api/messages/message/:messageId
router.delete('/message/:messageId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await messageService.deleteMessage(param(req, 'messageId'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/message/:messageId/delete-for-all — CPO 4.17 (expéditeur, < 15 min)
router.post('/message/:messageId/delete-for-all', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await messageService.deleteForAll(param(req, 'messageId'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/conversations/:conversationId/pin — body: { messageId }
router.post('/conversations/:conversationId/pin', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const messageId = req.body?.messageId;
    if (!messageId) return res.status(400).json({ success: false, error: 'messageId requis' });
    const result = await messageService.pinMessage(
      param(req, 'conversationId'),
      messageId,
      req.user!.id
    );
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// DELETE /api/messages/conversations/:conversationId/pin — CPO 4.23 désépingler
router.delete('/conversations/:conversationId/pin', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await messageService.unpinMessage(param(req, 'conversationId'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/block
router.post('/block', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.body;
    const result = await messageService.blockUser(req.user!.id, userId);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/report
router.post('/report', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { messageId, reason } = req.body;
    const result = await messageService.reportMessage(req.user!.id, messageId, reason);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

export default router;
