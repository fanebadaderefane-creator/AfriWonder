import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import moderationService from '../services/moderation.service.js';
import * as moderationSanctions from '../services/moderationSanctions.service.js';

const router = Router();

// GET /api/moderation/reports
router.get('/reports', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status as string;
    if (req.query.severity) filters.severity = req.query.severity as string;
    if (req.query.contentType) filters.contentType = req.query.contentType as string;
    const result = await moderationService.listReports(page, limit, filters);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/moderation/report
router.post('/report', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { contentType, contentId, reason, description, evidence, severity } = req.body;
    const report = await moderationService.createReport(req.user!.id, {
      contentType,
      contentId,
      reason,
      description,
      evidence,
      severity,
    });
    res.json({ success: true, data: report });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/moderation/reports/:id/review
router.put('/reports/:id/review', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (req.user!.role !== 'admin' && req.user!.role !== 'moderator') {
      return res.status(403).json({ success: false, error: 'Moderator access required' });
    }
    const { status, notes } = req.body;
    const report = await moderationService.reviewReport(param(req, 'id'), req.user!.id, {
      status,
      notes,
    });
    res.json({ success: true, data: report });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/moderation/strikes - CDC: Ajouter un strike (admin/mod)
router.post('/strikes', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (req.user!.role !== 'admin' && req.user!.role !== 'moderator') {
      return res.status(403).json({ success: false, error: 'Moderator access required' });
    }
    const { userId, infraction, reason, contextType, contextId } = req.body;
    if (!userId || !infraction || !reason) {
      return res.status(400).json({ success: false, error: 'userId, infraction, reason requis' });
    }
    const result = await moderationSanctions.addStrike(userId, {
      infraction,
      reason,
      contextType,
      contextId,
      issuedBy: req.user!.id,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/moderation/strikes/:userId
router.get('/strikes/:userId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (req.user!.role !== 'admin' && req.user!.role !== 'moderator') {
      return res.status(403).json({ success: false, error: 'Moderator access required' });
    }
    const strikes = await moderationSanctions.getStrikes(param(req, 'userId'));
    const count = await moderationSanctions.getStrikesCount(param(req, 'userId'));
    res.json({ success: true, data: { strikes, count } });
  } catch (error: any) {
    next(error);
  }
});

export default router;

