/**
 * CDC Live Streaming Mali - Grille sanctions.
 * 3 strikes = suspension définitive du compte.
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import notificationService from './notification.service.js';

const STRIKES_BEFORE_BAN = 3;

/** Grille CDC: 1ère fois → avertissement/timeout, récidive → suspension. suspensionHours pour timeout court. */
const CDC_GRID: Record<string, { first: { strike: boolean; suspensionDays?: number; suspensionHours?: number }; repeat: { strike: boolean; suspensionDays?: number } }> = {
  inappropriate_language: { first: { strike: false }, repeat: { strike: true, suspensionDays: 1 } },
  spam: { first: { strike: true, suspensionHours: 1 }, repeat: { strike: true, suspensionDays: 7 } }, // CDC: 1ère 1h, récidive 7j
  violence: { first: { strike: true, suspensionDays: 7 }, repeat: { strike: true, suspensionDays: 7 } },
  nudity: { first: { strike: true, suspensionDays: 1 }, repeat: { strike: true, suspensionDays: 30 } },
  harassment: { first: { strike: true, suspensionDays: 7 }, repeat: { strike: true, suspensionDays: 0 } }, // 0 = permanent
  cp: { first: { strike: true, suspensionDays: 0 }, repeat: { strike: true, suspensionDays: 0 } }, // ban immédiat
  copyright: { first: { strike: true, suspensionDays: 0 }, repeat: { strike: true, suspensionDays: 30 } },
  fraud: { first: { strike: true, suspensionDays: 0 }, repeat: { strike: true, suspensionDays: 0 } },
  algorithm_manipulation: { first: { strike: true, suspensionDays: 0 }, repeat: { strike: true, suspensionDays: 30 } },
};

export type InfractionType = keyof typeof CDC_GRID;

export async function addStrike(userId: string, data: {
  infraction: InfractionType;
  reason: string;
  contextType?: string;
  contextId?: string;
  issuedBy: string;
}): Promise<{ strike: { id: string }; strikesCount: number; banned: boolean }> {
  const grid = CDC_GRID[data.infraction] || CDC_GRID.spam;
  const strikes = await prisma.userStrike.findMany({ where: { user_id: userId }, orderBy: { created_at: 'desc' } });
  const sameInfractionCount = strikes.filter((s) => s.infraction === data.infraction).length;
  const isRepeat = sameInfractionCount >= 1;
  const rule = isRepeat ? grid.repeat : grid.first;

  const suspensionHours = 'suspensionHours' in rule ? (rule as any).suspensionHours : null;
  let suspensionDays: number | null = rule.suspensionDays ?? null;
  if (rule.suspensionDays === 0 && data.infraction === 'harassment' && isRepeat) suspensionDays = null; // permanent

  const strike = await prisma.userStrike.create({
    data: {
      user_id: userId,
      infraction: data.infraction,
      reason: data.reason,
      context_type: data.contextType,
      context_id: data.contextId,
      issued_by: data.issuedBy,
      suspension_days: suspensionHours ? null : suspensionDays,
      suspension_hours: suspensionHours ?? null,
      severity: ['cp', 'fraud', 'harassment'].includes(data.infraction) ? 'critical' : 'high',
    },
  });

  const totalStrikes = strikes.length + 1;
  let banned = false;

  if (suspensionHours && suspensionHours > 0) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + suspensionHours);
    await prisma.user.update({
      where: { id: userId },
      data: {
        account_suspended: true,
        suspended_at: new Date(),
        suspended_reason: `Timeout: ${data.infraction} (${suspensionHours}h)`,
      },
    });
    await notificationService.create(userId, {
      type: 'moderation_suspension',
      title: 'Timeout',
      message: `Votre compte est en timeout pendant ${suspensionHours} heure(s) : ${data.reason}`,
      reference_type: 'strike',
      reference_id: strike.id,
    });
  } else if (suspensionDays !== null && suspensionDays > 0) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + suspensionDays);
    await prisma.user.update({
      where: { id: userId },
      data: {
        account_suspended: true,
        suspended_at: new Date(),
        suspended_reason: `Strike: ${data.infraction} (${suspensionDays}j)`,
      },
    });
    await notificationService.create(userId, {
      type: 'moderation_suspension',
      title: 'Compte suspendu',
      message: `Votre compte est suspendu pendant ${suspensionDays} jour(s) : ${data.reason}`,
      reference_type: 'strike',
      reference_id: strike.id,
    });
  } else if (suspensionDays === 0 && (data.infraction === 'cp' || data.infraction === 'fraud' || (data.infraction === 'harassment' && isRepeat))) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        account_suspended: true,
        suspended_at: new Date(),
        suspended_reason: `Ban définitif: ${data.infraction}`,
      },
    });
    banned = true;
    await notificationService.create(userId, {
      type: 'moderation_ban',
      title: 'Compte banni',
      message: `Votre compte a été banni définitivement : ${data.reason}`,
      reference_type: 'strike',
      reference_id: strike.id,
    });
  } else if (rule.strike) {
    await notificationService.create(userId, {
      type: 'moderation_warning',
      title: 'Avertissement',
      message: `Strike enregistré (${totalStrikes}/${STRIKES_BEFORE_BAN}) : ${data.reason}`,
      reference_type: 'strike',
      reference_id: strike.id,
    });
  }

  if (totalStrikes >= STRIKES_BEFORE_BAN && !banned) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        account_suspended: true,
        suspended_at: new Date(),
        suspended_reason: `3 strikes = suspension définitive`,
      },
    });
    banned = true;
    await notificationService.create(userId, {
      type: 'moderation_ban',
      title: 'Compte suspendu définitivement',
      message: `Vous avez atteint ${STRIKES_BEFORE_BAN} strikes. Votre compte est suspendu définitivement.`,
      reference_type: 'strike',
      reference_id: strike.id,
    });
  }

  logger.info('Strike ajouté', { userId, infraction: data.infraction, totalStrikes, banned });
  return { strike: { id: strike.id }, strikesCount: totalStrikes, banned };
}

export async function getStrikes(userId: string) {
  return prisma.userStrike.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    take: 50,
  });
}

export async function getStrikesCount(userId: string): Promise<number> {
  return prisma.userStrike.count({ where: { user_id: userId } });
}
