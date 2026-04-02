/**
 * Routes API pour les avis sur les services
 */
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import serviceReviewService from '../services/service-review.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// POST /api/service-reviews - Créer avis
router.post('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { booking_id, rating, title, content, photos } = req.body;

    if (!booking_id || !rating || !content) {
      return res.status(400).json({
        success: false,
        message: 'booking_id, rating et content sont requis',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'La note doit être entre 1 et 5',
      });
    }

    const review = await serviceReviewService.createReview(booking_id, req.user!.id, {
      rating,
      title,
      content,
      photos,
    });

    res.status(201).json({ success: true, data: review });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/services/:id/reviews - Avis d'un service
router.get('/services/:id/reviews', async (req, res, next) => {
  try {
    const serviceId = param(req, 'id');
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const min_rating = req.query.min_rating ? parseInt(req.query.min_rating as string) : undefined;

    const result = await serviceReviewService.getServiceReviews(serviceId, {
      page,
      limit,
      min_rating,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/providers/:id/reviews - Avis d'un prestataire
router.get('/providers/:id/reviews', async (req, res, next) => {
  try {
    const providerId = param(req, 'id');
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const min_rating = req.query.min_rating ? parseInt(req.query.min_rating as string) : undefined;

    const result = await serviceReviewService.getProviderReviews(providerId, {
      page,
      limit,
      min_rating,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/service-reviews/:id/report - Signaler avis
router.post('/:id/report', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'reason est requis',
      });
    }

    const result = await serviceReviewService.reportReview(param(req, 'id'), req.user!.id, reason);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

export default router;
