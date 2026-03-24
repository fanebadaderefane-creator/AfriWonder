import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import supportTicketService from '../services/supportTicket.service.js';

const router = Router();
const ADMIN_SUPPORT_ROLES = new Set(['admin', 'super_admin', 'support_admin', 'data_admin', 'finance_admin', 'moderation_admin']);

router.post('/tickets', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { subject, message } = req.body;
    const ticket = await supportTicketService.create(req.user!.id, subject, message);
    res.status(201).json({ success: true, data: ticket });
  } catch (e) {
    next(e);
  }
});

router.post('/e2ee-diagnostic', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const payload = req.body || {};
    const subject = `Diagnostic E2EE - ${new Date().toISOString().slice(0, 10)}`;
    const serialized = JSON.stringify(
      {
        source: 'settings_messaging_e2ee',
        captured_at: payload?.captured_at || new Date().toISOString(),
        e2e_preference_enabled: !!payload?.e2e_preference_enabled,
        device_health: payload?.device_health || null,
        recent_events: Array.isArray(payload?.recent_events) ? payload.recent_events.slice(0, 50) : [],
      },
      null,
      2
    );
    const message = `Diagnostic automatique E2EE\n\n${serialized}`;
    const ticket = await supportTicketService.create(req.user!.id, subject, message);
    res.status(201).json({ success: true, data: ticket });
  } catch (e) {
    next(e);
  }
});

router.get('/tickets', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await supportTicketService.listByUser(req.user!.id, page, limit);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.get('/tickets/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const ticket = await supportTicketService.getById(param(req, 'id'), req.user!.id, isAdmin);
    res.json({ success: true, data: ticket });
  } catch (e) {
    next(e);
  }
});

router.post('/tickets/:id/messages', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const isStaff = req.user?.role === 'admin';
    const msg = await supportTicketService.addMessage(param(req, 'id'), req.user!.id, req.body.message, isStaff);
    res.status(201).json({ success: true, data: msg });
  } catch (e) {
    next(e);
  }
});

router.patch('/tickets/:id/status', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!ADMIN_SUPPORT_ROLES.has(String(req.user?.role || ''))) return res.status(403).json({ success: false, error: 'Admin required' });
    const ticket = await supportTicketService.updateStatus(param(req, 'id'), req.body.status);
    res.json({ success: true, data: ticket });
  } catch (e) {
    next(e);
  }
});

router.get('/admin/tickets', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!ADMIN_SUPPORT_ROLES.has(String(req.user?.role || ''))) return res.status(403).json({ success: false, error: 'Admin required' });
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const category = req.query.category as string;
    const result = await supportTicketService.listAll(page, limit, status, category);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

export default router;
