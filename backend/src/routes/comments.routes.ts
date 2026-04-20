import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import { videoService } from '../services/video.service.js';
import { validateBody } from '../utils/zodValidation.js';
import { commentContentPatchSchema, commentReactionBodySchema } from '../schemas/videosCommentsAdmin.schemas.js';
import * as commentReactionService from '../services/commentReaction.service.js';

const router = Router();

// POST /api/comments/:id/reaction — Réaction (toggle si même type)
router.post('/:id/reaction', authenticate, validateBody(commentReactionBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const result = await commentReactionService.setCommentReaction(req.user!.id, id, req.body.type ?? 'like');
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// PUT /api/comments/:id - Modifier son propre commentaire
router.put('/:id', authenticate, validateBody(commentContentPatchSchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const { content, is_pinned } = req.body || {};

    const comment = await videoService.updateComment(id, userId, { content, is_pinned });

    res.json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/comments/:id - Supprimer son propre commentaire
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;

    await videoService.deleteComment(id, userId);

    res.json({
      success: true,
      message: 'Commentaire supprimé',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
