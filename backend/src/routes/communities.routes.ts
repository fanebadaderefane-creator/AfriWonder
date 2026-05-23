import { Router } from 'express';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import communityService from '../services/community.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// GET /api/communities — avec Bearer : chaque entrée inclut is_member (sinon liste inchangée)
router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const filters: any = {};
    if (req.query.category) filters.category = req.query.category as string;
    if (req.query.isPrivate !== undefined) filters.isPrivate = req.query.isPrivate === 'true';
    if (req.query.search) filters.search = req.query.search as string;
    const forUserId = req.user?.id ?? null;
    const result = await communityService.list(page, limit, filters, forUserId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/communities/:id — avec Bearer : inclut is_member
router.get('/:id', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const community = await communityService.getById(param(req, 'id'), req.user?.id ?? null);
    res.json({ success: true, data: community });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/communities
router.post('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { name, description, avatar, banner, category, isPrivate } = req.body;
    const community = await communityService.create(req.user!.id, {
      name,
      description,
      avatar,
      banner,
      category,
      isPrivate,
    });
    res.status(201).json({ success: true, data: community });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/communities/:id/join
router.post('/:id/join', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const member = await communityService.join(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: member });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/communities/:id/leave
router.post('/:id/leave', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await communityService.leave(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

export default router;

