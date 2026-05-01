/**
 * AfriWonder — FYP / recommandation (spec 4.2)
 *
 * Signaux +: like, save, commentaire, follow créateur, visionnage fort (≥80 % / completed),
 *   relecture (historique), partages agrégés déjà dans `contentScore`.
 * Signaux −: skip rapide (<2 s & faible %), signalement vidéo, « pas intéressé », créateur bloqué.
 * Récence: bonus explicite < 24 h en couche personnalisée.
 * 80 / 20: ~80 % exploitation (score perso) + ~20 % exploration (hors bulle).
 * Cold start: `User.preferred_categories` (onboarding) si peu d’historique.
 * Localisation: pays viewer (header ou profil) vs `creator.country`.
 * Anti-bulles: slots supplémentaires hors top-catégories.
 *
 * Fallback SQL si drift schéma.
 */
import { Prisma } from '@prisma/client';
import prisma from '../config/database.js';
import { cacheGet, cacheSet } from '../utils/cache.js';
import { logger } from '../utils/logger.js';

/** Colonne ou table absente (migrations non appliquées, drift). */
function isSchemaColumnError(err: unknown): boolean {
  const e = err as { code?: string; message?: string; name?: string };
  if (e?.code === 'P2022') return true;
  const msg = String(e?.message || '');
  if (e?.name === 'PrismaClientKnownRequestError' && /does not exist|column|unknown column/i.test(msg)) {
    return true;
  }
  return /column .* does not exist|42703/i.test(msg);
}

const FAVORED_DURATION_MIN = 8;
const FAVORED_DURATION_MAX = 30;
/** Spec 4.2 — ~80 % personnalisé / ~20 % découverte. */
const EXPLORATION_RATIO = 0.2;
/** Injection anti-bulles : hors des 2 catégories les plus pondérées. */
const ANTI_BUBBLE_RATIO = 0.08;
const MAX_VIDEOS_PER_CREATOR = 3; // max vidéos du même créateur dans une fenêtre
const CANDIDATE_POOL_MULT = 5; // on tire limit * 5 candidats puis on score/trie
const USER_PREFS_CACHE_TTL_MS = 60_000;
const USER_SIGNAL_LIMIT = 500;

type UserPreferences = {
  seenVideoIds: Set<string>;
  preferredCategories: Map<string, number>;
  preferredCreatorIds: Set<string>;
  likedVideoIds: Set<string>;
  savedVideoIds: Set<string>;
  blockedCreatorIds: Set<string>;
  reportedVideoIds: Set<string>;
  notInterestedVideoIds: Set<string>;
  quickSkippedVideoIds: Set<string>;
  strongWatchVideoIds: Set<string>;
  replayBoostVideoIds: Set<string>;
  commentedVideoIds: Set<string>;
  onboardingCategories: Set<string>;
  /** Pays effectif (header `x-country` prioritaire, sinon profil). */
  viewerCountry: string | null;
};

type SerializedUserPreferences = {
  seenVideoIds: string[];
  preferredCategories: Array<[string, number]>;
  preferredCreatorIds: string[];
  likedVideoIds: string[];
  savedVideoIds: string[];
  blockedCreatorIds: string[];
  reportedVideoIds: string[];
  notInterestedVideoIds: string[];
  quickSkippedVideoIds: string[];
  strongWatchVideoIds: string[];
  replayBoostVideoIds: string[];
  commentedVideoIds: string[];
  onboardingCategories: string[];
  viewerCountry: string | null;
};

export interface RecommendationOptions {
  limit?: number;
  page?: number;
  userId?: string;
  deviceId?: string;
  /** Pays client (ex. header `x-country`) — prioritaire sur le pays profil pour la localisation FYP. */
  country?: string;
  category?: string;
  hashtag?: string;
  mediaType?: 'video' | 'image';
  /** Présent sur tirer-pour-rafraîchir (`_` ou `refresh`) : permutation circulaire page 1 pour ne pas retomber sur la même tête de liste. */
  refreshNonce?: string;
}

