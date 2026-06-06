import { Router } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import analyticsService from '../services/analytics.service.js';
import { getMobileAppVersionPolicyAsync } from '../services/mobileAppVersion.service.js';
import { getVideoLowQualityCoverageCached } from '../services/videoLowQualityCoverage.service.js';
import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

function isSchemaColumnError(err: unknown): boolean {
  const message = String((err as Error | undefined)?.message || '');
  return /column .* does not exist|Unknown column|no such column|42703/i.test(message);
}

function parseDeepLink(rawUrl: string): { entityType: string; entityId: string } | null {
  const value = String(rawUrl || '').trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);
    const host = String(url.host || '').trim();
    if (host && parts[0]) {
      return { entityType: host, entityId: parts[0] };
    }
    if (parts[0] && parts[1]) {
      return { entityType: parts[0], entityId: parts[1] };
    }
  } catch {
    const normalized = value.replace(/^afriwonder:\/\//i, '').replace(/^\/+/, '');
    const parts = normalized.split('/').filter(Boolean);
    if (parts[0] && parts[1]) {
      return { entityType: parts[0], entityId: parts[1] };
    }
  }

  return null;
}

async function resolveEntityExists(entityType: string, entityId: string): Promise<boolean> {
  switch (entityType) {
    case 'video':
    case 'watch':
      return Boolean(await prisma.video.findUnique({ where: { id: entityId }, select: { id: true } }));
    case 'live':
      return Boolean(await prisma.liveStream.findUnique({ where: { id: entityId }, select: { id: true } }));
    case 'user':
      return Boolean(await prisma.user.findUnique({ where: { id: entityId }, select: { id: true } }));
    case 'product':
      return Boolean(await prisma.product.findUnique({ where: { id: entityId }, select: { id: true } }));
    case 'community':
      return Boolean(await prisma.community.findUnique({ where: { id: entityId }, select: { id: true } }));
    case 'miniapp':
    case 'mini-app':
      return Boolean(await prisma.miniApp.findUnique({ where: { id: entityId }, select: { id: true } }));
    case 'hashtag':
      return entityId.trim().length > 0;
    default:
      return false;
  }
}

function buildResolvedRoute(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case 'video':
    case 'watch':
      return `/watch/${entityId}`;
    case 'live':
      return `/live/${entityId}`;
    case 'user':
      return `/user/${entityId}`;
    case 'product':
      return `/product/${entityId}`;
    case 'community':
      return `/communities/${entityId}`;
    case 'miniapp':
    case 'mini-app':
      return `/miniapps`;
    case 'hashtag': {
      const tag = decodeURIComponent(String(entityId || '').trim()).replace(/^#+/, '');
      if (!tag) return null;
      return `/search?q=${encodeURIComponent(`#${tag}`)}`;
    }
    default:
      return null;
  }
}

