import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/restaurants/admin/pending - Liste des restaurants en attente (Admin seulement)
router.get('/admin/pending', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const list = await prisma.restaurant.findMany({
      where: { is_verified: false },
      include: { owner: { select: { id: true, full_name: true, email: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: list });
  } catch (e) {
    next(e);
  }
});

// POST /api/restaurants/:id/approve - Approuver un restaurant (Admin seulement)
router.post('/:id/approve', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const id = param(req, 'id');
    const restaurant = await prisma.restaurant.findUnique({ where: { id }, include: { owner: { select: { id: true } } } });
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant non trouvé' });
    const updated = await prisma.restaurant.update({
      where: { id },
      data: { is_verified: true },
    });
    try {
      await prisma.notification.create({
        data: {
          user_id: restaurant.owner_id,
          type: 'restaurant_approved',
          title: 'Restaurant approuvé',
          message: `Votre restaurant "${restaurant.name}" a été approuvé et est maintenant visible.`,
          reference_type: 'restaurant',
          reference_id: id,
        },
      });
    } catch (notifErr) {
      logger.warn('Notification restaurant approuvé', { err: (notifErr as Error).message });
    }
    res.json({ success: true, data: updated, message: 'Restaurant approuvé' });
  } catch (e) {
    next(e);
  }
});

// POST /api/restaurants/:id/reject - Rejeter un restaurant (Admin seulement)
router.post('/:id/reject', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const id = param(req, 'id');
    const { reason } = req.body || {};
    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant non trouvé' });
    try {
      await prisma.notification.create({
        data: {
          user_id: restaurant.owner_id,
          type: 'restaurant_rejected',
          title: 'Demande restaurant rejetée',
          message: reason
            ? `Votre demande pour "${restaurant.name}" a été rejetée. Raison: ${reason}`
            : `Votre demande pour "${restaurant.name}" a été rejetée.`,
          reference_type: 'restaurant',
          reference_id: id,
        },
      });
    } catch (notifErr) {
      logger.warn('Notification restaurant rejeté', { err: (notifErr as Error).message });
    }
    res.json({ success: true, data: restaurant, message: 'Restaurant rejeté' });
  } catch (e) {
    next(e);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const city = req.query.city as string | undefined;
    const isOpen = req.query.is_open as string | undefined;
    const search = req.query.search as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const where: Record<string, unknown> = { is_verified: true };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (isOpen === 'true') where.is_open = true;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
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
    if (!restaurant.is_verified) return res.status(404).json({ success: false, message: 'Restaurant non trouvé' });
    res.json({ success: true, data: restaurant });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/menu-items', async (req, res, next) => {
  try {
    const id = param(req, 'id');
    const restaurant = await prisma.restaurant.findUnique({ where: { id }, select: { is_verified: true } });
    if (!restaurant || !restaurant.is_verified) return res.status(404).json({ success: false, message: 'Restaurant non trouvé' });
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
    const { name, description, address, city, phone, opening_hours, delivery_time_min, minimum_order, delivery_fee, cuisine_type } = req.body;
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
        is_verified: false,
        cuisine_type: Array.isArray(cuisine_type) ? cuisine_type : cuisine_type ? [cuisine_type] : undefined,
      },
    });
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['super_admin', 'admin', 'moderation_admin'] } },
        select: { id: true },
      });
      const owner = await prisma.user.findUnique({ where: { id: userId }, select: { full_name: true } });
      const ownerName = owner?.full_name || 'Un prestataire';
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            user_id: admin.id,
            type: 'restaurant_pending_approval',
            title: 'Nouveau restaurant en attente d\'approbation',
            message: `${ownerName} a inscrit le restaurant "${name}". Veuillez l'examiner et l'approuver.`,
            reference_type: 'restaurant',
            reference_id: restaurant.id,
          },
        });
      }
    } catch (notifErr) {
      logger.warn('Notification admin restaurant', { err: (notifErr as Error).message });
    }
    res.status(201).json({ success: true, data: restaurant, message: 'Demande enregistrée. Vous serez notifié après validation par l\'administrateur.' });
  } catch (e) {
    next(e);
  }
});

export default router;
