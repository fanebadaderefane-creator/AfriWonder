import { logger } from '../utils/logger.js';
import starCallService from '../services/starCall.service.js';

const INTERVAL_MS = 5 * 60 * 1000;

export async function processStarCallRemindersJob() {
  try {
    const out = await starCallService.processUpcomingReminders();
    if (out.sent > 0) {
      logger.info('Star call reminders sent', out);
    }
    return out;
  } catch (error) {
    logger.error('Star call reminder job error', { error: (error as Error).message });
    throw error;
  }
}

export function startStarCallReminderJob() {
  setInterval(() => {
    void processStarCallRemindersJob().catch(() => null);
  }, INTERVAL_MS);
  logger.info('Star call reminder job started (every 5 min)');
}
