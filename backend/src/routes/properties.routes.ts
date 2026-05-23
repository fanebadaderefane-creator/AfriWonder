import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// GET /api/properties/admin/pending - Annonces en attente (Admin seulement)
router.get('/admin/pending', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role ?? '')) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const list = await prisma.property.findMany({
      where: { is_verified: false },
      include: { owner: { select: { id: true, full_name: true, email: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: list });
  } catch (e) {
    next(e);
  }
});

// POST /api/properties/:id/approve - Approuver une annonce (Admin seulement)
router.post('/:id/approve', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role ?? '')) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const id = param(req, 'id');
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) return res.status(404).json({ success: false, message: 'Annonce non trouvée' });
    const updated = await prisma.property.update({
      where: { id },
      data: { is_verified: true },
    });
    try {
      await prisma.notification.create({
        data: {
          user_id: property.owner_id,
          type: 'property_approved',
          title: 'Annonce approuvée',
          message: `Votre annonce "${property.title}" est maintenant visible sur la plateforme.`,
          reference_type: 'property',
          reference_id: id,
        },
      });
    } catch (notifErr) {
      logger.warn('Notification property approuvée', { err: (notifErr as Error).message });
    }
    res.json({ success: true, data: updated, message: 'Annonce approuvée' });
  } catch (e) {
    next(e);
  }
});

// POST /api/properties/:id/reject - Rejeter une annonce (Admin seulement)
router.post('/:id/reject', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role ?? '')) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const id = param(req, 'id');
    const { reason } = req.body || {};
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) return res.status(404).json({ success: false, message: 'Annonce non trouvée' });
    try {
      await prisma.notification.create({
        data: {
          user_id: property.owner_id,
          type: 'property_rejected',
          title: 'Annonce rejetée',
          message: reason
            ? `Votre annonce "${property.title}" a été rejetée. Raison: ${reason}`
            : `Votre annonce "${property.title}" a été rejetée.`,
          reference_type: 'property',
          reference_id: id,
        },
      });
    } catch (notifErr) {
      logger.warn('Notification property rejetée', { err: (notifErr as Error).message });
    }
    res.json({ success: true, data: property, message: 'Annonce rejetée' });
  } catch (e) {
    next(e);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const listing_type = req.query.listing_type as string | undefined;
    const property_type = req.query.property_type as string | undefined;
    const city = req.query.city as string | undefined;
    const status = req.query.status as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const where: Record<string, unknown> = { is_verified: true };
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
    if (!property.is_verified) return res.status(404).json({ success: false, message: 'Bien non trouvé' });
    res.json({ success: true, data: property });
  } catch (e) {
    next(e);
  }
});

// POST /api/properties/:id/visit-request - Demande de visite
router.post('/:id/visit-request', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
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

router.post('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
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
        is_verified: false,
        amenities: Array.isArray(b.amenities) ? b.amenities : undefined,
        owner_phone: b.owner_phone ?? undefined,
      },
    });
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['super_admin', 'admin', 'moderation_admin'] } },
        select: { id: true },
      });
      const ownerName = user?.full_name || 'Un prestataire';
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            user_id: admin.id,
            type: 'property_pending_approval',
            title: 'Nouvelle annonce immobilier en attente',
            message: `${ownerName} a déposé une annonce "${property.title}". Veuillez l'examiner et l'approuver.`,
            reference_type: 'property',
            reference_id: property.id,
          },
        });
      }
    } catch (notifErr) {
      logger.warn('Notification admin property', { err: (notifErr as Error).message });
    }
    res.status(201).json({ success: true, data: property, message: 'Annonce enregistrée. Vous serez notifié après validation par l\'administrateur.' });
  } catch (e) {
    next(e);
  }
});

export default router;
