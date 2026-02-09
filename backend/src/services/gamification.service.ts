import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

const XP_UPLOAD_VIDEO = 50;
const XP_ENROLL_COURSE = 30;
const XP_COMPLETE_COURSE = 100;
const XP_FIRST_SALE = 80;
const XP_100_FOLLOWERS = 200;
const XP_1000_POINTS = 0; // badge/milestone, pas de XP en plus
const LEVEL_XP_BASE = 100;
const LEVEL_XP_MULTIPLIER = 1.5;

/**
 * Récupère ou crée le UserLevel pour un utilisateur.
 */
async function getOrCreateUserLevel(userId: string) {
  let ul = await prisma.userLevel.findUnique({
    where: { user_id: userId },
  });
  if (!ul) {
    ul = await prisma.userLevel.create({
      data: {
        user_id: userId,
        level: 1,
        xp: 0,
        next_level_xp: LEVEL_XP_BASE,
      },
    });
  }
  return ul;
}

/**
 * Calcule next_level_xp pour un niveau donné.
 */
function xpForLevel(level: number): number {
  return Math.floor(LEVEL_XP_BASE * Math.pow(LEVEL_XP_MULTIPLIER, level - 1));
}

/**
 * Calcule l'XP total cumulé (pour seuil badge 1000 points).
 */
function totalXp(level: number, currentXp: number): number {
  let total = currentXp;
  for (let i = 1; i < level; i++) total += xpForLevel(i);
  return total;
}

const BADGE_1000_POINTS = '1000_points';

/**
 * Débloque le badge "1000 points" si l'utilisateur atteint 1000 XP total (une seule fois).
 */
async function awardBadge1000PointsIfEligible(userId: string, level: number, xp: number): Promise<void> {
  if (totalXp(level, xp) < 1000) return;
  try {
    let badge = await prisma.badge.findUnique({ where: { name: BADGE_1000_POINTS } });
    if (!badge) {
      badge = await prisma.badge.create({
        data: {
          name: BADGE_1000_POINTS,
          icon: '🏆',
          description: 'Atteint 1000 XP',
          category: 'gamification',
          requirement: '1000 XP total',
        },
      });
    }
    await prisma.userBadge.upsert({
      where: { user_id_badge_id: { user_id: userId, badge_id: badge.id } },
      create: {
        user_id: userId,
        badge_id: badge.id,
        badge_name: badge.name,
        badge_icon: badge.icon,
        badge_description: badge.description ?? undefined,
        category: badge.category ?? undefined,
      },
      update: {},
    });
    logger.info('Gamification: badge 1000 points awarded', { userId });
  } catch (e) {
    logger.warn('Gamification: awardBadge1000Points', { userId, err: e });
  }
}

/**
 * Ajoute de l'XP et met à jour le niveau si seuil atteint.
 * Débloque le badge "1000 points" si total XP >= 1000.
 */
export async function addXp(userId: string, amount: number, reason: string) {
  if (amount <= 0) return null;
  const ul = await getOrCreateUserLevel(userId);
  let xp = ul.xp + amount;
  let level = ul.level;
  let next_level_xp = ul.next_level_xp;

  while (level < 100 && xp >= next_level_xp) {
    xp -= next_level_xp;
    level += 1;
    next_level_xp = xpForLevel(level);
  }

  const updated = await prisma.userLevel.update({
    where: { user_id: userId },
    data: { xp, level, next_level_xp },
  });
  logger.info('Gamification: XP added', { userId, reason, amount, newLevel: level });

  await awardBadge1000PointsIfEligible(userId, level, xp);
  return updated;
}

/**
 * Déclencheurs appelés par les autres services.
 */
export const GamificationEngine = {
  async onVideoUpload(userId: string) {
    return addXp(userId, XP_UPLOAD_VIDEO, 'upload_video');
  },
  async onCourseEnroll(userId: string) {
    return addXp(userId, XP_ENROLL_COURSE, 'enroll_course');
  },
  async onCourseComplete(userId: string) {
    return addXp(userId, XP_COMPLETE_COURSE, 'complete_course');
  },
  async onFirstSale(userId: string) {
    return addXp(userId, XP_FIRST_SALE, 'first_sale');
  },
  async on100Followers(userId: string) {
    return addXp(userId, XP_100_FOLLOWERS, '100_followers');
  },
};

export default GamificationEngine;
