import { Router } from 'express';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import { videoService } from '../services/video.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/videos - Liste des vidéos
router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { page = '1', limit, category, visibility = 'public', creator_id: creatorId, hashtag, search } = req.query;
    const userId = req.user?.id;
    const limitValue = limit ? parseInt(limit as string) : 0;

    const videos = await videoService.list({
      page: parseInt(page as string),
      limit: limitValue,
      category: category as string,
      visibility: visibility as string,
      userId,
      creator_id: creatorId as string,
      hashtag: hashtag as string,
      search: search as string,
    });

    res.json({
      success: true,
      data: videos,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/videos/category/:id - Vidéos par catégorie (avant :id pour éviter conflit)
router.get('/category/:id', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const categoryId = param(req, 'id');
    const { page = '1', limit = '20' } = req.query;
    const userId = req.user?.id;

    const videos = await videoService.list({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      category_id: categoryId,
      visibility: 'public',
      userId,
    });

    res.json({
      success: true,
      data: videos,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/videos/hashtag/:tag - Vidéos par hashtag (avant :id pour éviter conflit)
router.get('/hashtag/:tag', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const tag = param(req, 'tag');
    const { page = '1', limit = '20' } = req.query;
    const userId = req.user?.id;

    const videos = await videoService.list({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      hashtag: tag,
      visibility: 'public',
      userId,
    });

    res.json({
      success: true,
      data: videos,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/videos/:id/view - Enregistrer une vue (≥3s ou ≥25%, 1/30min/user)
router.post('/:id/view', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user?.id;
    const { watchSeconds, watchPercent, deviceId, scrollSlow, interactionDetected } = req.body || {};
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || (req.socket as any)?.remoteAddress;

    const result = await videoService.recordView(id, {
      userId,
      deviceId,
      watchSeconds,
      watchPercent,
      scrollSlow,
      interactionDetected,
      ip,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// GET /api/videos/:id - Détails d'une vidéo
router.get('/:id', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user?.id;

    const video = await videoService.getById(id, userId);

    if (!video) {
      return res.status(404).json({
        success: false,
        error: { message: 'Vidéo non trouvée' },
      });
    }

    res.json({
      success: true,
      data: video,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/videos - Créer une vidéo
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const videoData = {
      ...req.body,
      creator_id: req.user!.id,
    };

    const video = await videoService.create(videoData);

    res.status(201).json({
      success: true,
      data: video,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/videos/:id - Modifier une vidéo
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;

    const video = await videoService.update(id, req.body, userId);

    res.json({
      success: true,
      data: video,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/videos/:id - Supprimer une vidéo
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;

    await videoService.delete(id, userId);

    res.json({
      success: true,
      message: 'Vidéo supprimée',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/videos/:id/like - Liker une vidéo
router.post('/:id/like', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;

    const result = await videoService.toggleLike(id, userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/videos/:id/comment - Commenter une vidéo
router.post('/:id/comment', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const { content, parent_id } = req.body;

    const comment = await videoService.addComment(id, userId, content, parent_id);

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/videos/:id/comments - Liste des commentaires
router.get('/:id/comments', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const { page = '1', limit = '50' } = req.query;

    const comments = await videoService.getComments(id, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.json({
      success: true,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/videos/:id/tip - Faire un tip/don pour une vidéo (Orange Money)
router.post('/:id/tip', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const { amount, phone, message } = req.body;

    if (!amount || amount < 50) {
      return res.status(400).json({
        success: false,
        error: { message: 'Le montant minimum est de 50 FCFA' },
      });
    }

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: { message: 'Le numéro de téléphone est requis pour Orange Money' },
      });
    }

    const videoTipService = (await import('../services/videoTip.service.js')).default;
    const result = await videoTipService.createTip(userId, id, {
      amount,
      phone,
      message,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/videos/:id/tip-wallet - Tip avec le wallet (débit immédiat)
router.post('/:id/tip-wallet', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const { amount, message } = req.body;

    if (!amount || amount < 50) {
      return res.status(400).json({
        success: false,
        error: { message: 'Le montant minimum est de 50 FCFA' },
      });
    }

    const videoTipService = (await import('../services/videoTip.service.js')).default;
    const result = await videoTipService.createTipWithWallet(userId, id, { amount, message });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/videos/:id/tips - Liste des tips d'une vidéo
router.get('/:id/tips', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const { page = '1', limit = '20' } = req.query;

    const videoTipService = (await import('../services/videoTip.service.js')).default;
    const result = await videoTipService.getVideoTips(id, parseInt(page as string), parseInt(limit as string));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/videos/:id/share - Incrémenter le compteur de partages
router.post('/:id/share', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');

    await videoService.incrementShare(id);

    res.json({
      success: true,
      message: 'Partage enregistré',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

