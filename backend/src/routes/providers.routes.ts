/**
 * Routes API pour les prestataires (Services Locaux)
 */
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import providerService from '../services/provider.service.js';

const router = Router();

// GET /api/providers - Liste des prestataires
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string | undefined;
    const status = req.query.status as string | undefined;
    const user_id = req.query.user_id as string | undefined;

    if (user_id) {
      const provider = await providerService.getProviderByUserId(user_id);
      return res.json({ success: true, data: provider });
    }

    const result = await providerService.listProviders({
      category,
      status,
      page,
      limit,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/providers/:id - Détail d'un prestataire
router.get('/:id', async (req, res, next) => {
  try {
    const provider = await providerService.getProvider(param(req, 'id'));
    res.json({ success: true, data: provider });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/providers - Devenir prestataire
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { service_categories, service_radius_km, location_type, payout_method, payout_account } = req.body;
    const provider = await providerService.createProvider(userId, {
      service_categories: service_categories || [],
      service_radius_km,
      location_type,
      payout_method,
      payout_account,
    });
    res.status(201).json({ success: true, data: provider });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/providers/:id - Modifier le profil prestataire
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const provider = await providerService.getProviderByUserId(req.user!.id);
    if (!provider || provider.id !== param(req, 'id')) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }
    const { service_categories, service_radius_km, location_type, payout_method, payout_account } = req.body;
    const updated = await providerService.updateProvider(param(req, 'id'), {
      service_categories,
      service_radius_km,
      location_type,
      payout_method,
      payout_account,
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/providers/:id/verify - Vérifier un prestataire (admin)
router.post('/:id/verify', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const provider = await providerService.verifyProvider(param(req, 'id'));
    res.json({ success: true, data: provider });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/providers/:id/services - Services du prestataire
router.get('/:id/services', async (req, res, next) => {
  try {
    const provider = await providerService.getProvider(param(req, 'id'));
    res.json({ success: true, data: provider.services || [] });
  } catch (error: any) {
    next(error);
  }
});

export default router;
