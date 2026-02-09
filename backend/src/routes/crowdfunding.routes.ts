import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import crowdfundingService from '../services/crowdfunding.service.js';

const router = Router();

// GET /api/crowdfunding - Liste des campagnes
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await crowdfundingService.list(page, limit, { status, search });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/crowdfunding/:id - Détails d'une campagne
router.get('/:id', async (req, res, next) => {
  try {
    const campaignId = param(req, 'id');
    const campaign = await crowdfundingService.getById(campaignId);

    res.json({
      success: true,
      data: campaign,
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/crowdfunding - Créer une campagne
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { title, description, goalAmount, endDate } = req.body;

    const campaign = await crowdfundingService.create(userId, {
      title,
      description,
      goalAmount,
      endDate: new Date(endDate),
    });

    res.status(201).json({
      success: true,
      data: campaign,
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/crowdfunding/:id/contribute - Contribuer à une campagne
router.post('/:id/contribute', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const campaignId = param(req, 'id');
    const userId = req.user!.id;
    const { amount, phone, rewardTier } = req.body;

    if (!amount || !phone) {
      return res.status(400).json({
        success: false,
        error: { message: 'amount et phone requis' },
      });
    }

    const result = await crowdfundingService.contribute(campaignId, userId, {
      amount,
      phone,
      rewardTier,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Contribution créée. Redirigez vers paymentUrl pour compléter le paiement.',
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/crowdfunding/contributions/:id/confirm - Confirmer une contribution (webhook)
router.post('/contributions/:id/confirm', async (req, res, next) => {
  try {
    const contributionId = param(req, 'id');
    const contribution = await crowdfundingService.confirmContribution(contributionId);

    res.json({
      success: true,
      data: contribution,
      message: 'Contribution confirmée',
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/crowdfunding/:id/release-milestone - Libérer un milestone (créateur ou admin)
router.post('/:id/release-milestone', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const campaignId = param(req, 'id');
    const milestoneIndex = parseInt(req.body.milestoneIndex ?? req.body.milestone_index ?? '0', 10);
    const result = await crowdfundingService.releaseMilestone(campaignId, milestoneIndex);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/crowdfunding/:id/report - Signaler une campagne
router.post('/:id/report', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const campaignId = param(req, 'id');
    const userId = req.user!.id;
    const result = await crowdfundingService.reportCampaign(campaignId, userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

export default router;
