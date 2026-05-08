// AfriWonder full review PR - CodeRabbit
import { Router } from 'express';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import { videoService } from '../services/video.service.js';
import { createJob } from '../services/transcoding.service.js';
import * as subtitleService from '../services/subtitle.service.js';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { forceWebCompatTranscodePublishedVideo } from '../services/videoCompatTranscode.service.js';
import { invalidateUserFeedCaches } from '../services/feedCache.service.js';
import * as videoPollService from '../services/videoPoll.service.js';
import { generateThumbnailForVideoId } from '../services/videoThumbnail.service.js';
import { optionalIdempotencyMiddleware, saveIdempotencyResponse } from '../middleware/idempotency.js';
import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';
import {
  commentContentPatchSchema,
  videoAddCommentBodySchema,
  videoChapterBodySchema,
  videoCreateBodySchema,
  videoPollCreateBodySchema,
  videoPollVoteBodySchema,
  videoReactionTypeBodySchema,
  videoRecordViewSchema,
  videoSubtitlesGenerateBodySchema,
  videoSubtitlesPatchBodySchema,
  videoTipBodySchema,
  videoTipWalletBodySchema,
  videoTrimBodySchema,
  videoUpdateBodySchema,
} from '../schemas/videosCommentsAdmin.schemas.js';

const router = Router();

/** Réparation lecture web : créateur ou rôles staff (aligné front `videoWebRepairAccess`). */
function canStaffRepairWebPlayback(role: string | undefined): boolean {
  const r = (role || '').toLowerCase();
  return (
    r === 'admin' ||
    r === 'super_admin' ||
    r === 'moderation_admin' ||
    r === 'moderator'
  );
}

const PAGE_MIN = 1;
const LIMIT_MAX = 100;
function parsePageLimit(query: Record<string, unknown>, defaultLimit: number): { page: number; limit: number } {
  const page = Math.max(PAGE_MIN, parseInt(String(query.page || 1), 10) || PAGE_MIN);
  const rawLimit = parseInt(String(query.limit || defaultLimit), 10) || defaultLimit;
  const limit = Math.min(LIMIT_MAX, Math.max(1, rawLimit));
  return { page, limit };
}

