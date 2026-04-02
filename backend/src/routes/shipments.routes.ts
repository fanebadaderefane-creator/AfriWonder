import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import shipmentService from '../services/shipment.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// POST /api/shipments - Créer une expédition (réservé au vendeur)
router.post('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { order_id, carrier, tracking_number, estimated_delivery_days } = req.body;
    const shipment = await shipmentService.createShipment(order_id, userId, {
      carrier,
      tracking_number,
      estimated_delivery_days,
    });
    res.json({ success: true, data: shipment });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/shipments/:orderId/timeline - Obtenir la timeline d'une expédition
router.get('/:orderId/timeline', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const orderId = param(req, 'orderId');
    const userId = req.user!.id;
    const timeline = await shipmentService.getTimeline(orderId, userId);
    res.json({ success: true, data: timeline });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/shipments/:orderId/tracking - Ajouter un événement de suivi
router.post('/:orderId/tracking', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const orderId = param(req, 'orderId');
    const userId = req.user!.id;
    const { event_type, description, location } = req.body;
    if (!event_type || typeof event_type !== 'string') {
      return res.status(400).json({ success: false, error: { message: 'event_type requis' } });
    }
    const event = await shipmentService.addTrackingEvent(orderId, {
      event_type,
      description,
      location,
    }, userId);
    res.json({ success: true, data: event });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/shipments/:orderId/confirm-delivery - Confirmer la livraison
router.post('/:orderId/confirm-delivery', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const orderId = param(req, 'orderId');
    const userId = req.user!.id;
    const { proof_of_delivery_photo, signature, current_location } = req.body;
    if (!proof_of_delivery_photo || !signature) {
      return res.status(400).json({
        success: false,
        error: { message: 'proof_of_delivery_photo et signature sont requis' },
      });
    }
    const result = await shipmentService.confirmDelivery(orderId, {
      proof_of_delivery_photo,
      signature,
      current_location,
    }, userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/shipments/:orderId/location - Mettre à jour la localisation
router.put('/:orderId/location', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const orderId = param(req, 'orderId');
    const userId = req.user!.id;
    const { location } = req.body;
    if (!location || typeof location !== 'string') {
      return res.status(400).json({ success: false, error: { message: 'location requise' } });
    }
    const result = await shipmentService.updateLocation(orderId, location, userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

export default router;
