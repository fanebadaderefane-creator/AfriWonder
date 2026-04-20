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

// GET /api/posts/:id/comments — liste des commentaires (racine uniquement)
router.get('/:id/comments', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(String(req.query.page), 10) || 1;
    const limit = Math.min(100, parseInt(String(req.query.limit), 10) || 50);
    const result = await postService.listPostComments(param(req, 'id'), req.user?.id, page, limit);
    if (!result) return res.status(404).json({ success: false, error: { message: 'Post non trouvé' } });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/posts/:id/comments — ajouter un commentaire (auth)
router.post('/:id/comments', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const content = String(req.body?.content ?? req.body?.text ?? '').trim();
    const parentId = req.body?.parent_id != null ? String(req.body.parent_id).trim() || null : null;
    const comment = await postService.addPostComment(param(req, 'id'), req.user!.id, content, parentId);
    res.status(201).json({ success: true, data: comment });
  } catch (error: any) {
    const code = error?.statusCode;
    if (code === 400) return res.status(400).json({ success: false, error: { message: error.message || 'Requête invalide' } });
    if (code === 404) return res.status(404).json({ success: false, error: { message: error.message || 'Non trouvé' } });
    next(error);
  }
});

// PATCH /api/posts/comments/:commentId — modifier son commentaire
router.patch('/comments/:commentId', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const content = String(req.body?.content ?? req.body?.text ?? '').trim();
    const comment = await postService.updatePostComment(param(req, 'commentId'), req.user!.id, content);
    res.json({ success: true, data: comment });
  } catch (error: any) {
    const code = error?.statusCode;
    if (code === 400) return res.status(400).json({ success: false, error: { message: error.message || 'Requête invalide' } });
    if (code === 403) return res.status(403).json({ success: false, error: { message: error.message || 'Interdit' } });
    if (code === 404) return res.status(404).json({ success: false, error: { message: error.message || 'Non trouvé' } });
    next(error);
  }
});

// DELETE /api/posts/comments/:commentId — supprimer son commentaire
router.delete('/comments/:commentId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await postService.deletePostComment(param(req, 'commentId'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    const code = error?.statusCode;
    if (code === 403) return res.status(403).json({ success: false, error: { message: error.message || 'Interdit' } });
    if (code === 404) return res.status(404).json({ success: false, error: { message: error.message || 'Non trouvé' } });
    next(error);
  }
});

// POST /api/posts/comments/:commentId/reaction — like / réaction (toggle)
router.post('/comments/:commentId/reaction', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const type = String(req.body?.type ?? 'like').trim() || 'like';
    const result = await postService.setPostCommentReaction(req.user!.id, param(req, 'commentId'), type);
    res.json({ success: true, data: result });
  } catch (error: any) {
    const code = error?.statusCode;
    if (code === 404) return res.status(404).json({ success: false, error: { message: error.message || 'Non trouvé' } });
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
