/**
 * Routes Childcare - annuaire de gardes d'enfants et prise de reservations.
 *
 * V1 minimal pour le lancement : le catalogue s'appuie sur le modele
 * ServiceProvider filtre par category = 'childcare'. Les reservations
 * sont tracees dans Transaction (type = 'childcare_booking').
 *
 * Endpoints :
 *   GET  /api/childcare                     -> liste prestataires
 *   GET  /api/childcare/:providerId         -> detail
 *   POST /api/childcare/:providerId/book    -> reserver (auth)
 *   GET  /api/childcare/me/bookings         -> mes reservations (auth)
 */
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../utils/zodValidation.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';
import notificationService from '../services/notification.service.js';
import { logger } from '../utils/logger.js';

const router = Router();
const CATEGORY = 'childcare';

const bookSchema = z.object({
  date: z.string().min(1),
  hours: z.number().int().min(1).max(24),
  contact_phone: z.string().min(8).max(20),
  children_count: z.number().int().min(1).max(10),
  notes: z.string().max(280).optional(),
});

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10) || 20));
    const city = (req.query.city as string) || undefined;
    const where: any = { service_categories: { has: CATEGORY } };
    if (city) where.city = { contains: city, mode: 'insensitive' };

    let items: any[] = [];
    let total = 0;
    try {
      [items, total] = await Promise.all([
        prisma.serviceProvider.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.serviceProvider.count({ where }),
      ]);
    } catch {
      items = [];
      total = 0;
    }
    res.json({
      success: true,
      data: {
        items,
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:providerId', optionalAuth, async (req, res, next) => {
  try {
    const id = param(req, 'providerId');
    let provider: any = null;
    try {
      provider = await prisma.serviceProvider.findFirst({
        where: { id, service_categories: { has: CATEGORY } },
      });
    } catch {
      provider = null;
    }
    if (!provider) return res.status(404).json({ success: false, error: 'Prestataire introuvable' });
    res.json({ success: true, data: provider });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:providerId/book',
  authenticate,
  validateBody(bookSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const providerId = param(req, 'providerId');
      const { date, hours, contact_phone, children_count, notes } = req.body as z.infer<typeof bookSchema>;

      let provider: any = null;
      try {
        provider = await prisma.serviceProvider.findFirst({
          where: { id: providerId, service_categories: { has: CATEGORY } },
        });
      } catch {
        provider = null;
      }
      if (!provider) return res.status(404).json({ success: false, error: 'Prestataire introuvable' });

      // NB : type encode entierement le contexte (Transaction n'a pas de reference_type).
      const booking = await prisma.transaction.create({
        data: {
          user_id: userId,
          type: 'childcare_booking',
          amount: 0,
          currency: 'XOF',
          status: 'pending',
          description: `Garde enfants ${date} - ${hours}h - ${children_count} enfant(s)`,
          reference_id: providerId,
        },
      });

      const ownerId = (provider as any).user_id;
      if (ownerId && ownerId !== userId) {
        try {
          await notificationService.create(ownerId, {
            type: 'childcare_booking',
            title: 'Nouvelle demande de garde',
            message: `${date} pour ${hours}h, ${children_count} enfant(s). Contact: ${contact_phone}.`,
            reference_type: 'service_provider',
            reference_id: providerId,
            data: { booking_id: booking.id, contact_phone, notes, hours, children_count, date },
          });
        } catch (err) {
          logger.warn('childcare notify provider failed', {
            err: err instanceof Error ? err.message : String(err),
          });
        }
      }

      res.status(201).json({
        success: true,
        data: {
          booking_id: booking.id,
          status: 'pending',
          message: 'Demande envoyee. Le prestataire vous contactera.',
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/me/bookings', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const items = await prisma.transaction.findMany({
      where: { user_id: userId, type: 'childcare_booking' },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: { items } });
  } catch (err) {
    next(err);
  }
});

export default router;
