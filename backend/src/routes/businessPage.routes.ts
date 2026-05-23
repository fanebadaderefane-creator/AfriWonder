import { Router } from 'express';
import { authenticate, AuthRequest, optionalAuth } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import * as businessPageService from '../services/businessPage.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// PUT /api/business-page - Créer ou mettre à jour ma page entreprise
router.put('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { name, slug, description, avatar_url, cover_url, website, phone } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: { message: 'name requis' } });
    const page = await businessPageService.createOrUpdateBusinessPage(req.user!.id, {
      name,
      slug,
      description,
      avatar_url,
      cover_url,
      website,
      phone,
    });
    res.json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
});

// GET /api/business-page/me - Ma page entreprise
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = await businessPageService.getByUserId(req.user!.id);
    if (!page) return res.status(404).json({ success: false, error: { message: 'Page non trouvée' } });
    res.json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
});

// GET /api/business-page/slug/:slug - Page par slug (public)
router.get('/slug/:slug', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const page = await businessPageService.getBySlug(param(req, 'slug'));
    if (!page) return res.status(404).json({ success: false, error: { message: 'Page non trouvée' } });
    res.json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
});

export default router;
