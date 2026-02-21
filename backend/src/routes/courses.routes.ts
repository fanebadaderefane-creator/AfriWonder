import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import courseService from '../services/course.service.js';
import courseProviderService from '../services/courseProvider.service.js';

const router = Router();

// ========== Prestataire Formations (Devenir formateur + admin AfriWonder) ==========
// GET /api/courses/provider/me
router.get('/provider/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const provider = await courseProviderService.getByUserId(req.user!.id);
    res.json({ success: true, data: provider });
  } catch (e) {
    next(e);
  }
});

// POST /api/courses/provider/register
router.post('/provider/register', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const b = req.body;
    if (!b.full_name?.trim() || !b.email?.trim() || !b.phone?.trim()) {
      return res.status(400).json({ success: false, message: 'full_name, email et phone requis' });
    }
    const provider = await courseProviderService.register(userId, {
      full_name: b.full_name.trim(),
      email: b.email.trim(),
      phone: b.phone.trim(),
      bio: b.bio?.trim(),
      domains: b.domains?.trim(),
      experience: b.experience?.trim(),
    });
    res.status(201).json({
      success: true,
      data: provider,
      message: 'Demande enregistrée. Un administrateur AfriWonder la validera avant que vos formations n\'apparaissent.',
    });
  } catch (e: any) {
    if (e.message?.includes('déjà')) return res.status(400).json({ success: false, message: e.message });
    next(e);
  }
});

// GET /api/courses/provider/admin/pending
router.get('/provider/admin/pending', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role ?? '')) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const list = await courseProviderService.getPending();
    res.json({ success: true, data: list });
  } catch (e) {
    next(e);
  }
});

// POST /api/courses/provider/admin/:id/approve
router.post('/provider/admin/:id/approve', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role ?? '')) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const provider = await courseProviderService.approve(param(req, 'id'));
    res.json({ success: true, data: provider, message: 'Formateur approuvé' });
  } catch (e: any) {
    if (e.message) return res.status(400).json({ success: false, message: e.message });
    next(e);
  }
});

// POST /api/courses/provider/admin/:id/reject
router.post('/provider/admin/:id/reject', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role ?? '')) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const reason = req.body?.reason as string | undefined;
    const provider = await courseProviderService.reject(param(req, 'id'), reason);
    res.json({ success: true, data: provider, message: 'Demande rejetée' });
  } catch (e: any) {
    if (e.message) return res.status(400).json({ success: false, message: e.message });
    next(e);
  }
});

