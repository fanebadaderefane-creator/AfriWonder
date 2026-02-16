/**
 * CDC Phase 1 - Support créateur via wallet
 */
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import creatorSupportService from '../services/creatorSupport.service.js';

const router = Router();

// POST /api/creator-support/:creatorId - Soutenir un créateur avec le wallet
router.post('/:creatorId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const supporterId = req.user!.id;
    const raw = req.params.creatorId;
    const creatorId: string = Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
    const { amount_fcfa, message } = req.body;

    if (!amount_fcfa || amount_fcfa < 50) {
      return res.status(400).json({
        success: false,
        error: { message: 'Le montant minimum est de 50 FCFA' },
      });
    }

    const support = await creatorSupportService.supportCreator(supporterId, creatorId, {
      amount_fcfa,
      message,
    });

    res.status(201).json({
      success: true,
      data: support,
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/creator-support/:creatorId/stats - Stats support d'un créateur (pour le créateur lui-même)
router.get('/:creatorId/stats', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const raw = req.params.creatorId;
    const creatorId: string = Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
    const userId = req.user!.id;

    if (creatorId !== userId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Non autorisé' },
      });
    }

    const stats = await creatorSupportService.getCreatorSupportStats(creatorId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
