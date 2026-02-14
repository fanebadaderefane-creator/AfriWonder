import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { requireAnyAdmin } from '../middleware/adminRbac.js';
import { logger } from '../utils/logger.js';

const router = Router();

const VALID_TYPES = ['bug', 'suggestion', 'comment'];

// POST /api/platform-feedback — Public, envoyer un feedback
router.post('/', async (req, res, next) => {
  try {
    const { type, content, email, join_whatsapp, join_mailing } = req.body;
    const t = (type || 'comment').toLowerCase();
    if (!VALID_TYPES.includes(t)) {
      return res.status(400).json({
        success: false,
        message: 'Type invalide. Utilisez: bug, suggestion, ou comment',
      });
    }
    if (!content || typeof content !== 'string' || content.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Le contenu doit faire au moins 3 caractères',
      });
    }
    const feedback = await prisma.platformFeedback.create({
      data: {
        type: t,
        content: content.trim().slice(0, 5000),
        email: email?.trim() || null,
        join_whatsapp: !!join_whatsapp,
        join_mailing: !!join_mailing,
      },
    });
    logger.info('Platform feedback', { id: feedback.id, type: t });
    res.status(201).json({
      success: true,
      data: { id: feedback.id, message: 'Merci pour votre retour !' },
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/platform-feedback — Admin, liste des feedbacks
router.get('/', authenticate, requireAnyAdmin, async (req, res, next) => {
  try {
    const feedbacks = await prisma.platformFeedback.findMany({
      orderBy: { created_at: 'desc' },
      take: 500,
    });
    res.json({ success: true, data: feedbacks });
  } catch (error: any) {
    next(error);
  }
});

export default router;
