import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import orderService from '../services/order.service.js';
import invoiceService from '../services/invoice.service.js';

const router = Router();

/**
 * @swagger
 * /api/orders:
 *   get:
 *     tags: [Orders]
 *     summary: Lister les commandes de l'utilisateur
 *     security:
 *       - bearerAuth: []
 *   post:
 *     tags: [Orders]
 *     summary: Creer une commande a partir du panier
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Commande creee
 */

/**
 * @swagger
 * /api/orders/{id}/confirm-payment:
 *   post:
 *     tags: [Orders]
 *     summary: Confirmer le paiement d'une commande
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paiement confirme
 */

// Limitation création commandes et confirmations paiement (anti-abus)
const orderActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Trop d\'actions commande. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => (req.user?.id || req.ip || 'anon'),
});

// GET /api/orders  (as=buyer par défaut, as=seller, ou live_id pour commandes pendant un live)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const liveId = req.query.live_id as string | undefined;

    if (liveId) {
      const { default: prisma } = await import('../config/database.js');
      const live = await prisma.liveStream.findUnique({
        where: { id: liveId },
        select: { creator_id: true },
      });
      if (!live || live.creator_id !== userId) {
        return res.status(403).json({ success: false, error: 'Non autorisé pour ce live' });
      }
      const result = await orderService.listByLiveId(liveId, userId, page, limit);
      return res.json({ success: true, data: result });
    }

    const as = (req.query.as as string) || 'buyer';
    const result =
      as === 'seller'
        ? await orderService.listBySeller(userId, page, limit)
        : await orderService.list(userId, page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/orders/stats — analytics utilisateur (total dépensé, nb commandes, catégorie préférée, badge fidèle)
router.get('/stats', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const stats = await orderService.getUserOrderStats(userId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/orders/config — config publique (délai annulation, etc.)
router.get('/config', (req, res) => {
  const cancellationDeadlineHours = Number(process.env.CANCELLATION_DEADLINE_HOURS) || 24;
  res.json({
    success: true,
    data: {
      cancellation_deadline_hours: cancellationDeadlineHours,
    },
  });
});

// GET /api/orders/:id/invoice — téléchargement facture PDF
router.get('/:id/invoice', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const pdfBuffer = await invoiceService.generateInvoicePdf(id, userId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="facture-${id.slice(0, 8)}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    next(error);
  }
});

// GET /api/orders/:id
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const order = await orderService.getById(id, userId);
    res.json({ success: true, data: order });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/orders
router.post('/', authenticate, orderActionLimiter, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const order = await orderService.createFromCart(userId, req.body);
    res.status(201).json({ success: true, data: order });
  } catch (error: any) {
    next(error);
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const { status } = req.body;
    const order = await orderService.updateStatus(id, status, userId);
    res.json({ success: true, data: order });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/orders/:id/cancel
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const order = await orderService.cancel(id, userId);
    res.json({ success: true, data: order });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/orders/:id/confirm-payment - Confirmer le paiement (webhook ou admin)
router.post('/:id/confirm-payment', authenticate, orderActionLimiter, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const order = await orderService.confirmPayment(id);
    res.json({ success: true, data: order, message: 'Paiement confirmé et fonds distribués' });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/orders/:id/confirm-reception - Confirmation réception par l'acheteur
router.post('/:id/confirm-reception', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const order = await orderService.confirmReception(id, userId);
    res.json({ success: true, data: order, message: 'Réception confirmée' });
  } catch (error: any) {
    next(error);
  }
});

export default router;
