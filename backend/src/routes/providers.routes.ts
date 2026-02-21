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

// GET /api/providers/admin/pending - Liste des prestataires en attente (Admin AfriWonder)
router.get('/admin/pending', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role ?? '')) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const list = await providerService.getPendingProviders();
    res.json({ success: true, data: list });
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
    const { service_categories, service_radius_km, location_type, payout_method, payout_account, phone, whatsapp, email, address, city, country, bio } = req.body;
    const provider = await providerService.createProvider(userId, {
      service_categories: service_categories || [],
      service_radius_km,
      location_type,
      payout_method,
      payout_account,
      phone,
      whatsapp,
      email,
      address,
      city,
      country,
      bio,
    });
    res.status(201).json({ success: true, data: provider });
  } catch (error: any) {
    if (error?.message === 'Vous êtes déjà prestataire') {
      return res.status(400).json({ success: false, message: error.message });
    }
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
    const { service_categories, service_radius_km, location_type, payout_method, payout_account, phone, whatsapp, email, address, city, country, bio } = req.body;
    const updated = await providerService.updateProvider(param(req, 'id'), {
      service_categories,
      service_radius_km,
      location_type,
      payout_method,
      payout_account,
      phone,
      whatsapp,
      email,
      address,
      city,
      country,
      bio,
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/providers/:id/verify - Approuver un prestataire (Admin AfriWonder)
router.post('/:id/verify', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role ?? '')) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const provider = await providerService.verifyProvider(param(req, 'id'));
    res.json({ success: true, data: provider, message: 'Prestataire approuvé' });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/providers/:id/reject - Rejeter un prestataire (Admin AfriWonder)
router.post('/:id/reject', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role ?? '')) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const id = param(req, 'id');
    const { reason } = req.body || {};
    const provider = await providerService.rejectProvider(id, reason);
    res.json({ success: true, data: provider, message: 'Prestataire rejeté' });
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
