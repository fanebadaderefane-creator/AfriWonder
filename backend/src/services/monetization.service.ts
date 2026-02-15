/**
 * AfriWonder - Système de monétisation créateurs
 * Conditions strictes: 2K abonnés, 100K vues/30j, 10 vidéos, 14j actif, engagement ≥5%, compte vérifié
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

const MIN_SUBSCRIBERS = 2000;
const MIN_VIEWS_30D = 100_000;
const MIN_VIDEOS = 10;
const MIN_ACCOUNT_DAYS = 14;
const MIN_ENGAGEMENT_PCT = 0.05;
const EARLY_ACCESS_MAX_MONETIZED = 50;

export interface MonetizationStatus {
  eligible: boolean;
  enabled: boolean;
  suspended: boolean;
  conditions: {
    subscribers: { met: boolean; current: number; required: number };
    views30d: { met: boolean; current: number; required: number };
    videos: { met: boolean; current: number; required: number };
    accountDays: { met: boolean; current: number; required: number };
    engagement: { met: boolean; current: number; required: number };
    verified: { met: boolean };
  };
  reason?: string;
}

async function getMaxMonetizedCreators(): Promise<number> {
  const row = await prisma.platformSettings.findUnique({
    where: { key: 'early_access_max_monetized_creators' },
  });
  if (!row || row.value == null) return EARLY_ACCESS_MAX_MONETIZED;
  const v = row.value as number;
  return typeof v === 'number' ? v : EARLY_ACCESS_MAX_MONETIZED;
}

export async function checkMonetizationEligibility(userId: string): Promise<MonetizationStatus> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [user, followersCount, videosCount, views30d, engagement, monetizedCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { created_at: true, monetization_enabled: true, monetization_suspended_at: true, is_verified: true },
    }),
    prisma.follow.count({ where: { following_id: userId } }),
    prisma.video.count({ where: { creator_id: userId, visibility: 'public' } }),
    prisma.video.aggregate({
      where: {
        creator_id: userId,
        created_at: { gte: thirtyDaysAgo },
      },
      _sum: { views: true },
    }),
    getEngagementRate(userId),
    prisma.user.count({ where: { monetization_enabled: true } }),
  ]);

  if (!user) {
    return {
      eligible: false,
      enabled: false,
      suspended: false,
      conditions: {} as MonetizationStatus['conditions'],
      reason: 'Utilisateur non trouvé',
    };
  }

  const subs = followersCount;
  const views = views30d._sum?.views ?? 0;
  const videos = videosCount;
  const accountDays = Math.floor((Date.now() - user.created_at.getTime()) / (1000 * 60 * 60 * 24));
  const verified = user.is_verified || false;
  const maxMonetized = await getMaxMonetizedCreators();

  const conditions = {
    subscribers: { met: subs >= MIN_SUBSCRIBERS, current: subs, required: MIN_SUBSCRIBERS },
    views30d: { met: views >= MIN_VIEWS_30D, current: views, required: MIN_VIEWS_30D },
    videos: { met: videos >= MIN_VIDEOS, current: videos, required: MIN_VIDEOS },
    accountDays: { met: accountDays >= MIN_ACCOUNT_DAYS, current: accountDays, required: MIN_ACCOUNT_DAYS },
    engagement: { met: engagement >= MIN_ENGAGEMENT_PCT, current: engagement, required: MIN_ENGAGEMENT_PCT },
    verified: { met: verified },
  };

  const allMet =
    conditions.subscribers.met &&
    conditions.views30d.met &&
    conditions.videos.met &&
    conditions.accountDays.met &&
    conditions.engagement.met &&
    conditions.verified.met;

  const slotAvailable = monetizedCount < maxMonetized;
  const eligible = allMet && slotAvailable;
  const suspended = !!user.monetization_suspended_at;

  let reason: string | undefined;
  if (suspended) reason = 'Monétisation suspendue';
  else if (!slotAvailable) reason = `Limite Early Access: ${maxMonetized} créateurs monétisés max`;
  else if (!allMet) {
    const failed = Object.entries(conditions)
      .filter(([, c]) => !('met' in c) || !(c as { met: boolean }).met)
      .map(([k]) => k);
    reason = `Conditions non remplies: ${failed.join(', ')}`;
  }

  return {
    eligible,
    enabled: user.monetization_enabled && !suspended,
    suspended,
    conditions,
    reason,
  };
}

async function getEngagementRate(creatorId: string): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [views, likes, comments] = await Promise.all([
    prisma.video.aggregate({
      where: { creator_id: creatorId, created_at: { gte: thirtyDaysAgo } },
      _sum: { views: true },
    }),
    prisma.like.count({
      where: {
        video: { creator_id: creatorId, created_at: { gte: thirtyDaysAgo } },
      },
    }),
    prisma.comment.count({
      where: {
        video: { creator_id: creatorId, created_at: { gte: thirtyDaysAgo } },
      },
    }),
  ]);

  const totalViews = views._sum?.views ?? 0;
  if (totalViews === 0) return 0;
  const engagement = (likes + comments) / totalViews;
  return Math.round(engagement * 10000) / 10000;
}

/** Créateur envoie une demande de monétisation (en attente de validation admin) */
export async function requestMonetization(userId: string): Promise<{ success: boolean; message: string }> {
  const status = await checkMonetizationEligibility(userId);
  if (!status.eligible) {
    return { success: false, message: status.reason || 'Conditions non remplies' };
  }
  const existing = await prisma.monetizationRequest.findFirst({
    where: { creator_id: userId, status: 'pending' },
  });
  if (existing) {
    return { success: false, message: 'Une demande est déjà en cours de validation' };
  }
  await prisma.monetizationRequest.create({
    data: { creator_id: userId, status: 'pending' },
  });
  logger.info('Monetization request created', { userId });
  return { success: true, message: 'Demande envoyée à AfriWonder. Vous serez notifié après validation.' };
}

