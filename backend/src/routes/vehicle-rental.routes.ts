/**
 * Routes Location de véhicules — listing, recherche, détail, demande de location.
 *
 * V1 minimal pour J1 :
 *   - Catalogue géré comme un sous-type de Property (avec category="vehicle"),
 *     ce qui évite d'introduire un nouveau modèle Prisma le jour du lancement.
 *   - Demande de location = Booking via service-providers existant si présent,
 *     sinon stocké comme Notification + Transaction "vehicle_rental_request".
 *
 * Endpoints :
 *   GET  /api/vehicle-rental                  → liste publique
 *   GET  /api/vehicle-rental/:id              → détail
 *   POST /api/vehicle-rental/:id/request      → demande de location (auth)
 *   GET  /api/vehicle-rental/me/requests      → mes demandes (auth)
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

const VEHICLE_CATEGORY = 'vehicle';

const requestSchema = z.object({
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  contact_phone: z.string().min(8).max(20),
  notes: z.string().max(280).optional(),
});

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10) || 20));
    const city = (req.query.city as string) || undefined;
    const country = (req.query.country as string) || undefined;
    const where: any = { property_type: VEHICLE_CATEGORY, status: 'available' };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (country) where.country = { contains: country, mode: 'insensitive' };

    let items: any[] = [];
    let total = 0;
    try {
      [items, total] = await Promise.all([
        prisma.property.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.property.count({ where }),
      ]);
    } catch {
      // Modèle Property absent → catalogue vide géré côté UI (empty state).
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

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const id = param(req, 'id');
    let item: any = null;
    try {
      item = await prisma.property.findFirst({
        where: { id, property_type: VEHICLE_CATEGORY },
      });
    } catch {
      item = null;
    }
    if (!item) return res.status(404).json({ success: false, error: 'Véhicule introuvable' });
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/request',
  authenticate,
  validateBody(requestSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const id = param(req, 'id');
      const { start_date, end_date, contact_phone, notes } = req.body as z.infer<typeof requestSchema>;

      let vehicle: any = null;
      try {
        vehicle = await prisma.property.findFirst({
          where: { id, property_type: VEHICLE_CATEGORY },
        });
      } catch {
        vehicle = null;
      }
      if (!vehicle) return res.status(404).json({ success: false, error: 'Véhicule introuvable' });

      // NB : le modèle Transaction n'a pas `reference_type` — le type est
      // entièrement encodé dans le champ `type`.
      const requestRecord = await prisma.transaction.create({
        data: {
          user_id: userId,
          type: 'vehicle_rental_request',
          amount: 0,
          currency: 'XOF',
          status: 'pending',
          description: `Demande location véhicule ${id} du ${start_date} au ${end_date}`,
          reference_id: id,
        },
      });

      // Notifier le propriétaire si on peut le retrouver via le modèle Property.
      const ownerId = (vehicle as any).owner_id || (vehicle as any).user_id;
      if (ownerId && ownerId !== userId) {
        try {
          await notificationService.create(ownerId, {
            type: 'vehicle_rental_request',
            title: 'Nouvelle demande de location',
            message: `Du ${start_date} au ${end_date}. Contact: ${contact_phone}.`,
            reference_type: 'vehicle',
            reference_id: id,
            data: { request_id: requestRecord.id, contact_phone, notes },
          });
        } catch (err) {
          logger.warn('vehicle rental notify owner failed', {
            err: err instanceof Error ? err.message : String(err),
          });
        }
      }

      res.status(201).json({
        success: true,
        data: {
          request_id: requestRecord.id,
          status: 'pending',
          message: 'Demande envoyée. Le propriétaire vous contactera.',
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/me/requests', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const items = await prisma.transaction.findMany({
      where: { user_id: userId, type: 'vehicle_rental_request' },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: { items } });
  } catch (err) {
    next(err);
  }
});

export default router;
// end of vehicleRental.routes
