import prisma from '../config/database.js';
import { cacheGet, cacheSet } from '../utils/cache.js';

type Period = 'all' | 'weekly' | 'monthly' | 'annual';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cacheKey(params: { period?: Period; country?: string; category?: string; limit?: number }): string {
  return `lb:${[params?.period ?? 'all', params?.country ?? '', params?.category ?? '', params?.limit ?? 50].join('|')}`;
}

/**
 * Récupère les user_id des créateurs ayant du contenu (vidéo ou cours) dans la catégorie donnée.
 */
async function getUserIdsByCategory(category: string): Promise<string[]> {
  const [videoCreators, courseCreators] = await Promise.all([
    prisma.video.findMany({
      where: { category: { equals: category, mode: 'insensitive' } },
      select: { creator_id: true },
      distinct: ['creator_id'],
    }),
    prisma.course.findMany({
      where: { category: { equals: category, mode: 'insensitive' }, is_published: true },
      select: { creator_id: true },
      distinct: ['creator_id'],
    }),
  ]);
  const ids = new Set<string>([...videoCreators.map((v) => v.creator_id), ...courseCreators.map((c) => c.creator_id)]);
  return Array.from(ids);
}

/**
 * Leaderboard avec cache Redis (si REDIS_URL) ou mémoire 10 min.
 */
export async function getLeaderboard(params?: {
  period?: Period;
  country?: string;
  category?: string;
  limit?: number;
}) {
  const key = cacheKey(params ?? {});
  const hit = await cacheGet<{ leaderboard: unknown[]; period: string }>(key);
  if (hit) return hit;

  const data = await getLeaderboardUncached(params ?? {});
  await cacheSet(key, data, CACHE_TTL_MS);
  return data;
}

/**
 * Leaderboard basé sur UserPoints avec filtres pays et catégorie.
 */
async function getLeaderboardUncached(params?: {
  period?: Period;
  country?: string;
  category?: string;
  limit?: number;
}) {
  const limit = Math.min(params?.limit ?? 50, 100);

  const where: Record<string, unknown> = {};

  if (params?.period && params.period !== 'all') {
    const now = new Date();
    let from: Date;
    if (params.period === 'weekly') {
      from = new Date(now);
      from.setDate(from.getDate() - 7);
    } else if (params.period === 'monthly') {
      from = new Date(now);
      from.setMonth(from.getMonth() - 1);
    } else {
      from = new Date(now);
      from.setFullYear(from.getFullYear() - 1);
    }
    where.updated_at = { gte: from };
  }

  if (params?.country?.trim()) {
    where.user = { country: { equals: params.country.trim(), mode: 'insensitive' } };
  }

  let categoryUserIds: string[] | null = null;
  if (params?.category?.trim()) {
    categoryUserIds = await getUserIdsByCategory(params.category.trim());
    if (categoryUserIds.length === 0) {
      return { leaderboard: [], period: params?.period ?? 'all' };
    }
    where.user_id = { in: categoryUserIds };
  }

  const pointsList = await prisma.userPoints.findMany({
    where,
    take: limit,
    orderBy: { total_points: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          full_name: true,
          username: true,
          profile_image: true,
          country: true,
        },
      },
    },
  });

  const leaderboard = pointsList.map((p, index) => ({
    user_id: p.user_id,
    user_name: p.user?.full_name || p.user?.username || 'Anonyme',
    user_avatar: p.user?.profile_image || undefined,
    rank: index + 1,
    total_points: p.total_points,
    level: p.level,
    badges_count: p.badges_count,
  }));

  return { leaderboard, period: params?.period ?? 'all' };
}

/**
 * Fallback: si peu ou pas de UserPoints, construire à partir de UserLevel (xp = points).
 * Applique les mêmes filtres pays et catégorie.
 */
export async function getLeaderboardFromUserLevel(params?: {
  limit?: number;
  country?: string;
  category?: string;
}): Promise<{ leaderboard: unknown[]; period: string }> {
  const limit = Math.min(params?.limit ?? 50, 100);

  const where: Record<string, unknown> = {};

  if (params?.country?.trim()) {
    where.user = { country: { equals: params.country.trim(), mode: 'insensitive' } };
  }

  if (params?.category?.trim()) {
    const categoryUserIds = await getUserIdsByCategory(params.category.trim());
    if (categoryUserIds.length === 0) {
      return { leaderboard: [], period: 'all' };
    }
    where.user_id = { in: categoryUserIds };
  }

  const levels = await prisma.userLevel.findMany({
    where,
    take: limit,
    orderBy: [{ level: 'desc' }, { xp: 'desc' }],
    include: {
      user: {
        select: {
          id: true,
          full_name: true,
          username: true,
          profile_image: true,
        },
      },
    },
  });

  const badgeCounts = await prisma.userBadge.groupBy({
    by: ['user_id'],
    _count: true,
    where: { user_id: { in: levels.map((l) => l.user_id) } },
  });
  const badgeMap = new Map(badgeCounts.map((b) => [b.user_id, b._count]));

  return {
    leaderboard: levels.map((l, index) => ({
      user_id: l.user_id,
      user_name: l.user?.full_name || l.user?.username || 'Anonyme',
      user_avatar: l.user?.profile_image || undefined,
      rank: index + 1,
      total_points: l.xp,
      level: l.level,
      badges_count: badgeMap.get(l.user_id) ?? 0,
    })),
    period: 'all',
  };
}
