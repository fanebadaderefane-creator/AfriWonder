import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAnyAdmin } from '../middleware/adminRbac.js';
import { logger } from '../utils/logger.js';
import * as earlyAccessService from '../services/earlyAccess.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

const EARLY_ACCESS_FALLBACK = {
  maxUsers: 10000,
  totalUsers: 0,
  isFull: false,
  spotsLeft: 10000,
  monetizedCreators: 0,
  maxMonetizedCreators: 50,
};

// GET /api/early-access/config — Public, stats Early Access (ne jamais renvoyer 500)
router.get('/config', async (_req, res) => {
  try {
    const config = await earlyAccessService.getEarlyAccessConfig();
    return res.json({ success: true, data: config });
  } catch (error: unknown) {
    logger.warn('Early access config error', { err: error instanceof Error ? error.message : String(error) });
    return res.json({ success: true, data: EARLY_ACCESS_FALLBACK });
  }
});

// POST /api/early-access/waitlist — Public, rejoindre la liste d'attente
router.post('/waitlist', validateBody(jsonObjectBodySchema), async (req, res, next) => {
  try {
    const { email, full_name } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Email requis' });
    }
    const result = await earlyAccessService.joinWaitlist(email.trim(), full_name?.trim());
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/early-access/max-users — Admin only
router.put('/max-users', authenticate, requireAnyAdmin, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const max = parseInt(req.body.maxUsers ?? req.body.max_users, 10);
    if (isNaN(max) || max < 1) {
      return res.status(400).json({ success: false, message: 'maxUsers doit être un nombre positif' });
    }
    const result = await earlyAccessService.setMaxUsers(max, req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/early-access/max-monetized — Admin only
router.put('/max-monetized', authenticate, requireAnyAdmin, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const max = parseInt(req.body.maxMonetizedCreators ?? req.body.max_monetized_creators, 10);
    if (isNaN(max) || max < 1) {
      return res.status(400).json({ success: false, message: 'maxMonetizedCreators doit être un nombre positif' });
    }
    const result = await earlyAccessService.setMaxMonetizedCreators(max, req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/early-access/waitlist — Admin, liste des inscrits
router.get('/waitlist', authenticate, requireAnyAdmin, async (_req, res, next) => {
  try {
    const list = await prisma.earlyAccessWaitlist.findMany({
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: list });
  } catch (error: any) {
    next(error);
  }
});

export default router;
