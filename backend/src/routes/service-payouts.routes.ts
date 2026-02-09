/**
 * Routes API pour les payouts des prestataires
 */
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import servicePayoutService from '../services/service-payout.service.js';
import providerService from '../services/provider.service.js';

const router = Router();

// GET /api/providers/:id/payouts - Historique payouts prestataire
router.get('/providers/:id/payouts', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Vérifier que le prestataire appartient à l'utilisateur ou que l'utilisateur est admin
    const provider = await providerService.getProviderByUserId(req.user!.id);
    if (!provider || provider.id !== param(req, 'id')) {
      // TODO: Vérifier si admin
      return res.status(403).json({
        success: false,
        message: 'Non autorisé',
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;

    const result = await servicePayoutService.getPayoutHistory(param(req, 'id'), {
      page,
      limit,
      status,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/providers/:id/payouts/available - Montant disponible pour payout
router.get('/providers/:id/payouts/available', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Vérifier que le prestataire appartient à l'utilisateur
    const provider = await providerService.getProviderByUserId(req.user!.id);
    if (!provider || provider.id !== param(req, 'id')) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé',
      });
    }

    const available = await servicePayoutService.calculateAvailablePayout(param(req, 'id'));
    res.json({ success: true, data: available });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/providers/:id/payouts/request - Demander payout
router.post('/providers/:id/payouts/request', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Vérifier que le prestataire appartient à l'utilisateur
    const provider = await providerService.getProviderByUserId(req.user!.id);
    if (!provider || provider.id !== param(req, 'id')) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé',
      });
    }

    const { booking_ids } = req.body;

    const payout = await servicePayoutService.createPayout(param(req, 'id'), booking_ids);
    res.status(201).json({ success: true, data: payout });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/service-payouts - Liste tous les payouts (admin)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // TODO: Vérifier que l'utilisateur est admin
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const filters: any = { page, limit };

    if (req.query.provider_id) {
      filters.provider_id = req.query.provider_id as string;
    }

    if (req.query.status) {
      filters.status = req.query.status as string;
    }

    const result = await servicePayoutService.listAllPayouts(filters);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/service-payouts/:id/process - Traiter payout (admin)
router.post('/:id/process', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // TODO: Vérifier que l'utilisateur est admin
    const payout = await servicePayoutService.processPayout(param(req, 'id'));
    res.json({ success: true, data: payout });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/service-payouts/:id/complete - Marquer payout complété (admin/webhook)
router.post('/:id/complete', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // TODO: Vérifier que l'utilisateur est admin ou webhook
    const payout = await servicePayoutService.completePayout(param(req, 'id'));
    res.json({ success: true, data: payout });
  } catch (error: any) {
    next(error);
  }
});

export default router;
