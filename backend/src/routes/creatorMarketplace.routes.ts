/**
 * Phase 9 — Marketplace influence : media kit + recherche créateurs pour marques.
 */
import { Router } from 'express';
import { getCreatorMediaKit, searchCreatorsForBrands } from '../services/creatorMediaKit.service.js';

const router = Router();

// GET /api/creator-marketplace/creators — recherche (marques / partenaires)
router.get('/creators', async (req, res, next) => {
  try {
    const min_followers = req.query.min_followers != null ? Number(req.query.min_followers) : undefined;
    const country = typeof req.query.country === 'string' ? req.query.country : undefined;
    const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
    const data = await searchCreatorsForBrands({
      min_followers: Number.isFinite(min_followers!) ? min_followers : 0,
      country,
      limit: Number.isFinite(limit!) ? limit : 40,
    });
    res.json({ success: true, data: { creators: data } });
  } catch (e) {
    next(e);
  }
});

// GET /api/creator-marketplace/creators/:creatorId/media-kit
router.get('/creators/:creatorId/media-kit', async (req, res, next) => {
  try {
    const data = await getCreatorMediaKit(req.params.creatorId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

export default router;
