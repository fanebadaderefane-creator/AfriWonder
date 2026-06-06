// AfriWonder full review PR - CodeRabbit
// En premier : charge backend/.env avant tout module qui lit process.env (voir bootstrap-env.ts).
import './bootstrap-env.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { initSentry } from './config/sentry.js';
import app from './app.js';
import prisma from './config/database.js';
import { logger } from './utils/logger.js';
import { setMessageIo, broadcastPresence } from './services/message.service.js';
import notificationService from './services/notification.service.js';
import { recordCallLogMessage } from './services/callLogMessage.service.js';
import { dispatchIncomingCallMobileWakePush } from './services/incomingCallPush.service.js';
import { startAccountDeletionJobs } from './jobs/accountDeletion.job.js';
import { startDataRetentionJob, initializeRetentionPolicies } from './jobs/dataRetention.job.js';
import { startAdsExpirationJob } from './jobs/adsExpiration.job.js';
import { startLiveScheduledReminderJob } from './jobs/liveScheduledReminder.job.js';
import { startStarCallReminderJob } from './jobs/starCallReminder.job.js';
import { startScheduledMessagesJob } from './jobs/scheduledMessages.job.js';
import { startCrowdfundingFailedRefundsJob } from './jobs/crowdfundingRefunds.job.js';
import { startModerationTimeoutJob } from './jobs/moderationTimeout.job.js';
import { startE2eeMonitoringAlertJob } from './jobs/e2eeMonitoringAlert.job.js';
import { startVideoLowQualityBackfillJob } from './jobs/videoLowQualityBackfill.job.js';
import { initRedis } from './utils/cache.js';

const socketToUserId = new Map<string, string>();
const pendingCallTimers = new Map<string, NodeJS.Timeout>();
const pendingCallMeta = new Map<
  string,
  { toUserId: string; fromUserId: string; callId: string; type: 'audio' | 'video'; callerName?: string }
>();
const CALL_RING_TIMEOUT_MS = 30_000;
const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 30000;

function hasActiveSocketForUser(userId: string) {
  for (const activeUserId of socketToUserId.values()) {
    if (activeUserId === userId) return true;
  }
  return false;
}

function clearPendingCallTimer(callId?: string) {
  if (!callId) return;
  const t = pendingCallTimers.get(callId);
  if (t) {
    clearTimeout(t);
    pendingCallTimers.delete(callId);
  }
}

function clearPendingCall(callId?: string) {
  clearPendingCallTimer(callId);
  if (callId) pendingCallMeta.delete(callId);
}

/** Vérifie que l’émetteur et le destinataire sont bien les deux parties du callId. */
function canRelayDirectCallEvent(
  payload: { callId: string; fromUserId: string; toUserId: string },
  actorId: string,
): boolean {
  if (!payload?.callId || !payload?.fromUserId || !payload?.toUserId) return false;
  if (!actorId || actorId !== payload.fromUserId) return false;
  if (payload.fromUserId === payload.toUserId) return false;
  const meta = pendingCallMeta.get(payload.callId);
  if (!meta) return true;
  const forward =
    meta.fromUserId === payload.fromUserId && meta.toUserId === payload.toUserId;
  const reverse =
    meta.fromUserId === payload.toUserId && meta.toUserId === payload.fromUserId;
  return forward || reverse;
}

async function upsertDirectCallState(
  callId: string,
  fromUserId: string,
  toUserId: string,
  status: 'pending' | 'active' | 'declined' | 'missed' | 'completed' | 'ended' | 'cancelled',
) {
  try {
    const existing = await prisma.directCall.findUnique({ where: { id: callId } });
    const now = new Date();
    if (!existing) {
      await prisma.directCall.create({
        data: {
          id: callId,
          caller_id: fromUserId,
          receiver_id: toUserId,
          status,
          started_at: status === 'active' ? now : null,
          ended_at: ['declined', 'missed', 'completed', 'ended', 'cancelled'].includes(status) ? now : null,
        },
      });
      return;
    }
    await prisma.directCall.update({
      where: { id: callId },
      data: {
        status,
        started_at: status === 'active' && !existing.started_at ? now : existing.started_at,
        ended_at: ['declined', 'missed', 'completed', 'ended', 'cancelled'].includes(status) ? now : existing.ended_at,
      },
    });
  } catch (err) {
    logger.warn('upsertDirectCallState failed', { callId, status, err });
  }
}

// Sentry doit être initialisé avant toute création d’app (handlers dans app.ts)
initSentry();

const requiredEnv = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missingEnv = requiredEnv.filter((k) => !process.env[k]?.trim());
const missingProdObservability = !process.env.SENTRY_DSN?.trim();

function describeJwtStrengthIssue(): string | null {
  const a = String(process.env.JWT_SECRET || '').trim();
  const b = String(process.env.JWT_REFRESH_SECRET || '').trim();
  if (!a || !b) return null;
  if (a.length < 64 || b.length < 64) {
    return 'JWT_SECRET et JWT_REFRESH_SECRET doivent faire au moins 64 caractères chacun (ex. openssl rand -hex 32).';
  }
  if (a === b) {
    return 'JWT_SECRET et JWT_REFRESH_SECRET doivent être deux secrets distincts.';
  }
  return null;
}

