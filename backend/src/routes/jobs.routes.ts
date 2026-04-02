import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import jobService from '../services/job.service.js';
import moderationService from '../services/moderation.service.js';

const applyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Trop de candidatures. Réessayez dans 15 minutes.' },
  standardHeaders: true,
});

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// GET /api/jobs/recommended - Emplois recommandés (profil candidat, pays)
router.get('/recommended', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
    const data = await jobService.getRecommendedJobs(userId, limit);
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/jobs/dashboard/employer - Tableau de bord employeur
router.get('/dashboard/employer', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const data = await jobService.getEmployerDashboard(userId);
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/jobs/profile/candidate - Mon profil candidat
router.get('/profile/candidate', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const data = await jobService.getCandidateProfile(userId);
    res.json({ success: true, data: data ?? null });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/jobs/profile/candidate - Créer / mettre à jour profil candidat
router.put('/profile/candidate', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { cvUrl, portfolioUrl, skills, experience, education, availability, phone } = req.body;
    const data = await jobService.upsertCandidateProfile(userId, {
      cv_url: cvUrl,
      portfolio_url: portfolioUrl,
      skills,
      experience,
      education,
      availability,
      phone,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/jobs/profile/company - Mon profil entreprise
router.get('/profile/company', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const data = await jobService.getCompanyProfile(userId);
    res.json({ success: true, data: data ?? null });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/jobs/profile/company - Créer / mettre à jour profil entreprise
router.put('/profile/company', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { companyName, description, logoUrl, documentsLegal } = req.body;
    const data = await jobService.upsertCompanyProfile(userId, {
      company_name: companyName,
      description,
      logo_url: logoUrl,
      documents_legal: documentsLegal,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/jobs/saved/list - Mes offres sauvegardées
router.get('/saved/list', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await jobService.getSavedJobs(userId, page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/jobs - Liste des emplois (filtres: country, category, jobType, search)
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const category = req.query.category as string | undefined;
    const jobType = req.query.jobType as string | undefined;
    const search = req.query.search as string | undefined;
    const country = req.query.country as string | undefined;

    const result = await jobService.list(page, limit, {
      status,
      category,
      jobType,
      search,
      country,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/jobs/:id - Détails d'un emploi (optionnel: incrémenter vues)
router.get('/:id', async (req, res, next) => {
  try {
    const jobId = param(req, 'id');
    const incrementView = req.query.view === '1';
    const job = await jobService.getById(jobId, incrementView);

    res.json({
      success: true,
      data: job,
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/jobs - Créer un emploi
router.post('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const {
      title,
      description,
      location,
      salaryMin,
      salaryMax,
      salaryCurrency,
      jobType,
      category,
      country,
      expiresAt,
      isPremium,
      isUrgent,
      phone,
    } = req.body;

    const job = await jobService.create(userId, {
      title,
      description,
      location,
      salaryMin,
      salaryMax,
      salaryCurrency,
      jobType,
      category,
      country,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      isPremium,
      isUrgent,
      phone,
    });

    res.status(201).json({
      success: true,
      data: job,
      message: isPremium && phone ? 'Job créé. Redirigez vers paymentUrl pour compléter le paiement premium.' : 'Job créé.',
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/jobs/:id/apply - Postuler à un emploi
router.post('/:id/apply', applyLimiter, authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const jobId = param(req, 'id');
    const userId = req.user!.id;
    const { coverLetter, resumeUrl } = req.body;

    const application = await jobService.apply(jobId, userId, coverLetter, resumeUrl);

    res.status(201).json({
      success: true,
      data: application,
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/jobs/premium/:id/confirm - Confirmer paiement premium (webhook)
router.post('/premium/:id/confirm', validateBody(jsonObjectBodySchema), async (req, res, next) => {
  try {
    const transactionId = param(req, 'id');
    const result = await jobService.confirmPremiumPayment(transactionId);

    res.json({
      success: true,
      data: result,
      message: 'Paiement premium confirmé',
    });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/jobs/applications/:id/status - Employeur: changer statut candidature
router.put('/applications/:id/status', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const applicationId = param(req, 'id');
    const userId = req.user!.id;
    const { status } = req.body;
    if (!['pending', 'reviewed', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: { message: 'Statut invalide' } });
    }
    const data = await jobService.updateApplicationStatus(
      applicationId,
      userId,
      status as 'pending' | 'reviewed' | 'accepted' | 'rejected'
    );
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/jobs/rate/company - Candidat note l'entreprise (après entretien)
router.post('/rate/company', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { toUserId, jobId, rating, comment } = req.body;
    if (!toUserId || !jobId || rating == null) {
      return res.status(400).json({ success: false, error: { message: 'toUserId, jobId, rating requis' } });
    }
    const data = await jobService.rateCompany(userId, toUserId, jobId, Number(rating), comment);
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/jobs/rate/candidate - Employeur note le candidat
router.post('/rate/candidate', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { toUserId, jobId, rating, comment } = req.body;
    if (!toUserId || !jobId || rating == null) {
      return res.status(400).json({ success: false, error: { message: 'toUserId, jobId, rating requis' } });
    }
    const data = await jobService.rateCandidate(userId, toUserId, jobId, Number(rating), comment);
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/jobs/:id/save - Sauvegarder une offre
router.post('/:id/save', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const jobId = param(req, 'id');
    const userId = req.user!.id;
    await jobService.saveJob(jobId, userId);
    res.json({ success: true, data: { saved: true } });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/jobs/:id/save - Retirer des sauvegardes
router.delete('/:id/save', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const jobId = param(req, 'id');
    const userId = req.user!.id;
    await jobService.unsaveJob(jobId, userId);
    res.json({ success: true, data: { saved: false } });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/jobs/:id/report - Signaler une offre
router.post('/:id/report', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const jobId = param(req, 'id');
    const userId = req.user!.id;
    const { reason, description } = req.body;
    if (!reason?.trim()) return res.status(400).json({ success: false, error: { message: 'reason requis' } });
    const report = await moderationService.createReport(userId, {
      contentType: 'job',
      contentId: jobId,
      reason: reason.trim(),
      description: description?.trim(),
    });
    res.status(201).json({ success: true, data: report, message: 'Signalement enregistré.' });
  } catch (error: any) {
    next(error);
  }
});

export default router;
