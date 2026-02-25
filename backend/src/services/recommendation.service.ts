/**
 * AfriWonder - Système de recommandation type TikTok
 * Personnalisation: historique de visionnage, likes, sauvegardes, abonnements
 * Diversité: plafond par créateur, injection exploration
 * Cold start: trending + récence
 */
import prisma from '../config/database.js';

const FAVORED_DURATION_MIN = 8;
const FAVORED_DURATION_MAX = 30;
const EXPLORATION_RATIO = 0.12; // ~12% de contenu "exploration" (hors préférences)
const MAX_VIDEOS_PER_CREATOR = 3; // max vidéos du même créateur dans une fenêtre
const CANDIDATE_POOL_MULT = 5; // on tire limit * 5 candidats puis on score/trie

export interface RecommendationOptions {
  limit?: number;
  page?: number;
  userId?: string;
  deviceId?: string;
  category?: string;
  hashtag?: string;
}

/**
 * Score de contenu (engagement, rétention, durée, récence, tier) - même logique que feedAlgorithm
 */
function contentScore(v: any): number {
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
  return engagementRate * retentionBonus * durationBonus * recencyBonus * tierBonus * Math.log(views + 1);
}

function daysSince(d: Date): number {
  return (Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Charge les préférences utilisateur pour la personnalisation (categories, créateurs, vidéos déjà vues)
 */
async function loadUserPreferences(userId: string): Promise<{
  seenVideoIds: Set<string>;
  preferredCategories: Map<string, number>;
  preferredCreatorIds: Set<string>;
  likedVideoIds: Set<string>;
  savedVideoIds: Set<string>;
}> {
  const [history, likes, saves, follows] = await Promise.all([
    prisma.viewHistory.findMany({
      where: { user_id: userId },
      select: {
        video_id: true,
        category: true,
        watch_percent: true,
        video: { select: { creator_id: true, category: true } },
      },
      orderBy: { updated_at: 'desc' },
      take: 500,
    }),
    prisma.like.findMany({ where: { user_id: userId }, select: { video_id: true } }),
    prisma.save.findMany({ where: { user_id: userId }, select: { video_id: true } }),
    prisma.follow.findMany({ where: { follower_id: userId }, select: { following_id: true } }),
  ]);

  const seenVideoIds = new Set(history.map((h) => h.video_id));
  const preferredCategories = new Map<string, number>();
  const preferredCreatorIds = new Set(follows.map((f) => f.following_id));

  for (const h of history) {
    const cat = (h.video?.category ?? h.category) || null;
    if (cat) {
      const weight = (h.watch_percent ?? 50) / 100;
      preferredCategories.set(cat, (preferredCategories.get(cat) ?? 0) + weight);
    }
    if (h.video?.creator_id) {
      preferredCreatorIds.add(h.video.creator_id);
    }
  }

  const likedVideoIds = new Set(likes.map((l) => l.video_id));
  const savedVideoIds = new Set(saves.map((s) => s.video_id));

  return {
    seenVideoIds,
    preferredCategories,
    preferredCreatorIds,
    likedVideoIds,
    savedVideoIds,
  };
}

/**
 * Feed personnalisé type TikTok : contenu score + personnalisation + diversité + exploration
 */
export async function getPersonalizedFeed(options: RecommendationOptions): Promise<{
  videos: any[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const limit = options.limit || 50;
  const page = options.page || 1;
  const skip = (page - 1) * limit;
  const userId = options.userId;

  const where: any = {
    visibility: 'public',
    video_url: { not: { contains: 'example.com' } },
    algo_tier: { not: 'dead' },
  };
  if (options.category) where.category = options.category;
  if (options.hashtag?.trim()) {
    const tag = String(options.hashtag).replace(/^#/, '').toLowerCase();
    where.video_hashtags = { some: { tag_name: tag } };
  }

  const poolSize = Math.min(limit * CANDIDATE_POOL_MULT, 500);

  let videos: any[] = await prisma.video.findMany({
    where,
    include: {
      creator: {
        select: { id: true, username: true, full_name: true, profile_image: true },
      },
    },
    orderBy: { created_at: 'desc' },
    take: poolSize,
  });

  // Cold start ou pas d'userId : tri par score contenu uniquement (trending)
  if (!userId) {
    const scored = videos.map((v) => ({ ...v, _score: contentScore(v) }));
    scored.sort((a, b) => b._score - a._score);
    const paged = scored.slice(skip, skip + limit);
    return formatResult(paged, videos.length, page, limit);
  }

  const prefs = await loadUserPreferences(userId);

  // Score chaque vidéo : contenu + personnalisation
  const scored = videos.map((v: any) => {
    let score = contentScore(v);

    // Exclure (ou fortement pénaliser) les vidéos déjà vues récemment en tête de feed
    if (prefs.seenVideoIds.has(v.id)) {
      score *= 0.15; // on peut les remettre plus bas dans le feed
    }

    // Boost catégorie préférée
    if (v.category && prefs.preferredCategories.has(v.category)) {
      const catWeight = prefs.preferredCategories.get(v.category) ?? 0;
      score *= 1 + Math.min(0.6, catWeight * 0.1);
    }

    // Boost créateur suivi ou déjà regardé
    if (prefs.preferredCreatorIds.has(v.creator_id)) {
      score *= 1.4;
    }

    // Boost si l'utilisateur a aimé/sauvegardé des vidéos similaires (même catégorie/créateur)
    if (prefs.likedVideoIds.size > 0 || prefs.savedVideoIds.size > 0) {
      if (v.category && prefs.preferredCategories.has(v.category)) score *= 1.2;
    }

    return { ...v, _score: score };
  });

  scored.sort((a, b) => b._score - a._score);

  // Diversité : limiter le nombre de vidéos par créateur dans la page
  const diversified: any[] = [];
  const creatorCount = new Map<string, number>();
  const explorationCount = Math.ceil(limit * EXPLORATION_RATIO);
  let explorationInjected = 0;

  for (const v of scored) {
    if (diversified.length >= limit) break;
    const c = v.creator_id;
    const n = creatorCount.get(c) ?? 0;
    if (n >= MAX_VIDEOS_PER_CREATOR) continue;
    diversified.push(v);
    creatorCount.set(c, n + 1);
  }

  // Injection exploration : remplacer quelques slots par des vidéos plus "aléatoires" (fin du pool)
  if (explorationInjected < explorationCount && scored.length > diversified.length) {
    const rest = scored.filter((x) => !diversified.includes(x));
    const explorationCandidates = rest.slice(-Math.min(50, rest.length));
    for (let i = 0; i < explorationCount && explorationCandidates.length > 0; i++) {
      const idx = Math.floor(Math.random() * Math.min(explorationCandidates.length, 10));
      const cand = explorationCandidates[idx];
      if (cand && diversified.length >= 3) {
        const insertAt = Math.floor(diversified.length * (0.3 + Math.random() * 0.4));
        diversified.splice(insertAt, 0, cand);
        explorationInjected++;
      }
    }
  }

  const paged = diversified.slice(skip, skip + limit);
  return formatResult(paged, diversified.length, page, limit);
}

function formatResult(
  paged: any[],
  total: number,
  page: number,
  limit: number
): { videos: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } } {
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
