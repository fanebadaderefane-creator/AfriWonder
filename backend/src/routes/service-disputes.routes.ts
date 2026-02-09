/**
 * Routes API pour les litiges de services
 */
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import serviceDisputeService from '../services/service-dispute.service.js';
import providerService from '../services/provider.service.js';

const router = Router();

// POST /api/service-disputes - Créer litige
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { booking_id, reason, description, evidence } = req.body;

    if (!booking_id || !reason) {
      return res.status(400).json({
        success: false,
        message: 'booking_id et reason sont requis',
      });
    }

    const dispute = await serviceDisputeService.createDispute(booking_id, req.user!.id, {
      reason,
      description,
      evidence,
    });

    res.status(201).json({ success: true, data: dispute });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/service-disputes - Liste litiges
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const filters: any = { page, limit };

    // TODO: Vérifier si admin pour voir tous les litiges
    // Pour l'instant, filtrer par utilisateur
    const as = req.query.as as string || 'customer';
    if (as === 'customer') {
      filters.customer_id = req.user!.id;
    } else if (as === 'provider') {
      // Récupérer le provider_id depuis l'utilisateur
      const provider = await providerService.getProviderByUserId(req.user!.id);
      if (provider) {
        filters.provider_id = provider.id;
      }
    }

    if (req.query.status) {
      filters.status = req.query.status as string;
    }

    const result = await serviceDisputeService.listDisputes(filters);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/service-disputes/:id - Détails litige
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const dispute = await serviceDisputeService.getDispute(param(req, 'id'));
    res.json({ success: true, data: dispute });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/service-disputes/:id/resolve - Résoudre litige (admin)
router.put('/:id/resolve', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // TODO: Vérifier que l'utilisateur est admin
    const { resolution, status, refund_amount } = req.body;

    if (!resolution || !status || !['resolved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'resolution et status (resolved/rejected) sont requis',
      });
    }

    const dispute = await serviceDisputeService.resolveDispute(param(req, 'id'), req.user!.id, {
      resolution,
      status,
      refund_amount,
    });

    res.json({ success: true, data: dispute });
  } catch (error: any) {
    next(error);
  }
});

export default router;
