import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import supportTicketService from '../services/supportTicket.service.js';

const router = Router();

router.post('/tickets', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { subject, message } = req.body;
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
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin required' });
    const ticket = await supportTicketService.updateStatus(param(req, 'id'), req.body.status);
    res.json({ success: true, data: ticket });
  } catch (e) {
    next(e);
  }
});

router.get('/admin/tickets', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin required' });
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const result = await supportTicketService.listAll(page, limit, status);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

export default router;
