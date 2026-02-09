import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import shipmentService from '../services/shipment.service.js';

const router = Router();

// POST /api/shipments - Créer une expédition
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { order_id, carrier, tracking_number, estimated_delivery_days } = req.body;
    const shipment = await shipmentService.createShipment(order_id, {
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
    const timeline = await shipmentService.getTimeline(orderId);
    res.json({ success: true, data: timeline });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/shipments/:orderId/tracking - Ajouter un événement de suivi
router.post('/:orderId/tracking', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const orderId = param(req, 'orderId');
    const { event_type, description, location } = req.body;
    const event = await shipmentService.addTrackingEvent(orderId, {
      event_type,
      description,
      location,
    });
    res.json({ success: true, data: event });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/shipments/:orderId/confirm-delivery - Confirmer la livraison
router.post('/:orderId/confirm-delivery', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const orderId = param(req, 'orderId');
    const { proof_of_delivery_photo, signature, current_location } = req.body;
    const result = await shipmentService.confirmDelivery(orderId, {
      proof_of_delivery_photo,
      signature,
      current_location,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/shipments/:orderId/location - Mettre à jour la localisation
router.put('/:orderId/location', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const orderId = param(req, 'orderId');
    const { location } = req.body;
    const result = await shipmentService.updateLocation(orderId, location);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

export default router;