if (process.env.NODE_ENV === 'production') {
  if (missingEnv.length) {
    logger.error('Variables d’environnement manquantes en production: ' + missingEnv.join(', '));
    process.exit(1);
  }
  const jwtWeak = describeJwtStrengthIssue();
  if (jwtWeak) {
    logger.error(`Configuration JWT refusée en production: ${jwtWeak}`);
    process.exit(1);
  }
  if (missingProdObservability) {
    logger.error('SENTRY_DSN est obligatoire en production (monitoring erreurs).');
    process.exit(1);
  }
} else if (missingEnv.length) {
  logger.warn(
    'Variables manquantes (login renverra 500 tant qu’elles ne sont pas définies): ' + missingEnv.join(', ') +
    '. Copiez backend/.env.example vers backend/.env et renseignez les valeurs.'
  );
} else {
  const jwtWeak = describeJwtStrengthIssue();
  if (jwtWeak) {
    logger.warn(`JWT: ${jwtWeak} — corrigez avant tout déploiement.`);
  }
}

if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL?.trim()) {
  const forceRedis =
    process.env.FORCE_REDIS_IN_PRODUCTION === 'true' ||
    process.env.FORCE_REDIS_IN_PRODUCTION === '1';
  const explicitNoRedis =
    process.env.ALLOW_NO_REDIS_IN_PRODUCTION === 'true' ||
    process.env.ALLOW_NO_REDIS_IN_PRODUCTION === '1';
  /** Render définit RENDER=true ; sans Redis, une seule dyno utilise encore des compteurs mémoire. */
  const renderImpliedSingleInstance = process.env.RENDER === 'true' && !forceRedis;

  if (forceRedis) {
    logger.error(
      'FORCE_REDIS_IN_PRODUCTION est activé mais REDIS_URL est absent — définir REDIS_URL (ex. add-on Render Redis / Upstash).',
    );
    process.exit(1);
  }

  if (explicitNoRedis || renderImpliedSingleInstance) {
    logger.warn(
      explicitNoRedis
        ? 'REDIS_URL absent — ALLOW_NO_REDIS_IN_PRODUCTION (quotas en mémoire, ne pas scaler sans Redis).'
        : 'REDIS_URL absent sur Render — démarrage avec quotas en mémoire. ' +
            'Avant plusieurs instances / Socket.io adaptateur Redis : ajouter REDIS_URL ou définir FORCE_REDIS_IN_PRODUCTION=1 pour échouer explicitement sans Redis.',
    );
  } else {
    logger.error(
      'REDIS_URL est obligatoire en production (rate limiting partagé, JWT, Socket.io multi-nœuds). ' +
        'Instance unique : ALLOW_NO_REDIS_IN_PRODUCTION=true, ou déployez sur Render (RENDER=true) pour tolérance par défaut.',
    );
    process.exit(1);
  }
}

// Pays CEDEAO (optionnel) – APP_COUNTRY=ML|SN|CI|BF
try {
  const { getAppCountry, COUNTRY_NAMES } = await import('./config/region.js');
  const country = getAppCountry();
  logger.info('Pays actif (CEDEAO)', { country, name: COUNTRY_NAMES[country] || country });
} catch {
  // region config optionnel
}

const httpServer = createServer(app);

// Requêtes longues : upload + transcodage « repair-web-playback » (ffmpeg) peut dépasser 5 min.
const UPLOAD_TIMEOUT_MS = 300000;
const LONG_HTTP_MS = Math.max(
  UPLOAD_TIMEOUT_MS,
  Number(process.env.HTTP_LONG_REQUEST_TIMEOUT_MS) || 900000
);
httpServer.timeout = LONG_HTTP_MS;
httpServer.keepAliveTimeout = LONG_HTTP_MS + 1000;
httpServer.headersTimeout = LONG_HTTP_MS + 2000;

