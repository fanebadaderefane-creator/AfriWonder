/**
 * CDC: Levée automatique des timeouts courts (suspension_hours)
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

export async function processSuspensionTimeouts() {
  try {
    const now = new Date();
    const expired = await prisma.userStrike.findMany({
      where: {
        suspension_hours: { not: null },
        user: { account_suspended: true },
      },
      include: { user: true },
    });

    let unsuspended = 0;
    for (const strike of expired) {
      const hours = strike.suspension_hours ?? 0;
      const createdAt = new Date(strike.created_at);
      const expiresAt = new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
      if (now >= expiresAt) {
        await prisma.user.update({
          where: { id: strike.user_id },
          data: {
            account_suspended: false,
            suspended_at: null,
            suspended_reason: null,
          },
        });
        unsuspended++;
        logger.info('Timeout levé', { userId: strike.user_id, infraction: strike.infraction });
      }
    }
    return { success: true, unsuspended };
  } catch (error) {
    logger.error('Job levée timeouts', { err: (error as Error).message });
    throw error;
  }
}

export function startModerationTimeoutJob() {
  const intervalMs = 5 * 60 * 1000; // toutes les 5 min
  setInterval(async () => {
    try {
      await processSuspensionTimeouts();
    } catch (e) {
      logger.error('Moderation timeout job error', e);
    }
  }, intervalMs);
  logger.info('Job levée timeouts démarré (toutes les 5 min)');
}
