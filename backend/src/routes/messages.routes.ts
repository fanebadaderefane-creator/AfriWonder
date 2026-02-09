import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import messageService from '../services/message.service.js';

const router = Router();

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
    next(error);
  }
});

// GET /api/messages/conversations
router.get('/conversations', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await messageService.getConversations(req.user!.id, page, limit);
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

// POST /api/messages/send
router.post('/send', authenticate, sendLimiter, async (req: AuthRequest, res, next) => {
  try {
    const { recipientId, content, type, media_url, thumbnail_url, reply_to_message_id } = req.body;
    const message = await messageService.sendMessage(
      req.user!.id,
      recipientId,
      content ?? '',
      type || 'text',
      { media_url, thumbnail_url, reply_to_message_id }
    );
    res.json({ success: true, data: message });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/messages/:conversationId — cursor-based pagination (user must be participant)
router.get('/:conversationId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const cursor = (req.query.cursor as string) || null;
    const limit = parseInt(req.query.limit as string) || 30;
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