const corsOrigins: (string | RegExp)[] = [
  ...(process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== '*'),
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:19000',
  'http://localhost:19006',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:8082',
  'http://127.0.0.1:19000',
  'http://127.0.0.1:19006',
  'https://afri-wonder.vercel.app',
  'https://afriwonder.vercel.app',
  'https://afriwonder.com',
  'https://www.afriwonder.com',
];
// SÉCURITÉ : les préviews Vercel (*.vercel.app) ne sont autorisées QUE hors production
// pour éviter qu'un domaine de preview malveillant (afriwonder-fake.vercel.app) n'ouvre
// un socket authentifié vers l'API prod avec credentials.
if (process.env.NODE_ENV !== 'production' && process.env.CORS_ALLOW_VERCEL_PREVIEW === 'true') {
  corsOrigins.push(/\.vercel\.app$/);
}
/** Dev LAN : autoriser le frontend ouvert depuis l’IP du PC (`http://10.x.x.x:3001`, etc.). */
if (process.env.NODE_ENV !== 'production') {
  corsOrigins.push(/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/);
  corsOrigins.push(/^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/);
  corsOrigins.push(/^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}(:\d+)?$/);
}
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins.length > 0 ? corsOrigins : 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// SÉCURITÉ : authentification JWT obligatoire à la connexion Socket.io.
// Le token est transmis via socket.handshake.auth.token (client : io(url, { auth: { token } })).
// Sans cela, n'importe qui pouvait rejoindre `user:${victimId}` via `user:join` et recevoir
// messages, notifications, signalements d'appels, cadeaux live, etc.
io.use((socket, next) => {
  try {
    const rawToken =
      (socket.handshake.auth && (socket.handshake.auth as any).token) ||
      (socket.handshake.headers?.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.slice(7)
        : '') ||
      (socket.handshake.query?.token as string | undefined);

    if (!rawToken || typeof rawToken !== 'string') {
      // On autorise les connexions anonymes (feed public, live viewer non-logué)
      // mais on ne rejoint AUCUNE room personnelle. socket.data.userId reste undefined.
      return next();
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('Socket.io: JWT_SECRET non configuré — refus connexion authentifiée');
      return next(new Error('server_misconfigured'));
    }

    const decoded = jwt.verify(rawToken, secret) as { userId?: string; id?: string };
    const uid = decoded.userId || decoded.id;
    if (!uid) return next(new Error('invalid_token_payload'));

    (socket.data as { userId?: string }).userId = uid;
    return next();
  } catch (err) {
    logger.warn('Socket.io handshake rejected', {
      err: err instanceof Error ? err.message : String(err),
    });
    // Token fourni mais invalide → on rejette la connexion pour éviter qu'un
    // client forge un token puis passe par la branche anonyme.
    return next(new Error('unauthorized'));
  }
});

setMessageIo(io);

const PORT = parseInt(process.env.PORT || '3000', 10);