/** Décale la liste (page 1 uniquement) de façon reproductible depuis le nonce — sans casser le tri global. */
function rotateListByRefreshNonce<T>(items: T[], nonce: string | undefined, page: number): T[] {
  if (page !== 1 || !nonce || !String(nonce).trim() || items.length < 2) return items;
  const s = String(nonce);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  const off = Math.abs(h) % items.length;
  if (off === 0) return items;
  return [...items.slice(off), ...items.slice(0, off)];
}

/**
 * Score de contenu (engagement, rétention, durée, récence, tier) - même logique que feedAlgorithm
 */
function contentScore(v: any): number {
  const likes = Number(v?.likes) || 0;
  const comments = Number(v?.comments_count) || 0;
  const shares = Number(v?.shares) || 0;
  const views = Math.max(Number(v?.views) || 0, 1);
  const duration = v.duration ?? 60;
  const retentionPct = v.avg_retention_pct ?? 50;

  /** Plancher cold-start : sans ça, (0 likes / vues) × log(vues+1) ≈ 0 → les nouveaux posts ne montent jamais en tête. */
  const engagementRate = (likes + comments * 2 + shares * 3) / views + 0.08;
  const retentionBonus = 0.7 + (retentionPct / 100) * 0.6;
  const durationBonus =
    duration >= FAVORED_DURATION_MIN && duration <= FAVORED_DURATION_MAX ? 1.3 : 1;
  const ageDays = daysSince(v.created_at);
  const recencyBonus =
    ageDays <= 1 / 24
      ? 2.35
      : ageDays <= 1
        ? 1.72
        : ageDays <= 3
          ? 1.42
          : 1 + Math.max(0, 7 - ageDays) * 0.06;
  const tierMap: Record<string, number> = {
    tier_100k: 2, tier_10k: 1.7, tier_1k: 1.5, tier_500: 1.3,
    expanded: 1.5, test: 1, dead: 0.1,
  };
  const tierBonus = tierMap[v.algo_tier] ?? 1;
  /** +8 sous le log : les tout premiers vues restent visibles face au contenu viral déjà vues. */
  return engagementRate * retentionBonus * durationBonus * recencyBonus * tierBonus * Math.log(views + 8);
}

function daysSince(d: Date): number {
  return (Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24);
}

function parsePreferredCategoriesJson(raw: unknown): Set<string> {
  const out = new Set<string>();
  if (raw == null) return out;
  if (Array.isArray(raw)) {
    for (const x of raw) {
      const s = String(x).trim().toLowerCase();
      if (s) out.add(s);
    }
    return out;
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return out;
    if (t.startsWith('[')) {
      try {
        const j = JSON.parse(t) as unknown;
        if (Array.isArray(j)) return parsePreferredCategoriesJson(j);
      } catch {
        /* ignore */
      }
    }
    out.add(t.toLowerCase());
  }
  return out;
}

function normCat(s: string | null | undefined): string {
  return String(s || '').trim().toLowerCase();
}

function emptyUserPreferences(): UserPreferences {
  return {
    seenVideoIds: new Set(),
    preferredCategories: new Map(),
    preferredCreatorIds: new Set(),
    likedVideoIds: new Set(),
    savedVideoIds: new Set(),
    blockedCreatorIds: new Set(),
    reportedVideoIds: new Set(),
    notInterestedVideoIds: new Set(),
    quickSkippedVideoIds: new Set(),
    strongWatchVideoIds: new Set(),
    replayBoostVideoIds: new Set(),
    commentedVideoIds: new Set(),
    onboardingCategories: new Set(),
    viewerCountry: null,
  };
}

/**
 * Charge les préférences utilisateur pour la personnalisation (categories, créateurs, vidéos déjà vues)
 * En cas d'erreur Prisma / drift : retour vide pour ne pas faire échouer tout le feed (200 + trending).
 */
