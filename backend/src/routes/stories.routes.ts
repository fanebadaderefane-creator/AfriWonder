import { Router } from 'express';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import storyService from '../services/story.service.js';
import prisma from '../config/database.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

/**
 * GET /api/stories/feed-bar — Barre de stories style TikTok Following.
 *
 * Renvoie la liste des créateurs suivis par l'utilisateur (+ lui-même),
 * avec pour chacun :
 *  - son profil (id, username, nom, avatar),
 *  - `has_unseen_story` : bool indiquant qu'une story active n'a pas encore été vue,
 *  - `has_story` : bool indiquant une story active (vue ou non),
 *  - `is_live` : bool indiquant que le créateur diffuse un live public en ce moment,
 *  - `live_id` : id du flux live si `is_live` (pour ouvrir directement le player),
 *  - `sort_rank` : priorité de tri (live > non vu > vu > rien).
 */
router.get('/feed-bar', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({ success: true, data: { items: [] } });
    }

    const follows = await prisma.follow.findMany({
      where: { follower_id: userId },
      select: { following_id: true },
    });
    const followedIds = follows.map((f) => f.following_id);
    const participantIds = Array.from(new Set([userId, ...followedIds]));
    if (participantIds.length === 0) {
      return res.json({ success: true, data: { items: [] } });
    }

    const now = new Date();
    const [users, activeStories, liveStreams] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: participantIds } },
        select: { id: true, username: true, full_name: true, profile_image: true },
      }),
      prisma.story.findMany({
        where: { user_id: { in: participantIds }, expires_at: { gt: now } },
        select: { id: true, user_id: true, created_at: true },
        orderBy: { created_at: 'desc' },
      }),
      prisma.liveStream
        .findMany({
          where: { creator_id: { in: participantIds }, status: 'live' },
          select: { id: true, creator_id: true },
        })
        .catch(() => [] as { id: string; creator_id: string }[]),
    ]);

    /** Pas de table `StoryView` côté Prisma : l'état « vu » est géré côté client (cache 24h). */
    const storiesByUser = new Map<string, { id: string; seen: boolean }[]>();
    for (const s of activeStories) {
      const arr = storiesByUser.get(s.user_id) || [];
      arr.push({ id: s.id, seen: false });
      storiesByUser.set(s.user_id, arr);
    }

    const liveByUser = new Map<string, string>();
    for (const l of liveStreams) {
      if (!liveByUser.has(l.creator_id)) liveByUser.set(l.creator_id, l.id);
    }

    const items = users.map((u) => {
      const stories = storiesByUser.get(u.id) || [];
      const hasStory = stories.length > 0;
      // Côté serveur on ne sait pas ce qui a été vu ; le client croise avec son cache local (24h).
      const hasUnseen = hasStory;
      const isLive = liveByUser.has(u.id);
      const liveId = liveByUser.get(u.id) || null;
      const sortRank = isLive ? 0 : hasUnseen ? 1 : hasStory ? 2 : 3;
      return {
        id: u.id,
        username: u.username,
        full_name: u.full_name || null,
        profile_image: u.profile_image || null,
        is_self: u.id === userId,
        has_story: hasStory,
        has_unseen_story: hasUnseen,
        is_live: isLive,
        live_id: liveId,
        story_ids: stories.map((s) => s.id),
        sort_rank: sortRank,
      };
    });

    /** Toujours remonter l'utilisateur (bouton Create) en premier ; suivis triés par rank. */
    items.sort((a, b) => {
      if (a.is_self && !b.is_self) return -1;
      if (!a.is_self && b.is_self) return 1;
      return a.sort_rank - b.sort_rank;
    });

    return res.json({ success: true, data: { items } });
  } catch (error) {
    return next(error);
  }
});

// GET /api/stories
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { userIds } = req.query;
    const ids = userIds ? (userIds as string).split(',') : [req.user!.id];
    const stories = await storyService.getStories(ids);
    res.json({ success: true, data: stories });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/stories/user/:userId
router.get('/user/:userId', async (req, res, next) => {
  try {
    const stories = await storyService.getUserStories(param(req, 'userId'));
    res.json({ success: true, data: stories });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/stories
router.post('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { mediaUrl, mediaType, expiresInHours } = req.body;
    const story = await storyService.create(req.user!.id, {
      mediaUrl,
      mediaType,
      expiresInHours,
    });
    res.json({ success: true, data: story });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/stories/:id/view
router.post('/:id/view', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const story = await storyService.viewStory(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: story });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/stories/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await storyService.delete(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// CPO 2.19 — Réactions
router.post('/:id/reactions', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { emoji } = req.body;
    const reaction = await storyService.addReaction(param(req, 'id'), req.user!.id, emoji ?? '❤️');
    res.json({ success: true, data: reaction });
  } catch (error: any) {
    next(error);
  }
});

router.delete('/:id/reactions', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await storyService.removeReaction(param(req, 'id'), req.user!.id);
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

router.get('/:id/reactions', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const reactions = await storyService.getReactions(param(req, 'id'));
    res.json({ success: true, data: reactions });
  } catch (error: any) {
    next(error);
  }
});

// CPO 2.21 — Sondages
router.post('/polls/:pollId/vote', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { optionIndex } = req.body;
    const vote = await storyService.votePoll(param(req, 'pollId'), req.user!.id, Number(optionIndex));
    res.json({ success: true, data: vote });
  } catch (error: any) {
    next(error);
  }
});

router.get('/polls/:pollId/results', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const results = await storyService.getPollResults(param(req, 'pollId'));
    res.json({ success: true, data: results });
  } catch (error: any) {
    next(error);
  }
});

export default router;

