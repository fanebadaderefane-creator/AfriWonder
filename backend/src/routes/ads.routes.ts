/**
 * CDC Phase 1 - Routes publicitaires
 */
import { Router } from 'express';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import { adsService, AD_PRICING_BY_DURATION } from '../services/ads.service.js';
import { requireAnyAdmin } from '../middleware/adminRbac.js';
import moderationService from '../services/moderation.service.js';
import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';
import {
  adsCampaignCreateBodySchema,
  adsCampaignRejectBodySchema,
  adsCampaignUpdateBodySchema,
  adsCreativeBodySchema,
  adsImpressionClickBodySchema,
  adsReportBodySchema,
} from '../schemas/addressesAdsAirtime.schemas.js';

const router = Router();

// --- Public / optional auth ---

// GET /api/ads/feed - Feed publicités actives (pour insertion dans le feed)
router.get('/feed', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { limit = '20' } = req.query;
    const userId = req.user?.id;
    const deviceId = (req.headers['x-device-id'] as string) || undefined;
    const country = (req.headers['x-country'] as string) || undefined;

    const ads = await adsService.getActiveAdsForFeed(parseInt(limit as string) || 20, {
      userId,
      deviceId,
      country,
    });

    res.json({ success: true, data: ads });
  } catch (error) {
    next(error);
  }
});

// POST /api/ads/impression - Enregistrer une vue (appelé par le front quand une pub est visible)
router.post('/impression', optionalAuth, validateBody(adsImpressionClickBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { creative_id: creativeId, campaign_id: campaignId } = req.body;

    const userId = req.user?.id;
    const deviceId = (req.headers['x-device-id'] as string) || req.body.device_id;
    const viewerKey = userId ? `u:${userId}` : `d:${deviceId || 'anon-' + Math.random().toString(36).slice(2)}`;

    await adsService.recordImpression(creativeId, campaignId, viewerKey);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/ads/report - Signaler une publicité (CDC §4 Utilisateur peut signaler une pub)
router.post('/report', authenticate, validateBody(adsReportBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { campaign_id: campaignId, reason } = req.body;
    await moderationService.createReport(req.user!.id, {
      contentType: 'ad',
      contentId: campaignId,
      reason,
    });
    res.json({ success: true, message: 'Signalement enregistré.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/ads/click - Enregistrer un clic
router.post('/click', optionalAuth, validateBody(adsImpressionClickBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { creative_id: creativeId, campaign_id: campaignId } = req.body;

    const userId = req.user?.id;
    const deviceId = (req.headers['x-device-id'] as string) || req.body.device_id;
    const viewerKey = userId ? `u:${userId}` : `d:${deviceId || 'anon-' + Math.random().toString(36).slice(2)}`;

    await adsService.recordClick(creativeId, campaignId, viewerKey);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// --- Annonceur (authentifié) ---

// GET /api/ads/pricing - Tarification par durée
router.get('/pricing', authenticate, (req, res) => {
  res.json({ success: true, data: AD_PRICING_BY_DURATION });
});

// POST /api/ads/campaigns - Créer une campagne
router.post('/campaigns', authenticate, validateBody(adsCampaignCreateBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const campaign = await adsService.createCampaign({
      ...req.body,
      advertiser_id: userId,
    });
    res.json({ success: true, data: campaign });
  } catch (error) {
    next(error);
  }
});

// GET /api/ads/campaigns - Mes campagnes
router.get('/campaigns', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { page = '1', limit = '20' } = req.query;
    const result = await adsService.getAdvertiserCampaigns(
      userId,
      parseInt(page as string),
      parseInt(limit as string)
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/ads/campaigns/pending - Campagnes en attente (admin) - AVANT :id
router.get('/campaigns/pending', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const campaigns = await adsService.getCampaignsPendingReview(req.user!.id);
    res.json({ success: true, data: campaigns });
  } catch (error) {
    next(error);
  }
});

// GET /api/ads/campaigns/admin - Toutes les campagnes (admin)
router.get('/campaigns/admin', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.query;
    const campaigns = await adsService.getAllCampaignsForAdmin(
      typeof status === 'string' && status ? status : undefined
    );
    res.json({ success: true, data: campaigns });
  } catch (error) {
    next(error);
  }
});

// GET /api/ads/campaigns/:id - Stats d'une campagne
router.get('/campaigns/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const campaignId = param(req, 'id');
    const stats = await adsService.getCampaignStats(campaignId, userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// PUT /api/ads/campaigns/:id - Modifier une campagne (brouillon uniquement)
router.put('/campaigns/:id', authenticate, validateBody(adsCampaignUpdateBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const campaignId = param(req, 'id');
    const campaign = await adsService.updateCampaign(campaignId, userId, req.body);
    res.json({ success: true, data: campaign });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/ads/campaigns/:id - Supprimer une campagne (brouillon uniquement)
router.delete('/campaigns/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const campaignId = param(req, 'id');
    await adsService.deleteCampaign(campaignId, userId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/ads/campaigns/:id/creatives - Ajouter un créatif
router.post('/campaigns/:id/creatives', authenticate, validateBody(adsCreativeBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const campaignId = param(req, 'id');
    const creative = await adsService.addCreative({
      ...req.body,
      campaign_id: campaignId,
    });
    res.json({ success: true, data: creative });
  } catch (error) {
    next(error);
  }
});

// POST /api/ads/campaigns/:id/submit - Soumettre pour validation
router.post('/campaigns/:id/submit', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const campaignId = param(req, 'id');
    const campaign = await adsService.submitForReview(campaignId, userId);
    res.json({ success: true, data: campaign });
  } catch (error) {
    next(error);
  }
});

// --- Admin ---

// POST /api/ads/campaigns/:id/approve - Approuver une campagne
router.post('/campaigns/:id/approve', authenticate, requireAnyAdmin, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const adminId = req.user!.id;
    const campaignId = param(req, 'id');
    const campaign = await adsService.approveCampaign(campaignId, adminId);
    res.json({ success: true, data: campaign });
  } catch (error) {
    next(error);
  }
});

// POST /api/ads/campaigns/:id/reject - Rejeter une campagne
router.post(
  '/campaigns/:id/reject',
  authenticate,
  requireAnyAdmin,
  validateBody(adsCampaignRejectBodySchema),
  async (req: AuthRequest, res, next) => {
    try {
      const adminId = req.user!.id;
      const campaignId = param(req, 'id');
      const { reason } = req.body;
      const campaign = await adsService.rejectCampaign(campaignId, adminId, reason);
      res.json({ success: true, data: campaign });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
