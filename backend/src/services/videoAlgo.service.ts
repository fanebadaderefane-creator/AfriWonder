/**
 * AfriWonder - Algorithme TikTok: test 50-100, expansion par paliers 500→1K→10K→100K
 */
import prisma from '../config/database.js';

const TEST_IMPRESSIONS_MIN = 50;
const TEST_IMPRESSIONS_MAX = 100;
const MIN_ENGAGEMENT_FOR_EXPAND = 0.03;
const TIERS = [
  { min: 0, tier: 'test' },
  { min: 500, tier: 'tier_500' },
  { min: 1000, tier: 'tier_1k' },
  { min: 10000, tier: 'tier_10k' },
  { min: 100000, tier: 'tier_100k' },
] as const;

export async function updateVideoAlgoTier(videoId: string): Promise<void> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: {
      _count: {
        select: { video_views: true, video_likes: true, video_comments: true },
      },
    },
  });
  if (!video || video.algo_tier === 'dead') return;

  const impressions = video._count?.video_views ?? video.views ?? 0;
  const likes = video._count?.video_likes ?? video.likes ?? 0;
  const comments = video._count?.video_comments ?? video.comments_count ?? 0;
  const engagement = impressions > 0 ? (likes + comments * 2) / impressions : 0;

  let newTier = video.algo_tier;

  if (impressions >= TEST_IMPRESSIONS_MIN) {
    if (engagement < MIN_ENGAGEMENT_FOR_EXPAND && impressions >= TEST_IMPRESSIONS_MAX) {
      newTier = 'dead';
    } else if (engagement >= MIN_ENGAGEMENT_FOR_EXPAND) {
      const next = [...TIERS].reverse().find((t) => impressions >= t.min);
      newTier = next?.tier ?? 'tier_100k';
    }
  }

  if (newTier !== video.algo_tier) {
    await prisma.video.update({
      where: { id: videoId },
      data: { algo_tier: newTier },
    });
  }
}
