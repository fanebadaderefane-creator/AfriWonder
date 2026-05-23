/**
 * CDC Live Streaming Mali: Rappel live programmé 15 min avant
 * Notification push aux abonnés du créateur
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

const REMINDER_MINUTES_BEFORE = 15;

export async function processScheduledLiveReminders() {
  try {
    const now = new Date();
    const in15Min = new Date(now.getTime() + REMINDER_MINUTES_BEFORE * 60 * 1000);

    const upcomingLives = await prisma.liveStream.findMany({
      where: {
        status: 'scheduled',
        scheduled_reminder_sent_at: null,
        scheduled_at: {
          gte: now,
          lte: in15Min,
        },
      },
      include: {
        creator: {
          select: { id: true, username: true },
        },
      },
    });

    if (upcomingLives.length === 0) {
      return { success: true, sent: 0 };
    }

    let totalSent = 0;
    for (const stream of upcomingLives) {
      try {
        const followers = await prisma.follow.findMany({
          where: { following_id: stream.creator_id },
          select: { follower_id: true },
        });
        const creatorName = stream.creator?.username || 'Un créateur';

        for (const f of followers) {
          try {
            await prisma.notification.create({
              data: {
                user_id: f.follower_id,
                type: 'live_scheduled_reminder',
                title: 'Live dans 15 minutes',
                message: `${creatorName} commence un live dans 15 min : ${stream.title}`,
                reference_type: 'live',
                reference_id: stream.id,
              },
            });
            totalSent++;
          } catch (_) {}
        }
        logger.info('Rappels live programmé envoyés', { streamId: stream.id, count: followers.length });
        await prisma.liveStream.update({
          where: { id: stream.id },
          data: { scheduled_reminder_sent_at: new Date() },
        });
      } catch (e) {
        logger.warn('Erreur rappel live', { streamId: stream.id, err: (e as Error).message });
      }
    }

    return { success: true, sent: totalSent };
  } catch (error) {
    logger.error('Job rappel live programmé', { err: (error as Error).message });
    throw error;
  }
}

export function startLiveScheduledReminderJob() {
  const intervalMs = 5 * 60 * 1000; // toutes les 5 min
  setInterval(async () => {
    try {
      await processScheduledLiveReminders();
    } catch (e) {
      logger.error('Live scheduled reminder job error', e);
    }
  }, intervalMs);
  logger.info('Job rappel live programmé démarré (toutes les 5 min)');
}
