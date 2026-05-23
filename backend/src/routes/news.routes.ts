/**
 * Module News / Média — Routes production ready
 * Vues réelles, likes, commentaires imbriqués, breaking, trending, feed, premium, admin.
 */
import { Router, Request } from 'express';
import { authenticate, AuthRequest, optionalAuth } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import newsService from '../services/news.service.js';
import rateLimit from 'express-rate-limit';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, error: 'Trop de commentaires. Réessayez dans 1 minute.' },
  standardHeaders: true,
});

// ——— Public ———

// GET /api/news — Liste avec filtres, pagination
router.get('/', async (req, res, next) => {
  try {
    const params = {
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(50, parseInt(req.query.limit as string) || 20),
      category: req.query.category as string | undefined,
      country: req.query.country as string | undefined,
      language: req.query.language as string | undefined,
      isPublished: req.query.isPublished === 'true' ? true : req.query.isPublished === 'false' ? false : undefined,
      isBreaking: req.query.isBreaking === 'true' ? true : undefined,
      isFeatured: req.query.isFeatured === 'true' ? true : undefined,
      isSponsored: req.query.isSponsored === 'true' ? true : undefined,
      search: req.query.search as string | undefined,
      orderBy: (req.query.orderBy as 'published_at' | 'created_at' | 'views' | 'likes_count') || undefined,
      orderDir: (req.query.orderDir as 'asc' | 'desc') || 'desc',
    };
    const result = await newsService.list(params);
    res.json({ success: true, data: result });
  } catch (e: any) {
    next(e);
  }
});

// GET /api/news/breaking
router.get('/breaking', async (req, res, next) => {
  try {
    const items = await newsService.getBreaking();
    res.json({ success: true, data: items });
  } catch (e: any) {
    next(e);
  }
});

// GET /api/news/trending
router.get('/trending', async (req, res, next) => {
  try {
    const limit = Math.min(20, parseInt(req.query.limit as string) || 10);
    const items = await newsService.getTrending(limit);
    res.json({ success: true, data: items });
  } catch (e: any) {
    next(e);
  }
});

// GET /api/news/feed — Feed personnalisé (auth requis)
router.get('/feed', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(30, parseInt(req.query.limit as string) || 20);
    const result = await newsService.getFeed(req.user!.id, page, limit);
    res.json({ success: true, data: result });
  } catch (e: any) {
    next(e);
  }
});

// GET /api/news/verified-sources
router.get('/verified-sources', async (req, res, next) => {
  try {
    const list = await newsService.listVerifiedSources();
    res.json({ success: true, data: list });
  } catch (e: any) {
    next(e);
  }
});

// GET /api/news/premium-access — Vérifier si l'utilisateur a l'accès premium
router.get('/premium-access', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const hasAccess = await newsService.hasPremiumAccess(req.user!.id);
    res.json({ success: true, data: { hasAccess } });
  } catch (e: any) {
    next(e);
  }
});

// GET /api/news/admin/articles — Mes articles (auteur) ou tous (admin)
router.get('/admin/articles', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const isAdmin = (req as any).user?.role === 'admin';
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const result = await newsService.listMyArticles(req.user!.id, isAdmin, page, limit);
    res.json({ success: true, data: result });
  } catch (e: any) {
    next(e);
  }
});

// GET /api/news/:id/analytics — Analytics article (auteur ou admin)
router.get('/:id/analytics', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const isAdmin = (req as any).user?.role === 'admin';
    const analytics = await newsService.getArticleAnalytics(param(req, 'id'), req.user!.id, isAdmin);
    res.json({ success: true, data: analytics });
  } catch (e: any) {
    next(e);
  }
});

// GET /api/news/:idOrSlug — Détail par ID ou slug (optionnel: enregistrer vue)
router.get('/:idOrSlug', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const idOrSlug = param(req, 'idOrSlug');
    const userId = req.user?.id ?? undefined;
    const ip = (req as Request).ip || req.socket?.remoteAddress || '';
    const article = await newsService.getByIdOrSlug(idOrSlug, {
      incrementView: true,
      userId: userId || undefined,
      ip,
    });
    if (!article) {
      return res.status(404).json({ success: false, error: 'Article introuvable' });
    }
    let likeStatus = { liked: false };
    if (userId) {
      likeStatus = await newsService.getLikeStatus(article.id, userId);
    }
    res.json({ success: true, data: { article, likeStatus } });
  } catch (e: any) {
    next(e);
  }
});

