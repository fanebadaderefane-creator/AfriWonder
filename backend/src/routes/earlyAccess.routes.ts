import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAnyAdmin } from '../middleware/adminRbac.js';
import * as earlyAccessService from '../services/earlyAccess.service.js';

const router = Router();

// GET /api/early-access/config — Public, stats Early Access
router.get('/config', async (_req, res, next) => {
  try {
    const config = await earlyAccessService.getEarlyAccessConfig();
    res.json({ success: true, data: config });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/early-access/waitlist — Public, rejoindre la liste d'attente
router.post('/waitlist', async (req, res, next) => {
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
router.put('/max-users', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
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
