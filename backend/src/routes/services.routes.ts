import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import serviceService from '../services/service.service.js';
import providerService from '../services/provider.service.js';
import messageService from '../services/message.service.js';
import { requireMarketplaceFeature } from '../middleware/marketplaceSubscription.middleware.js';

const router = Router();

const isAdminRole = (role?: string) => ['super_admin', 'admin', 'moderation_admin'].includes(String(role || ''));

// GET /api/services (abonnement requis: view_services)
router.get(
  '/',
  authenticate,
  requireMarketplaceFeature('view_services'),
  async (req: AuthRequest, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters: any = {};
      if (req.query.category) filters.category = req.query.category as string;
      if (req.query.isAvailable !== undefined) filters.isAvailable = req.query.isAvailable === 'true';
      if (req.query.search) filters.search = req.query.search as string;
      if (req.query.minPrice !== undefined) filters.minPrice = Number(req.query.minPrice);
      if (req.query.maxPrice !== undefined) filters.maxPrice = Number(req.query.maxPrice);
      if (req.query.sortBy) filters.sortBy = String(req.query.sortBy);
      const result = await serviceService.list(page, limit, filters);
      res.json({ success: true, data: result });
    } catch (error: any) {
      next(error);
    }
  },
);

// GET /api/services/:id (abonnement requis: view_services)
router.get(
  '/:id',
  authenticate,
  requireMarketplaceFeature('view_services'),
  async (req: AuthRequest, res, next) => {
    try {
      const service = await serviceService.getById(param(req, 'id'));
      if (!service.is_available && !isAdminRole(req.user?.role)) {
        return res.status(404).json({ success: false, message: 'Service indisponible' });
      }
      res.json({ success: true, data: service });
    } catch (error: any) {
      next(error);
    }
  },
);

// POST /api/services (abonnement requis: post_service + prestataire validé)
router.post(
  '/',
  authenticate,
  requireMarketplaceFeature('post_service'),
  async (req: AuthRequest, res, next) => {
    try {
      const provider = await providerService.getProviderByUserId(req.user!.id);
      if (!provider) {
        return res.status(403).json({
          success: false,
          message: 'Vous devez être un prestataire pour créer un service',
        });
      }

      const {
        title,
        description,
        price,
        currency,
        duration,
        delivery_time,
        category,
        category_id,
        location,
        location_type,
        travel_fee,
      } = req.body;

      if (!title || !description || !price) {
        return res.status(400).json({
          success: false,
          message: 'title, description et price sont requis',
        });
      }

      const durationMinutes =
        duration != null
          ? Number(duration)
          : delivery_time != null
            ? Number(delivery_time) * 24 * 60
            : undefined;

      const service = await serviceService.create(provider.id, {
        title,
        description,
        price: Number(price),
        currency,
        duration: durationMinutes,
        category,
        category_id,
        location,
        location_type,
        travel_fee: travel_fee != null ? Number(travel_fee) : undefined,
      });

      res.status(201).json({
        success: true,
        data: service,
        message: 'Service soumis. En attente de validation admin.',
      });
    } catch (error: any) {
      next(error);
    }
  },
);

// POST /api/services/:id/contact (abonnement requis: contact_provider)
router.post(
  '/:id/contact',
  authenticate,
  requireMarketplaceFeature('contact_provider'),
  async (req: AuthRequest, res, next) => {
    try {
      const service = await serviceService.getById(param(req, 'id'));
      if (!service.is_available) {
        return res.status(400).json({ success: false, message: 'Service indisponible' });
      }
      const providerUserId = service.provider.user_id;
      if (!providerUserId || providerUserId === req.user!.id) {
        return res.status(400).json({ success: false, message: 'Conversation non valide' });
      }
      const conversation = await messageService.getOrCreateConversation(req.user!.id, providerUserId, req.user!.id);
      if (!conversation) return res.status(500).json({ success: false, message: 'Impossible de créer la conversation' });
      res.json({
        success: true,
        data: {
          conversation_id: conversation.id,
          provider_user_id: providerUserId,
        },
      });
    } catch (error: any) {
      next(error);
    }
  },
);

// GET /api/services/admin/pending
router.get('/admin/pending', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const page = parseInt(String(req.query.page || '1'), 10) || 1;
    const limit = parseInt(String(req.query.limit || '50'), 10) || 50;
    const data = await serviceService.listPending(page, limit);
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/services/:id/approve
router.post('/:id/approve', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const data = await serviceService.approve(param(req, 'id'));
    res.json({ success: true, data, message: 'Service approuvé' });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/services/:id/reject
router.post('/:id/reject', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const data = await serviceService.reject(param(req, 'id'));
    res.json({ success: true, data, message: 'Service rejeté' });
  } catch (error: any) {
    next(error);
  }
});

export default router;
