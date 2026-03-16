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

// CPO 2.19 — Réactions
router.post('/:id/reactions', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { emoji } = req.body;
    const reaction = await storyService.addReaction(param(req, 'id'), req.user!.id, emoji ?? '❤️');
    res.json({ success: true, data: reaction });
  } catch (error: any) {
    next(error);
  }
});

router.delete('/:id/reactions', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await storyService.removeReaction(param(req, 'id'), req.user!.id);
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

router.get('/:id/reactions', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const reactions = await storyService.getReactions(param(req, 'id'));
    res.json({ success: true, data: reactions });
  } catch (error: any) {
    next(error);
  }
});

// CPO 2.21 — Sondages
router.post('/polls/:pollId/vote', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { optionIndex } = req.body;
    const vote = await storyService.votePoll(param(req, 'pollId'), req.user!.id, Number(optionIndex));
    res.json({ success: true, data: vote });
  } catch (error: any) {
    next(error);
  }
});

router.get('/polls/:pollId/results', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const results = await storyService.getPollResults(param(req, 'pollId'));
    res.json({ success: true, data: results });
  } catch (error: any) {
    next(error);
  }
});

export default router;

