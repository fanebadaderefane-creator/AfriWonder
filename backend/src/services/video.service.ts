import { Prisma } from '@prisma/client';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import * as qualifiedViewService from './qualifiedView.service.js';
import { validateUrl } from '../utils/urlValidator.js';
import GamificationEngine from './gamification.service.js';
import { emit } from '../events/eventBus.js';
import { containsBannedWord } from './bannedWord.service.js';
import notificationService from './notification.service.js';
import { scheduleCompatTranscodeAfterPublish } from './videoCompatTranscode.service.js';
import { scheduleLowQualityRenditionAfterPublish } from './videoLowQualityRendition.service.js';
import { generateThumbnailForVideoId } from './videoThumbnail.service.js';
import { normalizeSimilarText } from '../utils/similarTextNormalize.js';

/**
 * Mots vides (FR / EN / simplifiés pour AR) — filtrés lors de l'extraction de mots-clés
 * pour « Rechercher contenu similaire ». Liste volontairement courte et couvrante
 * (on enlève aussi les tokens courts <3 caractères plus bas).
 */
const CONTENT_STOPWORDS = new Set<string>([
  // FR
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'ni', 'mais',
  'donc', 'car', 'au', 'aux', 'en', 'pour', 'par', 'sur', 'sous', 'dans',
  'avec', 'sans', 'que', 'qui', 'quoi', 'ce', 'cet', 'cette', 'ces', 'mon',
  'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'notre', 'votre',
  'leur', 'leurs', 'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils',
  'elles', 'est', 'sont', 'été', 'être', 'avoir', 'ai', 'as', 'ont', 'pas',
  'ne', 'si', 'oui', 'non', 'très', 'plus', 'moins', 'tout', 'tous', 'toute',
  'toutes', 'comme', 'aussi', 'alors', 'bien', 'fait', 'faire', 'quand',
  // EN
  'the', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'at', 'for',
  'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us',
  'them', 'my', 'your', 'his', 'our', 'their', 'its', 'so', 'not', 'no',
  'yes', 'very', 'too', 'just', 'now', 'then', 'there', 'here', 'what',
  'when', 'where', 'why', 'how', 'all', 'any', 'some', 'like', 'about',
  // Divers
  'https', 'http', 'www', 'com', 'net', 'org', 'html',
]);

/**
 * Extrait des mots-clés « discriminants » à partir du titre, description, hashtags et catégorie.
 * - Normalise (lowercase + suppression accents + ponctuation).
 * - Retire stopwords et tokens trop courts.
 * - Retourne les uniques, en priorité les hashtags / termes présents dans le titre.
 */
function extractContentKeywords(input: {
  title?: string | null;
  description?: string | null;
  hashtags?: string[];
  category?: string | null;
}): string[] {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/#/g, ' ')
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const tokens = (text?: string | null): string[] => {
    if (!text) return [];
    return normalize(text)
      .split(' ')
      .map((t) => t.trim())
      .filter((t) => t.length >= 3 && !CONTENT_STOPWORDS.has(t) && !/^\d+$/.test(t));
  };

  const keywords = new Set<string>();
  for (const tag of input.hashtags || []) {
    const norm = normalize(String(tag || ''));
    if (norm.length >= 2 && !CONTENT_STOPWORDS.has(norm)) keywords.add(norm);
  }
  for (const t of tokens(input.title)) keywords.add(t);
  for (const t of tokens(input.description)) keywords.add(t);
  if (input.category) {
    const c = normalize(String(input.category));
    if (c.length >= 2) keywords.add(c);
  }
  return Array.from(keywords).slice(0, 24);
}

interface ListOptions {
  page: number;
  limit?: number;
  category?: string;
  category_id?: string;
  visibility?: string;
  userId?: string;
  creator_id?: string;
  hashtag?: string;
  search?: string;
  /** Filtre strict (case-insensitive) sur `music_title` — page Son. */
  music_title?: string;
  /** Liste les vidéos où ce user est mentionné dans au moins un commentaire (`Comment.mention_ids`). */
  tagged_for_user_id?: string;
  /** Fil « Suivis » / Ami(e)s : uniquement les vidéos des créateurs que `userId` suit (données réelles, pas le catalogue global). */
  following_only?: boolean;
}

function isSchemaColumnError(err: unknown): boolean {
  const message = String((err as Error | undefined)?.message || '');
  return /column .* does not exist|Unknown column|no such column|42703/i.test(message);
}

function isUniqueLikeConstraintError(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code !== 'P2002') return false;
  const target = Array.isArray(err.meta?.target) ? err.meta?.target.map(String) : [];
  return target.includes('user_id') && target.includes('video_id');
}

const VIDEO_LIST_FALLBACK_SELECT = `SELECT v.id, v.title, v.description, v.video_url, v.low_quality_url, v.hls_url, v.thumbnail_url, v.creator_id, v.visibility, v.category, v.views, v.likes, v.comments_count, v.shares, v.saves, v.duration, v.created_at, v.updated_at, v.hashtags, v.music_title, v.is_featured, v.algo_tier, v.avg_retention_pct, v.qualified_views_count, v.media_type, v.remix_of_id, v.subtitle_url, v.download_allowed, v.is_premium, v.trim_start_sec, v.trim_end_sec, v.filter_id, v.comments_disabled, v.comment_visibility, v.hide_likes, v.scheduled_at,
                u.username, u.full_name as "creator_name", u.profile_image as "creator_avatar"
         FROM "Video" v
         JOIN "User" u ON u.id = v.creator_id
         WHERE v.visibility = 'public' AND (v.video_url IS NULL OR v.video_url NOT LIKE '%example.com%')
         ORDER BY v.created_at DESC
         LIMIT $1 OFFSET $2`;

const VIDEO_LIST_FALLBACK_SELECT_NO_LOW_Q = `SELECT v.id, v.title, v.description, v.video_url, v.hls_url, v.thumbnail_url, v.creator_id, v.visibility, v.category, v.views, v.likes, v.comments_count, v.shares, v.saves, v.duration, v.created_at, v.updated_at, v.hashtags, v.music_title, v.is_featured, v.algo_tier, v.avg_retention_pct, v.qualified_views_count, v.media_type, v.remix_of_id, v.subtitle_url, v.download_allowed, v.is_premium, v.trim_start_sec, v.trim_end_sec, v.filter_id, v.comments_disabled, v.comment_visibility, v.hide_likes, v.scheduled_at,
                u.username, u.full_name as "creator_name", u.profile_image as "creator_avatar"
         FROM "Video" v
         JOIN "User" u ON u.id = v.creator_id
         WHERE v.visibility = 'public' AND (v.video_url IS NULL OR v.video_url NOT LIKE '%example.com%')
         ORDER BY v.created_at DESC
         LIMIT $1 OFFSET $2`;

const VIEW_DEDUP_WINDOW_MINUTES = Math.max(
  5,
  Number.parseInt(
    process.env.VIDEO_VIEW_DEDUP_WINDOW_MINUTES
      || (process.env.NODE_ENV === 'production' ? '60' : '30'),
    10,
  ) || 30,
);

const STRICT_VIEW_REQUIRES_STABLE_VIEWER_ID =
  String(process.env.VIDEO_VIEW_STRICT_REQUIRE_STABLE_ID ?? '1') !== '0';

const inFlightAutoThumbnailVideoIds = new Set<string>();

