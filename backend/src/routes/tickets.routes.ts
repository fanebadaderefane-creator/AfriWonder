import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';
import eventService from '../services/event.service.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const ticket_type = req.query.ticket_type as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const where: Record<string, unknown> = {};
    if (ticket_type) where.ticket_type = ticket_type;
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({ where, orderBy: { event_date: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.ticket.count({ where }),
    ]);
    res.json({ success: true, data: { tickets, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
  } catch (e) {
    next(e);
  }
});

router.get('/my', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const list = await prisma.ticket.findMany({
      where: { user_id: req.user!.id },
      orderBy: { event_date: 'desc' },
    });
    res.json({ success: true, data: list });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const ticket = await prisma.ticket.findFirst({
      where: { id, user_id: req.user!.id },
    });
    if (!ticket) return res.status(404).json({ success: false, message: 'Billet non trouvé' });
    res.json({ success: true, data: ticket });
  } catch (e) {
    next(e);
  }
});

/** Scan QR — billet Event (anti-double, QR signé). Organisateur ou staff. */
router.post('/scan', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { qr_code } = req.body;
    if (!qr_code) return res.status(400).json({ success: false, message: 'qr_code requis' });
    const result = await eventService.checkIn(qr_code);
    return res.json({ success: true, data: result });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'Scan échoué' });
  }
});

/** Remboursement — billet Event (payment_status = refunded). */
router.post('/refund', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { ticket_id } = req.body;
    if (!ticket_id) return res.status(400).json({ success: false, message: 'ticket_id requis' });
    const result = await eventService.refundTicket(ticket_id, req.user!.id);
    return res.json({ success: true, data: result });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'Remboursement échoué' });
  }
});

router.post('/purchase', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const b = req.body;
    if (!b.event_name || !b.event_date || b.price == null) return res.status(400).json({ success: false, message: 'event_name, event_date et price requis' });
    const qty = Math.max(1, parseInt(b.quantity) || 1);
    const order = await prisma.ticket.create({
      data: {
        user_id: userId,
        ticket_type: b.ticket_type ?? 'event',
        event_id: b.event_id ?? undefined,
        event_name: b.event_name,
        event_date: new Date(b.event_date),
        venue: b.venue ?? undefined,
        price: Number(b.price),
        quantity: qty,
        total_amount: Number(b.price) * qty,
        payment_method: ['wallet', 'mobile_money', 'card'].includes(b.payment_method) ? b.payment_method : 'wallet',
        status: 'pending',
      },
    });
    res.status(201).json({ success: true, data: order });
  } catch (e) {
    next(e);
  }
});

export default router;
