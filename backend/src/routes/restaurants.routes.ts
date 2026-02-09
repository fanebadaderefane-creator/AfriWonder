import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const city = req.query.city as string | undefined;
    const isOpen = req.query.is_open as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const where: Record<string, unknown> = {};
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (isOpen === 'true') where.is_open = true;
    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        orderBy: { rating: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.restaurant.count({ where }),
    ]);
    res.json({ success: true, data: { restaurants, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = param(req, 'id');
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: { menu_items: true },
    });
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant non trouvé' });
    res.json({ success: true, data: restaurant });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/menu-items', async (req, res, next) => {
  try {
    const id = param(req, 'id');
    const category = req.query.category as string | undefined;
    const where: { restaurant_id: string; category?: string } = { restaurant_id: id };
    if (category) where.category = category;
    const items = await prisma.menuItem.findMany({ where, orderBy: { category: 'asc' } });
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
});

router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { name, description, address, city, phone, opening_hours, delivery_time_min, minimum_order, delivery_fee } = req.body;
    if (!name || !address || !phone) return res.status(400).json({ success: false, message: 'name, address et phone requis' });
    const restaurant = await prisma.restaurant.create({
      data: {
        owner_id: userId,
        name,
        description: description ?? undefined,
        address,
        city: city ?? undefined,
        phone,
        opening_hours: opening_hours ?? undefined,
        delivery_time_min: delivery_time_min ?? 30,
        minimum_order: minimum_order ?? 0,
        delivery_fee: delivery_fee ?? 0,
      },
    });
    res.status(201).json({ success: true, data: restaurant });
  } catch (e) {
    next(e);
  }
});

export default router;
