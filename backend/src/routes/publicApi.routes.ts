import { Router } from 'express';
import prisma from '../config/database.js';
import {
  getPublicApiContext,
  getPublicApiUsageSnapshot,
  requirePublicApiKey,
} from '../middleware/publicApiKey.middleware.js';
import { trackPublicApiUsage } from '../middleware/publicApiUsage.middleware.js';
import matchingEngineService from '../services/matchingEngine.service.js';

const router = Router();
const v1 = Router();

function parseGoal(rawGoal: string) {
  const normalized = String(rawGoal || 'earn_money').trim().toLowerCase();
  if (['earn_money', 'learn', 'find_job', 'entrepreneur'].includes(normalized)) {
    return normalized as 'earn_money' | 'learn' | 'find_job' | 'entrepreneur';
  }
  return 'earn_money';
}

function splitCSV(value: unknown) {
  return String(value || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      api: 'public',
      version: 'v1',
      timestamp: new Date().toISOString(),
    },
  });
});

// Legacy non-versioned endpoints kept for backward compatibility.
router.use((req, res, next) => {
  res.setHeader('X-API-Deprecation', 'Use /api/public/v1/* routes');
  next();
});

router.use(requirePublicApiKey, trackPublicApiUsage);

const opportunitiesHandler = async (req: any, res: any, next: any) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '12'), 10) || 12, 30);
    const data = await matchingEngineService.getPublicOpportunityPreview(
      {
        goal: parseGoal(String(req.query.goal || 'earn_money')),
        location: String(req.query.location || '').trim() || undefined,
        level: (String(req.query.level || '').trim() || undefined) as 'beginner' | 'intermediate' | 'advanced' | undefined,
        skills: splitCSV(req.query.skills),
        interests: splitCSV(req.query.interests),
      },
      limit
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

router.get('/matching/opportunities', opportunitiesHandler);

// Versioned routes (v1) — ne pas réappliquer requirePublicApiKey ici : le parent `router` le fait
// déjà (sinon 2× comptage rate-limit → 429 dès la 1ʳᵉ requête avec limit=1).
v1.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      api: 'public',
      version: 'v1',
      timestamp: new Date().toISOString(),
    },
  });
});
v1.get('/matching/opportunities', opportunitiesHandler);
v1.get('/usage', async (req, res, next) => {
  try {
    const ctx = getPublicApiContext(req);
    if (!ctx) {
      return res.status(401).json({ success: false, error: 'API key invalide' });
    }

    const sinceHours = Math.min(Math.max(parseInt(String(req.query.sinceHours || '24'), 10) || 24, 1), 168);
    const sinceDate = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

    const events = await prisma.analytics.findMany({
      where: {
        entity_type: 'public_api',
        entity_id: ctx.keyHash,
        metric_type: 'public_api_call',
        date: { gte: sinceDate },
      },
      orderBy: { date: 'desc' },
      take: 1000,
      select: {
        date: true,
        metadata: true,
      },
    });

    const byEndpoint: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const durations: number[] = [];

    for (const event of events) {
      const metadata = (event.metadata as any) || {};
      const endpoint = String(metadata.endpoint || 'unknown');
      const status = String(metadata.statusCode || 'unknown');
      const duration = Number(metadata.durationMs || 0);
      byEndpoint[endpoint] = (byEndpoint[endpoint] || 0) + 1;
      byStatus[status] = (byStatus[status] || 0) + 1;
      if (Number.isFinite(duration) && duration > 0) durations.push(duration);
    }

    durations.sort((a, b) => a - b);
    const p95 = durations.length > 0 ? durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.95))] : 0;

    return res.json({
      success: true,
      data: {
        keyAlias: ctx.keyAlias,
        window: {
          sinceHours,
          since: sinceDate.toISOString(),
          until: new Date().toISOString(),
        },
        totals: {
          calls: events.length,
          uniqueEndpoints: Object.keys(byEndpoint).length,
          avgDurationMs:
            durations.length > 0 ? Number((durations.reduce((sum, n) => sum + n, 0) / durations.length).toFixed(2)) : 0,
          p95DurationMs: p95,
        },
        distribution: {
          byEndpoint,
          byStatus,
        },
        quota: getPublicApiUsageSnapshot(ctx.keyHash),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.use('/v1', v1);

export default router;
