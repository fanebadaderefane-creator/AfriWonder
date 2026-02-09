import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import communityService from '../services/community.service.js';

const router = Router();

// GET /api/communities
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const filters: any = {};
    if (req.query.category) filters.category = req.query.category as string;
    if (req.query.isPrivate !== undefined) filters.isPrivate = req.query.isPrivate === 'true';
    if (req.query.search) filters.search = req.query.search as string;
    const result = await communityService.list(page, limit, filters);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/communities/:id
router.get('/:id', async (req, res, next) => {
  try {
    const community = await communityService.getById(param(req, 'id'));
    res.json({ success: true, data: community });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/communities
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
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
router.post('/:id/join', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const member = await communityService.join(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: member });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/communities/:id/leave
router.post('/:id/leave', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await communityService.leave(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

export default router;

