import { NextFunction, Request, Response, Router } from 'express';
import { authenticate, AuthRequest, optionalAuth } from '../middleware/auth.js';
import { param, isUuidLike } from '../utils/params.js';
import crowdfundingService from '../services/crowdfunding.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';
import { requireAdmin } from '../middleware/requireRole.js';
import { requireAnyAdmin } from '../middleware/adminRbac.js';

const router = Router();

const assertCampaignId = (req: Request, res: Response, next: NextFunction) => {
  const id = param(req, 'id');
  if (!isUuidLike(id)) {
    return res.status(404).json({ success: false, error: { message: 'Campagne introuvable' } });
  }
  next();
};

// GET /api/crowdfunding - Liste des campagnes
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;

    const result = await crowdfundingService.list(page, limit, { status, search, category });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/crowdfunding/me/recent-contributors — derniers soutiens sur mes campagnes (créateur)
router.get('/me/recent-contributors', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 40, 100);
    const result = await crowdfundingService.listRecentContributorsForCreator(userId, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/crowdfunding/me/campaigns — mes campagnes (porteur)
router.get('/me/campaigns', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const result = await crowdfundingService.listMyCampaigns(userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/crowdfunding/me/contributions — mes contributions (investisseur)
router.get('/me/contributions', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const result = await crowdfundingService.listMyContributions(userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/crowdfunding/me/portfolio — synthèse investisseur
router.get('/me/portfolio', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await crowdfundingService.getInvestorPortfolio(req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/crowdfunding/:id/updates — fil d'actus (visibilité = détail campagne)
router.get('/:id/updates', optionalAuth, assertCampaignId, async (req: AuthRequest, res, next) => {
  try {
    const campaignId = param(req, 'id');
    const viewer = req.user ? { userId: req.user.id, role: req.user.role } : undefined;
    const result = await crowdfundingService.listCampaignUpdates(campaignId, viewer);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/crowdfunding/:id/updates — publier une actu (porteur / admin)
router.post('/:id/updates', authenticate, assertCampaignId, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const campaignId = param(req, 'id');
    const result = await crowdfundingService.postCampaignUpdate(campaignId, req.user!.id, req.user!.role, {
      title: String(req.body.title ?? ''),
      content: String(req.body.content ?? ''),
      imageUrl: req.body.imageUrl ?? req.body.image_url,
    });
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/crowdfunding/:id/messages — discussion (commentaires)
router.get('/:id/messages', optionalAuth, assertCampaignId, async (req: AuthRequest, res, next) => {
  try {
    const campaignId = param(req, 'id');
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 30, 50);
    const viewer = req.user ? { userId: req.user.id, role: req.user.role } : undefined;
    const result = await crowdfundingService.listCampaignComments(campaignId, page, limit, viewer);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/crowdfunding/:id/messages — publier (campagne active)
router.post('/:id/messages', authenticate, assertCampaignId, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const campaignId = param(req, 'id');
    const result = await crowdfundingService.postCampaignComment(campaignId, req.user!.id, {
      content: String(req.body.content ?? ''),
      parentId: req.body.parentId ?? req.body.parent_id,
    });
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/crowdfunding/:id/contributions — soutiens confirmés (public)
router.get('/:id/contributions', assertCampaignId, async (req, res, next) => {
  try {
    const campaignId = param(req, 'id');
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 50);
    const result = await crowdfundingService.listCampaignContributions(campaignId, page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/crowdfunding/:id - Détails d'une campagne (auth optionnelle pour campagnes pending)
router.get('/:id', optionalAuth, assertCampaignId, async (req: AuthRequest, res, next) => {
  try {
    const campaignId = param(req, 'id');
    const viewer = req.user ? { userId: req.user.id, role: req.user.role } : undefined;
    const campaign = await crowdfundingService.getById(campaignId, viewer);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campagne introuvable' },
      });
    }

    res.json({
      success: true,
      data: campaign,
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/crowdfunding - Créer une campagne
router.post('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const {
      title,
      description,
      goalAmount,
      endDate,
      category,
      coverImage,
      cover_image,
      rewards,
    } = req.body;

    const campaign = await crowdfundingService.create(userId, {
      title,
      description,
      goalAmount: Number(goalAmount),
      endDate: new Date(endDate),
      category: typeof category === 'string' ? category : undefined,
      coverImage: typeof coverImage === 'string' ? coverImage : typeof cover_image === 'string' ? cover_image : undefined,
      rewards: Array.isArray(rewards) ? rewards : undefined,
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
router.post('/:id/contribute', authenticate, assertCampaignId, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
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
router.post('/contributions/:id/confirm', validateBody(jsonObjectBodySchema), async (req, res, next) => {
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
router.post('/:id/release-milestone', authenticate, assertCampaignId, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const campaignId = param(req, 'id');
    const milestoneIndex = parseInt(req.body.milestoneIndex ?? req.body.milestone_index ?? '0', 10);
    const result = await crowdfundingService.releaseMilestone(
      campaignId,
      milestoneIndex,
      req.user!.id,
      req.user!.role,
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/crowdfunding/:id/release-escrow - Libérer tout l'escrow vers le porteur (objectif atteint)
router.post('/:id/release-escrow', authenticate, assertCampaignId, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const campaignId = param(req, 'id');
    const result = await crowdfundingService.releaseEscrowToCreator(campaignId, req.user!.id, req.user!.role);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/crowdfunding/:id/refund-if-failed - Rembourser si date passée et objectif non atteint
router.post('/:id/refund-if-failed', authenticate, assertCampaignId, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const campaignId = param(req, 'id');
    const result = await crowdfundingService.refundCampaignIfFailed(campaignId, {
      userId: req.user!.id,
      role: req.user!.role,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/crowdfunding/:id/approve — modération (super-admin email + rôle)
router.post('/:id/approve', authenticate, assertCampaignId, requireAnyAdmin, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const campaignId = param(req, 'id');
    const result = await crowdfundingService.approveCampaignAdmin(campaignId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/crowdfunding/:id/reject — refus brouillon soumis
router.post('/:id/reject', authenticate, assertCampaignId, requireAnyAdmin, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const campaignId = param(req, 'id');
    const result = await crowdfundingService.rejectCampaignAdmin(campaignId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/crowdfunding/:id/suspend — admin (modération)
router.post('/:id/suspend', authenticate, assertCampaignId, requireAdmin, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const campaignId = param(req, 'id');
    const reason = String(req.body.reason ?? 'Moderation');
    const fraudFlag = Boolean(req.body.fraudFlag ?? req.body.fraud_flag);
    const result = await crowdfundingService.suspendCampaign(campaignId, reason, fraudFlag);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/crowdfunding/:id/report - Signaler une campagne
router.post('/:id/report', authenticate, assertCampaignId, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
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
