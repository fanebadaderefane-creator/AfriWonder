import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import storyService from '../services/story.service.js';

const router = Router();

// GET /api/stories
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { userIds } = req.query;
    const ids = userIds ? (userIds as string).split(',') : [req.user!.id];
    const stories = await storyService.getStories(ids);
    res.json({ success: true, data: stories });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/stories/user/:userId
router.get('/user/:userId', async (req, res, next) => {
  try {
    const stories = await storyService.getUserStories(param(req, 'userId'));
    res.json({ success: true, data: stories });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/stories
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { mediaUrl, mediaType, expiresInHours } = req.body;
    const story = await storyService.create(req.user!.id, {
      mediaUrl,
      mediaType,
      expiresInHours,
    });
    res.json({ success: true, data: story });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/stories/:id/view
router.post('/:id/view', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const story = await storyService.viewStory(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: story });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/stories/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await storyService.delete(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

export default router;