/** Admin approuve une demande → active la monétisation */
export async function approveMonetizationRequest(requestId: string, adminId: string): Promise<{ success: boolean; message: string }> {
  const req = await prisma.monetizationRequest.findUnique({
    where: { id: requestId },
    include: { creator: true },
  });
  if (!req || req.status !== 'pending') {
    return { success: false, message: 'Demande introuvable ou déjà traitée' };
  }
  const status = await checkMonetizationEligibility(req.creator_id);
  if (!status.eligible) {
    await prisma.monetizationRequest.update({
      where: { id: requestId },
      data: { status: 'rejected', reviewed_by: adminId, reviewed_at: new Date(), reject_reason: status.reason },
    });
    return { success: false, message: status.reason || 'Conditions non remplies' };
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: req.creator_id },
      data: { monetization_enabled: true, monetization_suspended_at: null },
    }),
    prisma.monetizationRequest.update({
      where: { id: requestId },
      data: { status: 'approved', reviewed_by: adminId, reviewed_at: new Date() },
    }),
  ]);
  logger.info('Monetization approved by admin', { requestId, creatorId: req.creator_id, adminId });
  return { success: true, message: 'Monétisation activée' };
}

/** Admin rejette une demande */
export async function rejectMonetizationRequest(requestId: string, adminId: string, reason?: string): Promise<{ success: boolean; message: string }> {
  const req = await prisma.monetizationRequest.findUnique({ where: { id: requestId } });
  if (!req || req.status !== 'pending') {
    return { success: false, message: 'Demande introuvable ou déjà traitée' };
  }
  await prisma.monetizationRequest.update({
    where: { id: requestId },
    data: { status: 'rejected', reviewed_by: adminId, reviewed_at: new Date(), reject_reason: reason },
  });
  logger.info('Monetization rejected by admin', { requestId, adminId });
  return { success: true, message: 'Demande rejetée' };
}

/** Liste des demandes en attente (admin) */
export async function getPendingMonetizationRequests(): Promise<any[]> {
  try {
    if (prisma.monetizationRequest) {
      return prisma.monetizationRequest.findMany({
        where: { status: 'pending' },
        include: {
          creator: {
            select: { id: true, username: true, full_name: true, email: true, profile_image: true },
          },
        },
        orderBy: { created_at: 'asc' },
      });
    }
  } catch {
    // fallback si modèle absent ou erreur
  }
  // Fallback SQL brut si MonetizationRequest non disponible dans le client
  try {
    const rows = await prisma.$queryRaw<
      { id: string; creator_id: string; status: string; created_at: Date; username: string | null; full_name: string | null; email: string; profile_image: string | null }[]
    >`
      SELECT mr.id, mr.creator_id, mr.status, mr.created_at,
             u.username, u.full_name, u.email, u.profile_image
      FROM "MonetizationRequest" mr
      JOIN "User" u ON u.id = mr.creator_id
      WHERE mr.status = 'pending'
      ORDER BY mr.created_at ASC
    `;
    return rows.map((r) => ({
      id: r.id,
      creator_id: r.creator_id,
      status: r.status,
      created_at: r.created_at,
      creator: {
        id: r.creator_id,
        username: r.username,
        full_name: r.full_name,
        email: r.email,
        profile_image: r.profile_image,
      },
    }));
  } catch (err) {
    logger.warn('getPendingMonetizationRequests fallback failed', { err });
    return [];
  }
}

export async function enableMonetization(userId: string): Promise<{ success: boolean; message: string }> {
  const status = await checkMonetizationEligibility(userId);
  if (!status.eligible) {
    return { success: false, message: status.reason || 'Conditions non remplies' };
  }
  await prisma.user.update({
    where: { id: userId },
    data: { monetization_enabled: true, monetization_suspended_at: null },
  });
  logger.info('Monetization enabled', { userId });
  return { success: true, message: 'Monétisation activée' };
}

export async function suspendMonetization(userId: string, reason?: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { monetization_enabled: false, monetization_suspended_at: new Date() },
  });
  logger.warn('Monetization suspended', { userId, reason });
}

export async function recheckAndSuspendIfNeeded(userId: string): Promise<boolean> {
  const status = await checkMonetizationEligibility(userId);
  if (status.enabled && !status.eligible) {
    await suspendMonetization(userId, status.reason);
    return true;
  }
  return false;
}
