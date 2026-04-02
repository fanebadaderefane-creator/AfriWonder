import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';
import {
  notificationPreferencesBodySchema,
  pushSubscribeBodySchema,
  pushUnsubscribeBodySchema,
} from '../schemas/cartProductsNotifications.schemas.js';

const router = Router();

// GET /api/notifications/preferences — préférences de notification (CPO 1.25)
router.get('/preferences', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    let prefs = await prisma.notificationPreference.findUnique({ where: { user_id: userId } });
    if (!prefs) {
      prefs = await prisma.notificationPreference.create({
        data: { user_id: userId },
      });
    }
    res.json({ success: true, data: prefs });
  } catch (error) {
    next(error);
  }
});

// PUT /api/notifications/preferences
router.put('/preferences', authenticate, validateBody(notificationPreferencesBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const body = req.body;
    const upd: Record<string, boolean> = {};
    const keys = [
      'email_like', 'email_comment', 'email_follow', 'email_order', 'email_live',
      'sms_like', 'sms_comment', 'sms_order',
      'push_like', 'push_comment', 'push_follow', 'push_order', 'push_live',
    ];
    keys.forEach((k) => { if (typeof body[k] === 'boolean') upd[k] = body[k]; });
    const prefs = await prisma.notificationPreference.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...upd },
      update: upd,
    });
    res.json({ success: true, data: prefs });
  } catch (error) {
    next(error);
  }
});

// POST /api/notifications/push/subscribe
router.post('/push/subscribe', authenticate, validateBody(pushSubscribeBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { endpoint, keys } = req.body;
    const p256dh = keys.p256dh;
    const auth = keys.auth;

    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint: String(endpoint) },
      create: {
        user_id: userId,
        endpoint: String(endpoint),
        p256dh: String(p256dh),
        auth: String(auth),
        user_agent: String(req.headers['user-agent'] || '').slice(0, 500),
        is_active: true,
        last_seen: new Date(),
      },
      update: {
        user_id: userId,
        p256dh: String(p256dh),
        auth: String(auth),
        user_agent: String(req.headers['user-agent'] || '').slice(0, 500),
        is_active: true,
        last_seen: new Date(),
      },
    });

    res.json({ success: true, data: { id: sub.id } });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notifications/push/unsubscribe
router.delete('/push/unsubscribe', authenticate, validateBody(pushUnsubscribeBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const endpoint = String(req.body.endpoint);
    await prisma.pushSubscription.updateMany({
      where: { user_id: userId, endpoint },
      data: { is_active: false, last_seen: new Date() },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/notifications - Get user notifications
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { user_id: userId } }),
      prisma.notification.count({ where: { user_id: userId, is_read: false } }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    logger.error('GET /api/notifications failed', error as Error, { userId: req.user?.id });
    res.status(200).json({
      success: true,
      data: {
        notifications: [],
        unreadCount: 0,
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      },
    });
  }
});

// PUT /api/notifications/:id/read - Mark as read
router.put('/:id/read', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const notification = await prisma.notification.findFirst({
      where: { id: String(id), user_id: userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.notification.update({
      where: { id: String(id) },
      data: { is_read: true },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    await prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;

