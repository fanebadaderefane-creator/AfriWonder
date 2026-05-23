import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';
import platformControlService from '../services/platformControl.service.js';
import {
  FOOD_ORDER_STATUS,
  afterFoodOrderStatusChange,
  computeFoodOrderSplit,
  sumMenuLinesVerified,
  transitionFoodOrderStatus,
  type FoodOrderStatus,
} from '../services/foodOrderVertical.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';
import { logger } from '../utils/logger.js';

const router = Router();

const ADMIN_ROLES = new Set(['super_admin', 'admin', 'moderation_admin']);

/** Commandes actives pour les restaurants dont l’utilisateur est propriétaire (dashboard restauration). */
router.get('/restaurant/incoming', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const owned = await prisma.restaurant.findMany({
      where: { owner_id: userId },
      select: { id: true },
    });
    const ids = owned.map((r) => r.id);
    if (ids.length === 0) {
      return res.json({ success: true, data: { orders: [] } });
    }
    const statusOpen = (req.query.open as string | undefined) !== '0';
    const orders = await prisma.foodOrder.findMany({
      where: {
        restaurant_id: { in: ids },
        ...(statusOpen
          ? { status: { notIn: [FOOD_ORDER_STATUS.delivered, FOOD_ORDER_STATUS.cancelled, FOOD_ORDER_STATUS.rejected] } }
          : {}),
      },
      orderBy: { created_at: 'desc' },
      take: Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50)),
      include: {
        restaurant: { select: { id: true, name: true } },
        customer: { select: { id: true, full_name: true, profile_image: true } },
      },
    });
    res.json({ success: true, data: { orders } });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/status', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const status = req.body?.status as string | undefined;
    if (!status || !Object.values(FOOD_ORDER_STATUS).includes(status as FoodOrderStatus)) {
      return res.status(400).json({ success: false, message: 'status invalide' });
    }
    const { delivery_person_id, reject_reason } = req.body || {};
    await transitionFoodOrderStatus(
      id,
      { userId: req.user!.id, role: req.user?.role },
      status as FoodOrderStatus,
      { delivery_person_id, reject_reason },
    );
    const order = await prisma.foodOrder.findUnique({
      where: { id },
      include: { restaurant: { select: { id: true, name: true } } },
    });
    res.json({ success: true, data: order });
  } catch (e: unknown) {
    const err = e as { statusCode?: number; message?: string };
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message ?? 'Erreur' });
    }
    next(e);
  }
});

router.post('/:id/cancel', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    await transitionFoodOrderStatus(id, { userId: req.user!.id, role: req.user?.role }, FOOD_ORDER_STATUS.cancelled);
    const order = await prisma.foodOrder.findUnique({ where: { id } });
    res.json({ success: true, data: order });
  } catch (e: unknown) {
    const err = e as { statusCode?: number; message?: string };
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message ?? 'Erreur' });
    }
    next(e);
  }
});