// GET /api/news/:id/comments
router.get('/:id/comments', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(50, parseInt(req.query.limit as string) || 30);
    const comments = await newsService.listComments(param(req, 'id'), page, limit);
    res.json({ success: true, data: comments });
  } catch (e: any) {
    next(e);
  }
});

// ——— Authentifié ———

// POST /api/news/:id/like — Toggle like
router.post('/:id/like', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await newsService.toggleLike(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (e: any) {
    next(e);
  }
});

// POST /api/news/:id/share — Incrémenter partage
router.post('/:id/share', validateBody(jsonObjectBodySchema), async (req, res, next) => {
  try {
    await newsService.incrementShare(param(req, 'id'));
    res.json({ success: true, data: { ok: true } });
  } catch (e: any) {
    next(e);
  }
});

// GET /api/news/preferences
router.get('/preferences/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const prefs = await newsService.getPreferences(req.user!.id);
    res.json({ success: true, data: prefs });
  } catch (e: any) {
    next(e);
  }
});

// PUT /api/news/preferences
router.put('/preferences', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const prefs = await newsService.savePreferences(req.user!.id, req.body);
    res.json({ success: true, data: prefs });
  } catch (e: any) {
    next(e);
  }
});

// POST /api/news/:id/comments — Ajouter commentaire (rate limit)
router.post('/:id/comments', authenticate, commentLimiter, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { content, parentId } = req.body;
    const comment = await newsService.addComment(param(req, 'id'), req.user!.id, content || '', parentId);
    res.status(201).json({ success: true, data: comment });
  } catch (e: any) {
    next(e);
  }
});

// DELETE /api/news/comments/:commentId — Supprimer (auteur ou admin)
router.delete('/comments/:commentId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const isAdmin = (req as any).user?.role === 'admin';
    await newsService.deleteComment(param(req, 'commentId'), req.user!.id, isAdmin);
    res.json({ success: true });
  } catch (e: any) {
    next(e);
  }
});

// POST /api/news/comments/:commentId/report
router.post('/comments/:commentId/report', authenticate, validateBody(jsonObjectBodySchema), async (req, res, next) => {
  try {
    await newsService.reportComment(param(req, 'commentId'));
    res.json({ success: true });
  } catch (e: any) {
    next(e);
  }
});

// ——— Admin / Auteur ———

// POST /api/news — Créer article
router.post('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const article = await newsService.create(req.user!.id, req.body);
    res.status(201).json({ success: true, data: article });
  } catch (e: any) {
    next(e);
  }
});

// PATCH /api/news/:id
router.patch('/:id', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const isAdmin = (req as any).user?.role === 'admin';
    const article = await newsService.update(param(req, 'id'), req.user!.id, isAdmin, req.body);
    res.json({ success: true, data: article });
  } catch (e: any) {
    next(e);
  }
});

// POST /api/news/:id/status — draft | review | published | archived
router.post('/:id/status', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.body;
    const isAdmin = (req as any).user?.role === 'admin';
    const article = await newsService.setStatus(param(req, 'id'), req.user!.id, isAdmin, status);
    res.json({ success: true, data: article });
  } catch (e: any) {
    next(e);
  }
});

// POST /api/news/verified-sources — Admin: créer source vérifiée
router.post('/verified-sources', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const source = await newsService.createVerifiedSource(req.body);
    res.status(201).json({ success: true, data: source });
  } catch (e: any) {
    next(e);
  }
});

// ——— Cron (protégé par X-Cron-Secret) ———

router.post('/cron/calculate-trending', (req, res, next) => {
  const secret = req.headers['x-cron-secret'];
  const expected = process.env.CRON_SECRET || process.env.NEWS_CRON_SECRET;
  if (expected && secret !== expected) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  newsService.calculateTrending()
    .then(() => res.json({ success: true, message: 'Trending calculated' }))
    .catch((e) => next(e));
});

router.post('/cron/expire-breaking', (req, res, next) => {
  const secret = req.headers['x-cron-secret'];
  const expected = process.env.CRON_SECRET || process.env.NEWS_CRON_SECRET;
  if (expected && secret !== expected) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  newsService.expireBreaking()
    .then((count) => res.json({ success: true, expired: count }))
    .catch((e) => next(e));
});

export default router;