async function loadUserPreferences(userId: string, countryHeader?: string): Promise<UserPreferences> {
  try {
    const [
      history,
      likes,
      saves,
      follows,
      userRow,
      blocks,
      modReports,
      notInterestedRows,
      commentedRows,
    ] = await Promise.all([
      prisma.viewHistory.findMany({
        where: { user_id: userId },
        select: {
          video_id: true,
          category: true,
          watch_percent: true,
          watch_seconds: true,
          completed: true,
          created_at: true,
          updated_at: true,
          video: { select: { creator_id: true, category: true } },
        },
        orderBy: { updated_at: 'desc' },
        take: USER_SIGNAL_LIMIT,
      }),
      prisma.like.findMany({
        where: { user_id: userId },
        select: { video_id: true },
        orderBy: { created_at: 'desc' },
        take: USER_SIGNAL_LIMIT,
      }),
      prisma.save.findMany({
        where: { user_id: userId },
        select: { video_id: true },
        orderBy: { created_at: 'desc' },
        take: USER_SIGNAL_LIMIT,
      }),
      prisma.follow.findMany({
        where: { follower_id: userId },
        select: { following_id: true },
        orderBy: { created_at: 'desc' },
        take: USER_SIGNAL_LIMIT,
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { country: true, preferred_categories: true },
      }),
      prisma.userBlock.findMany({
        where: { blocker_id: userId },
        select: { blocked_id: true },
      }),
      prisma.moderation.findMany({
        where: {
          reporter_id: userId,
          content_type: { in: ['video', 'Video'] },
        },
        select: { content_id: true },
        orderBy: { created_at: 'desc' },
        take: 200,
      }),
      prisma.analytics.findMany({
        where: {
          user_id: userId,
          entity_type: 'video',
          metric_type: 'feed_not_interested',
        },
        select: { entity_id: true },
        orderBy: { date: 'desc' },
        take: 400,
      }),
      prisma.comment.findMany({
        where: { user_id: userId },
        distinct: ['video_id'],
        select: { video_id: true },
        orderBy: { video_id: 'desc' },
        take: 400,
      }),
    ]);

    const seenVideoIds = new Set(history.map((h) => h.video_id));
    const preferredCategories = new Map<string, number>();
    const preferredCreatorIds = new Set(follows.map((f) => f.following_id));
    const quickSkippedVideoIds = new Set<string>();
    const strongWatchVideoIds = new Set<string>();
    const replayBoostVideoIds = new Set<string>();

    for (const h of history) {
      const cat = (h.video?.category ?? h.category) || null;
      const catKey = normCat(cat);
      if (catKey) {
        const weight = (h.watch_percent ?? 50) / 100;
        preferredCategories.set(catKey, (preferredCategories.get(catKey) ?? 0) + weight);
      }
      if (h.video?.creator_id) {
        preferredCreatorIds.add(h.video.creator_id);
      }
      const ws = h.watch_seconds ?? 0;
      const wp = h.watch_percent ?? 0;
      if (ws < 2 && wp < 15) quickSkippedVideoIds.add(h.video_id);
      if (h.completed || wp >= 80) strongWatchVideoIds.add(h.video_id);
      const dwell = new Date(h.updated_at).getTime() - new Date(h.created_at).getTime();
      if (wp >= 45 && dwell > 50 * 60 * 1000) replayBoostVideoIds.add(h.video_id);
    }

    const likedVideoIds = new Set(likes.map((l) => l.video_id));
    const savedVideoIds = new Set(saves.map((s) => s.video_id));
    const blockedCreatorIds = new Set(blocks.map((b) => b.blocked_id));
    const reportedVideoIds = new Set(modReports.map((m) => m.content_id));
    const notInterestedVideoIds = new Set(notInterestedRows.map((r) => r.entity_id));
    const commentedVideoIds = new Set(commentedRows.map((c) => c.video_id));
    const onboardingCategories = parsePreferredCategoriesJson(userRow?.preferred_categories);
    const headerC = countryHeader?.trim().toLowerCase() || '';
    const profileC = userRow?.country?.trim().toLowerCase() || '';
    const viewerCountry = headerC || profileC || null;

    return {
      seenVideoIds,
      preferredCategories,
      preferredCreatorIds,
      likedVideoIds,
      savedVideoIds,
      blockedCreatorIds,
      reportedVideoIds,
      notInterestedVideoIds,
      quickSkippedVideoIds,
      strongWatchVideoIds,
      replayBoostVideoIds,
      commentedVideoIds,
      onboardingCategories,
      viewerCountry,
    };
  } catch (err) {
    logger.warn('loadUserPreferences: échec, personnalisation désactivée pour ce feed', {
      userId,
      message: String((err as Error)?.message || err),
    });
    return emptyUserPreferences();
  }
}

