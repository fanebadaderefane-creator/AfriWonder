import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import * as qualifiedViewService from './qualifiedView.service.js';
import { validateUrl } from '../utils/urlValidator.js';
import GamificationEngine from './gamification.service.js';
import { emit } from '../events/eventBus.js';
import { containsBannedWord } from './bannedWord.service.js';
import notificationService from './notification.service.js';
import { scheduleCompatTranscodeAfterPublish } from './videoCompatTranscode.service.js';

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
}

class VideoService {
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
      let maxIterations = 5;
      
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
    const { page, limit, category, category_id, visibility = 'public', userId, creator_id: creatorId, hashtag, search } = options;
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

    // Filtre par visibilité
    if (visibility === 'public') {
      where.visibility = 'public';
    } else if (visibility === 'creator' && creatorId && userId && creatorId === userId) {
      // Profil propre : inclure public + privé (brouillons) du créateur — vidéos privées = brouillons
      where.creator_id = creatorId;
      where.OR = [
        { visibility: 'public' },
        { visibility: 'prive' },
      ];
    } else if (userId) {
      // Si utilisateur connecté, voir aussi ses vidéos privées et celles des abonnements
      where.OR = [
        { visibility: 'public' },
        { visibility: 'prive', creator_id: userId },
        {
          visibility: 'abonnes',
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
    // Filtre par créateur
    if (creatorId && visibility !== 'creator') {
      where.creator_id = creatorId;
    }

    // Filtre par hashtag
    if (hashtag && hashtag.trim()) {
      const tag = String(hashtag).replace(/^#/, '').toLowerCase();
      where.video_hashtags = { some: { tag_name: tag } };
    }

    // Recherche texte (titre, description, hashtags, music_title)
    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { music_title: { contains: search.trim(), mode: 'insensitive' } },
        { video_hashtags: { some: { tag_name: { contains: search.trim().replace(/^#/, ''), mode: 'insensitive' } } } },
      ];
    }

    let videos: any[];
    let total: number;

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
          orderBy: { created_at: 'desc' },
          ...(skip !== undefined && { skip }),
          ...(!shouldGetAll && limit && { take: limit }),
        }),
        prisma.video.count({ where }),
      ]);
    } catch (err) {
      logger.warn('video.list Prisma failed, using raw SQL fallback', { err: (err as Error)?.message });
      const takeVal = shouldGetAll ? 9999 : (limit || 20);
      const skipVal = shouldGetAll ? 0 : (skip ?? 0);
      // Colonnes explicites (+ reste du modèle) : en secours Prisma, le client doit recevoir hls_url & media_type pour le fallback HLS (Firefox / WebView).
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT v.id, v.title, v.description, v.video_url, v.hls_url, v.thumbnail_url, v.creator_id, v.visibility, v.category, v.views, v.likes, v.comments_count, v.shares, v.saves, v.duration, v.created_at, v.updated_at, v.hashtags, v.music_title, v.is_featured, v.algo_tier, v.avg_retention_pct, v.qualified_views_count, v.media_type, v.remix_of_id, v.subtitle_url, v.download_allowed, v.is_premium, v.trim_start_sec, v.trim_end_sec, v.filter_id, v.comments_disabled, v.comment_visibility, v.hide_likes, v.scheduled_at,
                u.username, u.full_name as "creator_name", u.profile_image as "creator_avatar"
         FROM "Video" v
         JOIN "User" u ON u.id = v.creator_id
         WHERE v.visibility = 'public' AND (v.video_url IS NULL OR v.video_url NOT LIKE '%example.com%')
         ORDER BY v.created_at DESC
         LIMIT $1 OFFSET $2`,
        takeVal,
        skipVal
      );
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
        // URLs lues directement depuis la base - aucune transformation
        creator_id: creator?.id || video.creator_id,
        creator_name: creator?.full_name || creator?.username || '',
        creator_avatar: creator?.profile_image || '',
        views: video.views ?? 0, // S'assurer que views est toujours défini
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
      hide_likes: video.hide_likes ?? false,
    };

    // Supprimer les champs internes
    delete formattedVideo.creator;
    delete formattedVideo.video_hashtags;
    if (formattedVideo.video_likes !== undefined) {
      delete formattedVideo.video_likes;
    }
    delete formattedVideo._count;

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
    const viewerKey = userId ? `u:${userId}` : (deviceId ? `d:${deviceId}` : ip ? `i:${ip}` : null);

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
    if (!minWatch) return { recorded: false, views: video.views };

    const timeBucket = Math.floor(Date.now() / 1000 / 1800);

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
    media_type?: 'video' | 'image';
    remix_of_id?: string;
    subtitle_url?: string;
    download_allowed?: boolean;
    is_premium?: boolean;
    comments_disabled?: boolean;
    comment_visibility?: string;
    hide_likes?: boolean;
    scheduled_at?: string | Date | null;
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
        ...(data.remix_of_id && { remix_of_id: data.remix_of_id }),
        ...(data.subtitle_url && { subtitle_url: data.subtitle_url }),
        ...(data.download_allowed != null && { download_allowed: Boolean(data.download_allowed) }),
        ...(data.is_premium != null && { is_premium: Boolean(data.is_premium) }),
        ...(data.comments_disabled != null && { comments_disabled: Boolean(data.comments_disabled) }),
        ...(data.comment_visibility != null && { comment_visibility: ['everyone', 'followers', 'mentioned_only'].includes(data.comment_visibility) ? data.comment_visibility : 'everyone' }),
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
    }

    GamificationEngine.onVideoUpload(data.creator_id).catch((e) =>
      logger.warn('Gamification onVideoUpload', { creatorId: data.creator_id, err: e })
    );
    (await import('./dailyMissions.service.js')).checkAndAwardPostVideo(data.creator_id).catch(() => {});

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
    hide_likes?: boolean;
    scheduled_at?: string | Date | null;
  }>, userId: string) {
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

    const hashtagsArray = Array.isArray(data.hashtags) ? data.hashtags : undefined;
    const updateData: Record<string, unknown> = { ...data };

    if (hashtagsArray !== undefined) {
      updateData.hashtags = hashtagsArray.length ? JSON.stringify(hashtagsArray) : null;
    }
    if (data.scheduled_at !== undefined) {
      updateData.scheduled_at = data.scheduled_at ? new Date(data.scheduled_at) : null;
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

  private static readonly REACTION_TYPES = new Set(['like', 'love', 'fire', 'laugh', 'wow', 'sad', 'angry']);

  async toggleLike(videoId: string, userId: string, type: string = 'like') {
    const reactionType = VideoService.REACTION_TYPES.has(type) ? type : 'like';
    const result = await this.setReaction(videoId, userId, reactionType);
    return { liked: result.reaction !== null, reaction: result.reaction };
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

    await prisma.$transaction([
      prisma.like.create({
        data: { video_id: videoId, user_id: userId, type: reactionType },
      }),
      prisma.video.update({
        where: { id: videoId },
        data: { likes: { increment: 1 } },
      }),
    ]);
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

  async addComment(videoId: string, userId: string, content: string, parentId?: string) {
    // Valider le contenu
    if (!content || content.trim().length === 0) {
      const error: any = new Error('Le contenu du commentaire ne peut pas être vide');
      error.statusCode = 400;
      throw error;
    }

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
    if (await containsBannedWord(content.trim())) {
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
    const mentionUsernames = [...(content.match(/@([a-zA-Z0-9_.]+)/g) || [])].map((m) => m.slice(1).toLowerCase());
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
        content,
        parent_id: parentId,
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
        message: `${authorName} a commenté votre vidéo`,
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

  async getComments(videoId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: {
          video_id: videoId,
          parent_id: null, // Commentaires principaux seulement
        },
        include: {
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
            },
            orderBy: {
              created_at: 'asc',
            },
          },
        },
        orderBy: [
          { is_pinned: 'desc' },
          { created_at: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.comment.count({
        where: {
          video_id: videoId,
          parent_id: null,
        },
      }),
    ]);

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const videoService = new VideoService();
export default videoService;