router.post('/:id/assign-delivery', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const delivery_person_id = req.body?.delivery_person_id as string | undefined;
    if (!delivery_person_id?.trim()) {
      return res.status(400).json({ success: false, message: 'delivery_person_id requis' });
    }
    await transitionFoodOrderStatus(
      id,
      { userId: req.user!.id, role: req.user?.role },
      FOOD_ORDER_STATUS.courier_assigned,
      { delivery_person_id: delivery_person_id.trim() },
    );
    const order = await prisma.foodOrder.findUnique({ where: { id }, include: { restaurant: true } });
    res.json({ success: true, data: order });
  } catch (e: unknown) {
    const err = e as { statusCode?: number; message?: string };
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message ?? 'Erreur' });
    }
    next(e);
  }
});

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
    const userId = req.user!.id;
    const role = req.user?.role ?? '';
    const isAdmin = ADMIN_ROLES.has(role);
    const order = isAdmin
      ? await prisma.foodOrder.findUnique({
          where: { id },
          include: { restaurant: true },
        })
      : await prisma.foodOrder.findFirst({
          where: {
            id,
            OR: [
              { customer_id: userId },
              { restaurant: { owner_id: userId } },
              { delivery_person_id: userId },
            ],
          },
          include: { restaurant: true },
        });
    if (!order) return res.status(404).json({ success: false, message: 'Commande non trouvée' });
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
    const restaurant_id = body.restaurant_id as string;
    const items = body.items as { menu_item_id: string; quantity: number }[];
    const total_amount = body.total_amount;
    let delivery_address = body.delivery_address as string;
    if (!restaurant_id || !items || !Array.isArray(items) || total_amount == null) {
      return res.status(400).json({ success: false, message: 'restaurant_id, items et total_amount requis' });
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurant_id } });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant non trouvé' });
    }
    if (restaurant.account_status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Établissement suspendu.' });
    }
    if (!restaurant.is_verified) {
      return res.status(403).json({ success: false, message: 'Restaurant non disponible.' });
    }
    if (!restaurant.accepts_orders || !restaurant.is_open) {
      return res.status(403).json({ success: false, message: 'Commandes fermées pour cet établissement.' });
    }

    const fulfillment: 'delivery' | 'pickup' =
      body.fulfillment_type === 'pickup' || body.fulfillment_type === 'pickup_only' ? 'pickup' : 'delivery';
    if (fulfillment === 'pickup' && !restaurant.supports_pickup) {
      return res.status(400).json({ success: false, message: 'Retrait sur place non proposé.' });
    }
    if (fulfillment === 'delivery' && !(delivery_address && String(delivery_address).trim())) {
      return res.status(400).json({ success: false, message: 'delivery_address requis pour la livraison.' });
    }
    if (fulfillment === 'pickup') {
      delivery_address = `Retrait — ${restaurant.address}`;
    }

    let subtotal: number;
    try {
      subtotal = await sumMenuLinesVerified(restaurant_id, items);
    } catch (err) {
      return res.status(400).json({ success: false, message: (err as Error).message });
    }

    const deliveryFee = fulfillment === 'delivery' ? Number(restaurant.delivery_fee) || 0 : 0;
    const commissionPct = Number(restaurant.platform_commission_pct);
    const split = computeFoodOrderSplit({
      subtotal,
      deliveryFee,
      platformCommissionPct: Number.isFinite(commissionPct) ? commissionPct : 10,
      fulfillmentType: fulfillment,
    });

    if (Math.abs(split.customer_total - Number(total_amount)) > 0.02) {
      return res.status(400).json({
        success: false,
        message: 'Montant total incohérent avec le panier.',
        expected_total: split.customer_total,
        breakdown: split,
      });
    }

    if (restaurant.minimum_order > 0 && subtotal < restaurant.minimum_order) {
      return res.status(400).json({
        success: false,
        message: `Minimum de commande : ${restaurant.minimum_order} FCFA (hors livraison).`,
      });
    }

    const order = await prisma.foodOrder.create({
      data: {
        customer_id: userId,
        customer_name: user?.full_name ?? undefined,
        restaurant_id,
        restaurant_name: restaurant.name,
        items: items as object,
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: split.customer_total,
        platform_fee_amount: split.platform_fee_amount,
        restaurant_payout_amount: split.restaurant_payout_amount,
        courier_payout_amount: split.courier_payout_amount,
        fulfillment_type: fulfillment,
        delivery_address,
        delivery_lat: body.delivery_lat != null ? Number(body.delivery_lat) : undefined,
        delivery_lng: body.delivery_lng != null ? Number(body.delivery_lng) : undefined,
        delivery_instructions: body.delivery_instructions ?? undefined,
        payment_method: ['cash', 'wallet', 'mobile_money', 'card'].includes(body.payment_method)
          ? body.payment_method
          : 'cash',
        special_requests: body.special_requests ?? undefined,
        status: FOOD_ORDER_STATUS.pending,
      },
      include: { restaurant: { select: { owner_id: true, name: true } } },
    });

    try {
      await afterFoodOrderStatusChange({
        id: order.id,
        status: order.status,
        customer_id: order.customer_id,
        restaurant_id: order.restaurant_id,
        delivery_person_id: order.delivery_person_id,
        restaurant: order.restaurant,
      });
    } catch (hookErr) {
      logger.error('food_order post-create hook failed', {
        orderId: order.id,
        err: (hookErr as Error).message,
      });
    }

    res.status(201).json({ success: true, data: order });
  } catch (e) {
    const pe = e as { code?: string; message?: string };
    if (
      pe?.code === 'P2022'
      || /column .+ does not exist/i.test(String(pe?.message || ''))
      || /The column `.+` does not exist/i.test(String(pe?.message || ''))
    ) {
      logger.error('food_order create schema drift', { code: pe.code, message: pe.message });
      return res.status(503).json({
        success: false,
        message:
          'Mise à jour base de données requise. Côté serveur : cd backend && npx prisma migrate deploy',
      });
    }
    next(e);
  }
});

export default router;