function serializeUserPreferences(prefs: UserPreferences): SerializedUserPreferences {
  return {
    seenVideoIds: Array.from(prefs.seenVideoIds),
    preferredCategories: Array.from(prefs.preferredCategories.entries()),
    preferredCreatorIds: Array.from(prefs.preferredCreatorIds),
    likedVideoIds: Array.from(prefs.likedVideoIds),
    savedVideoIds: Array.from(prefs.savedVideoIds),
    blockedCreatorIds: Array.from(prefs.blockedCreatorIds),
    reportedVideoIds: Array.from(prefs.reportedVideoIds),
    notInterestedVideoIds: Array.from(prefs.notInterestedVideoIds),
    quickSkippedVideoIds: Array.from(prefs.quickSkippedVideoIds),
    strongWatchVideoIds: Array.from(prefs.strongWatchVideoIds),
    replayBoostVideoIds: Array.from(prefs.replayBoostVideoIds),
    commentedVideoIds: Array.from(prefs.commentedVideoIds),
    onboardingCategories: Array.from(prefs.onboardingCategories),
    viewerCountry: prefs.viewerCountry,
  };
}

function hydrateUserPreferences(raw: SerializedUserPreferences): UserPreferences {
  return {
    seenVideoIds: new Set(raw.seenVideoIds || []),
    preferredCategories: new Map(raw.preferredCategories || []),
    preferredCreatorIds: new Set(raw.preferredCreatorIds || []),
    likedVideoIds: new Set(raw.likedVideoIds || []),
    savedVideoIds: new Set(raw.savedVideoIds || []),
    blockedCreatorIds: new Set(raw.blockedCreatorIds || []),
    reportedVideoIds: new Set(raw.reportedVideoIds || []),
    notInterestedVideoIds: new Set(raw.notInterestedVideoIds || []),
    quickSkippedVideoIds: new Set(raw.quickSkippedVideoIds || []),
    strongWatchVideoIds: new Set(raw.strongWatchVideoIds || []),
    replayBoostVideoIds: new Set(raw.replayBoostVideoIds || []),
    commentedVideoIds: new Set(raw.commentedVideoIds || []),
    onboardingCategories: new Set(raw.onboardingCategories || []),
    viewerCountry: raw.viewerCountry ?? null,
  };
}

async function loadUserPreferencesCached(userId: string, countryHeader?: string): Promise<UserPreferences> {
  const cacheKey = `feed:prefs:v3:${userId}`;
  try {
    const cached = await cacheGet<SerializedUserPreferences>(cacheKey);
    if (cached) {
      const h = hydrateUserPreferences(cached);
      if (countryHeader?.trim()) {
        h.viewerCountry = countryHeader.trim().toLowerCase();
      }
      return h;
    }
  } catch (e) {
    logger.warn('loadUserPreferencesCached: lecture cache Redis/indisponible', {
      message: String((e as Error)?.message || e),
    });
  }

  const prefs = await loadUserPreferences(userId, countryHeader);
  cacheSet(cacheKey, serializeUserPreferences(prefs), USER_PREFS_CACHE_TTL_MS).catch(() => {});
  return prefs;
}

/** Colonnes Video de base (sans algo_tier, avg_retention_pct, qualified_views_count) pour fallback en cas de drift DB. Inclure hls_url + media_type : sinon le client ne peut pas basculer HLS si le MP4 principal est cassé. */
const VIDEO_CORE_SELECT = `v.id, v.title, v.description, v.video_url, v.low_quality_url, v.hls_url, v.thumbnail_url, v.creator_id, v.visibility, v.category, v.views, v.likes, v.comments_count, v.shares, v.saves, v.duration, v.created_at, v.updated_at, v.hashtags, v.music_title, v.is_featured, v.media_type`;

