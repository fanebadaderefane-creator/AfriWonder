import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import serviceService from '../services/service.service.js';
import providerService from '../services/provider.service.js';

const router = Router();

// GET /api/services
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const filters: any = {};
    if (req.query.category) filters.category = req.query.category as string;
    if (req.query.isAvailable !== undefined) filters.isAvailable = req.query.isAvailable === 'true';
    if (req.query.search) filters.search = req.query.search as string;
    const result = await serviceService.list(page, limit, filters);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/services
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Récupérer le provider_id depuis l'utilisateur
    const provider = await providerService.getProviderByUserId(req.user!.id);
    if (!provider) {
      return res.status(403).json({
        success: false,
        message: 'Vous devez être un prestataire pour créer un service',
      });
    }

    const { title, description, price, currency, duration, category, category_id, location, location_type, travel_fee } = req.body;

    if (!title || !description || !price) {
      return res.status(400).json({
        success: false,
        message: 'title, description et price sont requis',
      });
    }

    const service = await serviceService.create(provider.id, {
      title,
      description,
      price,
      currency,
      duration,
      category,
      category_id,
      location,
      location_type,
      travel_fee,
    });
    res.status(201).json({ success: true, data: service });
  } catch (error: any) {
    next(error);
  }
});

export default router;

