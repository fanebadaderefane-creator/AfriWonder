import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import shippingService from '../services/shipping.service.js';
import prisma from '../config/database.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// GET /api/shipping/pickup-points (points relais)
router.get('/pickup-points', async (req, res, next) => {
  try {
    const country = req.query.country as string;
    const city = req.query.city as string;
    const where: any = { is_active: true };
    if (country) where.country = country;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    const points = await prisma.pickupPoint.findMany({ where, orderBy: [{ country: 'asc' }, { city: 'asc' }] });
    res.json({ success: true, data: points });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/shipping/rates
router.get('/rates', async (req, res, next) => {
  try {
    const { destinationCountry, weight } = req.query;
    const rates = await shippingService.getShippingRates(
      destinationCountry as string,
      parseFloat(weight as string) || 1
    );
    res.json({ success: true, data: rates });
  } catch (error: any) {
    next(error);
  }
});

// ——— Livraison colis (standalone) ———
// POST /api/shipping/parcel
router.post('/parcel', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const {
      recipient_name,
      recipient_phone,
      recipient_address,
      destination_country,
      weight_kg,
      carrier,
      tracking_number,
      cost,
      estimated_delivery,
    } = req.body || {};
    if (!recipient_name || !recipient_address || !destination_country || weight_kg == null || !carrier || cost == null) {
      return res.status(400).json({
        success: false,
        error: { message: 'Champs requis: recipient_name, recipient_address, destination_country, weight_kg, carrier, cost' },
      });
    }
    const parcel = await shippingService.createParcel(userId, {
      recipient_name,
      recipient_phone,
      recipient_address,
      destination_country,
      weight_kg: Number(weight_kg),
      carrier,
      tracking_number,
      cost: Number(cost),
      estimated_delivery: estimated_delivery ? new Date(estimated_delivery) : undefined,
    });
    res.status(201).json({ success: true, data: parcel });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/shipping/parcel — mes colis
router.get('/parcel', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || 1), 10));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || 20), 10)));
    const result = await shippingService.listMyParcels(req.user!.id, page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/shipping/parcel/track/:trackingNumber — suivi public
router.get('/parcel/track/:trackingNumber', async (req, res, next) => {
  try {
    const parcel = await shippingService.getParcelByTrackingNumber(param(req, 'trackingNumber'));
    if (!parcel) return res.status(404).json({ success: false, error: { message: 'Colis non trouvé' } });
    res.json({ success: true, data: parcel });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/shipping/parcel/:id
router.get('/parcel/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const parcel = await shippingService.getParcel(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: parcel });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/shipping/parcel/:id/status
router.put('/parcel/:id/status', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ success: false, error: { message: 'status requis' } });
    const parcel = await shippingService.updateParcelStatus(param(req, 'id'), req.user!.id, status);
    res.json({ success: true, data: parcel });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/shipping/parcel/:id/tracking
router.post('/parcel/:id/tracking', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { event_type, location, description } = req.body || {};
    if (!event_type) return res.status(400).json({ success: false, error: { message: 'event_type requis' } });
    const event = await shippingService.addParcelTrackingEvent(param(req, 'id'), req.user!.id, {
      event_type,
      location,
      description,
    });
    res.status(201).json({ success: true, data: event });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/shipping/order/:orderId
router.get('/order/:orderId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const shipping = await shippingService.getShippingByOrder(param(req, 'orderId'));
    res.json({ success: true, data: shipping });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/shipping/track/:trackingNumber
router.get('/track/:trackingNumber', async (req, res, next) => {
  try {
    const shipping = await shippingService.getShippingByTrackingNumber(param(req, 'trackingNumber'));
    res.json({ success: true, data: shipping });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/shipping
router.post('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { orderId, trackingNumber, carrier, shippingAddress, cost, estimatedDelivery } = req.body;
    const shipping = await shippingService.createShipping(orderId, {
      trackingNumber,
      carrier,
      shippingAddress,
      cost,
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
    });
    res.json({ success: true, data: shipping });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/shipping/:id/status
router.put('/:id/status', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.body;
    const shipping = await shippingService.updateShippingStatus(param(req, 'id'), status);
    res.json({ success: true, data: shipping });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/shipping/:id/tracking
router.post('/:id/tracking', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { eventType, location, description } = req.body;
    const event = await shippingService.addTrackingEvent(param(req, 'id'), {
      eventType,
      location,
      description,
    });
    res.json({ success: true, data: event });
  } catch (error: any) {
    next(error);
  }
});

export default router;

