/**
 * CDC Phase 1 - Routes publicitaires
 */
import { Router } from 'express';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import { adsService, AD_PRICING_BY_DURATION } from '../services/ads.service.js';
import { requireAnyAdmin } from '../middleware/adminRbac.js';

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
router.post('/impression', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { creative_id: creativeId, campaign_id: campaignId } = req.body;
    if (!creativeId || !campaignId) {
      return res.status(400).json({ success: false, error: 'creative_id et campaign_id requis' });
    }

    const userId = req.user?.id;
    const deviceId = (req.headers['x-device-id'] as string) || req.body.device_id;
    const viewerKey = userId ? `u:${userId}` : `d:${deviceId || 'anon-' + Math.random().toString(36).slice(2)}`;

    await adsService.recordImpression(creativeId, campaignId, viewerKey);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/ads/click - Enregistrer un clic
router.post('/click', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { creative_id: creativeId, campaign_id: campaignId } = req.body;
    if (!creativeId || !campaignId) {
      return res.status(400).json({ success: false, error: 'creative_id et campaign_id requis' });
    }

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
router.post('/campaigns', authenticate, async (req: AuthRequest, res, next) => {
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

// POST /api/ads/campaigns/:id/creatives - Ajouter un créatif
router.post('/campaigns/:id/creatives', authenticate, async (req: AuthRequest, res, next) => {
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
router.post('/campaigns/:id/submit', authenticate, async (req: AuthRequest, res, next) => {
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
router.post('/campaigns/:id/approve', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
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
router.post('/campaigns/:id/reject', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const adminId = req.user!.id;
    const campaignId = param(req, 'id');
    const { reason } = req.body || {};
    const campaign = await adsService.rejectCampaign(campaignId, adminId, reason);
    res.json({ success: true, data: campaign });
  } catch (error) {
    next(error);
  }
});

export default router;