class VideoService {
  private scheduleThumbnailBackfillIfMissing(video: {
    id?: string | null;
    media_type?: string | null;
    thumbnail_url?: string | null;
  }): void {
    const videoId = String(video.id || '').trim();
    if (!videoId) return;
    const mediaType = String(video.media_type || 'video').toLowerCase();
    if (mediaType !== 'video') return;
    if (String(video.thumbnail_url || '').trim()) return;
    if (inFlightAutoThumbnailVideoIds.has(videoId)) return;

    inFlightAutoThumbnailVideoIds.add(videoId);
    generateThumbnailForVideoId(videoId, { timeSec: 1 })
      .catch((err) => {
        logger.warn('Auto thumbnail backfill failed', {
          videoId,
          err: (err as Error)?.message || String(err),
        });
      })
      .finally(() => {
        inFlightAutoThumbnailVideoIds.delete(videoId);
      });
  }
  /**
   * Normalise une URL vidéo/image UNIQUEMENT à l'upload
   * Décodage récursif puis réencodage propre
   * NE JAMAIS utiliser dans list() ou getById() - ça casse la stabilité React
   */
  private normalizeUrl(url: string): string {
    if (!url) return url;
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/');
      const filename = parts.pop();

      if (!filename) return url;

      // Décoder récursivement si nécessaire
      let decoded = filename;
      let previous = '';
      const maxIterations = 5;
      
      for (let i = 0; i < maxIterations; i++) {
        previous = decoded;
        try {
          const temp = decodeURIComponent(decoded);
          if (temp === decoded) break;
          decoded = temp;
        } catch {
          break;
        }
      }

      // Réencoder proprement
      const safeFilename = encodeURIComponent(decoded);
      parts.push(safeFilename);
      u.pathname = parts.join('/');

      return u.toString();
    } catch {
      // Si l'URL n'est pas valide, retourner telle quelle
      return url;
    }
  }
  async list(options: ListOptions) {
    const {
      page,
      limit,
      category,
      category_id,
      visibility = 'public',
      userId,
      creator_id: creatorId,
      hashtag,
      search,
      music_title: musicTitle,
      tagged_for_user_id: taggedForUserId,
      following_only: followingOnly,
    } = options;
    // Si limit n'est pas spécifié ou est 0, récupérer toutes les vidéos
    const shouldGetAll = !limit || limit === 0;
    const skip = shouldGetAll ? undefined : (page - 1) * (limit || 0);

    const where: any = {
      // Exclure les vidéos avec des URLs de test (example.com)
      video_url: {
        not: {
          contains: 'example.com',
        },
      },
    };

    /** Fil abonnements : créateurs suivis uniquement (public + contenu « abonnés » de ces créateurs). */
    if (followingOnly) {
      if (!userId) {
        return {
          videos: [],
          pagination: {
            page,
            limit: limit || 0,
            total: 0,
            totalPages: 0,
          },
        };
      }
      const follows = await prisma.follow.findMany({
        where: { follower_id: userId },
        select: { following_id: true },
      });
      const creatorIds = follows.map((f) => f.following_id);
      if (creatorIds.length === 0) {
        return {
          videos: [],
          pagination: {
            page,
            limit: limit || 0,
            total: 0,
            totalPages: 0,
          },
        };
      }
      where.creator_id = { in: creatorIds };
      where.visibility = { in: ['public', 'abonnes'] };
    }

    // Profil « Identifié » : vidéos publiques où l’utilisateur est cité dans un commentaire (@ → mention_ids)
    // ou dans le titre / la description (@username, aligné sur le parsing commentaires).
    const taggedId = (taggedForUserId || '').trim();
    if (followingOnly) {
      /* `where` déjà restreint aux suivis — ne pas appliquer les branches « visibilité globale » ci-dessous. */
    } else if (taggedId) {
      where.visibility = 'public';
      const taggedUser = await prisma.user.findUnique({
        where: { id: taggedId },
        select: { username: true },
      });
      const usernameSlug = (taggedUser?.username || '').replace(/^@+/, '').trim();
      const taggedOr: Record<string, unknown>[] = [
        {
          video_comments: {
            some: { mention_ids: { has: taggedId } },
          },
        },
      ];
      if (usernameSlug) {
        const needle = `@${usernameSlug}`;
        taggedOr.push(
          { title: { contains: needle, mode: 'insensitive' } },
          { description: { contains: needle, mode: 'insensitive' } },
        );
      }
      where.OR = taggedOr;
    } else if (visibility === 'public') {
      where.visibility = 'public';
    } else if (visibility === 'creator' && creatorId && userId && creatorId === userId) {
      // Profil propre : inclure public + privé (brouillons) du créateur — vidéos privées = brouillons
      where.creator_id = creatorId;
      where.OR = [
        { visibility: 'public' },
        { visibility: { in: ['prive', 'private'] } },
      ];
    } else if (userId) {
      // Si utilisateur connecté, voir aussi ses vidéos privées et celles des abonnements.
      // Accepte les libellés FR historiques (`prive`, `abonnes`) ET les nouveaux EN
      // (`private`, `followers`) envoyés par l'écran "Créer" TikTok-like.
      where.OR = [
        { visibility: 'public' },
        { visibility: { in: ['prive', 'private'] }, creator_id: userId },
        {
          visibility: { in: ['abonnes', 'followers'] },
          creator: {
            followers: {
              some: {
                follower_id: userId,
              },
            },
          },
        },
      ];
    }

    // Filtre par catégorie (string ou category_id)
    if (category) {
      where.category = category;
    } else if (category_id) {
      where.video_categories = { some: { category_id } };
    }

    /**
     * Vidéos planifiées : on cache celles dont `scheduled_at` est dans le futur,
     * sauf quand l'utilisateur consulte ses propres vidéos (mode `creator`).
     * Les vidéos non planifiées (`scheduled_at = null`) restent visibles.
     */
    const isOwnerScope = visibility === 'creator' && creatorId && userId && creatorId === userId;
    if (!isOwnerScope) {
      const now = new Date();
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { OR: [{ scheduled_at: null }, { scheduled_at: { lte: now } }] },
      ];
    }
    // Filtre par créateur (incompatible avec le mode « identifications » ni fil suivis)
    if (creatorId && visibility !== 'creator' && !taggedId && !followingOnly) {
      where.creator_id = creatorId;
    }

    // Filtre par hashtag
    if (hashtag && hashtag.trim()) {
      const tag = String(hashtag).replace(/^#/, '').toLowerCase();
      where.video_hashtags = { some: { tag_name: tag } };
    }

    // Page Son: filtrer strictement `music_title` (indépendant de `search`)
    if (musicTitle && String(musicTitle).trim()) {
      where.music_title = { equals: String(musicTitle).trim(), mode: 'insensitive' };
    }

    // Recherche texte (titre, description, hashtags, music_title)
    if (search && search.trim()) {
      const q = search.trim();
      const searchOr = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { music_title: { contains: q, mode: 'insensitive' } },
        { video_hashtags: { some: { tag_name: { contains: q.replace(/^#/, ''), mode: 'insensitive' } } } },
      ];
      if (taggedId) {
        const taggedPart = where.OR;
        where.AND = [{ OR: taggedPart as any[] }, { OR: searchOr }];
        delete where.OR;
      } else if (followingOnly) {
        const cid = where.creator_id;
        const vis = where.visibility;
        delete where.creator_id;
        delete where.visibility;
        where.AND = [{ creator_id: cid }, { visibility: vis }, { OR: searchOr }];
      } else {
        where.OR = searchOr;
      }
    }

    let videos: any[];
    let total: number;

    const orderBy =
      creatorId && !taggedId && !followingOnly
        ? ([{ is_featured: 'desc' }, { created_at: 'desc' }] as const)
        : { created_at: 'desc' };

    try {
      [videos, total] = await Promise.all([
        prisma.video.findMany({
          where,
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                full_name: true,
                profile_image: true,
              },
            },
            video_hashtags: { select: { tag_name: true } },
            _count: {
              select: {
                video_likes: true,
                video_comments: true,
              },
            },
          },
          orderBy: orderBy as any,
          ...(skip !== undefined && { skip }),
          ...(!shouldGetAll && limit && { take: limit }),
        }),
        prisma.video.count({ where }),
      ]);
    } catch (err) {
      logger.warn('video.list Prisma failed, using raw SQL fallback', { err: (err as Error)?.message });
      const takeVal = shouldGetAll ? 9999 : (limit || 20);
      const skipVal = shouldGetAll ? 0 : (skip ?? 0);
      let rows: any[];
      try {
        rows = await prisma.$queryRawUnsafe<any[]>(
          VIDEO_LIST_FALLBACK_SELECT,
          takeVal,
          skipVal
        );
      } catch (rawErr) {
        if (!isSchemaColumnError(rawErr)) throw rawErr;
        logger.warn('video.list fallback retry without low_quality_url', { err: (rawErr as Error)?.message });
        rows = await prisma.$queryRawUnsafe<any[]>(
          VIDEO_LIST_FALLBACK_SELECT_NO_LOW_Q,
          takeVal,
          skipVal
        );
      }
      const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
        `SELECT COUNT(*)::int as count FROM "Video" v WHERE v.visibility = 'public' AND (v.video_url IS NULL OR v.video_url NOT LIKE '%example.com%')`
      );
      total = Number(countRows[0]?.count ?? 0);
      videos = rows.map((r: any) => ({
        ...r,
        creator: { id: r.creator_id, username: r.username, full_name: r.creator_name, profile_image: r.creator_avatar },
        video_hashtags: [],
        _count: { video_likes: r.likes ?? 0, video_comments: r.comments_count ?? 0 },
      }));
    }

    // Formater les vidéos pour correspondre au format attendu par le frontend
    // IMPORTANT: Ne JAMAIS modifier les URLs ici - elles doivent être stables pour React
    const formattedVideos = videos.map((video: any) => {
      this.scheduleThumbnailBackfillIfMissing(video);
      const { creator, _count, video_hashtags, ...videoData } = video;
      // Parser les hashtags depuis JSON ou video_hashtags
      let hashtags = video.hashtags;
      if (typeof hashtags === 'string') {
        try {
          hashtags = JSON.parse(hashtags);
        } catch {
          hashtags = [];
        }
      }
      if (!Array.isArray(hashtags) || hashtags.length === 0) {
        hashtags = (video_hashtags || []).map((h: any) => h.tag_name);
      }
      return {
        ...videoData,
        low_quality_playback_url: videoData.low_quality_url ?? null,
        // URLs lues directement depuis la base - aucune transformation
        creator_id: creator?.id || video.creator_id,
        creator_name: creator?.full_name || creator?.username || '',
        creator_avatar: creator?.profile_image || '',
        views: Math.max(Number(video.views ?? 0), Number(video.qualified_views_count ?? 0)),
        likes: _count?.video_likes || video.likes || 0,
        comments_count: _count?.video_comments || video.comments_count || 0,
        hashtags: Array.isArray(hashtags) ? hashtags : [],
        music_title: video.music_title || null,
      };
    });

    return {
      videos: formattedVideos,
      pagination: {
        page: shouldGetAll ? 1 : page,
        limit: shouldGetAll ? total : (limit || total),
        total,
        totalPages: shouldGetAll ? 1 : Math.ceil(total / (limit || total)),
      },
    };
  }

  async getById(id: string, userId?: string) {
    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            full_name: true,
            profile_image: true,
          },
        },
        remix_of: {
          select: {
            id: true,
            title: true,
            creator_id: true,
            creator: {
              select: { id: true, username: true, full_name: true, profile_image: true },
            },
          },
        },
        challenge: {
          select: { id: true, hashtag: true, title: true, is_sponsored: true, sponsor_brand: true },
        },
        video_hashtags: { select: { tag_name: true } },
        video_likes: userId
          ? {
              where: { user_id: userId },
              select: { id: true },
            }
          : false,
        _count: {
          select: {
            video_likes: true,
            video_comments: true,
          },
        },
      },
    });

    if (!video) {
      const error: any = new Error('Vidéo non trouvée');
      error.statusCode = 404;
      throw error;
    }

    // Vérifier la visibilité
    if (video.visibility === 'prive' && video.creator_id !== userId) {
      const error: any = new Error('Vidéo privée');
      error.statusCode = 403;
      throw error;
    }

    if (video.visibility === 'abonnes' && video.creator_id !== userId && userId) {
      const isFollowing = await prisma.follow.findFirst({
        where: {
          follower_id: userId,
          following_id: video.creator_id,
        },
      });

      if (!isFollowing) {
        const error: any = new Error('Vous devez suivre le créateur pour voir cette vidéo');
        error.statusCode = 403;
        throw error;
      }
    }

    // Vues = backend event uniquement. Ne PAS incrémenter dans getById (voir POST /videos/:id/view).

    // Parser les hashtags depuis JSON ou video_hashtags
    let hashtags = video.hashtags;
    if (typeof hashtags === 'string') {
      try {
        hashtags = JSON.parse(hashtags);
      } catch {
        hashtags = [];
      }
    }
    if (!Array.isArray(hashtags) || hashtags.length === 0) {
      hashtags = (video.video_hashtags || []).map((h: any) => h.tag_name);
    }

    const [reaction_counts, current_user_reaction] = await Promise.all([
      this.getReactionCounts(video.id),
      this.getCurrentUserReaction(video.id, userId ?? null),
    ]);

    // Formater la réponse pour correspondre au format attendu par le frontend
    // IMPORTANT: Ne JAMAIS modifier les URLs ici - elles doivent être stables pour React
    const formattedVideo: any = {
      ...video,
      low_quality_playback_url: video.low_quality_url ?? null,
      // URLs lues directement depuis la base - aucune transformation
      creator_id: video.creator.id,
      creator_name: video.creator.full_name || video.creator.username,
      creator_avatar: video.creator.profile_image,
      is_verified: false,
      is_liked: video.video_likes ? (Array.isArray(video.video_likes) && video.video_likes.length > 0) : false,
      likes: video.likes ?? video._count?.video_likes ?? 0,
      reaction_counts,
      current_user_reaction,
      comments_count: video._count?.video_comments || 0,
      hashtags: Array.isArray(hashtags) ? hashtags : [],
      music_title: video.music_title || null,
      comment_visibility: video.comment_visibility || 'everyone',
      comment_subscribers_first: Boolean((video as any).comment_subscribers_first),
      hide_likes: video.hide_likes ?? false,
      remix_kind: (video as any).remix_kind ?? null,
      remix_credit: (video as any).remix_of_id
        ? {
            video_id: (video as any).remix_of?.id,
            title: (video as any).remix_of?.title,
            kind: (video as any).remix_kind || 'remix',
            creator: (video as any).remix_of?.creator
              ? {
                  id: (video as any).remix_of.creator.id,
                  username: (video as any).remix_of.creator.username,
                  full_name: (video as any).remix_of.creator.full_name,
                  profile_image: (video as any).remix_of.creator.profile_image,
                }
              : null,
          }
        : null,
      challenge: (video as any).challenge
        ? {
            id: (video as any).challenge.id,
            hashtag: (video as any).challenge.hashtag,
            title: (video as any).challenge.title,
            is_sponsored: (video as any).challenge.is_sponsored,
            sponsor_brand: (video as any).challenge.sponsor_brand,
          }
        : null,
    };

    // Supprimer les champs internes
    delete formattedVideo.remix_of;
    delete formattedVideo.creator;
    delete formattedVideo.video_hashtags;
    if (formattedVideo.video_likes !== undefined) {
      delete formattedVideo.video_likes;
    }
    delete formattedVideo._count;

    this.scheduleThumbnailBackfillIfMissing(video as any);

    return formattedVideo;
  }

  /**
   * Enregistrer une vue (event backend validé).
   * Règles: viewer ≠ creator, ≥3 sec OU ≥25%, 1 vue / 30 min / user|device / vidéo.
   */
  async recordView(videoId: string, options: {
    userId?: string;
    deviceId?: string;
    watchSeconds?: number;
    watchPercent?: number;
    scrollSlow?: boolean;
    interactionDetected?: boolean;
    ip?: string;
  }): Promise<{ recorded: boolean; views: number }> {
    const { userId, deviceId, watchSeconds = 0, watchPercent = 0, scrollSlow, interactionDetected, ip } = options;
    const normalizedUserId = String(userId || '').trim();
    const normalizedDeviceId = String(deviceId || '').trim();
    const normalizedIp = String(ip || '').trim();
    const hasStableId = Boolean(normalizedUserId || normalizedDeviceId);
    const viewerKey = normalizedUserId
      ? `u:${normalizedUserId}`
      : normalizedDeviceId
        ? `d:${normalizedDeviceId}`
        : (!STRICT_VIEW_REQUIRES_STABLE_VIEWER_ID && normalizedIp ? `i:${normalizedIp}` : null);

    if (!viewerKey) {
      return { recorded: false, views: 0 };
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, creator_id: true, views: true, avg_retention_pct: true, category: true },
    });
    const prevViews = video?.views ?? 0;

    if (!video) return { recorded: false, views: 0 };

    if (userId && userId === video.creator_id) return { recorded: false, views: video.views };

    const minWatch = watchSeconds >= 3 || watchPercent >= 25;
    if (!minWatch) {
      /** FYP 4.2 — enregistrer les skips rapides (< 3 s / < 25 %) pour pénaliser dans l’algo. */
      if (userId) {
        try {
          const existing = await prisma.viewHistory.findFirst({
            where: { user_id: userId, video_id: videoId },
          });
          const payload = {
            watch_seconds: Math.round(watchSeconds),
            watch_percent: watchPercent,
            completed: false,
            category: video.category ?? undefined,
            updated_at: new Date(),
          };
          if (existing) {
            await prisma.viewHistory.update({ where: { id: existing.id }, data: payload });
          } else {
            await prisma.viewHistory.create({
              data: { user_id: userId, video_id: videoId, ...payload },
            });
          }
        } catch {
          /* non bloquant */
        }
      }
      return { recorded: false, views: video.views };
    }

    const bucketWindowSeconds = VIEW_DEDUP_WINDOW_MINUTES * 60;
    const timeBucket = Math.floor(Date.now() / bucketWindowSeconds);

    const result = await prisma.videoView.createMany({
      data: [{
        video_id: videoId,
        viewer_key: viewerKey,
        time_bucket: timeBucket,
      }],
      skipDuplicates: true,
    });

    if (result.count === 0) {
      if ((scrollSlow || interactionDetected) && watchSeconds >= 5) {
        await qualifiedViewService.recordQualifiedView(videoId, {
          userId,
          deviceId: deviceId || undefined,
          watchSeconds,
          watchPercent,
          scrollSlow,
          interactionDetected,
        });
      }
      // Mettre à jour ViewHistory pour l'algo même si la vue n'est pas comptée (même bucket)
      if (userId) {
        const existing = await prisma.viewHistory.findFirst({
          where: { user_id: userId, video_id: videoId },
        });
        const payload = {
          watch_seconds: Math.round(watchSeconds),
          watch_percent: watchPercent,
          completed: watchPercent >= 80,
          category: video.category ?? undefined,
          updated_at: new Date(),
        };
        if (existing) {
          await prisma.viewHistory.update({ where: { id: existing.id }, data: payload });
        } else {
          await prisma.viewHistory.create({
            data: { user_id: userId, video_id: videoId, ...payload },
          });
        }
      }
      return { recorded: false, views: video.views };
    }

    const newViews = video.views + 1;
    const newAvgRetention = video.avg_retention_pct != null
      ? (video.avg_retention_pct * video.views + watchPercent) / newViews
      : watchPercent;

    const updated = await prisma.video.update({
      where: { id: videoId },
      data: {
        views: { increment: 1 },
        avg_retention_pct: newAvgRetention,
      },
      select: { views: true },
    });

    if (watchSeconds >= 5) {
      await qualifiedViewService.recordQualifiedView(videoId, {
        userId,
        deviceId: deviceId || undefined,
        watchSeconds,
        watchPercent,
        scrollSlow,
        interactionDetected,
      });
    }
    // Algo de recommandation : mettre à jour l'historique de visionnage (watch_seconds, watch_percent)
    if (userId) {
      const existing = await prisma.viewHistory.findFirst({
        where: { user_id: userId, video_id: videoId },
      });
      const payload = {
        watch_seconds: Math.round(watchSeconds),
        watch_percent: watchPercent,
        completed: watchPercent >= 80,
        category: video.category ?? undefined,
        updated_at: new Date(),
      };
      if (existing) {
        await prisma.viewHistory.update({
          where: { id: existing.id },
          data: payload,
        });
      } else {
        await prisma.viewHistory.create({
          data: {
            user_id: userId,
            video_id: videoId,
            ...payload,
          },
        });
      }
    }
    const [viralBonusService, videoAlgoService, dailyMissionsService] = await Promise.all([
      import('./viralBonus.service.js'),
      import('./videoAlgo.service.js'),
      import('./dailyMissions.service.js'),
    ]);
    viralBonusService.checkAndCreateViralBonuses(videoId, updated.views).catch(() => {});
    videoAlgoService.updateVideoAlgoTier(videoId).catch(() => {});
    if (prevViews < 1000 && updated.views >= 1000) {
      dailyMissionsService.checkAndAwardReach1000Views(video.creator_id, videoId).catch(() => {});
    }
    // Event-driven: emit for recommendation, analytics, future Kafka consumers
    emit('video', 'video', 'viewed', {
      videoId,
      creatorId: video.creator_id,
      userId,
      deviceId,
      watchSeconds,
      watchPercent,
      views: updated.views,
    });
    return { recorded: true, views: updated.views };
  }

  private readonly SPAM_PATTERNS = [
    /\b(viagra|cialis|casino|lottery|winner|click here|buy now)\b/i,
    /(https?:\/\/[^\s]+){3,}/,
    /(.)\1{15,}/,
  ];

  async create(data: {
    title: string;
    description?: string;
    video_url: string;
    thumbnail_url?: string;
    creator_id: string;
    visibility?: string;
    category?: string;
    hashtags?: string[];
    music_title?: string;
    /** JSON string (éditeur mobile) — persisté tel quel pour jobs futurs. */
    editor_metadata?: string;
    media_type?: 'video' | 'image';
    remix_of_id?: string;
    subtitle_url?: string;
    download_allowed?: boolean;
    is_premium?: boolean;
    comments_disabled?: boolean;
    comment_visibility?: string;
    hide_likes?: boolean;
    scheduled_at?: string | Date | null;
    poll_options?: string[];
    remix_kind?: string | null;
    comment_subscribers_first?: boolean;
    challenge_id?: string | null;
  }) {
    // Valider les données requises
    if (!data.title || !data.video_url) {
      const error: any = new Error('Titre et URL vidéo sont requis');
      error.statusCode = 400;
      throw error;
    }

    const textToCheck = `${data.title} ${data.description || ''}`;
    if (this.SPAM_PATTERNS.some((p) => p.test(textToCheck))) {
      const error: any = new Error('Contenu identifié comme spam');
      error.statusCode = 400;
      throw error;
    }

    const existingSameUrl = await prisma.video.findFirst({
      where: { video_url: data.video_url },
    });
    if (existingSameUrl) {
      const error: any = existingSameUrl.creator_id === data.creator_id
        ? new Error('Vous avez déjà publié cette vidéo (contenu dupliqué)')
        : new Error('Cette vidéo a déjà été publiée par un autre créateur (repost non autorisé)');
      error.statusCode = 400;
      throw error;
    }

    // Rejeter les URLs de domaines externes non autorisés
    validateUrl(data.video_url, 'video_url');
    validateUrl(data.thumbnail_url, 'thumbnail_url');

    const hashtagsArray = Array.isArray(data.hashtags) ? data.hashtags : [];
    const video = await prisma.video.create({
      data: {
        title: data.title,
        description: data.description,
        video_url: this.normalizeUrl(data.video_url),
        thumbnail_url: data.thumbnail_url ? this.normalizeUrl(data.thumbnail_url) : undefined,
        creator_id: data.creator_id,
        visibility: data.visibility || 'public',
        category: data.category,
        hashtags: hashtagsArray.length ? JSON.stringify(hashtagsArray) : undefined,
        music_title: data.music_title,
        media_type: data.media_type || 'video',
        ...(typeof data.editor_metadata === 'string' && data.editor_metadata.trim()
          ? { editor_metadata: data.editor_metadata.trim().slice(0, 16000) }
          : {}),
        ...(data.remix_of_id && { remix_of_id: data.remix_of_id }),
        ...(data.remix_kind != null && String(data.remix_kind).trim() && { remix_kind: String(data.remix_kind).trim() }),
        ...(data.challenge_id != null && { challenge_id: data.challenge_id || null }),
        ...(data.comment_subscribers_first != null && {
          comment_subscribers_first: Boolean(data.comment_subscribers_first),
        }),
        ...(data.subtitle_url && { subtitle_url: data.subtitle_url }),
        ...(data.download_allowed != null && { download_allowed: Boolean(data.download_allowed) }),
        ...(data.is_premium != null && { is_premium: Boolean(data.is_premium) }),
        ...(data.comments_disabled != null && { comments_disabled: Boolean(data.comments_disabled) }),
        ...(data.comment_visibility != null && {
          comment_visibility: ['everyone', 'friends', 'followers', 'mentioned_only', 'no_one'].includes(
            data.comment_visibility,
          )
            ? data.comment_visibility
            : 'everyone',
        }),
        ...(data.hide_likes != null && { hide_likes: Boolean(data.hide_likes) }),
        ...(data.scheduled_at != null && { scheduled_at: data.scheduled_at ? new Date(data.scheduled_at) : null }),
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            full_name: true,
            profile_image: true,
          },
        },
      },
    });

    if (hashtagsArray.length > 0) {
      await prisma.videoHashtag.createMany({
        data: hashtagsArray.map((tag: string) => ({
          video_id: video.id,
          tag_name: String(tag).replace(/^#/, '').toLowerCase(),
        })),
        skipDuplicates: true,
      });
    }

    if (data.category && data.category.trim()) {
      const catName = String(data.category).trim().toLowerCase();
      let cat = await prisma.category.findUnique({ where: { name: catName } });
      if (!cat) {
        cat = await prisma.category.create({ data: { name: catName } });
      }
      await prisma.videoCategory.create({
        data: { video_id: video.id, category_id: cat.id },
      }).catch(() => {});
    }

    logger.info('Vidéo créée', { videoId: video.id, creatorId: data.creator_id });

    if ((video.media_type || 'video') === 'video' && video.video_url) {
      scheduleCompatTranscodeAfterPublish(video.id, video.video_url);
      scheduleLowQualityRenditionAfterPublish(video.id);
      // Thumbnail manquante à l'upload: générer automatiquement une frame tôt dans la vidéo.
      if (!video.thumbnail_url) {
        generateThumbnailForVideoId(video.id, { timeSec: 1 }).catch((err) => {
          logger.warn('Auto thumbnail generation failed after upload', {
            videoId: video.id,
            err: (err as Error)?.message || String(err),
          });
        });
      }
    }

    GamificationEngine.onVideoUpload(data.creator_id).catch((e) =>
      logger.warn('Gamification onVideoUpload', { creatorId: data.creator_id, err: e })
    );
    (await import('./dailyMissions.service.js')).checkAndAwardPostVideo(data.creator_id).catch(() => {});

    if (Array.isArray(data.poll_options) && data.poll_options.length >= 2) {
      const { createVideoPoll } = await import('./videoPoll.service.js');
      await createVideoPoll(data.creator_id, video.id, data.poll_options).catch((e) =>
        logger.warn('video poll create failed', { videoId: video.id, err: e })
      );
    }

    return video;
  }

  /** Montage léger : définir trim start/end (secondes). */
  async trim(id: string, userId: string, payload: { trim_start_sec?: number; trim_end_sec?: number }) {
    const video = await prisma.video.findUnique({
      where: { id },
      select: { creator_id: true, duration: true },
    });
    if (!video) throw new Error('Vidéo non trouvée');
    if (video.creator_id !== userId) throw new Error('Non autorisé');
    const start = payload.trim_start_sec != null ? Math.max(0, Math.floor(payload.trim_start_sec)) : undefined;
    const end = payload.trim_end_sec != null ? Math.max(0, Math.floor(payload.trim_end_sec)) : undefined;
    if (start != null && end != null && start >= end) throw new Error('trim_start_sec doit être inférieur à trim_end_sec');
    if (video.duration != null && end != null && end > video.duration) throw new Error('trim_end_sec ne peut pas dépasser la durée de la vidéo');
    const updated = await prisma.video.update({
      where: { id },
      data: { trim_start_sec: start ?? undefined, trim_end_sec: end ?? undefined },
      include: { creator: { select: { id: true, username: true, full_name: true, profile_image: true } } },
    });
    return updated;
  }

  async update(id: string, data: Partial<{
    title: string;
    description: string;
    visibility: string;
    category: string;
    is_featured: boolean;
    hashtags?: string[];
    music_title?: string;
    thumbnail_url?: string;
    comments_disabled?: boolean;
    comment_visibility?: string;
    comment_subscribers_first?: boolean;
    hide_likes?: boolean;
    scheduled_at?: string | Date | null;
    remix_kind?: string | null;
    challenge_id?: string | null;
  }>, userId: string) {
    // Vérifier que l'utilisateur est le créateur
    const video = await prisma.video.findUnique({
      where: { id },
      select: { creator_id: true, is_featured: true },
    });

    if (!video) {
      throw new Error('Vidéo non trouvée');
    }

    if (video.creator_id !== userId) {
      throw new Error('Non autorisé');
    }

    /** Max 3 vidéos épinglées sur le profil (aligné usage type TikTok). */
    if (data.is_featured === true && !video.is_featured) {
      const featuredOthers = await prisma.video.count({
        where: {
          creator_id: userId,
          is_featured: true,
          id: { not: id },
        },
      });
      if (featuredOthers >= 3) {
        const err: Error & { statusCode?: number } = new Error(
          'Vous pouvez épingler au maximum 3 vidéos sur votre profil'
        );
        err.statusCode = 400;
        throw err;
      }
    }

    const hashtagsArray = Array.isArray(data.hashtags) ? data.hashtags : undefined;
    const updateData: Record<string, unknown> = { ...data };

    if (hashtagsArray !== undefined) {
      updateData.hashtags = hashtagsArray.length ? JSON.stringify(hashtagsArray) : null;
    }
    if (data.scheduled_at !== undefined) {
      updateData.scheduled_at = data.scheduled_at ? new Date(data.scheduled_at) : null;
    }
    if (data.comment_subscribers_first !== undefined) {
      updateData.comment_subscribers_first = Boolean(data.comment_subscribers_first);
    }
    if (data.remix_kind !== undefined) {
      updateData.remix_kind = data.remix_kind ? String(data.remix_kind).trim() : null;
    }
    if (data.challenge_id !== undefined) {
      updateData.challenge_id = data.challenge_id || null;
    }

    const updated = await prisma.video.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            full_name: true,
            profile_image: true,
          },
        },
      },
    });

    if (hashtagsArray !== undefined) {
      await prisma.videoHashtag.deleteMany({ where: { video_id: id } });
      if (hashtagsArray.length > 0) {
        await prisma.videoHashtag.createMany({
          data: hashtagsArray.map((tag: string) => ({
            video_id: id,
            tag_name: String(tag).replace(/^#/, '').toLowerCase(),
          })),
          skipDuplicates: true,
        });
      }
    }

    return updated;
  }

  async delete(id: string, userId: string) {
    // Vérifier que l'utilisateur est le créateur
    const video = await prisma.video.findUnique({
      where: { id },
      select: { creator_id: true },
    });

    if (!video) {
      throw new Error('Vidéo non trouvée');
    }

    if (video.creator_id !== userId) {
      throw new Error('Non autorisé');
    }

    await prisma.video.delete({
      where: { id },
    });

    logger.info('Vidéo supprimée', { videoId: id, userId });
  }

  private static readonly REACTION_TYPES = new Set([
    'like',
    'love',
    'fire',
    'laugh',
    'wow',
    'sad',
    'angry',
    /** Phase 23 — réactions sociales (libellés produit) */
    'moving',
    'strong',
    'african',
  ]);

  async toggleLike(videoId: string, userId: string, type: string = 'like') {
    const reactionType = VideoService.REACTION_TYPES.has(type) ? type : 'like';
    const result = await this.setReaction(videoId, userId, reactionType);
    return {
      liked: result.reaction !== null,
      reaction: result.reaction,
      reaction_counts: result.reaction_counts,
    };
  }

  /** Définir ou supprimer une réaction (CPO 2.44). type = null pour retirer. */
  async setReaction(videoId: string, userId: string, type: string | null) {
    if (!videoId?.trim() || !userId?.trim()) {
      const err: any = new Error('Paramètres invalides');
      err.statusCode = 400;
      throw err;
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, likes: true },
    });
    if (!video) {
      const err: any = new Error('Vidéo introuvable');
      err.statusCode = 404;
      throw err;
    }

    const existing = await prisma.like.findFirst({
      where: { video_id: videoId, user_id: userId },
    });

    if (type === null || type === '') {
      if (existing) {
        await prisma.$transaction([
          prisma.like.delete({ where: { id: existing.id } }),
          prisma.video.update({
            where: { id: videoId },
            data: { likes: Math.max(0, (video.likes ?? 0) - 1) },
          }),
        ]);
      }
      return { reaction: null, reaction_counts: await this.getReactionCounts(videoId) };
    }

    const reactionType = VideoService.REACTION_TYPES.has(type) ? type : 'like';

    if (existing) {
      if (existing.type === reactionType) {
        await prisma.like.delete({ where: { id: existing.id } });
        await prisma.video.update({
          where: { id: videoId },
          data: { likes: Math.max(0, (video.likes ?? 0) - 1) },
        });
        return { reaction: null, reaction_counts: await this.getReactionCounts(videoId) };
      }
      await prisma.like.update({
        where: { id: existing.id },
        data: { type: reactionType },
      });
      return { reaction: reactionType, reaction_counts: await this.getReactionCounts(videoId) };
    }

    try {
      await prisma.$transaction([
        prisma.like.create({
          data: { video_id: videoId, user_id: userId, type: reactionType },
        }),
        prisma.video.update({
          where: { id: videoId },
          data: { likes: { increment: 1 } },
        }),
      ]);
    } catch (error) {
      // Deux taps rapides / requêtes concurrentes peuvent tenter le même INSERT.
      // Dans ce cas, la ligne existe déjà: on renvoie un état idempotent au lieu de 500.
      if (isUniqueLikeConstraintError(error)) {
        const existingAfterRace = await prisma.like.findFirst({
          where: { video_id: videoId, user_id: userId },
          select: { type: true },
        });
        return {
          reaction: existingAfterRace?.type ?? reactionType,
          reaction_counts: await this.getReactionCounts(videoId),
        };
      }
      throw error;
    }

    const vCreator = await prisma.video.findUnique({
      where: { id: videoId },
      select: { creator_id: true },
    });
    if (vCreator?.creator_id && vCreator.creator_id !== userId) {
      const liker = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, full_name: true },
      });
      const likerName = liker?.full_name || liker?.username || 'Quelqu\'un';
      notificationService.create(vCreator.creator_id, {
        type: 'like',
        title: 'Nouvelle réaction',
        message:
          reactionType === 'like'
            ? `${likerName} a aimé votre vidéo`
            : `${likerName} a réagi à votre vidéo`,
        reference_type: 'video',
        reference_id: videoId,
        data: { videoId, from_user_id: userId, reaction: reactionType },
      }).catch(() => {});
    }

    return { reaction: reactionType, reaction_counts: await this.getReactionCounts(videoId) };
  }

  async getReactionCounts(videoId: string): Promise<Record<string, number>> {
    const rows = await prisma.like.groupBy({
      by: ['type'],
      where: { video_id: videoId },
      _count: { type: true },
    });
    const out: Record<string, number> = {};
    for (const r of rows) {
      const t = r.type || 'like';
      out[t] = r._count.type;
    }
    return out;
  }

  async getCurrentUserReaction(videoId: string, userId: string | null): Promise<string | null> {
    if (!userId) return null;
    const like = await prisma.like.findFirst({
      where: { video_id: videoId, user_id: userId },
      select: { type: true },
    });
    return like?.type ?? null;
  }

  async addComment(videoId: string, userId: string, content: string, parentId?: string | null, audioUrl?: string | null) {
    const text = (content ?? '').trim();
    const audio = (audioUrl ?? '').trim();
    if (!text && !audio) {
      const error: any = new Error('Contenu texte ou commentaire vocal requis');
      error.statusCode = 400;
      throw error;
    }
    const contentForDb = text || '🎤 Commentaire vocal';

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { creator_id: true, comments_disabled: true, comment_visibility: true, description: true },
    });
    if (!video) {
      const error: any = new Error('Vidéo non trouvée');
      error.statusCode = 404;
      throw error;
    }
    if (video.comments_disabled) {
      const error: any = new Error('Les commentaires sont désactivés sur cette vidéo');
      error.statusCode = 403;
      throw error;
    }
    const visibility = (video.comment_visibility as string) || 'everyone';
    if (visibility === 'followers') {
      const isFollower = await prisma.follow.findFirst({
        where: { follower_id: userId, following_id: video.creator_id },
      });
      if (!isFollower) {
        const err: any = new Error('Seuls les abonnés du créateur peuvent commenter');
        err.statusCode = 403;
        throw err;
      }
    } else if (visibility === 'mentioned_only') {
      const desc = (video.description || '') + ' ';
      const mentionMatches = [...desc.matchAll(/@([a-zA-Z0-9_.]+)/g)];
      const usernames = [...new Set(mentionMatches.map((m) => m[1].toLowerCase()))];
      const allowed = usernames.length
        ? await prisma.user.findMany({ where: { username: { in: usernames } }, select: { id: true } })
        : [];
      const allowedIds = new Set(allowed.map((u) => u.id));
      if (!allowedIds.has(userId)) {
        const err: any = new Error('Seules les personnes mentionnées dans la description peuvent commenter');
        err.statusCode = 403;
        throw err;
      }
    }
    if (await containsBannedWord(contentForDb)) {
      const error: any = new Error('Votre commentaire contient un mot non autorisé');
      error.statusCode = 400;
      throw error;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        full_name: true,
        profile_image: true,
      },
    });

    if (!user) {
      const error: any = new Error('Utilisateur non trouvé');
      error.statusCode = 404;
      throw error;
    }

    // Extraire les mentions @username et résoudre en user ids
    const mentionUsernames = [...(contentForDb.match(/@([a-zA-Z0-9_.]+)/g) || [])].map((m) => m.slice(1).toLowerCase());
    const uniqueUsernames = [...new Set(mentionUsernames)];
    const mentionedUsers = uniqueUsernames.length
      ? await prisma.user.findMany({
          where: { username: { in: uniqueUsernames } },
          select: { id: true },
        })
      : [];
    const mentionIds = mentionedUsers.map((u) => u.id);

    const comment = await prisma.comment.create({
      data: {
        video_id: videoId,
        user_id: userId,
        content: contentForDb,
        audio_url: audio || null,
        parent_id: parentId || null,
        user_name: user.full_name || user.username,
        user_avatar: user.profile_image,
        mention_ids: mentionIds,
      },
    });

    await prisma.video.update({
      where: { id: videoId },
      data: {
        comments_count: {
          increment: 1,
        },
      },
    });

    // Notifications : notifier le créateur de la vidéo (sauf si c'est lui qui commente)
    const creatorId = video.creator_id;
    const authorName = user.full_name || user.username || 'Quelqu\'un';
    if (creatorId && creatorId !== userId) {
      await notificationService.create(creatorId, {
        type: 'comment',
        title: 'Nouveau commentaire',
        message: audio ? `${authorName} a laissé un commentaire vocal sur votre vidéo` : `${authorName} a commenté votre vidéo`,
        reference_id: videoId,
        reference_type: 'video',
        data: {
          videoId,
          from_user_id: userId,
          from_user_name: authorName,
        },
      });
    }

    // Si c'est une réponse : notifier l'auteur du commentaire parent (sauf si c'est lui ou le créateur)
    if (parentId && creatorId !== undefined) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { user_id: true },
      });
      const parentAuthorId = parent?.user_id;
      if (parentAuthorId && parentAuthorId !== userId && parentAuthorId !== creatorId) {
        await notificationService.create(parentAuthorId, {
          type: 'comment',
          title: 'Réponse à votre commentaire',
          message: `${authorName} a répondu à votre commentaire`,
          reference_id: videoId,
          reference_type: 'video',
          data: {
            videoId,
            from_user_id: userId,
            from_user_name: authorName,
          },
        });
      }
    }

    // Notifications dédiées « X vous a mentionné » (commentaire texte ou vocal avec @ résolus en base)
    const mentionMsg = audio
      ? `${authorName} vous a mentionné dans un commentaire vocal`
      : `${authorName} vous a mentionné dans un commentaire`;
    const uniqueMentionIds = [...new Set(mentionIds)];
    for (const mentionedId of uniqueMentionIds) {
      if (!mentionedId || mentionedId === userId) continue;
      // Le créateur de la vidéo reçoit déjà « Nouveau commentaire » si ce n’est pas lui qui écrit
      if (mentionedId === creatorId && creatorId !== userId) continue;
      await notificationService
        .create(mentionedId, {
          type: 'mention',
          title: 'Mention',
          message: mentionMsg,
          reference_type: 'video',
          reference_id: videoId,
          data: {
            videoId,
            commentId: comment.id,
            from_user_id: userId,
            from_user_name: authorName,
          },
        })
        .catch(() => {});
    }

    return comment;
  }

  async updateComment(commentId: string, userId: string, data: { content?: string; is_pinned?: boolean }) {
    // Prisma: use either select OR include at top level, not both
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        video: { select: { creator_id: true } },
      },
    });
    if (!comment) {
      const error: any = new Error('Commentaire non trouvé');
      error.statusCode = 404;
      throw error;
    }
    const isCreator = comment.video?.creator_id === userId;
    if (data.is_pinned !== undefined) {
      if (!isCreator) {
        const error: any = new Error('Seul le créateur de la vidéo peut épingler un commentaire');
        error.statusCode = 403;
        throw error;
      }
      if (data.is_pinned) {
        await prisma.comment.updateMany({
          where: { video_id: comment.video_id },
          data: { is_pinned: false },
        });
      }
      return prisma.comment.update({
        where: { id: commentId },
        data: { is_pinned: data.is_pinned },
        include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } },
      });
    }
    if (comment.user_id !== userId) {
      const error: any = new Error('Vous ne pouvez modifier que vos propres commentaires');
      error.statusCode = 403;
      throw error;
    }
    if (data.content === undefined || data.content.trim().length === 0) {
      return prisma.comment.findUnique({ where: { id: commentId } });
    }
    return prisma.comment.update({
      where: { id: commentId },
      data: { content: data.content.trim() },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, user_id: true, video_id: true, parent_id: true },
    });
    if (!comment) {
      const error: any = new Error('Commentaire non trouvé');
      error.statusCode = 404;
      throw error;
    }
    if (comment.user_id !== userId) {
      const error: any = new Error('Vous ne pouvez supprimer que vos propres commentaires');
      error.statusCode = 403;
      throw error;
    }
    await prisma.comment.delete({ where: { id: commentId } });
    await prisma.video.update({
      where: { id: comment.video_id },
      data: { comments_count: { decrement: 1 } },
    });
    return { success: true };
  }

  async incrementShare(videoId: string) {
    await prisma.video.update({
      where: { id: videoId },
      data: {
        shares: {
          increment: 1,
        },
      },
    });

    return { success: true };
  }

  async getComments(videoId: string, options: { page: number; limit: number }, viewerUserId?: string | null) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const commentInclude = {
      user: {
        select: {
          id: true,
          username: true,
          full_name: true,
          profile_image: true,
        },
      },
      replies: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              full_name: true,
              profile_image: true,
            },
          },
          _count: { select: { reactions: true } },
        },
        orderBy: {
          created_at: 'asc' as const,
        },
      },
      _count: { select: { reactions: true } },
    };

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { creator_id: true, comment_subscribers_first: true },
    });
    if (!video) {
      const err: any = new Error('Vidéo non trouvée');
      err.statusCode = 404;
      throw err;
    }

    const useSubscriberSort =
      Boolean(video.comment_subscribers_first) &&
      !!viewerUserId &&
      viewerUserId !== video.creator_id;

    let orderedIds: string[] = [];
    let total: number;

    if (useSubscriberSort) {
      const rows = await prisma.$queryRaw<{ id: string }[]>(
        Prisma.sql`
          SELECT c.id FROM "Comment" c
          LEFT JOIN "Follow" f ON f."follower_id" = c."user_id" AND f."following_id" = ${video.creator_id}
          WHERE c."video_id" = ${videoId} AND c."parent_id" IS NULL
          ORDER BY c."is_pinned" DESC, CASE WHEN f."follower_id" IS NOT NULL THEN 0 ELSE 1 END ASC, c."created_at" DESC
          OFFSET ${skip} LIMIT ${limit}
        `
      );
      orderedIds = rows.map((r) => r.id);
      const countRow = await prisma.$queryRaw<{ c: bigint }[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS c FROM "Comment" c WHERE c."video_id" = ${videoId} AND c."parent_id" IS NULL`
      );
      total = Number(countRow[0]?.c ?? 0);
    } else {
      const [pageRows, count] = await Promise.all([
        prisma.comment.findMany({
          where: { video_id: videoId, parent_id: null },
          orderBy: [{ is_pinned: 'desc' }, { created_at: 'desc' }],
          skip,
          take: limit,
          select: { id: true },
        }),
        prisma.comment.count({ where: { video_id: videoId, parent_id: null } }),
      ]);
      orderedIds = pageRows.map((c) => c.id);
      total = count;
    }

    const comments = orderedIds.length
      ? await prisma.comment.findMany({
          where: { id: { in: orderedIds } },
          include: commentInclude,
        })
      : [];

    const byId = new Map(comments.map((c) => [c.id, c]));
    const ordered = orderedIds.map((id) => byId.get(id)).filter(Boolean) as typeof comments;

    const collectCommentIds = (list: typeof ordered): string[] => {
      const out: string[] = [];
      for (const c of list) {
        out.push(c.id);
        for (const r of c.replies || []) {
          out.push(r.id);
        }
      }
      return out;
    };
    const allCommentIds = [...new Set(collectCommentIds(ordered))];

    const countsByComment = new Map<string, Record<string, number>>();
    const myByComment = new Map<string, string | null>();

    if (allCommentIds.length > 0) {
      const [groupRows, myRows] = await Promise.all([
        prisma.commentReaction.groupBy({
          by: ['comment_id', 'type'],
          where: { comment_id: { in: allCommentIds } },
          _count: { _all: true },
        }),
        viewerUserId
          ? prisma.commentReaction.findMany({
              where: { comment_id: { in: allCommentIds }, user_id: viewerUserId },
              select: { comment_id: true, type: true },
            })
          : Promise.resolve([] as { comment_id: string; type: string }[]),
      ]);

      for (const row of groupRows) {
        const cid = row.comment_id;
        const t = (row.type || 'like') as string;
        const n = row._count._all;
        let cur = countsByComment.get(cid);
        if (!cur) {
          cur = {};
          countsByComment.set(cid, cur);
        }
        cur[t] = n;
      }
      for (const r of myRows) {
        myByComment.set(r.comment_id, r.type || 'like');
      }
    }

    const enrichComment = (c: (typeof comments)[number]): (typeof comments)[number] & {
      reaction_counts: Record<string, number>;
      my_reaction: string | null;
    } => ({
      ...c,
      reaction_counts: countsByComment.get(c.id) ?? {},
      my_reaction: myByComment.get(c.id) ?? null,
      replies: (c.replies || []).map((r) =>
        enrichComment(r as unknown as (typeof comments)[number])
      ),
    });

    return {
      comments: ordered.map(enrichComment),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Suggestions « similaires » (heuristique : même type média + catégorie / hashtags / musique / créateur).
   * Pas d’analyse d’image — base pour une future recherche visuelle.
   */
  async listSimilar(sourceId: string, userId: string | undefined, rawLimit?: number) {
    const limit = Math.min(40, Math.max(4, Number(rawLimit) || 20));
    const source = await prisma.video.findUnique({
      where: { id: sourceId },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        music_title: true,
        media_type: true,
        creator_id: true,
        hashtags: true,
        visibility: true,
      },
    });
    if (!source) {
      const error: any = new Error('Vidéo non trouvée');
      error.statusCode = 404;
      throw error;
    }
    if (source.visibility !== 'public' && source.creator_id !== userId) {
      const error: any = new Error('Contenu non disponible');
      error.statusCode = 403;
      throw error;
    }

    const mediaType = String(source.media_type || 'video').toLowerCase();
    const isPhoto = mediaType === 'photo';

    // --- 1) Hashtags de la source ----------------------------------------
    let tagNames: string[] = [];
    const rawTags = source.hashtags as unknown;
    if (Array.isArray(rawTags)) {
      tagNames = rawTags
        .map((t) => String(t).replace(/^#/, '').trim().toLowerCase())
        .filter(Boolean);
    }
    if (tagNames.length === 0) {
      const tagRows = await prisma.videoHashtag.findMany({
        where: { video_id: sourceId },
        select: { tag_name: true },
      });
      tagNames = tagRows.map((r) => r.tag_name.toLowerCase());
    }

    // --- 2) Extraction de mots-clés (titre + description + hashtags) -----
    /**
     * Similarité type TikTok « contenu » : extraire les mots-clés discriminants
     * (nom du sujet, ex. "naruto", "coran", "stem") pour retrouver tout contenu
     * qui en parle, peu importe les tags formels.
     */
    const keywords = extractContentKeywords({
      title: source.title,
      description: source.description,
      hashtags: tagNames,
      category: source.category,
    });

    const musicTitle = (source.music_title || '').trim();

    // --- 3) Conditions OR pour la recherche SQL --------------------------
    const or: Prisma.VideoWhereInput[] = [];
    for (const kw of keywords.slice(0, 12)) {
      or.push({ title: { contains: kw, mode: 'insensitive' } });
      or.push({ description: { contains: kw, mode: 'insensitive' } });
      or.push({
        video_hashtags: { some: { tag_name: { contains: kw, mode: 'insensitive' } } },
      });
    }
    for (const tag of tagNames.slice(0, 8)) {
      or.push({
        video_hashtags: { some: { tag_name: { equals: tag, mode: 'insensitive' } } },
      });
    }
    if (source.category) {
      or.push({ category: source.category });
    }
    if (musicTitle) {
      or.push({ music_title: { equals: musicTitle, mode: 'insensitive' } });
    }

    /** `NOT photo` excluait les lignes `media_type: null` (SQL trois valeurs) — on traite null comme vidéo. */
    const typeWhere: Prisma.VideoWhereInput = isPhoto
      ? { media_type: 'photo' }
      : { OR: [{ media_type: 'video' }, { media_type: null }] };

    /** Si aucun critère sémantique : même créateur, sinon filtre large (vues) pour ne pas renvoyer une liste vide. */
    if (or.length === 0) {
      if (source.creator_id) {
        or.push({ creator_id: source.creator_id });
      } else {
        /** Toujours vrai : évite une liste vide quand il n’y a ni tags ni catégorie exploitable. */
        or.push({ created_at: { lte: new Date() } });
      }
    }

    const similarInclude = {
      creator: {
        select: { id: true, username: true, full_name: true, profile_image: true },
      },
      video_hashtags: { select: { tag_name: true } },
      _count: { select: { video_likes: true, video_comments: true } },
    } as const;

    const baseWhere: Prisma.VideoWhereInput = {
      id: { not: sourceId },
      visibility: 'public',
      video_url: { not: { contains: 'example.com' } },
      AND: [typeWhere, { OR: or }],
    };

    const rawRows = await prisma.video.findMany({
      where: baseWhere,
      include: similarInclude,
      orderBy: [{ views: 'desc' }, { created_at: 'desc' }],
      take: Math.max(limit * 4, 40),
    });

    /**
     * Score pondéré type TF-IDF simple :
     *   Titre       → +4 par mot-clé trouvé
     *   Description → +1 par mot-clé trouvé
     *   Hashtag     → +3 par tag exact partagé, +2 par mot-clé contenu dans un tag
     *   Catégorie   → +2
     *   Musique     → +2
     *   Créateur    → +1 (bonus faible)
     */
    const sourceTagSet = new Set(
      tagNames.map((t) => normalizeSimilarText(t)).filter(Boolean),
    );
    const musicNorm = musicTitle ? normalizeSimilarText(musicTitle) : '';

    const scoreRow = (row: any): { row: any; score: number } => {
      let score = 0;
      const rowTitle = normalizeSimilarText(String(row.title || ''));
      const rowDesc = normalizeSimilarText(String(row.description || ''));
      const rowTags: string[] = (row.video_hashtags || [])
        .map((h: any) => normalizeSimilarText(String(h.tag_name || '')))
        .filter(Boolean);

      for (const kw of keywords) {
        if (!kw) continue;
        if (rowTitle.includes(kw)) score += 4;
        if (rowDesc.includes(kw)) score += 1;
        if (rowTags.some((t) => t.includes(kw))) score += 2;
      }
      for (const t of rowTags) {
        if (sourceTagSet.has(t)) score += 3;
      }
      if (source.category && row.category === source.category) score += 2;
      if (musicNorm) {
        const rowMusic = normalizeSimilarText(String(row.music_title || '').trim());
        if (rowMusic && rowMusic === musicNorm) score += 2;
      }
      if (source.creator_id && row.creator_id === source.creator_id) score += 1;
      return { row, score };
    };

    const scored = rawRows.map((row: any) => scoreRow(row));
    const positive = scored
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || (b.row.views || 0) - (a.row.views || 0))
      .slice(0, limit)
      .map((x) => x.row);

    let rows = positive;
    if (rows.length === 0 && rawRows.length > 0) {
      /** Candidats SQL OK mais score 0 (ex. accentuation) — on garde le top par vues. */
      rows = [...rawRows]
        .sort((a: any, b: any) => (b.views ?? 0) - (a.views ?? 0))
        .slice(0, limit);
    }

    if (rows.length === 0) {
      /** Dernier recours : contenus publics populaires du même type (évite « aucun résultat »). */
      const trending = await prisma.video.findMany({
        where: {
          id: { not: sourceId },
          visibility: 'public',
          video_url: { not: { contains: 'example.com' } },
          AND: [typeWhere],
        },
        include: similarInclude,
        orderBy: [{ views: 'desc' }, { created_at: 'desc' }],
        take: limit,
      });
      rows = trending;
    }

    const videos = rows.map((video: any) => {
      const { creator, _count, video_hashtags, ...videoData } = video;
      let hashtags = video.hashtags;
      if (typeof hashtags === 'string') {
        try {
          hashtags = JSON.parse(hashtags);
        } catch {
          hashtags = [];
        }
      }
      if (!Array.isArray(hashtags) || hashtags.length === 0) {
        hashtags = (video_hashtags || []).map((h: any) => h.tag_name);
      }
      const rawThumb = String(video.thumbnail_url || '').trim();
      const vu = String(video.video_url || '').trim();
      const looksImage =
        /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(vu) || /^data:image\//i.test(vu);
      const thumbnail_url = rawThumb || (looksImage ? vu : '');
      return {
        ...videoData,
        thumbnail_url,
        low_quality_playback_url: videoData.low_quality_url ?? null,
        creator_id: creator?.id || video.creator_id,
        creator_name: creator?.full_name || creator?.username || '',
        creator_avatar: creator?.profile_image || '',
        views: video.views ?? 0,
        likes: _count?.video_likes || video.likes || 0,
        comments_count: _count?.video_comments || video.comments_count || 0,
        hashtags: Array.isArray(hashtags) ? hashtags : [],
        music_title: video.music_title || null,
        media_type: video.media_type || 'video',
      };
    });

    return {
      source_media_type: isPhoto ? 'photo' : 'video',
      videos,
    };
  }
}

export const videoService = new VideoService();
export default videoService;

