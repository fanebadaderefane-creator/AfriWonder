import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const listing_type = req.query.listing_type as string | undefined;
    const property_type = req.query.property_type as string | undefined;
    const city = req.query.city as string | undefined;
    const status = req.query.status as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const where: Record<string, unknown> = {};
    if (listing_type) where.listing_type = listing_type;
    if (property_type) where.property_type = property_type;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (status) where.status = status;
    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.property.count({ where }),
    ]);
    res.json({ success: true, data: { properties, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
  } catch (e) {
    next(e);
  }
});

// GET /api/properties/visit-requests/me — doit être avant /:id pour ne pas être pris pour un id
router.get('/visit-requests/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const list = await (prisma as any).propertyVisitRequest?.findMany({
      where: { user_id: userId },
      include: { property: { select: { id: true, title: true, address: true } } },
      orderBy: { created_at: 'desc' },
    }).catch(() => []);
    res.json({ success: true, data: list ?? [] });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = param(req, 'id');
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) return res.status(404).json({ success: false, message: 'Bien non trouvé' });
    res.json({ success: true, data: property });
  } catch (e) {
    next(e);
  }
});

// POST /api/properties/:id/visit-request - Demande de visite
router.post('/:id/visit-request', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const propertyId = param(req, 'id');
    const userId = req.user!.id;
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) return res.status(404).json({ success: false, message: 'Bien non trouvé' });
    const { requested_date, message } = req.body;
    const visit = await (prisma as any).propertyVisitRequest?.create({
      data: {
        property_id: propertyId,
        user_id: userId,
        requested_date: requested_date ? new Date(requested_date) : undefined,
        message: message ?? undefined,
        status: 'pending',
      },
    }).catch(() => null);
    if (!visit) return res.status(500).json({ success: false, message: 'Demande non enregistrée' });
    res.status(201).json({ success: true, data: visit });
  } catch (e) {
    next(e);
  }
});

router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { full_name: true } });
    const b = req.body;
    if (!b.listing_type || !b.property_type || !b.title || !b.address || b.price == null) {
      return res.status(400).json({ success: false, message: 'listing_type, property_type, title, address et price requis' });
    }
    const property = await prisma.property.create({
      data: {
        owner_id: userId,
        owner_name: user?.full_name ?? undefined,
        listing_type: b.listing_type,
        property_type: b.property_type,
        title: b.title,
        description: b.description ?? undefined,
        address: b.address,
        city: b.city ?? undefined,
        neighborhood: b.neighborhood ?? undefined,
        price: Number(b.price),
        bedrooms: b.bedrooms ?? undefined,
        bathrooms: b.bathrooms ?? undefined,
        surface_area: b.surface_area != null ? Number(b.surface_area) : undefined,
        is_furnished: b.is_furnished === true,
      },
    });
    res.status(201).json({ success: true, data: property });
  } catch (e) {
    next(e);
  }
});

export default router;