async function processSyncAction(userId: string, action: Record<string, any>) {
  const type = String(action?.type || '').trim();
  const targetId = String(action?.target_id || action?.targetId || '').trim();
  const payload = action?.payload ?? {};

  if (!type) {
    return { success: false, error: 'type requis' };
  }

  if (type === 'comment_video') {
    const content = String(payload?.content || '').trim();
    if (!targetId || !content) return { success: false, error: 'target_id et content requis' };

    const comment = await prisma.comment.create({
      data: {
        video_id: targetId,
        user_id: userId,
        content,
        parent_id: payload?.parent_id || null,
      },
    });

    await prisma.video.update({
      where: { id: targetId },
      data: { comments_count: { increment: 1 } },
    }).catch(() => {});

    return { success: true, data: { comment_id: comment.id } };
  }

  if (!targetId) {
    return { success: false, error: 'target_id requis' };
  }

  if (type === 'like_video') {
    const liked = payload?.liked !== false;
    const existing = await prisma.like.findFirst({ where: { user_id: userId, video_id: targetId } });
    if (liked && !existing) {
      await prisma.like.create({ data: { user_id: userId, video_id: targetId, type: 'like' } });
      await prisma.video.update({ where: { id: targetId }, data: { likes: { increment: 1 } } }).catch(() => {});
    }
    if (!liked && existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      await prisma.video.update({ where: { id: targetId }, data: { likes: { decrement: 1 } } }).catch(() => {});
    }
    return { success: true, data: { liked } };
  }

  if (type === 'save_video') {
    const saved = payload?.saved !== false;
    const existing = await prisma.save.findFirst({ where: { user_id: userId, video_id: targetId } });
    if (saved && !existing) {
      await prisma.save.create({ data: { user_id: userId, video_id: targetId } });
      await prisma.video.update({ where: { id: targetId }, data: { saves: { increment: 1 } } }).catch(() => {});
    }
    if (!saved && existing) {
      await prisma.save.delete({ where: { id: existing.id } });
      await prisma.video.update({ where: { id: targetId }, data: { saves: { decrement: 1 } } }).catch(() => {});
    }
    return { success: true, data: { saved } };
  }

  if (type === 'follow_user') {
    const following = payload?.following !== false;
    const existing = await prisma.follow.findFirst({
      where: { follower_id: userId, following_id: targetId },
    });
    if (following && !existing) {
      await prisma.follow.create({ data: { follower_id: userId, following_id: targetId } });
    }
    if (!following && existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
    }
    return { success: true, data: { following } };
  }

  return { success: false, error: `type non supporté: ${type}` };
}

