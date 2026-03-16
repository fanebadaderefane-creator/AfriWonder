// AfriWonder full review PR - CodeRabbit
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initSentry } from './config/sentry.js';
import app from './app.js';
import prisma from './config/database.js';
import { logger } from './utils/logger.js';
import messageService from './services/message.service.js';
import { setMessageIo } from './services/message.service.js';
import { startAccountDeletionJobs } from './jobs/accountDeletion.job.js';
import { startDataRetentionJob, initializeRetentionPolicies } from './jobs/dataRetention.job.js';
import { startAdsExpirationJob } from './jobs/adsExpiration.job.js';
import { startLiveScheduledReminderJob } from './jobs/liveScheduledReminder.job.js';
import { startScheduledMessagesJob } from './jobs/scheduledMessages.job.js';
import { startModerationTimeoutJob } from './jobs/moderationTimeout.job.js';
import { initRedis } from './utils/cache.js';

const socketToUserId = new Map<string, string>();
const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 30000;

// Charger backend/.env en priorité (évite qu'un .env à la racine du projet n'écrase DATABASE_URL)
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(backendRoot, '.env');
const envExamplePath = path.join(backendRoot, '.env.example');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (fs.existsSync(envExamplePath)) {
  dotenv.config({ path: envExamplePath });
} else {
  dotenv.config();
}

// Sentry doit être initialisé avant toute création d’app (handlers dans app.ts)
initSentry();

const requiredEnv = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missingEnv = requiredEnv.filter((k) => !process.env[k]?.trim());

if (process.env.NODE_ENV === 'production') {
  if (missingEnv.length) {
    logger.error('Variables d’environnement manquantes en production: ' + missingEnv.join(', '));
    process.exit(1);
  }
} else if (missingEnv.length) {
  logger.warn(
    'Variables manquantes (login renverra 500 tant qu’elles ne sont pas définies): ' + missingEnv.join(', ') +
    '. Copiez backend/.env.example vers backend/.env et renseignez les valeurs.'
  );
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

// Timeout pour requêtes longues (upload vidéo/audio) : 5 min, aligné avec le client
const UPLOAD_TIMEOUT_MS = 300000;
httpServer.timeout = UPLOAD_TIMEOUT_MS;
httpServer.keepAliveTimeout = UPLOAD_TIMEOUT_MS + 1000;
httpServer.headersTimeout = UPLOAD_TIMEOUT_MS + 2000;

const corsOrigins = [
  ...(process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== '*'),
  'http://localhost:5173',
  'https://afri-wonder.vercel.app',
  'https://afriwonder.vercel.app',
  'https://afriwonder.com',
  'https://www.afriwonder.com',
  /\.vercel\.app$/, // Préviews Vercel
].filter(Boolean);
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins.length > 0 ? corsOrigins : 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST']
  }
});

setMessageIo(io);

const PORT = parseInt(process.env.PORT || '3000', 10);

// Attendre que la DB soit prête avant d’accepter du trafic et lancer les jobs (évite "credentials (not available)" / "Server has closed the connection")
async function ensureDbConnected() {
  await prisma.$connect();
}

// WebSocket connection
io.on('connection', (socket) => {
  logger.info('WebSocket client connected', { socketId: socket.id });

  socket.on('user:join', (userId: string) => {
    if (userId) {
      socket.join(`user:${userId}`);
      socketToUserId.set(socket.id, userId);
      messageService.setPresenceOnline(userId).catch((e) => logger.warn('Presence online', e));
      logger.info('User joined room', { userId, socketId: socket.id });
    }
  });

  socket.on('user:leave', (userId: string) => {
    if (userId) {
      socket.leave(`user:${userId}`);
      socketToUserId.delete(socket.id);
      messageService.setPresenceOffline(userId).catch((e) => logger.warn('Presence offline', e));
    }
  });

  socket.on('disconnect', () => {
    const userId = socketToUserId.get(socket.id);
    if (userId) {
      messageService.setPresenceOffline(userId).catch((e) => logger.warn('Presence offline', e));
      socketToUserId.delete(socket.id);
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

  // Direct call signaling (invite / accept / decline / end)
  socket.on('call:invite', (payload: { toUserId: string; fromUserId: string; type?: 'audio' | 'video'; callerName?: string; callerAvatar?: string }) => {
    if (!payload?.toUserId || !payload?.fromUserId) return;
    io.to(`user:${payload.toUserId}`).emit('call:invite', payload);
  });

  socket.on('call:accept', (payload: { toUserId: string; fromUserId: string; type?: 'audio' | 'video' }) => {
    if (!payload?.toUserId || !payload?.fromUserId) return;
    io.to(`user:${payload.toUserId}`).emit('call:accept', payload);
  });

  socket.on('call:decline', (payload: { toUserId: string; fromUserId: string; reason?: string }) => {
    if (!payload?.toUserId || !payload?.fromUserId) return;
    io.to(`user:${payload.toUserId}`).emit('call:decline', payload);
  });

  socket.on('call:end', (payload: { toUserId?: string; fromUserId?: string; endedBy?: string }) => {
    if (!payload) return;
    if (payload.toUserId) io.to(`user:${payload.toUserId}`).emit('call:end', payload);
    if (payload.fromUserId) io.to(`user:${payload.fromUserId}`).emit('call:end', payload);
  });

  socket.on('call:signal', (payload: { toUserId: string; fromUserId: string; callId: string; signal: any }) => {
    if (!payload?.toUserId || !payload?.fromUserId || !payload?.callId || !payload?.signal) return;
    io.to(`user:${payload.toUserId}`).emit('call:signal', payload);
  });

  // Live: join stream room (pour recevoir chat, gifts, viewers, like)
  socket.on('live:join-room', (streamId: string) => {
    if (streamId) {
      socket.join(`stream:${streamId}`);
      logger.info('Socket joined live room', { streamId, socketId: socket.id });
    }
  });

  socket.on('live:leave-room', (streamId: string) => {
    if (streamId) socket.leave(`stream:${streamId}`);
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
  await ensureDbConnected();
  httpServer.listen(PORT, '0.0.0.0', async () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📡 WebSocket server ready`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    const redis = await initRedis();
    if (redis) logger.info('✅ Cache Redis initialisé');
    else logger.info('ℹ️ Cache: mémoire locale (REDIS_URL absent ou connexion indisponible)');

    // Adapter Redis pour Socket.io : scale WebSocket sur plusieurs nœuds (charges massives)
    const redisUrl = process.env.REDIS_URL?.trim();
    if (redisUrl) {
      try {
        const { createClient } = await import('redis');
        const { createAdapter } = await import('@socket.io/redis-adapter');
        const pubClient = createClient({ url: redisUrl });
        const subClient = pubClient.duplicate();
        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('✅ Socket.io Redis adapter activé (multi-nœuds)');
      } catch (adapterErr) {
        logger.warn('Socket.io Redis adapter non activé (connexion Redis Socket échouée)', { error: adapterErr });
      }
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
        startScheduledMessagesJob();
        startModerationTimeoutJob();

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
