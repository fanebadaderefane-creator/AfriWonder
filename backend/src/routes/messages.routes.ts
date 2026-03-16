// AfriWonder full review PR - CodeRabbit
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import messageService from '../services/message.service.js';
import * as messageGroupService from '../services/messageGroup.service.js';
import { logger } from '../utils/logger.js';

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

// GET /api/messages/unread/count — must be before /:conversationId
router.get('/unread/count', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await messageService.getUnreadCount(req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('messages/unread/count failed', error as Error, { userId: req.user?.id });
    res.json({ success: true, data: { count: 0 } });
  }
});

// GET /api/messages/export — sauvegarde cloud (export conversations + messages, hors éphémères expirés)
router.get('/export', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await messageService.exportConversations(req.user!.id);
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
    const conversation = await messageService.getOrCreateConversation(req.user!.id, param(req, 'userId'));
    res.json({ success: true, data: conversation });
  } catch (error: unknown) {
    next(error);
  }
});

// PATCH /api/messages/conversations/:conversationId/archive — archiver / désarchiver (body: archived boolean)
router.patch('/conversations/:conversationId/archive', authenticate, async (req: AuthRequest, res, next) => {
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
router.put('/conversations/:conversationId/draft', authenticate, async (req: AuthRequest, res, next) => {
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
router.patch('/conversations/:conversationId/notifications', authenticate, async (req: AuthRequest, res, next) => {
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

// POST /api/messages/send
router.post('/send', authenticate, sendLimiter, async (req: AuthRequest, res, next) => {
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
      }
    );
    res.json({ success: true, data: message });
  } catch (error: unknown) {
    next(error);
  }
});

// PATCH /api/messages/message/:messageId/meta
router.patch('/message/:messageId/meta', authenticate, async (req: AuthRequest, res, next) => {
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

// POST /api/messages/message/:messageId/reaction
router.post('/message/:messageId/reaction', authenticate, async (req: AuthRequest, res, next) => {
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

// ========== Group messaging (CDC) ==========
// POST /api/messages/groups — create group
router.post('/groups', authenticate, sendLimiter, async (req: AuthRequest, res, next) => {
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

// GET /api/messages/group/:groupId — group info
router.get('/group/:groupId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await messageGroupService.getGroup(param(req, 'groupId'), req.user!.id);
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

// POST /api/messages/group/:groupId/send — send message to group
router.post('/group/:groupId/send', authenticate, sendLimiter, async (req: AuthRequest, res, next) => {
  try {
    const { content, type, media_url, thumbnail_url } = req.body || {};
    const result = await messageGroupService.sendGroupMessage(
      param(req, 'groupId'),
      req.user!.id,
      content ?? '',
      { type, media_url, thumbnail_url }
    );
    res.status(201).json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/group/:groupId/members — add members (admin only)
router.post('/group/:groupId/members', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { userIds } = req.body || {};
    const result = await messageGroupService.addGroupMembers(
      param(req, 'groupId'),
      req.user!.id,
      Array.isArray(userIds) ? userIds : [userIds].filter(Boolean)
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

// POST /api/messages/group/:groupId/leave — leave group
router.post('/group/:groupId/leave', authenticate, async (req: AuthRequest, res, next) => {
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

// PUT /api/messages/:conversationId/read
router.put('/:conversationId/read', authenticate, async (req: AuthRequest, res, next) => {
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
router.post('/message/:messageId/delete-for-all', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await messageService.deleteForAll(param(req, 'messageId'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/conversations/:conversationId/pin — body: { messageId }
router.post('/conversations/:conversationId/pin', authenticate, async (req: AuthRequest, res, next) => {
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
router.post('/block', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.body;
    const result = await messageService.blockUser(req.user!.id, userId);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/messages/report
router.post('/report', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { messageId, reason } = req.body;
    const result = await messageService.reportMessage(req.user!.id, messageId, reason);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

export default router;
