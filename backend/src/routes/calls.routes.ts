import { Router } from 'express';
import crypto from 'node:crypto';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import directCallService from '../services/directCall.service.js';
import prisma from '../config/database.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';
import {
  buildStaticIceServers,
  fetchMeteredTurnCredentials,
  PUBLIC_STUN_FALLBACKS,
} from '../services/meteredTurn.service.js';
import { resolveMeteredTurnRelayHosts } from '../services/meteredTurnRegions.js';
import { recordCallLogMessage } from '../services/callLogMessage.service.js';
import type { CallLogOutcome } from '../utils/callLogPayload.js';
import { parseCallHistoryLimit } from '../utils/callHistoryLimit.js';

const router = Router();

const TERMINAL_CALL_STATUSES = new Set(['completed', 'declined', 'missed', 'ended', 'failed', 'cancelled']);

function parseTurnUrls(): string[] {
  const raw = String(process.env.TURN_URL || process.env.TURN_URLS || '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
}

/**
 * Identifiants TURN statiques (fournisseurs gérés : Metered.ca, Twilio, Open Relay…).
 * Variables Render : `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`.
 */
function createStaticTurnCredentials() {
  const username = String(process.env.TURN_USERNAME || '').trim();
  const credential = String(process.env.TURN_CREDENTIAL || '').trim();
  const urls = parseTurnUrls();
  if (!username || !credential || urls.length === 0) return null;
  const iceServers = buildStaticIceServers(urls, username, credential);
  const region = resolveMeteredTurnRelayHosts();
  const turnUrls = iceServers.flatMap((s) => {
    const raw = s.urls;
    const list = Array.isArray(raw) ? raw.map(String) : [String(raw ?? '')];
    return list.filter((u) => u.startsWith('turn:') || u.startsWith('turns:'));
  });
  return {
    urls: turnUrls.length > 0 ? turnUrls : urls,
    username,
    credential,
    iceServers,
    expiresAt: 0,
    ttlSec: 0,
    realm: String(process.env.TURN_REALM || 'metered.ca').trim(),
    publicStun: PUBLIC_STUN_FALLBACKS,
    turnConfigured: true,
    turnRegion: region.preset,
    turnRelayHosts: [...region.hosts],
  };
}

/**
 * Identifiants TURN temporaires HMAC (coturn auto-hébergé avec `use-auth-secret`
 * / `static-auth-secret` = `TURN_SHARED_SECRET`).
 */
function createHmacTurnCredentials(userId: string) {
  const secret = String(process.env.TURN_SHARED_SECRET || '').trim();
  const realm = String(process.env.TURN_REALM || '').trim();
  const ttlSec = Math.max(60, Number(process.env.TURN_CREDENTIAL_TTL_SEC || 3600));
  const urls = parseTurnUrls();
  if (!secret || !realm || urls.length === 0) return null;
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const username = `${exp}:${userId}`;
  const credential = crypto.createHmac('sha1', secret).update(username).digest('base64');
  const iceServers = buildStaticIceServers(urls, username, credential);
  return {
    urls,
    username,
    credential,
    iceServers,
    expiresAt: exp * 1000,
    ttlSec,
    realm,
    publicStun: PUBLIC_STUN_FALLBACKS,
    turnConfigured: true,
  };
}

/**
 * Priorité :
 * 1. API REST Metered.ca (`METERED_TURN_API_KEY`) — recommandé
 * 2. Identifiants statiques (`TURN_URL` + `TURN_USERNAME` + `TURN_CREDENTIAL`)
 * 3. HMAC coturn auto-hébergé
 */
async function resolveTurnCredentials(userId: string) {
  const metered = await fetchMeteredTurnCredentials();
  if (metered) return metered;
  return createStaticTurnCredentials() ?? createHmacTurnCredentials(userId);
}

// GET /api/calls/turn-credentials - Credentials TURN temporaires (ne pas exposer VITE_TURN_CREDENTIAL côté client)
router.get('/turn-credentials', authenticate, async (req: AuthRequest, res) => {
  const userId = String(req.user?.id || '').trim();
  const creds = await resolveTurnCredentials(userId || 'anonymous');
  if (!creds) {
    /**
     * TURN non configuré : on renvoie quand même les STUN publics pour que l'appel
     * puisse fonctionner sur réseaux ouverts (WiFi, ADSL).
     * Sur réseaux mobiles restrictifs Afrique, l'appel échouera silencieusement —
     * l'admin doit configurer TURN (variables TURN_URL/TURN_SHARED_SECRET/TURN_REALM).
     */
    return res.json({
      success: true,
      data: {
        urls: [],
        username: '',
        credential: '',
        expiresAt: 0,
        ttlSec: 0,
        realm: '',
        publicStun: PUBLIC_STUN_FALLBACKS,
        iceServers: PUBLIC_STUN_FALLBACKS.map((u) => ({ urls: u })),
        turnConfigured: false,
      },
    });
  }
  return res.json({ success: true, data: creds });
});

/** GET /api/calls/history — journal récent (audit juin 2026, persistance hors socket seul). */
router.get('/history', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const limit = parseCallHistoryLimit(req.query.limit);
    const calls = await prisma.directCall.findMany({
      where: {
        OR: [{ caller_id: userId }, { receiver_id: userId }],
      },
      orderBy: { updated_at: 'desc' },
      take: limit,
    });
    return res.json({ success: true, data: calls });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/calls/initiate - Initier un appel payant
router.post('/initiate', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { receiverId, phone, estimatedDuration } = req.body;

    if (!receiverId || !phone) {
      return res.status(400).json({
        success: false,
        error: { message: 'receiverId et phone requis' },
      });
    }

    const result = await directCallService.initiateCall(userId, receiverId, {
      phone,
      estimatedDuration,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Appel initié. Redirigez vers paymentUrl pour compléter le paiement.',
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/calls/session/upsert - Créer/valider une session d'appel DM (WebRTC)
router.post('/session/upsert', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { callId, peerUserId, role, status } = req.body || {};

    if (!callId || !peerUserId || !role) {
      return res.status(400).json({
        success: false,
        error: { message: 'callId, peerUserId et role sont requis' },
      });
    }
    if (!['caller', 'receiver'].includes(String(role))) {
      return res.status(400).json({
        success: false,
        error: { message: 'role invalide (caller|receiver)' },
      });
    }
    if (peerUserId === userId) {
      return res.status(400).json({
        success: false,
        error: { message: 'peerUserId doit être différent de votre user id' },
      });
    }

    const existing = await prisma.directCall.findUnique({ where: { id: String(callId) } });
    if (existing) {
      if (![existing.caller_id, existing.receiver_id].includes(userId)) {
        return res.status(403).json({ success: false, error: { message: 'Accès interdit à cet appel' } });
      }
      const updated = await prisma.directCall.update({
        where: { id: existing.id },
        data: {
          status: typeof status === 'string' && status.trim() ? status.trim() : existing.status,
        },
      });
      return res.json({ success: true, data: updated });
    }

    const isCaller = role === 'caller';
    const created = await prisma.directCall.create({
      data: {
        id: String(callId),
        caller_id: isCaller ? userId : String(peerUserId),
        receiver_id: isCaller ? String(peerUserId) : userId,
        status: typeof status === 'string' && status.trim() ? status.trim() : 'pending',
      },
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/calls/voip-token - Enregistre le token VoIP PushKit iOS pour réveil app killed
router.post('/voip-token', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const token = String(req.body?.token || '').trim();
    const platform = String(req.body?.platform || 'ios').trim().toLowerCase();
    if (!token) {
      return res.status(400).json({ success: false, error: { message: 'token requis' } });
    }
    if (token.length > 512) {
      return res.status(400).json({ success: false, error: { message: 'token invalide (trop long)' } });
    }

    // Stockage dans PushSubscription (même table que les FCM tokens, préfixe 'voip' pour différencier)
    const endpoint = `voip:${platform}:${token}`;
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        user_id: userId,
        endpoint,
        p256dh: 'voip',
        auth: 'voip',
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

    return res.json({ success: true, data: { registered: true } });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/calls/:id/session-state - Mettre à jour l'état d'un appel DM (sans flux paiement)
router.post('/:id/session-state', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const callId = param(req, 'id');
    const { status, duration } = req.body || {};

    const call = await prisma.directCall.findUnique({ where: { id: callId } });
    if (!call) {
      return res.status(404).json({
        success: false,
        error: { message: 'Appel introuvable' },
      });
    }
    if (![call.caller_id, call.receiver_id].includes(userId)) {
      return res.status(403).json({ success: false, error: { message: 'Accès interdit à cet appel' } });
    }

    const nextStatus = typeof status === 'string' && status.trim() ? status.trim() : call.status;
    const numericDuration =
      typeof duration === 'number'
        ? Math.max(0, Math.floor(duration))
        : Number.isFinite(Number(duration))
          ? Math.max(0, Math.floor(Number(duration)))
          : null;

    const data: any = {
      status: nextStatus,
    };

    if (nextStatus === 'active' && !call.started_at) {
      data.started_at = new Date();
    }

    if (TERMINAL_CALL_STATUSES.has(nextStatus)) {
      data.ended_at = new Date();
      if (numericDuration !== null) data.duration = numericDuration;
      if (!call.started_at && (numericDuration ?? 0) > 0) {
        data.started_at = new Date(Date.now() - (numericDuration || 0) * 1000);
      }
    }

    const updated = await prisma.directCall.update({
      where: { id: callId },
      data,
    });

    if (TERMINAL_CALL_STATUSES.has(nextStatus)) {
      const mediaRaw = String(req.body?.callMediaType || req.body?.media || 'audio').toLowerCase();
      const media = mediaRaw.includes('video') ? 'video' : 'audio';
      const outcomeMap: Record<string, CallLogOutcome> = {
        completed: 'completed',
        missed: 'missed',
        declined: 'declined',
        cancelled: 'cancelled',
        failed: 'cancelled',
        ended: 'completed',
      };
      const outcome = outcomeMap[nextStatus] ?? 'completed';
      await recordCallLogMessage({
        callId,
        callerId: call.caller_id,
        receiverId: call.receiver_id,
        media,
        outcome,
        durationSec: numericDuration ?? undefined,
        callerName: typeof req.body?.callerName === 'string' ? req.body.callerName : undefined,
      });
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/calls/:id/end - Terminer un appel
router.post('/:id/end', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const callId = param(req, 'id');
    const { duration } = req.body; // Durée en secondes

    if (!duration) {
      return res.status(400).json({
        success: false,
        error: { message: 'duration requis (en secondes)' },
      });
    }

    const result = await directCallService.endCall(callId, duration);

    res.json({
      success: true,
      data: result,
      message: 'Appel terminé et paiement traité',
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