// GET /api/mobile/app-version — politique MAJ Play Store / App Store (sans auth)
router.get('/app-version', async (_req, res, next) => {
  try {
    res.json({
      success: true,
      data: await getMobileAppVersionPolicyAsync(),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/mobile/health
router.get('/health', async (_req, res) => {
  const agoraAppId = !!process.env.AGORA_APP_ID?.trim();
  const agoraCert = !!process.env.AGORA_APP_CERTIFICATE?.trim();
  const turn =
    !!process.env.METERED_TURN_API_KEY?.trim() ||
    !!process.env.TURN_URL?.trim() ||
    !!process.env.TURN_URLS?.trim() ||
    (!!process.env.TURN_USERNAME?.trim() &&
      !!process.env.TURN_CREDENTIAL?.trim() &&
      (!!process.env.TURN_URL?.trim() || !!process.env.TURN_URLS?.trim())) ||
    !!process.env.TURN_SHARED_SECRET?.trim();

  let videoDelivery: {
    coverage_pct: number;
    alert_level: string;
    hd_only: number;
    alerts: string[];
  } | null = null;
  try {
    const cov = await getVideoLowQualityCoverageCached();
    videoDelivery = {
      coverage_pct: cov.coverage_pct,
      alert_level: cov.alert_level,
      hd_only: cov.hd_only,
      alerts: cov.alerts.slice(0, 3),
    };
  } catch {
    /* DB indisponible — health partiel */
  }

  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'mobile',
      timestamp: new Date().toISOString(),
      capabilities: {
        agora_rtc: agoraAppId && agoraCert,
        turn: turn,
        push_expo: true,
        push_fcm_legacy: !!process.env.FIREBASE_SERVER_KEY?.trim(),
        push_web_vapid: !!(
          process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim()
        ),
        /** Crédit serveur : POST /api/coins/iap/credit — reçus Play/App Store à valider en prod. */
        coins_iap_credit: true,
        /** % vidéos publiques avec flux léger (~480p) — sous 70% = risque forfait. */
        video_low_quality_coverage_pct: videoDelivery?.coverage_pct ?? null,
        video_data_saver_ok: videoDelivery ? videoDelivery.alert_level === 'ok' : null,
      },
      video_delivery: videoDelivery,
    },
  });
});

/**
 * POST /api/mobile/biometric-session
 * Atteste côté serveur qu’après déverrouillage biométrique local l’app réutilise encore un JWT valide.
 * Les secrets (refresh) restent dans SecureStore côté client — pas de secret échangé ici.
 */
router.post('/biometric-session', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const intent = String((req.body as Record<string, unknown>)?.intent || 'unlock').trim().slice(0, 64);
    await analyticsService
      .createAnalytics({
        userId,
        entityType: 'security',
        entityId: intent || 'unlock',
        metricType: 'mobile_biometric_session',
        metricValue: 1,
        metadata: { platform: String(req.headers['x-client-platform'] || '').slice(0, 64) || undefined },
      })
      .catch(() => {});

    res.json({
      success: true,
      data: {
        user_id: userId,
        intent,
        validated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/mobile/push-token
router.post('/push-token', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const token = String(req.body?.token || '').trim();
    const platform = String(req.body?.platform || 'unknown').trim().toLowerCase();
    if (!token) {
      return res.status(400).json({ success: false, error: 'token requis' });
    }

    const endpoint = `fcm:${platform}:${token}`;
    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        user_id: userId,
        endpoint,
        p256dh: 'mobile',
        auth: 'mobile',
        user_agent: String(req.headers['user-agent'] || '').slice(0, 500),
        is_active: true,
        last_seen: new Date(),
      },
      update: {
        user_id: userId,
        user_agent: String(req.headers['user-agent'] || '').slice(0, 500),
        is_active: true,
        last_seen: new Date(),
      },
    });

    res.json({ success: true, data: { id: sub.id, endpoint } });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/mobile/push-token/:token
router.delete('/push-token/:token', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const token = String(req.params.token || '').trim();
    if (!token) {
      return res.status(400).json({ success: false, error: 'token requis' });
    }
    const endpointSuffix = `:${token}`;
    await prisma.pushSubscription.updateMany({
      where: {
        user_id: userId,
        endpoint: { endsWith: endpointSuffix },
      },
      data: {
        is_active: false,
        last_seen: new Date(),
      },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/mobile/videos/:id/download-url
router.get('/videos/:id/download-url', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    let video: { video_url: string | null; download_allowed?: boolean; visibility: string | null; creator_id: string | null } | null = null;
    try {
      video = await prisma.video.findFirst({
        where: { id: param(req, 'id') },
        select: { video_url: true, download_allowed: true, visibility: true, creator_id: true },
      });
    } catch (err) {
      if (!isSchemaColumnError(err)) throw err;
      const rows = await prisma.$queryRawUnsafe<Array<{ video_url: string | null; visibility: string | null; creator_id: string | null }>>(
        `SELECT video_url, visibility, creator_id FROM "Video" WHERE id = $1 LIMIT 1`,
        param(req, 'id')
      );
      const row = rows[0];
      video = row ? { ...row, download_allowed: true } : null;
    }
    if (!video) return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    if (!video.download_allowed) return res.status(403).json({ success: false, error: 'Téléchargement non autorisé par le créateur' });
    if (video.visibility !== 'public' && video.creator_id !== req.user?.id) {
      return res.status(403).json({ success: false, error: 'Accès non autorisé' });
    }
    res.json({ success: true, data: { download_url: video.video_url } });
  } catch (error) {
    next(error);
  }
});

// GET /api/mobile/resolve-deeplink
router.get('/resolve-deeplink', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const rawUrl = String(req.query.url || '').trim();
    const parsed = parseDeepLink(rawUrl);
    if (!parsed) {
      return res.status(400).json({ success: false, error: 'url deeplink invalide' });
    }
    const route = buildResolvedRoute(parsed.entityType, parsed.entityId);
    if (!route) {
      return res.status(404).json({ success: false, error: 'deeplink non supporté' });
    }
    const exists = await resolveEntityExists(parsed.entityType, parsed.entityId);
    res.json({
      success: true,
      data: {
        entity_type: parsed.entityType,
        entity_id: parsed.entityId,
        route,
        exists,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/mobile/device-settings
router.get('/device-settings', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          data_saver_mode: true,
          preferred_language: true,
          timezone: true,
          theme: true,
          preferred_categories: true,
          messaging_e2e_enabled: true,
          messaging_read_receipts_enabled: true,
          messaging_cdc_moderation: true,
        },
      });
      return res.json({ success: true, data: user });
    } catch (err) {
      if (!isSchemaColumnError(err)) throw err;
      const key = `mobile_settings:${userId}`;
      const stored = await prisma.platformSettings.findUnique({ where: { key } });
      return res.json({
        success: true,
        data: {
          id: userId,
          ...(((stored?.value as Record<string, unknown>) || {})),
          storage: 'platform_settings_fallback',
        },
      });
    }
  } catch (error) {
    next(error);
  }
});

router.put('/device-settings', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const body = req.body || {};
    const data: Record<string, unknown> = {};

    if (typeof body.data_saver_mode === 'boolean') data.data_saver_mode = body.data_saver_mode;
    if (typeof body.preferred_language === 'string') data.preferred_language = body.preferred_language;
    if (typeof body.timezone === 'string') data.timezone = body.timezone;
    if (typeof body.theme === 'string') data.theme = body.theme;
    if (Array.isArray(body.preferred_categories)) data.preferred_categories = body.preferred_categories;
    if (typeof body.messaging_e2e_enabled === 'boolean') data.messaging_e2e_enabled = body.messaging_e2e_enabled;
    if (typeof body.messaging_read_receipts_enabled === 'boolean') data.messaging_read_receipts_enabled = body.messaging_read_receipts_enabled;
    if (body.messaging_cdc_moderation && typeof body.messaging_cdc_moderation === 'object') {
      data.messaging_cdc_moderation = body.messaging_cdc_moderation;
    }

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          data_saver_mode: true,
          preferred_language: true,
          timezone: true,
          theme: true,
          preferred_categories: true,
          messaging_e2e_enabled: true,
          messaging_read_receipts_enabled: true,
          messaging_cdc_moderation: true,
        },
      });

      return res.json({ success: true, data: user });
    } catch (err) {
      if (!isSchemaColumnError(err)) throw err;

      const key = `mobile_settings:${userId}`;
      const jsonValue = data as Prisma.InputJsonValue;
      const stored = await prisma.platformSettings.upsert({
        where: { key },
        create: { key, value: jsonValue },
        update: { value: jsonValue },
      });

      return res.json({
        success: true,
        data: {
          id: userId,
          ...((stored.value as Record<string, unknown>) || {}),
          storage: 'platform_settings_fallback',
        },
      });
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/mobile/sync
router.post('/sync', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const actions = Array.isArray(req.body?.actions) ? req.body.actions : [];
    const results: Array<Record<string, unknown>> = [];

    for (const action of actions) {
      const key = String(action?.client_id || action?.clientId || '').trim();
      if (key) {
        const existing = await prisma.idempotencyKey.findUnique({ where: { key } });
        if (existing?.response_body) {
          try {
            results.push(JSON.parse(existing.response_body));
            continue;
          } catch {
            /* ignore malformed cache */
          }
        }
      }

      const result = {
        client_id: action?.client_id || action?.clientId || null,
        type: action?.type || null,
        ...(await processSyncAction(userId, action)),
      };

      if (key) {
        await prisma.idempotencyKey.upsert({
          where: { key },
          create: {
            key,
            response_status: result.success ? 200 : 400,
            response_body: JSON.stringify(result),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          update: {
            response_status: result.success ? 200 : 400,
            response_body: JSON.stringify(result),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      }

      results.push(result);
    }

    res.json({ success: true, data: { processed: results.length, results } });
  } catch (error) {
    next(error);
  }
});

// POST /api/mobile/analytics/event
router.post('/analytics/event', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { eventType, entityType, entityId, metricValue, metadata } = req.body || {};
    if (!eventType || !entityType || !entityId) {
      return res.status(400).json({ success: false, error: 'eventType, entityType et entityId requis' });
    }

    const analytics = await analyticsService.createAnalytics({
      userId: req.user!.id,
      entityType: String(entityType),
      entityId: String(entityId),
      metricType: String(eventType),
      metricValue: Number(metricValue ?? 1),
      metadata: metadata ?? null,
    });

    res.json({ success: true, data: analytics });
  } catch (error) {
    next(error);
  }
});

export default router;