/** Même liste sans `low_quality_url` si la migration n'a pas été appliquée. */
const VIDEO_CORE_SELECT_NO_LOW_Q = `v.id, v.title, v.description, v.video_url, v.hls_url, v.thumbnail_url, v.creator_id, v.visibility, v.category, v.views, v.likes, v.comments_count, v.shares, v.saves, v.duration, v.created_at, v.updated_at, v.hashtags, v.music_title, v.is_featured, v.media_type`;

/**
 * Récupère un pool de vidéos via SQL brut (colonnes de base uniquement) quand prisma.video.findMany
 * échoue parce que la base n'a pas toutes les colonnes du schéma.
 */
async function getVideoPoolFallback(
  poolSize: number,
  category?: string | null,
  hashtag?: string | null
): Promise<any[]> {
  const tag = hashtag?.trim() ? String(hashtag).replace(/^#/, '').toLowerCase() : null;
  type Row = {
    id: string;
    title: string;
    description: string | null;
    video_url: string;
    low_quality_url?: string | null;
    hls_url: string | null;
    thumbnail_url: string | null;
    creator_id: string;
    visibility: string;
    category: string | null;
    views: number;
    likes: number;
    comments_count: number;
    shares: number;
    saves: number;
    duration: number | null;
    created_at: Date;
    updated_at: Date;
    hashtags: unknown;
    music_title: string | null;
    is_featured: boolean;
    media_type: string | null;
    creator_username: string | null;
    creator_full_name: string | null;
    creator_profile_image: string | null;
  };

  const mapRows = (rows: Row[]) =>
    rows.map((r) => ({
      ...r,
      low_quality_url: r.low_quality_url ?? null,
      algo_tier: 'test',
      avg_retention_pct: null as number | null,
      qualified_views_count: 0,
      media_type: r.media_type || 'video',
      creator: {
        id: r.creator_id,
        username: r.creator_username,
        full_name: r.creator_full_name,
        profile_image: r.creator_profile_image,
      },
    }));

  const runSelect = async (cols: string): Promise<any[]> => {
    const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
    SELECT ${Prisma.raw(cols)},
      u.username AS "creator_username", u.full_name AS "creator_full_name", u.profile_image AS "creator_profile_image"
    FROM "Video" v
    INNER JOIN "User" u ON u.id = v.creator_id
    WHERE v.visibility = 'public' AND (v.video_url NOT LIKE '%example.com%')
      AND (v.scheduled_at IS NULL OR v.scheduled_at <= NOW())
      AND (${category ?? null}::text IS NULL OR v.category = ${category ?? null})
      AND (${tag ?? null}::text IS NULL OR EXISTS (SELECT 1 FROM "VideoHashtag" vh WHERE vh.video_id = v.id AND LOWER(vh.tag_name) = ${tag ?? null}))
    ORDER BY v.created_at DESC
    LIMIT ${poolSize}
  `);
    return mapRows(rows);
  };

  /** Dernier recours : sans scheduled_at / sans filtre hashtag (tables ou colonnes partielles). */
  const runMinimalSelect = async (): Promise<any[]> => {
    const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
    SELECT ${Prisma.raw(VIDEO_CORE_SELECT_NO_LOW_Q)},
      u.username AS "creator_username", u.full_name AS "creator_full_name", u.profile_image AS "creator_profile_image"
    FROM "Video" v
    INNER JOIN "User" u ON u.id = v.creator_id
    WHERE v.visibility = 'public' AND (v.video_url NOT LIKE '%example.com%')
      AND (${category ?? null}::text IS NULL OR v.category = ${category ?? null})
    ORDER BY v.created_at DESC
    LIMIT ${poolSize}
  `);
    return mapRows(rows);
  };

  try {
    return await runSelect(VIDEO_CORE_SELECT);
  } catch (err) {
    if (!isSchemaColumnError(err)) throw err;
    logger.warn('Feed fallback SQL: colonnes incomplètes, nouvel essai sans low_quality_url', {
      message: (err as Error)?.message,
    });
    try {
      return await runSelect(VIDEO_CORE_SELECT_NO_LOW_Q);
    } catch (err2) {
      if (!isSchemaColumnError(err2)) throw err2;
      logger.warn('Feed fallback SQL: requête minimale (sans scheduled/hashtag)', {
        message: (err2 as Error)?.message,
      });
      return await runMinimalSelect();
    }
  }
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

  try {
  const now = new Date();
  const where: any = {
    visibility: 'public',
    video_url: { not: { contains: 'example.com' } },
    algo_tier: { not: 'dead' },
    OR: [{ scheduled_at: null }, { scheduled_at: { lte: now } }],
  };
  if (options.category) where.category = options.category;
  if (options.mediaType) where.media_type = options.mediaType;
  if (options.hashtag?.trim()) {
    const tag = String(options.hashtag).replace(/^#/, '').toLowerCase();
    where.video_hashtags = { some: { tag_name: tag } };
  }

  const poolSize = Math.min(limit * CANDIDATE_POOL_MULT, 500);

  let videos: any[];
  try {
    videos = await prisma.video.findMany({
      where,
      include: {
        creator: {
          select: { id: true, username: true, full_name: true, profile_image: true, country: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: poolSize,
    });
  } catch (err: any) {
    // Drift schéma / base : colonnes manquantes (ex. algo_tier, low_quality_url)
    if (isSchemaColumnError(err)) {
      logger.warn('Feed prisma.video.findMany: drift détecté, fallback SQL', { message: String(err?.message || '') });
      videos = await getVideoPoolFallback(poolSize, options.category, options.hashtag);
    } else {
      throw err;
    }
  }

  // Cold start ou pas d'userId : tri par score contenu uniquement (trending)
  if (!userId) {
    const scored = videos.map((v) => ({ ...v, _score: contentScore(v) }));
    scored.sort((a, b) => b._score - a._score);
    const rotated = rotateListByRefreshNonce(scored, options.refreshNonce, page);
    const paged = rotated.slice(skip, skip + limit);
    return formatResult(paged, videos.length, page, limit);
  }

  const prefs = await loadUserPreferencesCached(userId, options.country);

  const viewerCc = (options.country?.trim().toLowerCase() || prefs.viewerCountry || '') || '';

  videos = videos.filter((v: any) => {
    if (prefs.blockedCreatorIds.has(v.creator_id)) return false;
    if (prefs.reportedVideoIds.has(v.id)) return false;
    if (prefs.notInterestedVideoIds.has(v.id)) return false;
    return true;
  });

  const coldUser =
    prefs.seenVideoIds.size < 12
    && prefs.preferredCategories.size < 2
    && prefs.onboardingCategories.size > 0;

  const topCatEntries = [...prefs.preferredCategories.entries()].sort((a, b) => b[1] - a[1]);
  const topCatSet = new Set(topCatEntries.slice(0, 2).map(([k]) => k));

  const scored = videos.map((v: any) => {
    let score = contentScore(v);
    const catKey = normCat(v.category);
    const ageH = (Date.now() - new Date(v.created_at).getTime()) / (1000 * 3600);
    if (ageH <= 24) {
      score *= 1.1 + (1 - Math.min(1, ageH / 24)) * 0.32;
    }
    if (prefs.likedVideoIds.has(v.id)) score *= 1.32;
    if (prefs.savedVideoIds.has(v.id)) score *= 1.14;
    if (prefs.commentedVideoIds.has(v.id)) score *= 1.24;
    if (prefs.strongWatchVideoIds.has(v.id)) score *= 1.38;
    if (prefs.replayBoostVideoIds.has(v.id)) score *= 1.16;
    if (prefs.preferredCreatorIds.has(v.creator_id)) score *= 1.36;
    if (catKey && prefs.preferredCategories.has(catKey)) {
      const catWeight = prefs.preferredCategories.get(catKey) ?? 0;
      score *= 1 + Math.min(0.68, catWeight * 0.12);
    }
    if (coldUser && catKey && prefs.onboardingCategories.has(catKey)) {
      score *= 1.52;
    }
    const cr = v.creator?.country ? String(v.creator.country).trim().toLowerCase() : '';
    if (viewerCc && cr && cr === viewerCc) score *= 1.24;
    if (prefs.quickSkippedVideoIds.has(v.id)) score *= 0.18;
    if (prefs.seenVideoIds.has(v.id)) score *= 0.16;
    if ((prefs.likedVideoIds.size > 0 || prefs.savedVideoIds.size > 0) && catKey && prefs.preferredCategories.has(catKey)) {
      score *= 1.08;
    }
    return { ...v, _score: score };
  });

  scored.sort((a, b) => b._score - a._score);

  const diversified: any[] = [];
  const diversifiedIds = new Set<string>();
  const creatorCount = new Map<string, number>();
  const explorationCount = Math.ceil(limit * EXPLORATION_RATIO);
  const antiBubbleCount = Math.max(1, Math.ceil(limit * ANTI_BUBBLE_RATIO));
  let explorationInjected = 0;
  let antiBubbleInjected = 0;

  for (const v of scored) {
    if (diversified.length >= limit) break;
    const c = v.creator_id;
    const n = creatorCount.get(c) ?? 0;
    if (n >= MAX_VIDEOS_PER_CREATOR) continue;
    diversified.push(v);
    diversifiedIds.add(String(v.id));
    creatorCount.set(c, n + 1);
  }

  if (explorationInjected < explorationCount && scored.length > diversified.length) {
    const rest = scored.filter((x) => !diversifiedIds.has(String(x.id)));
    const explorationCandidates = rest.slice(-Math.min(50, rest.length));
    for (let i = 0; i < explorationCount && explorationCandidates.length > 0; i++) {
      const idx = Math.floor(Math.random() * Math.min(explorationCandidates.length, 10));
      const cand = explorationCandidates[idx];
      if (cand && diversified.length >= 3 && !diversifiedIds.has(String(cand.id))) {
        const insertAt = Math.floor(diversified.length * (0.25 + Math.random() * 0.45));
        diversified.splice(insertAt, 0, cand);
        diversifiedIds.add(String(cand.id));
        explorationInjected++;
      }
    }
  }

  if (antiBubbleInjected < antiBubbleCount && scored.length > diversified.length) {
    const nichePool = scored.filter(
      (x) =>
        !diversifiedIds.has(String(x.id))
        && (!normCat(x.category) || !topCatSet.has(normCat(x.category))),
    );
    const nicheCandidates = nichePool.slice(-Math.min(60, nichePool.length));
    for (let i = 0; i < antiBubbleCount && nicheCandidates.length > 0; i++) {
      const idx = Math.floor(Math.random() * Math.min(nicheCandidates.length, 14));
      const cand = nicheCandidates[idx];
      if (cand && diversified.length >= 2 && !diversifiedIds.has(String(cand.id))) {
        const insertAt = Math.floor(diversified.length * (0.12 + Math.random() * 0.25));
        diversified.splice(insertAt, 0, cand);
        diversifiedIds.add(String(cand.id));
        antiBubbleInjected++;
      }
    }
  }

  while (diversified.length > limit) diversified.pop();

  const diversifiedForPage = rotateListByRefreshNonce(diversified, options.refreshNonce, page);
  const paged = diversifiedForPage.slice(skip, skip + limit);
  return formatResult(paged, diversified.length, page, limit);
  } catch (err) {
    logger.error('getPersonalizedFeed: erreur inattendue — feed vide pour éviter HTTP 500', {
      message: String((err as Error)?.message || err),
    });
    return formatResult([], 0, page, limit);
  }
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
      low_quality_playback_url: videoData.low_quality_url ?? null,
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
