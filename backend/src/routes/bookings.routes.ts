/**
 * Routes API pour les réservations de services (Services Locaux)
 */
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import bookingService from '../services/booking.service.js';
import providerService from '../services/provider.service.js';
import { requireMarketplaceFeature } from '../middleware/marketplaceSubscription.middleware.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// POST /api/bookings - Créer une réservation
router.post('/', authenticate, requireMarketplaceFeature('contact_provider'), validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const customerId = req.user!.id;
    const { service_id, booking_date, booking_time, location_type, customer_address_id, notes, payment_method, deposit_only, phone, customer_name, customer_phone, customer_email } = req.body;

    if (!service_id || !booking_date || !booking_time || !location_type || !payment_method) {
      return res.status(400).json({
        success: false,
        message: 'service_id, booking_date, booking_time, location_type et payment_method sont requis',
      });
    }

    const booking = await bookingService.createBooking(service_id, customerId, {
      booking_date: new Date(booking_date),
      booking_time,
      location_type,
      customer_address_id,
      notes,
      payment_method,
      deposit_only,
      phone,
      customer_name: customer_name?.trim() || undefined,
      customer_phone: customer_phone?.trim() || undefined,
      customer_email: customer_email?.trim() || undefined,
    });

    res.status(201).json({ success: true, data: booking });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/bookings - Liste des réservations
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const as = (req.query.as as string) || 'customer';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;

    const filters: any = { page, limit };
    if (as === 'customer') {
      filters.customer_id = userId;
    } else {
      const provider = await providerService.getProviderByUserId(userId);
      if (!provider) {
        return res.json({ success: true, data: { bookings: [], pagination: { page, limit, total: 0, totalPages: 0 } } });
      }
      filters.provider_id = provider.id;
    }
    if (status) filters.status = status;

    const result = await bookingService.listBookings(filters);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/bookings/:id - Détail d'une réservation
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const booking = await bookingService.getBooking(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: booking });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/bookings/:id/confirm - Confirmer une réservation (prestataire)
router.put('/:id/confirm', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const provider = await providerService.getProviderByUserId(req.user!.id);
    if (!provider) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }
    const booking = await bookingService.confirmBooking(param(req, 'id'), provider.id);
    res.json({ success: true, data: booking });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/bookings/:id/status - Mettre à jour le statut (prestataire)
router.put('/:id/status', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { status, reason } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'status requis' });
    }
    const booking = await bookingService.updateBookingStatus(
      param(req, 'id'),
      req.user!.id,
      status,
      reason
    );
    res.json({ success: true, data: booking });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/bookings/:id/cancel - Annuler une réservation
router.post('/:id/cancel', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { reason } = req.body;
    const booking = await bookingService.cancelBooking(param(req, 'id'), req.user!.id, reason || '');
    res.json({ success: true, data: booking });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/bookings/:id/complete - Marquer comme terminé (prestataire)
router.post('/:id/complete', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const provider = await providerService.getProviderByUserId(req.user!.id);
    if (!provider) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }
    const booking = await bookingService.completeBooking(param(req, 'id'), provider.id);
    res.json({ success: true, data: booking });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/bookings/:id/confirm-payment - Confirmer le paiement (webhook/admin)
router.post('/:id/confirm-payment', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { transaction_id } = req.body;
    const booking = await bookingService.confirmPayment(param(req, 'id'), transaction_id || '');
    res.json({ success: true, data: booking });
  } catch (error: any) {
    next(error);
  }
});

export default router;
