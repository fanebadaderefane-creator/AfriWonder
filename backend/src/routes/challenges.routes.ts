import { Router } from 'express';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import challengeService from '../services/challenge.service.js';
import * as videoChallengeService from '../services/videoChallenge.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';
import { z } from 'zod';

const router = Router();

const viralChallengeCreateSchema = z.object({
  hashtag: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  sponsor_brand: z.string().max(120).optional(),
  is_sponsored: z.boolean().optional(),
  revenue_share_note: z.string().max(500).optional(),
});

const viralJoinBodySchema = z.object({
  video_id: z.string().min(1).max(64),
});

// Phase 23 — challenges « hashtag » (séparés des challenges payants historiques)
router.get('/viral/trending', optionalAuth, async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '15'), 10)));
    const data = await videoChallengeService.listTrendingChallenges(limit);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/viral', authenticate, validateBody(viralChallengeCreateSchema), async (req: AuthRequest, res, next) => {
  try {
    const ch = await videoChallengeService.createChallenge(req.user!.id, req.body);
    res.status(201).json({ success: true, data: ch });
  } catch (error) {
    next(error);
  }
});

router.post('/viral/:hashtag/join', authenticate, validateBody(viralJoinBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const hashtag = param(req, 'hashtag');
    const data = await videoChallengeService.participateVideoInChallenge(req.user!.id, hashtag, req.body.video_id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/viral/:id/leaderboard', optionalAuth, async (req, res, next) => {
  try {
    const id = param(req, 'id');
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const data = await videoChallengeService.getChallengeLeaderboard(id, limit);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// GET /api/challenges - Liste des challenges
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await challengeService.list(page, limit, { status, search });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/challenges - Créer un challenge
router.post('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { title, description, startDate, endDate, prize } = req.body;

    const challenge = await challengeService.create(userId, {
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      prize,
    });

    res.status(201).json({
      success: true,
      data: challenge,
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/challenges/:id/participate - Participer à un challenge (payant)
router.post('/:id/participate', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const challengeId = param(req, 'id');
    const userId = req.user!.id;
    const { phone, participationFee } = req.body;

    if (!phone || !participationFee) {
      return res.status(400).json({
        success: false,
        error: { message: 'phone et participationFee requis' },
      });
    }

    const result = await challengeService.participate(challengeId, userId, {
      phone,
      participationFee,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Participation créée. Redirigez vers paymentUrl pour compléter le paiement.',
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/challenges/participations/:id/confirm - Confirmer participation (webhook)
router.post('/participations/:id/confirm', validateBody(jsonObjectBodySchema), async (req, res, next) => {
  try {
    const transactionId = param(req, 'id');
    const result = await challengeService.confirmParticipation(transactionId);

    res.json({
      success: true,
      data: result,
      message: 'Participation confirmée',
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
