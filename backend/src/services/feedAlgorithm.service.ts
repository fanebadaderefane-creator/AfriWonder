/**
 * AfriWonder - Algorithme type TikTok
 * Test initial → Analyse performance → Expansion
 * Facteurs: rétention, likes, commentaires, partages, durée courte (8-30s favorisée)
 */
import prisma from '../config/database.js';

const FAVORED_DURATION_MIN = 8;
const FAVORED_DURATION_MAX = 30;

export async function getAlgorithmFeed(options: {
  limit?: number;
  page?: number;
  userId?: string;
  category?: string;
  hashtag?: string;
}) {
  const limit = options.limit || 50;
  const page = options.page || 1;
  const skip = (page - 1) * limit;

  const where: any = {
    visibility: 'public',
    video_url: { not: { contains: 'example.com' } },
  };
  if (options.category) where.category = options.category;
  if (options.hashtag?.trim()) {
    const tag = String(options.hashtag).replace(/^#/, '').toLowerCase();
    where.video_hashtags = { some: { tag_name: tag } };
  }

  let videos: any[];
  try {
    videos = await prisma.video.findMany({
      where,
      include: {
        creator: {
          select: { id: true, username: true, full_name: true, profile_image: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: limit * 3,
      skip: 0,
    });
  } catch {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT v.*, u.id as "creator_id", u.username, u.full_name as "creator_name", u.profile_image as "creator_avatar"
      FROM "Video" v
      JOIN "User" u ON u.id = v.creator_id
      WHERE v.visibility = 'public' AND v.video_url NOT LIKE '%example.com%'
      ORDER BY v.created_at DESC
      LIMIT ${limit * 3}
    `;
    videos = rows.map((r: any) => ({
      ...r,
      creator: { id: r.creator_id, username: r.username, full_name: r.creator_name, profile_image: r.creator_avatar },
    }));
  }

  const scored = videos.map((v: any) => {
    const likes = v.likes ?? 0;
    const comments = v.comments_count ?? 0;
    const shares = v.shares ?? 0;
    const views = Math.max(v.views, 1);
    const duration = v.duration ?? 60;
    const retentionPct = v.avg_retention_pct ?? 50;

    const engagementRate = (likes + comments * 2 + shares * 3) / views;
    const retentionBonus = 0.7 + (retentionPct / 100) * 0.6;
    const durationBonus =
      duration >= FAVORED_DURATION_MIN && duration <= FAVORED_DURATION_MAX ? 1.3 : 1;
    const recencyBonus = 1 + Math.max(0, 7 - daysSince(v.created_at)) * 0.05;
    const tierMap: Record<string, number> = {
      tier_100k: 2, tier_10k: 1.7, tier_1k: 1.5, tier_500: 1.3,
      expanded: 1.5, test: 1, dead: 0.1,
    };
    const tierBonus = tierMap[v.algo_tier] ?? 1;
    const score = engagementRate * retentionBonus * durationBonus * recencyBonus * tierBonus * Math.log(views + 1);

    return { ...v, _score: score };
  });

  scored.sort((a: any, b: any) => b._score - a._score);
  const paged = scored.slice(skip, skip + limit);

  const formatted = paged.map((video: any) => {
    const { creator, _score, ...videoData } = video;
    let hashtags = video.hashtags;
    if (typeof hashtags === 'string') {
      try {
        hashtags = JSON.parse(hashtags);
      } catch {
        hashtags = [];
      }
    }
    if (!Array.isArray(hashtags)) hashtags = [];
    return {
      ...videoData,
      creator_id: creator?.id || video.creator_id,
      creator_name: creator?.full_name || creator?.username || '',
      creator_avatar: creator?.profile_image || '',
      views: video.views ?? 0,
      likes: video.likes ?? 0,
      comments_count: video.comments_count ?? 0,
      hashtags: Array.isArray(hashtags) ? hashtags : [],
      music_title: video.music_title || null,
    };
  });

  const total = scored.length;
  return {
    videos: formatted,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

function daysSince(d: Date): number {
  return (Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24);
}
