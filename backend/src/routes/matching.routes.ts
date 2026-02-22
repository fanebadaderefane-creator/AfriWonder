import { Router } from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import matchingEngineService from '../services/matchingEngine.service.js';

const router = Router();

router.use(authenticate);

router.get('/onboarding', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const data = await matchingEngineService.getSavedOnboardingProfile(userId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/onboarding', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const data = await matchingEngineService.saveOnboardingProfile(userId, req.body || {});
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/journey/preview', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const data = await matchingEngineService.buildUserJourney(userId, req.body || {});
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/opportunities-for-you', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 50);
    const data = await matchingEngineService.getOpportunitiesForUser(userId, {}, limit);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/opportunities-for-you', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 50);
    const data = await matchingEngineService.getOpportunitiesForUser(userId, req.body || {}, limit);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/interconnections', async (_req, res) => {
  res.json({
    success: true,
    data: matchingEngineService.getInterconnections(),
  });
});

router.get('/dashboard', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const data = await matchingEngineService.getJourneyDashboard(userId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/kpi-summary', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const windowDays = Math.min(Math.max(parseInt((req.query.windowDays as string) || '30', 10) || 30, 7), 90);
    const data = await matchingEngineService.getKpiSummary(userId, windowDays);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/coach', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const data = await matchingEngineService.getCoachSuggestions(userId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/coach/history', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 50);
    const data = await matchingEngineService.getCoachHistory(userId, limit);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/coach/chat', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const message = String(req.body?.message || '').trim();
    const data = await matchingEngineService.chatWithCoach(userId, message);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/trust-status', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const data = await matchingEngineService.getTrustStatus(userId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/localization', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const data = await matchingEngineService.getLocalizationStatus(userId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/progression', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const data = await matchingEngineService.getProgressionStatus(userId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/smart-notifications', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const data = await matchingEngineService.getSmartNotifications(userId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/opportunity-action', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const opportunityId = String(req.body?.opportunityId || '').trim();
    const moduleName = String(req.body?.module || '').trim();
    const action = String(req.body?.action || 'open').trim();

    if (!opportunityId || !moduleName) {
      res.status(400).json({ success: false, error: 'opportunityId et module sont requis' });
      return;
    }

    const data = await matchingEngineService.trackOpportunityAction(userId, opportunityId, moduleName, action);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
