import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initSentry } from './config/sentry.js';
import app from './app.js';
import { logger } from './utils/logger.js';
import messageService from './services/message.service.js';
import { setMessageIo } from './services/message.service.js';
import { startAccountDeletionJobs } from './jobs/accountDeletion.job.js';
import { startDataRetentionJob, initializeRetentionPolicies } from './jobs/dataRetention.job.js';
import { startAdsExpirationJob } from './jobs/adsExpiration.job.js';
import { startLiveScheduledReminderJob } from './jobs/liveScheduledReminder.job.js';
import { startModerationTimeoutJob } from './jobs/moderationTimeout.job.js';
import { initRedis } from './utils/cache.js';

const socketToUserId = new Map<string, string>();

dotenv.config();

// Sentry doit être initialisé avant toute création d’app (handlers dans app.ts)
initSentry();

if (process.env.NODE_ENV === 'production') {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter((k) => !process.env[k]?.trim());
  if (missing.length) {
    logger.error('Variables d’environnement manquantes en production: ' + missing.join(', '));
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
const corsOrigins = [
  ...(process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== '*'),
  'http://localhost:5173',
  'https://afri-wonder.vercel.app',
  'https://afriwonder.vercel.app',
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

// Start server — écouter sur 0.0.0.0 pour accepter les connexions externes (Railway, Docker, Render)
httpServer.listen(PORT, '0.0.0.0', async () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📡 WebSocket server ready`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    const redis = await initRedis();
    if (redis) logger.info('✅ Cache Redis initialisé');
    else logger.info('ℹ️ Cache: mémoire locale (REDIS_URL absent ou connexion indisponible)');

    await initializeRetentionPolicies();

    startAccountDeletionJobs();
    startDataRetentionJob();
    startAdsExpirationJob();
    startLiveScheduledReminderJob();
    startModerationTimeoutJob();

    logger.info('✅ Jobs automatiques démarrés');
    logger.info('🛡️ Sécurité: Rate limiting + Anti-bot + Chiffrement ACTIVÉS');
  } catch (err) {
    logger.error('Erreur post-démarrage (Redis / rétention / jobs):', err);
  }
});