// GET /api/courses - Liste des cours (uniquement formateurs approuvés) (sort: popular | rating | newest | price_low | price_high, price: all | free | paid)
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string | undefined;
    const level = req.query.level as string | undefined;
    const isPublished = req.query.isPublished === 'true' ? true : undefined;
    const search = req.query.search as string | undefined;
    const sort = (req.query.sort as string) || 'popular';
    const price = (req.query.price as string) || 'all';

    const result = await courseService.list(page, limit, {
      category,
      level,
      isPublished,
      search,
      sort: sort as 'popular' | 'rating' | 'newest' | 'price_low' | 'price_high',
      price: price as 'all' | 'free' | 'paid',
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/courses/recommendations - Recommandations (auth optionnel pour exclure déjà inscrits/wishlist)
router.get('/recommendations', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
    const courses = await courseService.getRecommendations(userId, limit);
    res.json({ success: true, data: courses });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/courses/wishlist - Ma wishlist
router.get('/wishlist', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await courseService.wishlistList(userId, page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/courses/instructor/dashboard - Dashboard instructeur (revenus, stats, taux complétion)
router.get('/instructor/dashboard', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const creatorId = req.user!.id;
    const dashboard = await courseService.getInstructorDashboard(creatorId);
    res.json({ success: true, data: dashboard });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/courses/:id/enrollment - Mon inscription (auth)
router.get('/:id/enrollment', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const courseId = param(req, 'id');
    const userId = req.user!.id;
    const enrollment = await courseService.getMyEnrollment(courseId, userId);
    if (!enrollment) {
      return res.status(404).json({ success: false, error: { message: 'Non inscrit à ce cours' } });
    }
    res.json({
      success: true,
      data: { ...enrollment, enrolled_at: enrollment.created_at },
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/courses/:id/reviews - Avis du cours (avant GET /:id pour priorité)
router.get('/:id/reviews', async (req, res, next) => {
  try {
    const courseId = param(req, 'id');
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await courseService.getReviews(courseId, page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/courses/:id - Détails d'un cours
router.get('/:id', async (req, res, next) => {
  try {
    const courseId = param(req, 'id');
    const course = await courseService.getById(courseId);

    res.json({
      success: true,
      data: course,
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/courses - Créer un cours
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { title, description, thumbnailUrl, trailerUrl, price, category, level, durationHours, currency, language, certificateEnabled } = req.body;

    const course = await courseService.create(userId, {
      title,
      description,
      thumbnailUrl,
      trailerUrl,
      price,
      category,
      level,
      durationHours,
      currency,
      language,
      certificateEnabled,
    });

    res.status(201).json({
      success: true,
      data: course,
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/courses/:id/enroll - S'inscrire à un cours
router.post('/:id/enroll', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const courseId = param(req, 'id');
    const userId = req.user!.id;
    const { phone } = req.body;

    const result = await courseService.enroll(courseId, userId, phone ? { phone } : undefined);

    res.status(201).json({
      success: true,
      data: result,
      message: phone ? 'Inscription créée. Redirigez vers paymentUrl pour compléter le paiement.' : 'Inscription créée (cours gratuit).',
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/courses/:id/wishlist - Ajouter à la wishlist
router.post('/:id/wishlist', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const courseId = param(req, 'id');
    const userId = req.user!.id;
    await courseService.wishlistAdd(userId, courseId);
    res.json({ success: true, message: 'Ajouté à la wishlist' });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/courses/:id/wishlist - Retirer de la wishlist
router.delete('/:id/wishlist', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const courseId = param(req, 'id');
    const userId = req.user!.id;
    await courseService.wishlistRemove(userId, courseId);
    res.json({ success: true, message: 'Retiré de la wishlist' });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/courses/:id/reviews - Déposer un avis
router.post('/:id/reviews', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const courseId = param(req, 'id');
    const userId = req.user!.id;
    const { rating, comment } = req.body;
    if (typeof rating !== 'number' && typeof rating !== 'string') {
      return res.status(400).json({ success: false, error: { message: 'rating requis (1-5)' } });
    }
    const review = await courseService.addReview(courseId, userId, Number(rating), comment);
    res.status(201).json({ success: true, data: review });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/courses/enrollments/:id/progress - Mettre à jour la progression (pour compat)
router.put('/enrollments/:id/progress', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const enrollmentId = param(req, 'id');
    const progress = Number(req.body.progress);
    if (Number.isNaN(progress)) {
      return res.status(400).json({ success: false, error: { message: 'progress requis (0-100)' } });
    }
    const enrollment = await courseService.updateProgress(enrollmentId, progress);
    res.json({ success: true, data: enrollment });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/courses/enrollments/:id/lessons/:lessonId/complete - Marquer une leçon comme complétée
router.post('/enrollments/:id/lessons/:lessonId/complete', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const enrollmentId = param(req, 'id');
    const lessonId = param(req, 'lessonId');
    const userId = req.user!.id;
    const enrollment = await courseService.completeLesson(enrollmentId, lessonId, userId);
    res.json({ success: true, data: enrollment });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/courses/enrollments/:id/lessons/:lessonId/stream - URL de stream vidéo (vérif enrollment, quality=240|720 pour adaptative)
router.get('/enrollments/:id/lessons/:lessonId/stream', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const enrollmentId = param(req, 'id');
    const lessonId = param(req, 'lessonId');
    const userId = req.user!.id;
    const quality = req.query.quality as '240' | '720' | undefined;
    const result = await courseService.getLessonStreamUrl(enrollmentId, lessonId, userId, quality);
    if (!result) return res.status(404).json({ success: false, error: { message: 'Leçon ou inscription non trouvée' } });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/courses/enrollments/:id/confirm - Confirmer le paiement (webhook)
router.post('/enrollments/:id/confirm', async (req, res, next) => {
  try {
    const enrollmentId = param(req, 'id');
    const enrollment = await courseService.confirmCoursePayment(enrollmentId);

    res.json({
      success: true,
      data: enrollment,
      message: 'Paiement cours confirmé',
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
