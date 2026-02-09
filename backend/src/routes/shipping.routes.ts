import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import shippingService from '../services/shipping.service.js';
import prisma from '../config/database.js';

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
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
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
router.put('/:id/status', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.body;
    const shipping = await shippingService.updateShippingStatus(param(req, 'id'), status);
    res.json({ success: true, data: shipping });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/shipping/:id/tracking
router.post('/:id/tracking', authenticate, async (req: AuthRequest, res, next) => {
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

