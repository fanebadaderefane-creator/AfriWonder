/**
 * Routes API pour les disponibilités des prestataires (Services Locaux)
 */
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import availabilityService from '../services/availability.service.js';
import providerService from '../services/provider.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// GET /api/providers/:id/availability - Récupérer les disponibilités
router.get('/providers/:id/availability', async (req, res, next) => {
  try {
    const providerId = param(req, 'id');
    const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
    const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;

    const availability = await availabilityService.getAvailability(providerId, startDate, endDate);
    res.json({ success: true, data: availability });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/providers/:id/availability - Définir les disponibilités (prestataire)
router.put('/providers/:id/availability', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const provider = await providerService.getProviderByUserId(req.user!.id);
    if (!provider || provider.id !== param(req, 'id')) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    const { availabilities } = req.body;
    if (!Array.isArray(availabilities)) {
      return res.status(400).json({
        success: false,
        message: 'availabilities doit être un tableau',
      });
    }

    const result = await availabilityService.setAvailability(param(req, 'id'), availabilities);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/providers/:id/unavailability - Ajouter une indisponibilité (prestataire)
router.post('/providers/:id/unavailability', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const provider = await providerService.getProviderByUserId(req.user!.id);
    if (!provider || provider.id !== param(req, 'id')) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    const { start_date, end_date, reason, notes } = req.body;
    if (!start_date || !end_date || !reason) {
      return res.status(400).json({
        success: false,
        message: 'start_date, end_date et reason sont requis',
      });
    }

    const unavailability = await availabilityService.addUnavailability(param(req, 'id'), {
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      reason,
      notes,
    });
    res.status(201).json({ success: true, data: unavailability });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/providers/:id/available-slots - Créneaux disponibles pour une date
router.get('/providers/:id/available-slots', async (req, res, next) => {
  try {
    const providerId = param(req, 'id');
    const dateParam = req.query.date as string;
    const duration = parseInt(req.query.duration as string) || 60;

    if (!dateParam) {
      return res.status(400).json({
        success: false,
        message: 'Paramètre date requis (YYYY-MM-DD)',
      });
    }

    const date = new Date(dateParam);
    const slots = await availabilityService.getAvailableSlots(providerId, date, duration);
    res.json({ success: true, data: slots });
  } catch (error: any) {
    next(error);
  }
});

export default router;