// Attendre que la DB soit prête avant d’accepter du trafic et lancer les jobs (évite "credentials (not available)" / "Server has closed the connection")
async function ensureDbConnected() {
  if (process.env.NODE_ENV !== 'test') {
    console.log('[api] Connexion PostgreSQL… (si blocage ici → vérifiez PostgreSQL et DATABASE_URL dans backend/.env)');
  }
  const ms = Math.min(Math.max(parseInt(process.env.DATABASE_CONNECT_TIMEOUT_MS || '20000', 10), 3000), 120000);
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => {
      reject(
        new Error(
          `PostgreSQL indisponible après ${ms} ms (DATABASE_URL / pare-feu / instance arrêtée). Le proxy média et l’API locales ne démarreront pas sans base.`
        )
      );
    }, ms);
    prisma
      .$connect()
      .then(() => {
        clearTimeout(t);
        if (process.env.NODE_ENV !== 'test') console.log('[api] PostgreSQL OK');
        resolve();
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

// WebSocket connection
io.on('connection', (socket) => {
  logger.info('WebSocket client connected', { socketId: socket.id });

  /** Rejoindre immédiatement la room privée — évite perte de call:signal avant user:join client. */
  const authUserId = (socket.data as { userId?: string }).userId;
  if (authUserId) {
    socket.join(`user:${authUserId}`);
    socketToUserId.set(socket.id, authUserId);
    broadcastPresence(authUserId, true).catch((e) =>
      logger.warn('Presence online', { err: e instanceof Error ? e.message : String(e) }),
    );
    logger.info('User auto-joined room on connect', { userId: authUserId, socketId: socket.id });
  }

  // SÉCURITÉ : l'userId provient STRICTEMENT du JWT vérifié dans io.use() ci-dessus.
  // Tout userId fourni par le client est ignoré pour empêcher l'usurpation de rooms privées.
  socket.on('user:join', (_clientUserId?: string) => {
    const userId = (socket.data as { userId?: string }).userId;
    if (!userId) {
      logger.warn('user:join rejeté (socket non authentifié)', { socketId: socket.id });
      return;
    }
    socket.join(`user:${userId}`);
    socketToUserId.set(socket.id, userId);
    broadcastPresence(userId, true).catch((e) => logger.warn('Presence online', { err: e instanceof Error ? e.message : String(e) }));
    logger.info('User joined room', { userId, socketId: socket.id });
  });

  socket.on('user:leave', (_clientUserId?: string) => {
    const userId = (socket.data as { userId?: string }).userId;
    if (!userId) return;
    socket.leave(`user:${userId}`);
    socketToUserId.delete(socket.id);
    if (!hasActiveSocketForUser(userId)) {
      broadcastPresence(userId, false).catch((e) => logger.warn('Presence offline', { err: e instanceof Error ? e.message : String(e) }));
    }
  });

  socket.on('disconnect', () => {
    const userId = socketToUserId.get(socket.id);
    if (userId) {
      socketToUserId.delete(socket.id);
      if (!hasActiveSocketForUser(userId)) {
        broadcastPresence(userId, false).catch((e) => logger.warn('Presence offline', { err: e instanceof Error ? e.message : String(e) }));
      }
    }
    logger.info('WebSocket client disconnected', { socketId: socket.id });
  });

  // Messages: conversation room (new_message, typing, read)
  socket.on('message:join-conversation', (conversationId: string) => {
    if (conversationId) socket.join(`conversation:${conversationId}`);
  });

  socket.on('message:leave-conversation', (conversationId: string) => {
    if (conversationId) socket.leave(`conversation:${conversationId}`);
  });

  socket.on('message:join-group', (groupId: string) => {
    if (groupId) socket.join(`group:${groupId}`);
  });

  socket.on('message:leave-group', (groupId: string) => {
    if (groupId) socket.leave(`group:${groupId}`);
  });

  // =========================
  // RIDE / DELIVERY TRACKING
  // =========================
  // Rooms : `ride:<rideId>` ou `shipment:<shipmentId>`
  //
  // Clients côté chauffeur émettent `ride:location` avec { rideId, lat, lng, heading, speed }
  // Clients côté passager écoutent `ride:location` dans la room pour afficher la position.
  // Statut change → `ride:status` broadcast.
  socket.on('ride:join', (rideId: string) => {
    const userId = (socket.data as { userId?: string }).userId;
    if (!rideId || !userId) return;
    socket.join(`ride:${rideId}`);
  });

  socket.on('ride:leave', (rideId: string) => {
    if (rideId) socket.leave(`ride:${rideId}`);
  });

  socket.on('ride:location', (payload: { rideId: string; lat: number; lng: number; heading?: number; speed?: number }) => {
    const userId = (socket.data as { userId?: string }).userId;
    if (!payload?.rideId || !userId) return;
    if (typeof payload.lat !== 'number' || typeof payload.lng !== 'number') return;
    // Broadcast à la room (passager + chauffeur) mais pas à l'émetteur
    socket.to(`ride:${payload.rideId}`).emit('ride:location', {
      rideId: payload.rideId,
      driverId: userId,
      lat: payload.lat,
      lng: payload.lng,
      heading: payload.heading,
      speed: payload.speed,
      timestamp: Date.now(),
    });
  });

  socket.on('ride:status', (payload: { rideId: string; status: string; eta_min?: number }) => {
    const userId = (socket.data as { userId?: string }).userId;
    if (!payload?.rideId || !userId) return;
    socket.to(`ride:${payload.rideId}`).emit('ride:status', {
      rideId: payload.rideId,
      status: payload.status,
      eta_min: payload.eta_min,
      updatedBy: userId,
      timestamp: Date.now(),
    });
  });

  // Même pattern pour les livraisons marketplace/food
  socket.on('shipment:join', (shipmentId: string) => {
    const userId = (socket.data as { userId?: string }).userId;
    if (!shipmentId || !userId) return;
    socket.join(`shipment:${shipmentId}`);
  });

  socket.on('shipment:leave', (shipmentId: string) => {
    if (shipmentId) socket.leave(`shipment:${shipmentId}`);
  });

  socket.on('shipment:location', (payload: { shipmentId: string; lat: number; lng: number; heading?: number }) => {
    const userId = (socket.data as { userId?: string }).userId;
    if (!payload?.shipmentId || !userId) return;
    if (typeof payload.lat !== 'number' || typeof payload.lng !== 'number') return;
    socket.to(`shipment:${payload.shipmentId}`).emit('shipment:location', {
      shipmentId: payload.shipmentId,
      driverId: userId,
      lat: payload.lat,
      lng: payload.lng,
      heading: payload.heading,
      timestamp: Date.now(),
    });
  });

  socket.on('shipment:status', (payload: { shipmentId: string; status: string; eta_min?: number }) => {
    const userId = (socket.data as { userId?: string }).userId;
    if (!payload?.shipmentId || !userId) return;
    socket.to(`shipment:${payload.shipmentId}`).emit('shipment:status', {
      shipmentId: payload.shipmentId,
      status: payload.status,
      eta_min: payload.eta_min,
      updatedBy: userId,
      timestamp: Date.now(),
    });
  });

  socket.on('message:typing-start', (payload: { conversationId: string; userId: string; name?: string }) => {
    if (payload?.conversationId) {
      socket.to(`conversation:${payload.conversationId}`).emit('message:typing', { userId: payload.userId, name: payload.name, typing: true });
    }
  });

  socket.on('message:typing-stop', (payload: { conversationId: string; userId: string }) => {
    if (payload?.conversationId) {
      socket.to(`conversation:${payload.conversationId}`).emit('message:typing', { userId: payload.userId, typing: false });
    }
  });

  socket.on('message:group-typing-start', (payload: { groupId: string; userId: string; name?: string }) => {
    if (payload?.groupId) {
      socket.to(`group:${payload.groupId}`).emit('message:group-typing', {
        groupId: payload.groupId,
        userId: payload.userId,
        name: payload.name,
        typing: true,
      });
    }
  });

  socket.on('message:group-typing-stop', (payload: { groupId: string; userId: string }) => {
    if (payload?.groupId) {
      socket.to(`group:${payload.groupId}`).emit('message:group-typing', {
        groupId: payload.groupId,
        userId: payload.userId,
        typing: false,
      });
    }
  });

  socket.on('message:group-recording-start', (payload: { groupId: string; userId: string; name?: string }) => {
    if (payload?.groupId) {
      socket.to(`group:${payload.groupId}`).emit('message:group-recording', {
        groupId: payload.groupId,
        userId: payload.userId,
        name: payload.name,
        recording: true,
      });
    }
  });

  socket.on('message:group-recording-stop', (payload: { groupId: string; userId: string }) => {
    if (payload?.groupId) {
      socket.to(`group:${payload.groupId}`).emit('message:group-recording', {
        groupId: payload.groupId,
        userId: payload.userId,
        recording: false,
      });
    }
  });

  socket.on('message:recording-start', (payload: { conversationId: string; userId: string; name?: string }) => {
    if (payload?.conversationId) {
      socket.to(`conversation:${payload.conversationId}`).emit('message:recording', {
        userId: payload.userId,
        name: payload.name,
        recording: true,
      });
    }
  });

  socket.on('message:recording-stop', (payload: { conversationId: string; userId: string }) => {
    if (payload?.conversationId) {
      socket.to(`conversation:${payload.conversationId}`).emit('message:recording', {
        userId: payload.userId,
        recording: false,
      });
    }
  });

  // Direct call signaling (invite / accept / decline / end)
  socket.on('call:invite', async (payload: { toUserId: string; fromUserId: string; callId?: string; type?: 'audio' | 'video'; callerName?: string; callerAvatar?: string }) => {
    if (!payload?.toUserId || !payload?.fromUserId) return;
    const actorId = (socket.data as { userId?: string }).userId;
    if (!actorId || actorId !== payload.fromUserId) return;
    const callId = payload.callId || `call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const callType: 'audio' | 'video' = payload.type === 'video' ? 'video' : 'audio';
    const calleeRoom = `user:${payload.toUserId}`;
    io.to(calleeRoom).emit('call:invite', { ...payload, callId, type: callType, toUserId: payload.toUserId });
    let receiverReachable = false;
    try {
      const calleeSockets = await io.in(calleeRoom).fetchSockets();
      receiverReachable = calleeSockets.length > 0;
      if (!receiverReachable) {
        logger.info('call:invite — destinataire hors ligne (socket)', {
          callId,
          toUserId: payload.toUserId,
        });
      }
    } catch {
      /* fetchSockets indisponible — push + notif DB restent actifs */
    }
    socket.emit('call:invite:ack', {
      callId,
      type: callType,
      toUserId: payload.toUserId,
      receiverReachable,
    });
    await upsertDirectCallState(callId, payload.fromUserId, payload.toUserId, 'pending');
    clearPendingCall(callId);
    pendingCallMeta.set(callId, {
      toUserId: payload.toUserId,
      fromUserId: payload.fromUserId,
      callId,
      type: callType,
      callerName: payload.callerName,
    });
    try {
      await recordCallLogMessage({
        callId,
        callerId: payload.fromUserId,
        receiverId: payload.toUserId,
        media: callType,
        outcome: 'incoming',
        callerName: payload.callerName,
      });
    } catch (err) {
      logger.warn('Incoming call log failed', { callId, err });
    }
    pendingCallTimers.set(
      callId,
      setTimeout(async () => {
        const meta = pendingCallMeta.get(callId);
        clearPendingCall(callId);
        if (!meta) return;
        io.to(`user:${meta.fromUserId}`).emit('call:missed', {
          callId: meta.callId,
          fromUserId: meta.fromUserId,
          toUserId: meta.toUserId,
          type: meta.type,
        });
        io.to(`user:${meta.toUserId}`).emit('call:missed', {
          callId: meta.callId,
          fromUserId: meta.fromUserId,
          toUserId: meta.toUserId,
          type: meta.type,
        });
        await upsertDirectCallState(meta.callId, meta.fromUserId, meta.toUserId, 'missed');
        try {
          await recordCallLogMessage({
            callId: meta.callId,
            callerId: meta.fromUserId,
            receiverId: meta.toUserId,
            media: meta.type,
            outcome: 'missed',
            callerName: meta.callerName,
          });
        } catch (err) {
          logger.warn('Missed call log failed', { callId: meta.callId, err });
        }
      }, CALL_RING_TIMEOUT_MS)
    );
    try {
      const callKind = callType === 'video' ? 'vidéo' : 'audio';
      const callerId = payload.fromUserId;
      const actionUrls = {
        answerAudio: `/DirectCall?mode=incoming&callId=${encodeURIComponent(callId)}&callerId=${encodeURIComponent(callerId)}&type=audio&autoAccept=1`,
        answerVideo: `/DirectCall?mode=incoming&callId=${encodeURIComponent(callId)}&callerId=${encodeURIComponent(callerId)}&type=video&autoAccept=1`,
        message: `/Chat?userId=${encodeURIComponent(callerId)}&source=incoming-call`,
      };
      await notificationService.create(payload.toUserId, {
        type: 'call_incoming',
        title: 'Appel entrant',
        message: `${payload.callerName || 'Quelqu’un'} vous appelle (${callKind})`,
        reference_type: 'direct_call',
        reference_id: callId,
        data: {
          callId,
          callerId,
          callMediaType: callType,
          callerName: payload.callerName || '',
          callerAvatar: payload.callerAvatar || '',
          actions: [
            { action: 'answer-audio', title: 'Répondre audio' },
            { action: 'answer-video', title: 'Répondre vidéo' },
            { action: 'send-message', title: 'Message' },
          ],
          actionUrls,
        },
      });
      void dispatchIncomingCallMobileWakePush({
        toUserId: payload.toUserId,
        callId,
        fromUserId: payload.fromUserId,
        type: callType,
        callerName: payload.callerName,
        callerAvatar: payload.callerAvatar,
      }).catch((err) => {
        logger.warn('Incoming call mobile wake push failed', { callId, err });
      });
    } catch (err) {
      logger.warn('Incoming call notification failed from socket', {
        toUserId: payload.toUserId,
        fromUserId: payload.fromUserId,
        callId: payload.callId,
        err,
      });
    }
  });

  socket.on('call:accept', async (payload: { toUserId: string; fromUserId: string; callId?: string; type?: 'audio' | 'video' }) => {
    if (!payload?.toUserId || !payload?.fromUserId || !payload?.callId) return;
    const actorId = (socket.data as { userId?: string }).userId;
    if (!actorId || actorId !== payload.fromUserId) return;
    clearPendingCallTimer(payload.callId);
    if (payload.callId) await upsertDirectCallState(payload.callId, payload.toUserId, payload.fromUserId, 'active');
    io.to(`user:${payload.toUserId}`).emit('call:accept', payload);
  });

  socket.on('call:decline', async (payload: { toUserId: string; fromUserId: string; callId?: string; reason?: string }) => {
    if (!payload?.toUserId || !payload?.fromUserId) return;
    const actorId = (socket.data as { userId?: string }).userId;
    if (!actorId || actorId !== payload.fromUserId) return;
    const meta = payload.callId ? pendingCallMeta.get(payload.callId) : undefined;
    clearPendingCall(payload.callId);
    const callerId = payload.toUserId;
    const receiverId = payload.fromUserId;
    if (payload.callId) await upsertDirectCallState(payload.callId, callerId, receiverId, 'declined');
    io.to(`user:${payload.toUserId}`).emit('call:decline', payload);
    const callId = payload.callId || '';
    if (callId) {
      try {
        await recordCallLogMessage({
          callId,
          callerId,
          receiverId,
          media: meta?.type ?? 'audio',
          outcome: 'declined',
          callerName: meta?.callerName,
        });
      } catch (err) {
        logger.warn('Declined call log failed', { callId, err });
      }
    }
  });

  socket.on(
    'call:end',
    async (payload: {
      toUserId?: string;
      fromUserId?: string;
      callId?: string;
      endedBy?: string;
      reason?: 'completed' | 'cancelled' | 'missed' | 'declined' | 'failed';
      durationSec?: number;
    }) => {
    if (!payload) return;
    const actorId = (socket.data as { userId?: string }).userId;
    if (!actorId || !payload.fromUserId || actorId !== payload.fromUserId) return;
    const callId = payload.callId || '';
    const meta = callId ? pendingCallMeta.get(callId) : undefined;
    clearPendingCall(callId);

    let dbStatus: 'completed' | 'cancelled' | 'missed' | 'ended' = 'completed';
    let outcome: 'completed' | 'cancelled' | 'missed' = 'completed';
    const reason = payload.reason;

    if (reason === 'cancelled') {
      dbStatus = 'cancelled';
      outcome = 'cancelled';
    } else if (reason === 'missed') {
      dbStatus = 'missed';
      outcome = 'missed';
    } else if (reason === 'failed') {
      dbStatus = 'ended';
      outcome = 'cancelled';
    } else if (reason === 'declined') {
      dbStatus = 'declined' as typeof dbStatus;
      outcome = 'cancelled';
    }

    if (callId && payload.fromUserId && payload.toUserId) {
      let callerId = meta?.fromUserId ?? payload.fromUserId;
      let receiverId = meta?.toUserId ?? payload.toUserId;
      try {
        const existing = await prisma.directCall.findUnique({ where: { id: callId } });
        if (existing) {
          callerId = existing.caller_id;
          receiverId = existing.receiver_id;
          if (existing.status === 'pending' && !reason) {
            const endedBy = payload.endedBy || payload.fromUserId;
            if (endedBy === existing.caller_id) {
              dbStatus = 'cancelled';
              outcome = 'cancelled';
            } else {
              dbStatus = 'missed';
              outcome = 'missed';
            }
          } else if (existing.status === 'active') {
            dbStatus = 'completed';
            outcome = 'completed';
          }
        }
      } catch {
        /* ignore */
      }

      await upsertDirectCallState(callId, callerId, receiverId, dbStatus);
      const durationSec =
        typeof payload.durationSec === 'number'
          ? Math.max(0, Math.floor(payload.durationSec))
          : undefined;
      if (outcome === 'completed' || outcome === 'cancelled' || outcome === 'missed') {
        try {
          await recordCallLogMessage({
            callId,
            callerId,
            receiverId,
            media: meta?.type ?? 'audio',
            outcome,
            durationSec: outcome === 'completed' ? durationSec : 0,
            callerName: meta?.callerName,
          });
        } catch (err) {
          logger.warn('Call end log failed', { callId, outcome, err });
        }
      }
    }

    if (payload.toUserId) io.to(`user:${payload.toUserId}`).emit('call:end', payload);
    if (payload.fromUserId) io.to(`user:${payload.fromUserId}`).emit('call:end', payload);
  });

  socket.on('call:signal', (payload: { toUserId: string; fromUserId: string; callId: string; signal: any }) => {
    if (!payload?.toUserId || !payload?.fromUserId || !payload?.callId || !payload?.signal) return;
    const actorId = (socket.data as { userId?: string }).userId;
    if (!actorId || !canRelayDirectCallEvent(payload, actorId)) return;
    io.to(`user:${payload.toUserId}`).emit('call:signal', payload);
  });

  /** Réaction emoji pendant un appel 1-1 — relais temps réel (pas de persistance serveur). */
  socket.on(
    'call:reaction',
    (payload: { toUserId: string; fromUserId: string; callId: string; emoji: string }) => {
      if (!payload?.toUserId || !payload?.fromUserId || !payload?.callId || typeof payload.emoji !== 'string') return;
      const actorId = (socket.data as { userId?: string }).userId;
      if (!actorId || !canRelayDirectCallEvent(payload, actorId)) return;
      const emoji = payload.emoji.trim().slice(0, 16);
      if (!emoji) return;
      io.to(`user:${payload.toUserId}`).emit('call:reaction', { ...payload, emoji });
    },
  );

  /** Lever / baisser la main — relais à l’autre participant. */
  socket.on(
    'call:raise_hand',
    (payload: { toUserId: string; fromUserId: string; callId: string; raised: boolean }) => {
      if (!payload?.toUserId || !payload?.fromUserId || !payload?.callId || typeof payload.raised !== 'boolean') return;
      const actorId = (socket.data as { userId?: string }).userId;
      if (!actorId || !canRelayDirectCallEvent(payload, actorId)) return;
      io.to(`user:${payload.toUserId}`).emit('call:raise_hand', payload);
    },
  );

  /** État partage d’écran (signal UX ; média géré en WebRTC côté clients). */
  socket.on(
    'call:screen_share',
    (payload: { toUserId: string; fromUserId: string; callId: string; active: boolean }) => {
      if (!payload?.toUserId || !payload?.fromUserId || !payload?.callId || typeof payload.active !== 'boolean') return;
      const actorId = (socket.data as { userId?: string }).userId;
      if (!actorId || !canRelayDirectCallEvent(payload, actorId)) return;
      io.to(`user:${payload.toUserId}`).emit('call:screen_share', payload);
    },
  );

  /** Passage vocal → vidéo en cours d’appel (re-négociation WebRTC côté clients). */
  socket.on(
    'call:upgrade',
    (payload: { toUserId: string; fromUserId: string; callId: string; active: boolean }) => {
      if (!payload?.toUserId || !payload?.fromUserId || !payload?.callId || typeof payload.active !== 'boolean') return;
      const actorId = (socket.data as { userId?: string }).userId;
      if (!actorId || !canRelayDirectCallEvent(payload, actorId)) return;
      io.to(`user:${payload.toUserId}`).emit('call:upgrade', payload);
    },
  );

  /**
   * Invitation d’un tiers pendant un appel 1-1 — relais + notification push (pas de fusion média multi‑participant ici).
   */
  socket.on(
    'call:participant-invite',
    async (payload: {
      callId?: string;
      fromUserId?: string;
      invitedUserId?: string;
      peerUserId?: string;
      type?: 'audio' | 'video';
      inviterName?: string;
    }) => {
      if (!payload?.callId || !payload?.fromUserId || !payload?.invitedUserId) return;
      if (payload.invitedUserId === payload.fromUserId) return;
      io.to(`user:${payload.invitedUserId}`).emit('call:participant-invite', payload);
      try {
        const mediaKind = payload.type === 'video' ? 'vidéo' : 'audio';
        await notificationService.create(payload.invitedUserId, {
          type: 'call_participant_invite',
          title: 'Invitation à un appel',
          message: `${(payload.inviterName || 'Un contact').slice(0, 80)} vous invite à rejoindre un appel ${mediaKind}`,
          reference_type: 'direct_call',
          reference_id: payload.callId,
          data: {
            callId: payload.callId,
            callerId: payload.fromUserId,
            peerUserId: payload.peerUserId || '',
            callMediaType: payload.type === 'video' ? 'video' : 'audio',
            mode: 'join_existing_call',
          },
        });
      } catch (err) {
        logger.warn('call:participant-invite notification failed', { err });
      }
    },
  );

  // Live: join stream room (pour recevoir chat, gifts, viewers, like)
  socket.on('live:join-room', (streamId: string) => {
    if (streamId) {
      socket.join(`stream:${streamId}`);
      logger.info('Socket joined live room', { streamId, socketId: socket.id });
      try {
        // C — envoyer l’état du timer commun s’il existe (reconnexion / arrivée tardive).
        const liveSvc = require('./services/live.service.js').default;
        const t = typeof liveSvc.getBroadcastTimer === 'function' ? liveSvc.getBroadcastTimer(streamId) : null;
        if (t) socket.emit('live:timer', t);
      } catch {
        /* ignore */
      }
    }
  });

  socket.on('live:leave-room', (streamId: string) => {
    if (streamId) socket.leave(`stream:${streamId}`);
  });

  /**
   * Cœurs flottants TikTok-like — relay best-effort sans persistance.
   * Le client émet { liveId, count } quand un viewer tap pour liker.
   * On rediffuse à tous les autres viewers du stream (sauf l'émetteur).
   * Rate-limit côté serveur : max 30 events/min/socket (anti-spam).
   */
  const heartsRateLimit = new Map<string, number[]>();
  socket.on('live:hearts', (payload: { liveId?: string; count?: number }) => {
    const liveId = String(payload?.liveId || '').trim();
    if (!liveId) return;
    const count = Math.min(20, Math.max(1, Number(payload?.count || 1)));
    const now = Date.now();
    const arr = (heartsRateLimit.get(socket.id) || []).filter((t) => now - t < 60_000);
    if (arr.length >= 30) return; // anti-spam
    arr.push(now);
    heartsRateLimit.set(socket.id, arr);
    socket.to(`stream:${liveId}`).emit('live:hearts', { liveId, count });
  });
});

// Export io for use in routes
export { io };

/** Arrêt propre : ferme le serveur HTTP puis déconnexion DB (K8s, Docker, Render). */
function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  httpServer.close(() => {
    logger.info('HTTP server closed');
    prisma.$disconnect()
      .then(() => {
        logger.info('Database disconnected');
        process.exit(0);
      })
      .catch((err: Error) => {
        logger.error('Error disconnecting database', err);
        process.exit(1);
      });
  });
  setTimeout(() => {
    logger.warn('Forced shutdown after timeout');
    process.exit(1);
  }, GRACEFUL_SHUTDOWN_TIMEOUT_MS);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Démarrer après connexion DB pour éviter erreurs "credentials (not available)" / "Server has closed the connection" (notamment sur Render)
async function startServer() {
  if (process.env.NODE_ENV !== 'test') console.log('[api] Démarrage serveur HTTP…');
  await ensureDbConnected();
  httpServer.listen(PORT, '0.0.0.0', async () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📡 WebSocket server ready`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    const redis = await initRedis();
    if (redis) logger.info('✅ Cache Redis initialisé');
    else logger.info('ℹ️ Cache: mémoire locale (REDIS_URL absent ou connexion indisponible)');

    const { attachSocketIoRedisAdapterWithRetry } = await import('./realtime/socketCluster.js');
    const cluster = await attachSocketIoRedisAdapterWithRetry(io);
    if (cluster.mode === 'redis') {
      logger.info('✅ Socket.io Redis adapter activé (multi-nœuds)', { attempts: cluster.attempts });
    } else if (process.env.REDIS_URL?.trim()) {
      logger.warn('ℹ️ Socket.io sans adapter Redis — single-node', { lastError: cluster.lastError });
    }

    const r2Config = await import('./config/cloudflare-r2.js');
    if (r2Config.isR2Configured()) {
      logger.info('✅ Stockage R2 configuré (upload images/vidéos disponible)');
    } else {
      const missing = r2Config.getR2ConfigDiagnostic();
      if (!r2Config.R2_PUBLIC_URL?.trim()) missing.push('R2_PUBLIC_URL (vide ou absent)');
      logger.warn('⚠️ R2 non configuré: upload indisponible. Variables à définir sur l’hébergeur:', { missing });
    }

    // Pooler Supabase : laisser le pool se stabiliser après $connect() avant transactions (évite circuit breaker)
    const STARTUP_DELAY_MS = 2500;
    setTimeout(async () => {
      try {
        try {
          await initializeRetentionPolicies();
        } catch (e) {
          logger.warn('Init politiques de rétention reportée (circuit breaker / pool)', { error: (e as Error)?.message });
        }
        const commissionSettingsService = (await import('./services/commissionSettings.service.js')).default;
        await commissionSettingsService.loadFromDb().catch(() => {});

        startAccountDeletionJobs();
        startDataRetentionJob();
        startAdsExpirationJob();
        startLiveScheduledReminderJob();
        startStarCallReminderJob();
        startScheduledMessagesJob();
        startCrowdfundingFailedRefundsJob();
        startModerationTimeoutJob();
        startE2eeMonitoringAlertJob();
        startVideoLowQualityBackfillJob();

        logger.info('✅ Jobs automatiques démarrés');
        logger.info('🛡️ Sécurité: Rate limiting + Anti-bot + Chiffrement ACTIVÉS');
      } catch (err) {
        logger.error('Erreur post-démarrage (rétention / jobs):', { error: (err as Error)?.message });
      }
    }, STARTUP_DELAY_MS);
  } catch (err) {
    logger.error('Erreur post-démarrage (Redis / rétention / jobs):', { error: err });
  }
  });
}

startServer().catch((err) => {
  logger.error('Démarrage serveur échoué', { error: err });
  process.exit(1);
});
