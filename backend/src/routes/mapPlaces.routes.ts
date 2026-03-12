import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireRole.js';
import { mapPlacesService } from '../services/mapPlaces.service.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.latitude as string);
    const lng = parseFloat(req.query.longitude as string);
    const radiusKm = Math.min(parseFloat(req.query.radius_km as string) || 50, 200);
    const category = req.query.category as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ success: false, error: { message: 'latitude et longitude requis' } });
    }
    const result = await mapPlacesService.listNearby(lat, lng, radiusKm, category, limit);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { name, category, address, latitude, longitude, description, image_url } = req.body;
    if (!name || !category || latitude == null || longitude == null) {
      return res.status(400).json({ success: false, error: { message: 'name, category, latitude, longitude requis' } });
    }
    const place = await mapPlacesService.create({
      name,
      category,
      address,
      latitude: Number(latitude),
      longitude: Number(longitude),
      description,
      image_url,
    });
    res.status(201).json({ success: true, data: place });
  } catch (e) {
    next(e);
  }
});

export default router;
