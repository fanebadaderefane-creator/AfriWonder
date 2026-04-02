import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';
import platformControlService from '../services/platformControl.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = req.query.status as string | undefined;
    const where: { customer_id: string; status?: string } = { customer_id: userId };
    if (status) where.status = status;
    const [orders, total] = await Promise.all([
      prisma.foodOrder.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { restaurant: { select: { id: true, name: true } } },
      }),
      prisma.foodOrder.count({ where }),
    ]);
    res.json({ success: true, data: { orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const order = await prisma.foodOrder.findFirst({
      where: { id, customer_id: req.user!.id },
      include: { restaurant: true },
    });
    if (!order) return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    // Pour le tracking : statut actuel + historique minimal (status + updated_at)
    const data = {
      ...order,
      status_history: [{ status: order.status, at: order.updated_at }],
    };
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

router.post('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    if (!(await platformControlService.isFoodEnabled())) {
      return res.status(503).json({ success: false, message: 'Commandes food temporairement indisponibles.' });
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { full_name: true } });
    const body = req.body;
    const restaurant_id = body.restaurant_id;
    const items = body.items;
    const total_amount = body.total_amount;
    const delivery_address = body.delivery_address;
    if (!restaurant_id || !items || !Array.isArray(items) || total_amount == null || !delivery_address) {
      return res.status(400).json({ success: false, message: 'restaurant_id, items, total_amount et delivery_address requis' });
    }
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurant_id }, select: { name: true } });
    const order = await prisma.foodOrder.create({
      data: {
        customer_id: userId,
        customer_name: user?.full_name ?? undefined,
        restaurant_id,
        restaurant_name: restaurant?.name ?? undefined,
        items: items as object,
        total_amount: Number(total_amount),
        delivery_address,
        delivery_lat: body.delivery_lat != null ? Number(body.delivery_lat) : undefined,
        delivery_lng: body.delivery_lng != null ? Number(body.delivery_lng) : undefined,
        delivery_instructions: body.delivery_instructions ?? undefined,
        payment_method: ['cash', 'wallet', 'mobile_money', 'card'].includes(body.payment_method) ? body.payment_method : 'cash',
        special_requests: body.special_requests ?? undefined,
        status: 'pending',
      },
    });
    res.status(201).json({ success: true, data: order });
  } catch (e) {
    next(e);
  }
});

export default router;
