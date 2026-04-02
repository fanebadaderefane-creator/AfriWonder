import { Router } from 'express';
import { authenticate, AuthRequest, optionalAuth } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import * as postService from '../services/post.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// POST /api/posts - Créer un post (texte / image ; programmation, épingler, sondage optionnels)
router.post('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { text, image_url, images, visibility, scheduled_at, is_pinned, poll } = req.body;
    const post = await postService.createPost(req.user!.id, { text, image_url, images, visibility, scheduled_at, is_pinned, poll });
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
});

// GET /api/posts - Liste des posts (feed ou par user ; includeScheduled=true pour voir ses posts programmés)
router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.query.userId as string | undefined;
    const visibility = req.query.visibility as string | undefined;
    const page = parseInt(String(req.query.page), 10) || 1;
    const limit = Math.min(50, parseInt(String(req.query.limit), 10) || 20);
    const includeScheduled = req.query.includeScheduled === 'true' && !!req.user?.id && userId === req.user.id;
    const result = await postService.listPosts({
      userId,
      viewerId: req.user?.id,
      visibility,
      page,
      limit,
      ...(includeScheduled ? { includeScheduled: true } : {}),
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/posts/archived - Mes archives (posts)
router.get('/archived', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(String(req.query.page), 10) || 1;
    const limit = parseInt(String(req.query.limit), 10) || 20;
    const result = await postService.listArchivedPosts(req.user!.id, page, limit);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/posts/polls/:pollId/vote — body: { option_index: number }
router.post('/polls/:pollId/vote', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const pollId = param(req, 'pollId');
    const optionIndex = parseInt(String(req.body?.option_index), 10);
    if (Number.isNaN(optionIndex) || optionIndex < 0) {
      return res.status(400).json({ success: false, error: { message: 'option_index requis (entier >= 0)' } });
    }
    const result = await postService.votePoll(pollId, req.user!.id, optionIndex);
    if (!result) return res.status(404).json({ success: false, error: { message: 'Sondage non trouvé ou terminé' } });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/posts/:id - Détail d'un post
router.get('/:id', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const post = await postService.getPostById(param(req, 'id'), req.user?.id);
    if (!post) return res.status(404).json({ success: false, error: { message: 'Post non trouvé' } });
    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
});

// PUT /api/posts/:id - Modifier son post (scheduled_at, is_pinned optionnels)
router.put('/:id', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { text, image_url, images, visibility, scheduled_at, is_pinned } = req.body;
    const post = await postService.updatePost(param(req, 'id'), req.user!.id, { text, image_url, images, visibility, scheduled_at, is_pinned });
    if (!post) return res.status(404).json({ success: false, error: { message: 'Post non trouvé' } });
    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/posts/:id - Supprimer son post
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const ok = await postService.deletePost(param(req, 'id'), req.user!.id);
    if (!ok) return res.status(404).json({ success: false, error: { message: 'Post non trouvé' } });
    res.json({ success: true, message: 'Post supprimé' });
  } catch (error) {
    next(error);
  }
});

export default router;
