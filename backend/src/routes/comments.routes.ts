import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import { videoService } from '../services/video.service.js';

const router = Router();

// PUT /api/comments/:id - Modifier son propre commentaire
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const { content } = req.body;

    const comment = await videoService.updateComment(id, userId, { content });

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
