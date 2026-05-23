/**
 * CPO 4.36 — Envoi des messages programmés dont l'heure est due
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import messageService from '../services/message.service.js';
import { deliverScheduledGroupMessage } from '../services/messageGroup.service.js';

export async function processScheduledMessages(): Promise<{ processed: number; errors: number }> {
  const now = new Date();
  const due = await prisma.message.findMany({
    where: {
      status: 'scheduled',
      scheduled_at: { not: null, lte: now },
    },
    select: { id: true },
    take: 100,
  });

  let processed = 0;
  let errors = 0;

  for (const msg of due) {
    try {
      const ok = await messageService.deliverScheduledMessage(msg.id);
      if (ok) processed++;
    } catch (e) {
      errors++;
      logger.warn('Erreur envoi message programmé', { messageId: msg.id, err: (e as Error).message });
    }
  }

  const dueGroups = await prisma.groupMessage.findMany({
    where: {
      status: 'scheduled',
      scheduled_at: { not: null, lte: now },
    },
    select: { id: true },
    take: 100,
  });

  for (const msg of dueGroups) {
    try {
      const ok = await deliverScheduledGroupMessage(msg.id);
      if (ok) processed++;
    } catch (e) {
      errors++;
      logger.warn('Erreur envoi message groupe programmé', { messageId: msg.id, err: (e as Error).message });
    }
  }

  if (due.length > 0 || dueGroups.length > 0) {
    logger.info('Job messages programmés', {
      dmDue: due.length,
      groupDue: dueGroups.length,
      processed,
      errors,
    });
  }

  return { processed, errors };
}

const INTERVAL_MS = 60 * 1000; // toutes les 1 min

export function startScheduledMessagesJob() {
  setInterval(async () => {
    try {
      await processScheduledMessages();
    } catch (e) {
      logger.error('Scheduled messages job error', e);
    }
  }, INTERVAL_MS);
  logger.info('Job messages programmés démarré (toutes les 1 min)');
}