// GET /api/videos - Liste des vidéos
router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { category, visibility = 'public', creator_id: creatorId, hashtag, search, music_title: musicTitle, tagged_for: taggedFor } = req.query;
    const userId = req.user?.id;
    const { page, limit: limitValue } = parsePageLimit(req.query as Record<string, unknown>, 20);
    const followingOnlyRaw = (req.query as Record<string, unknown>).following_only ?? (req.query as Record<string, unknown>).followingOnly;
    const followingOnly =
      String(followingOnlyRaw || '').toLowerCase() === '1' || String(followingOnlyRaw || '').toLowerCase() === 'true';
    if (followingOnly && !userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Connexion requise pour le fil des comptes suivis.' },
      });
    }

    const taggedForStr = typeof taggedFor === 'string' ? taggedFor.trim() : '';
    if (taggedForStr) {
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Connexion requise' });
      }
      if (taggedForStr !== userId) {
        return res.status(403).json({ success: false, error: 'Vous ne pouvez consulter que vos propres identifications' });
      }
    }

    const videos = await videoService.list({
      page,
      limit: limitValue,
      category: category as string,
      visibility: visibility as string,
      userId,
      creator_id: creatorId as string,
      hashtag: hashtag as string,
      search: search as string,
      music_title: typeof musicTitle === 'string' ? musicTitle : undefined,
      tagged_for_user_id: taggedForStr || undefined,
      following_only: followingOnly,
    });

    res.json({
      success: true,
      data: videos,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/videos/category/:id - Vidéos par catégorie (avant :id pour éviter conflit)
router.get('/category/:id', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const categoryId = param(req, 'id');
    const userId = req.user?.id;
    const { page, limit } = parsePageLimit(req.query as Record<string, unknown>, 20);

    const videos = await videoService.list({
      page,
      limit,
      category_id: categoryId,
      visibility: 'public',
      userId,
    });

    res.json({
      success: true,
      data: videos,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/videos/topic/:topic - Fil thématique
 * Presets style TikTok / YouTube : on recherche les vidéos dont le titre, la description,
 * les hashtags ou la catégorie contiennent l'un des mots-clés du preset.
 * Exemple : `apprendre` → éducation, science, tech, tuto, cours, dev, code, maths, etc.
 */
const TOPIC_PRESETS: Record<string, { label: string; keywords: string[] }> = {
  apprendre: {
    label: 'Apprendre',
    keywords: [
      'apprendre', 'education', 'éducation', 'learn', 'learning', 'study', 'cours',
      'tuto', 'tutorial', 'tutoriel', 'how to', 'comment', 'explique', 'explain',
      'science', 'sciences', 'physique', 'chimie', 'biologie', 'maths', 'math', 'math\u00e9matiques',
      'tech', 'technologie', 'technology', 'coding', 'programmation', 'code', 'developer',
      'dev', 'informatique', 'ia', 'ai', 'intelligence artificielle',
      'stem', 'ingenieur', 'ingénieur', 'engineering', 'robot', 'robotique',
      'history', 'histoire', 'culture', 'geography', 'géographie',
      'quran', 'coran', 'islam', 'religion',
      'finance', 'économie', 'economy', 'business', 'entrepreneur',
    ],
  },
  divertissement: {
    label: 'Divertissement',
    keywords: ['humour', 'comedy', 'drole', 'drôle', 'funny', 'prank', 'meme', 'sketch', 'gag'],
  },
  sport: {
    label: 'Sport',
    keywords: ['sport', 'football', 'foot', 'basket', 'tennis', 'running', 'fitness', 'gym'],
  },
};

router.get('/topic/:topic', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const topic = param(req, 'topic').toLowerCase();
    const preset = TOPIC_PRESETS[topic];
    if (!preset) {
      return res.status(404).json({
        success: false,
        error: { message: `Sujet inconnu : ${topic}` },
      });
    }
    const { page, limit } = parsePageLimit(req.query as Record<string, unknown>, 20);
    const skip = (page - 1) * limit;

    const kwOr = preset.keywords.flatMap((kw) => [
      { title: { contains: kw, mode: 'insensitive' as const } },
      { description: { contains: kw, mode: 'insensitive' as const } },
      { category: { contains: kw, mode: 'insensitive' as const } },
      { video_hashtags: { some: { tag_name: { contains: kw, mode: 'insensitive' as const } } } },
    ]);

    const where: any = {
      visibility: 'public',
      video_url: { not: { contains: 'example.com' } },
      OR: kwOr,
    };

    const [rows, total] = await Promise.all([
      prisma.video.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ views: 'desc' }, { created_at: 'desc' }],
        include: {
          creator: { select: { id: true, username: true, full_name: true, profile_image: true } },
          video_hashtags: { select: { tag_name: true } },
          _count: { select: { video_likes: true, video_comments: true } },
        },
      }),
      prisma.video.count({ where }),
    ]);

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
      return {
        ...videoData,
        thumbnail_url: rawThumb || (looksImage ? vu : ''),
        low_quality_playback_url: videoData.low_quality_url ?? null,
        creator_id: creator?.id || video.creator_id,
        creator_name: creator?.full_name || creator?.username || '',
        creator_avatar: creator?.profile_image || '',
        views: Math.max(Number(video.views ?? 0), Number(video.qualified_views_count ?? 0)),
        likes: _count?.video_likes || video.likes || 0,
        comments_count: _count?.video_comments || video.comments_count || 0,
        hashtags: Array.isArray(hashtags) ? hashtags : [],
        media_type: video.media_type || 'video',
      };
    });

    return res.json({
      success: true,
      data: {
        topic,
        label: preset.label,
        videos,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/videos/diversified - Feed « Explorer » style TikTok.
 * Objectif : sortir l'utilisateur de sa bulle habituelle.
 *  - Exclut les vidéos des créateurs déjà suivis.
 *  - Mélange les résultats par fenêtre glissante pour diversifier.
 *  - Priorise les vidéos des créateurs récents / moins vus (découverte).
 */
router.get('/diversified', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    const { page, limit } = parsePageLimit(req.query as Record<string, unknown>, 20);
    const skip = (page - 1) * limit;

    let excludedCreatorIds: string[] = [];
    if (userId) {
      const follows = await prisma.follow.findMany({
        where: { follower_id: userId },
        select: { following_id: true },
      });
      excludedCreatorIds = follows.map((f) => f.following_id);
    }

    const where: any = {
      visibility: 'public',
      video_url: { not: { contains: 'example.com' } },
    };
    if (excludedCreatorIds.length > 0) {
      where.creator_id = { notIn: excludedCreatorIds };
    }
    if (userId) {
      where.creator_id = where.creator_id
        ? { ...where.creator_id, not: userId }
        : { not: userId };
    }

    /**
     * Sur-fetch × 3 pour mélanger ensuite côté serveur (diversité des créateurs).
     * On prend les plus récentes + vues moyennes, pas uniquement les blockbusters,
     * pour favoriser la découverte de nouveaux créateurs.
     */
    const overFetch = limit * 3;
    const rows = await prisma.video.findMany({
      where,
      skip,
      take: overFetch,
      orderBy: [{ created_at: 'desc' }, { views: 'desc' }],
      include: {
        creator: { select: { id: true, username: true, full_name: true, profile_image: true } },
        video_hashtags: { select: { tag_name: true } },
        _count: { select: { video_likes: true, video_comments: true } },
      },
    });

    // Diversité : max 2 vidéos par créateur dans la page.
    const byCreator = new Map<string, number>();
    const diversified: typeof rows = [];
    for (const r of rows) {
      const count = byCreator.get(r.creator_id) || 0;
      if (count >= 2) continue;
      byCreator.set(r.creator_id, count + 1);
      diversified.push(r);
      if (diversified.length >= limit) break;
    }

    /**
     * Fallback anti-feed vide/répétitif : si la fenêtre diversifiée est trop courte,
     * on complète avec les vidéos publiques les plus populaires (toujours max 2/creator).
     */
    if (diversified.length < limit) {
      const seenIds = new Set(diversified.map((v) => v.id));
      const need = limit - diversified.length;
      const fallbackRows = await prisma.video.findMany({
        where: {
          ...where,
          id: { notIn: [...seenIds] },
        },
        take: need * 4,
        orderBy: [{ views: 'desc' }, { created_at: 'desc' }],
        include: {
          creator: { select: { id: true, username: true, full_name: true, profile_image: true } },
          video_hashtags: { select: { tag_name: true } },
          _count: { select: { video_likes: true, video_comments: true } },
        },
      });
      for (const r of fallbackRows) {
        if (diversified.length >= limit) break;
        if (seenIds.has(r.id)) continue;
        const count = byCreator.get(r.creator_id) || 0;
        if (count >= 2) continue;
        byCreator.set(r.creator_id, count + 1);
        diversified.push(r);
        seenIds.add(r.id);
      }
    }

    const videos = diversified.map((video: any) => {
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
      return {
        ...videoData,
        thumbnail_url: rawThumb || (looksImage ? vu : ''),
        low_quality_playback_url: videoData.low_quality_url ?? null,
        creator_id: creator?.id || video.creator_id,
        creator_name: creator?.full_name || creator?.username || '',
        creator_avatar: creator?.profile_image || '',
        views: Math.max(Number(video.views ?? 0), Number(video.qualified_views_count ?? 0)),
        likes: _count?.video_likes || video.likes || 0,
        comments_count: _count?.video_comments || video.comments_count || 0,
        hashtags: Array.isArray(hashtags) ? hashtags : [],
        media_type: video.media_type || 'video',
      };
    });

    return res.json({
      success: true,
      data: {
        videos,
        pagination: {
          page,
          limit,
          total: videos.length,
          totalPages: videos.length >= limit ? page + 1 : page,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

// GET /api/videos/hashtags/trending - Hashtags tendances (agrégation VideoHashtag)
router.get('/hashtags/trending', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const limit = Math.min(Math.max(1, parseInt(String(req.query.limit || '15'), 10)), 50);
    const result = await prisma.videoHashtag.groupBy({
      by: ['tag_name'],
      _count: { tag_name: true },
      orderBy: { _count: { tag_name: 'desc' } },
      take: limit,
    });
    const hashtags = result.map((r) => ({
      tag: r.tag_name,
      count: r._count.tag_name,
      countFormatted: r._count.tag_name >= 1000000 ? `${(r._count.tag_name / 1000000).toFixed(1)}M` : r._count.tag_name >= 1000 ? `${(r._count.tag_name / 1000).toFixed(0)}K` : String(r._count.tag_name),
    }));
    res.json({ success: true, data: hashtags });
  } catch (error) {
    next(error);
  }
});

// GET /api/videos/hashtag/:tag - Vidéos par hashtag (avant :id pour éviter conflit)
router.get('/hashtag/:tag', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const tag = param(req, 'tag');
    const { page = '1', limit = '20' } = req.query;
    const userId = req.user?.id;

    const videos = await videoService.list({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      hashtag: tag,
      visibility: 'public',
      userId,
    });

    res.json({
      success: true,
      data: videos,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/videos/:id/view - Enregistrer une vue (≥3s ou ≥25%, 1/30min/user)
router.post('/:id/view', optionalAuth, validateBody(videoRecordViewSchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user?.id;
    const { watchSeconds, watchPercent, deviceId, scrollSlow, interactionDetected } = req.body || {};
    const deviceIdFromHeader = String(req.headers['x-afw-device-id'] || '').trim();
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || (req.socket as any)?.remoteAddress;

    const result = await videoService.recordView(id, {
      userId,
      deviceId: deviceId || deviceIdFromHeader || undefined,
      watchSeconds,
      watchPercent,
      scrollSlow,
      interactionDetected,
      ip,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// GET /api/videos/:id/poll — Sondage attaché (avant GET /:id)
router.get('/:id/poll', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const data = await videoPollService.getVideoPollPayload(id, req.user?.id ?? null);
    res.json({ success: true, data: data ?? null });
  } catch (error) {
    next(error);
  }
});

// POST /api/videos/:id/poll — Créer un sondage (créateur uniquement)
router.post('/:id/poll', authenticate, validateBody(videoPollCreateBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const result = await videoPollService.createVideoPoll(req.user!.id, id, req.body.options);
    invalidateUserFeedCaches(req.user!.id).catch(() => {});
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/videos/:id/poll/vote — Voter (auth)
router.post('/:id/poll/vote', authenticate, validateBody(videoPollVoteBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const result = await videoPollService.voteVideoPoll(req.user!.id, id, req.body.option_index);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/videos/:id/similar — suggestions (même type média : vidéo ou photo)
router.get('/:id/similar', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const limit = parseInt(String(req.query.limit || '20'), 10) || 20;
    const data = await videoService.listSimilar(id, req.user?.id, limit);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// GET /api/videos/:id - Détails d'une vidéo
router.get('/:id', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user?.id;

    const video = await videoService.getById(id, userId);

    if (!video) {
      return res.status(404).json({
        success: false,
        error: { message: 'Vidéo non trouvée' },
      });
    }

    res.json({
      success: true,
      data: video,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/videos - Créer une vidéo
router.post('/', authenticate, optionalIdempotencyMiddleware, validateBody(videoCreateBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const videoData = {
      ...req.body,
      creator_id: req.user!.id,
    };

    const video = await videoService.create(videoData);

    const { invalidateAllFeedResponseCaches } = await import('../services/feedCache.service.js');
    invalidateAllFeedResponseCaches().catch(() => {});

    const response = {
      success: true,
      data: video,
    };
    const key = String(req.headers['idempotency-key'] || '').trim();
    if (key) await saveIdempotencyResponse(key, 201, response).catch(() => {});
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/videos/:id - Modifier une vidéo
router.put('/:id', authenticate, validateBody(videoUpdateBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;

    const video = await videoService.update(id, req.body, userId);

    res.json({
      success: true,
      data: video,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/videos/:id/trim - Montage léger (trim_start_sec, trim_end_sec)
router.post('/:id/trim', authenticate, validateBody(videoTrimBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const { trim_start_sec, trim_end_sec } = req.body || {};
    const video = await videoService.trim(id, userId, { trim_start_sec, trim_end_sec });
    res.json({ success: true, data: video });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/videos/:id - Supprimer une vidéo
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;

    await videoService.delete(id, userId);

    res.json({
      success: true,
      message: 'Vidéo supprimée',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/videos/:id/reaction — Définir une réaction (body: { type: 'like'|'love'|'fire'|... })
router.post('/:id/reaction', authenticate, validateBody(videoReactionTypeBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const type = req.body?.type ?? 'like';
    const result = await videoService.setReaction(id, userId, type);
    invalidateUserFeedCaches(userId).catch(() => {});
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/videos/:id/reaction — Retirer sa réaction
router.delete('/:id/reaction', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const result = await videoService.setReaction(id, userId, null);
    invalidateUserFeedCaches(userId).catch(() => {});
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/videos/:id/like - Liker / réaction (body: { type?: 'like'|'love'|'fire'|'laugh'|'wow'|'sad'|'angry' })
router.post('/:id/like', authenticate, validateBody(videoReactionTypeBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const type = req.body?.type ?? 'like';

    const result = await videoService.toggleLike(id, userId, type);
    invalidateUserFeedCaches(userId).catch(() => {});

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/videos/:id/comment - Commenter une vidéo
router.post('/:id/comment', authenticate, validateBody(videoAddCommentBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const { content, parent_id, audio_url } = req.body;

    const comment = await videoService.addComment(id, userId, content, parent_id, audio_url ?? null);

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/videos/comments/:commentId - Modifier un commentaire (auteur uniquement)
router.patch('/comments/:commentId', authenticate, validateBody(commentContentPatchSchema), async (req: AuthRequest, res, next) => {
  try {
    const commentId = param(req, 'commentId');
    const userId = req.user!.id;
    const { content, is_pinned } = req.body || {};

    const comment = await videoService.updateComment(commentId, userId, { content, is_pinned });

    res.json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/videos/comments/:commentId - Supprimer un commentaire (auteur uniquement)
router.delete('/comments/:commentId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const commentId = param(req, 'commentId');
    const userId = req.user!.id;

    await videoService.deleteComment(commentId, userId);

    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/videos/:id/comments - Liste des commentaires
router.get('/:id/comments', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const { page = '1', limit = '50' } = req.query;

    const comments = await videoService.getComments(
      id,
      {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      },
      req.user?.id ?? null
    );

    res.json({
      success: true,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/videos/:id/tip - Faire un tip/don pour une vidéo (Orange Money)
router.post('/:id/tip', authenticate, validateBody(videoTipBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const { amount, phone, message } = req.body;

    const videoTipService = (await import('../services/videoTip.service.js')).default;
    const result = await videoTipService.createTip(userId, id, {
      amount,
      phone,
      message,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/videos/:id/tip-wallet - Tip avec le wallet (débit immédiat)
router.post('/:id/tip-wallet', authenticate, validateBody(videoTipWalletBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const { amount, message } = req.body;

    const videoTipService = (await import('../services/videoTip.service.js')).default;
    const result = await videoTipService.createTipWithWallet(userId, id, { amount, message });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/videos/:id/tips - Liste des tips d'une vidéo
router.get('/:id/tips', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const { page = '1', limit = '20' } = req.query;

    const videoTipService = (await import('../services/videoTip.service.js')).default;
    const result = await videoTipService.getVideoTips(id, parseInt(page as string), parseInt(limit as string));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/videos/:id/share - Incrémenter le compteur de partages
router.post('/:id/share', optionalAuth, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');

    await videoService.incrementShare(id);

    res.json({
      success: true,
      message: 'Partage enregistré',
    });
  } catch (error) {
    next(error);
  }
});

// ========== Pipeline HLS (CDC) ==========
// POST /api/videos/:id/transcode - Enqueue transcoding job (créateur uniquement)
router.post('/:id/transcode', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const videoId = param(req, 'id');
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, video_url: true, creator_id: true },
    });
    if (!video) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    }
    if (video.creator_id !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Seul le créateur peut lancer le transcodage' });
    }
    const { job, created } = await createJob({
      video_id: videoId,
      source_url: video.video_url,
    });
    res.status(created ? 201 : 200).json({
      success: true,
      data: job,
      message: created ? 'Job de transcodage créé' : 'Un job est déjà en cours ou en attente',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/videos/:id/thumbnail:generate - Générer une miniature (frame) si absente
router.post('/:id/thumbnail:generate', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const timeSecRaw = (req.body as any)?.time_sec;
    const forceRaw = (req.body as any)?.force;
    const timeSec = typeof timeSecRaw === 'number' ? timeSecRaw : typeof timeSecRaw === 'string' ? Number(timeSecRaw) : undefined;
    const force = forceRaw === true || forceRaw === '1' || forceRaw === 1;

    // Sécurité: uniquement pour la lecture app → pas besoin de générer pour privé d'autrui
    const row = await prisma.video.findUnique({
      where: { id },
      select: { id: true, creator_id: true, visibility: true },
    });
    if (!row) return res.status(404).json({ success: false, error: { message: 'Vidéo introuvable' } });
    if (row.visibility !== 'public' && row.creator_id !== req.user!.id) {
      return res.status(403).json({ success: false, error: { message: 'Accès non autorisé' } });
    }

    const out = await generateThumbnailForVideoId(id, { timeSec, force });
    if (!out.ok) {
      return res.status(422).json({ success: false, error: { message: out.error || 'Génération miniature échouée' }, data: out });
    }

    invalidateUserFeedCaches(row.creator_id).catch(() => {});
    return res.json({ success: true, data: { thumbnail_url: out.thumbnail_url, skipped: out.skipped || null } });
  } catch (error) {
    next(error);
  }
});

// GET /api/videos/:id/transcode/status - Statut du job de transcodage
router.get('/:id/transcode/status', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const videoId = param(req, 'id');
    const job = await prisma.transcodingJob.findFirst({
      where: { video_id: videoId },
      orderBy: { created_at: 'desc' },
    });
    if (!job) {
      return res.json({ success: true, data: { job: null, hasHls: false } });
    }
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { hls_url: true },
    });
    res.json({
      success: true,
      data: {
        job: {
          id: job.id,
          status: job.status,
          hls_manifest_url: job.hls_manifest_url,
          error_message: job.error_message,
          created_at: job.created_at,
          completed_at: job.completed_at,
        },
        hasHls: !!video?.hls_url,
        hls_url: video?.hls_url ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/videos/:id/repair-web-playback — ré-encode forcé MP4 web (Firefox / WebView) pour 1 vidéo défaillante
router.post('/:id/repair-web-playback', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const startedAt = Date.now();
    const videoId = param(req, 'id');
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, creator_id: true },
    });
    if (!video) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    }
    const isCreator = video.creator_id === req.user!.id;
    const isStaff = canStaffRepairWebPlayback(req.user!.role);
    if (!isCreator && !isStaff) {
      return res.status(403).json({
        success: false,
        error: 'Seul le créateur ou un administrateur / modération peut lancer la réparation',
      });
    }

    logger.info('repair-web-playback request started', {
      videoId,
      userId: req.user!.id,
      requestId: (req as any).requestId,
      isCreator,
      isStaff,
    });

    const result = await forceWebCompatTranscodePublishedVideo(videoId);
    if (result.skipped) {
      logger.warn('repair-web-playback request skipped', {
        videoId,
        userId: req.user!.id,
        requestId: (req as any).requestId,
        duration_ms: Date.now() - startedAt,
        reason: result.skipped,
      });
      return res.status(400).json({
        success: false,
        error: { message: result.skipped },
      });
    }
    if (!result.ok) {
      const msg = result.error || 'Transcodage échoué';
      logger.warn('repair-web-playback request failed', {
        videoId,
        userId: req.user!.id,
        requestId: (req as any).requestId,
        duration_ms: Date.now() - startedAt,
        error: msg,
      });
      return res.status(422).json({
        success: false,
        error: { message: msg, code: 'WEB_COMPAT_TRANSCODE_FAILED' },
      });
    }

    invalidateUserFeedCaches(video.creator_id).catch(() => {});
    logger.info('repair-web-playback request succeeded', {
      videoId,
      userId: req.user!.id,
      requestId: (req as any).requestId,
      duration_ms: Date.now() - startedAt,
      hasNewUrl: !!result.newUrl,
    });
    res.json({
      success: true,
      message: 'Vidéo ré-encodée pour la lecture navigateur (H.264 + yuv420p + AAC)',
      data: { video_url: result.newUrl },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/videos/archived - Mes vidéos archivées
router.get('/archived/list', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { page, limit } = parsePageLimit(req.query as Record<string, unknown>, 20);
    const list = await videoService.list({ creator_id: req.user!.id, visibility: 'archived', page, limit });
    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

// PUT /api/videos/:id/archive - Archiver une vidéo (créateur)
router.put('/:id/archive', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const video = await prisma.video.findFirst({
      where: { id: param(req, 'id'), creator_id: req.user!.id },
    });
    if (!video) return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    await prisma.video.update({
      where: { id: video.id },
      data: { visibility: 'archived' },
    });
    res.json({ success: true, message: 'Vidéo archivée' });
  } catch (error) {
    next(error);
  }
});

// GET /api/videos/:id/chapters - Chapitres VOD
router.get('/:id/chapters', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const chapters = await prisma.videoChapter.findMany({
      where: { video_id: param(req, 'id') },
      orderBy: { start_time_sec: 'asc' },
    });
    res.json({ success: true, data: chapters });
  } catch (error) {
    next(error);
  }
});

// POST /api/videos/:id/chapters - Ajouter un chapitre (créateur)
router.post('/:id/chapters', authenticate, validateBody(videoChapterBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const videoId = param(req, 'id');
    const video = await prisma.video.findFirst({ where: { id: videoId, creator_id: req.user!.id } });
    if (!video) return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    const { title, start_time_sec, end_time_sec } = req.body;
    const chapter = await prisma.videoChapter.create({
      data: { video_id: videoId, title, start_time_sec: Number(start_time_sec), end_time_sec: end_time_sec != null ? Number(end_time_sec) : null },
    });
    res.status(201).json({ success: true, data: chapter });
  } catch (error) {
    next(error);
  }
});

// GET /api/videos/:id/download - URL de téléchargement (si autorisé)
router.get('/:id/download', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const video = await prisma.video.findFirst({
      where: { id: param(req, 'id') },
      select: { video_url: true, download_allowed: true, visibility: true, creator_id: true },
    });
    if (!video) return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    if (!video.download_allowed) return res.status(403).json({ success: false, error: 'Téléchargement non autorisé par le créateur' });
    if (video.visibility !== 'public' && video.creator_id !== req.user?.id) return res.status(403).json({ success: false, error: 'Accès non autorisé' });
    res.json({ success: true, data: { download_url: video.video_url } });
  } catch (error) {
    next(error);
  }
});

// CPO 3.9 — Sous-titres automatiques
// GET /api/videos/:id/subtitles - Statut sous-titres + dernière génération
router.get('/:id/subtitles', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const result = await subtitleService.getStatus(id, req.user!.id);
    if (!result) return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});
// POST /api/videos/:id/subtitles/generate - Lancer génération STT
router.post('/:id/subtitles/generate', authenticate, validateBody(videoSubtitlesGenerateBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const source = req.body.source as 'auto' | 'manual';
    const gen = await subtitleService.requestGeneration(id, req.user!.id, source);
    res.status(202).json({ success: true, data: gen, message: 'Génération lancée' });
  } catch (e: any) {
    if (e?.statusCode) return res.status(e.statusCode).json({ success: false, error: { message: e.message } });
    next(e);
  }
});

/** Alias CDC / intégrations : même comportement que `POST .../subtitles/generate`. */
router.post('/:id/generate-captions', authenticate, validateBody(videoSubtitlesGenerateBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const source = req.body.source as 'auto' | 'manual';
    const gen = await subtitleService.requestGeneration(id, req.user!.id, source);
    res.status(202).json({ success: true, data: gen, message: 'Génération lancée' });
  } catch (e: any) {
    if (e?.statusCode) return res.status(e.statusCode).json({ success: false, error: { message: e.message } });
    next(e);
  }
});
// PATCH /api/videos/:id/subtitles - Définir URL sous-titres (manuel)
router.patch('/:id/subtitles', authenticate, validateBody(videoSubtitlesPatchBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const subtitle_url = req.body?.subtitle_url != null ? String(req.body.subtitle_url) : null;
    const video = await subtitleService.setSubtitleUrl(id, req.user!.id, subtitle_url);
    res.json({ success: true, data: video });
  } catch (e: any) {
    if (e?.statusCode) return res.status(e.statusCode).json({ success: false, error: { message: e.message } });
    next(e);
  }
});

export default router;

