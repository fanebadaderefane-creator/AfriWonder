import prisma from '../config/database.js';

/**
 * Media kit auto (Phase 9) — agrégation stats créateur pour marques / deals.
 */
export async function getCreatorMediaKit(creatorId: string) {
  const user = await prisma.user.findUnique({
    where: { id: creatorId },
    select: {
      id: true,
      username: true,
      full_name: true,
      profile_image: true,
      bio: true,
      country: true,
      monetization_enabled: true,
      is_afriwonder_pro: true,
      is_verified: true,
    },
  });
  if (!user) {
    const err: any = new Error('Créateur introuvable');
    err.statusCode = 404;
    throw err;
  }

  const followers = await prisma.follow.count({ where: { following_id: creatorId } });
  const videoAgg = await prisma.video.aggregate({
    where: { creator_id: creatorId, visibility: 'public' },
    _count: { id: true },
    _sum: { views: true, likes: true },
  });
  const count = videoAgg._count?.id ?? 0;
  const totalViews = videoAgg._sum?.views ?? 0;
  const totalLikes = videoAgg._sum?.likes ?? 0;
  const avgViews = count > 0 ? totalViews / count : 0;

  return {
    creator: user,
    niches: [] as string[],
    followers_count: followers,
    public_videos_count: count,
    total_views: totalViews,
    total_likes: totalLikes,
    avg_views_per_video: Math.round(avgViews),
    engagement_hint:
      totalViews > 0 ? Math.round(((totalLikes || 0) / totalViews) * 10000) / 100 : 0,
  };
}

export async function searchCreatorsForBrands(options: {
  min_followers?: number;
  country?: string;
  limit?: number;
}) {
  const minFollowers = Math.max(0, options.min_followers ?? 0);
  const limit = Math.min(80, Math.max(1, options.limit ?? 40));
  const where: any = { monetization_enabled: true };
  if (options.country && String(options.country).length === 2) {
    where.country = String(options.country).toUpperCase();
  }

  const users = await prisma.user.findMany({
    where,
    take: limit * 3,
    select: {
      id: true,
      username: true,
      full_name: true,
      profile_image: true,
      bio: true,
      country: true,
      is_verified: true,
      is_afriwonder_pro: true,
    },
    orderBy: { created_at: 'desc' },
  });

  const withFollowers = await Promise.all(
    users.map(async (u) => {
      const fc = await prisma.follow.count({ where: { following_id: u.id } });
      return { ...u, followers_count: fc };
    })
  );

  return withFollowers
    .filter((u) => u.followers_count >= minFollowers)
    .sort((a, b) => b.followers_count - a.followers_count)
    .slice(0, limit);
}
