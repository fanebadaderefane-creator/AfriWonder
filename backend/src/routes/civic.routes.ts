import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import civicService from '../services/civic.service.js';
import moderationService from '../services/moderation.service.js';

const signLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { success: false, error: 'Trop de signatures. Réessayez dans 15 minutes.' },
  standardHeaders: true,
});

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// GET /api/civic - Liste des pétitions (filtres: status, search, country, region, category)
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const country = req.query.country as string | undefined;
    const region = req.query.region as string | undefined;
    const category = req.query.category as string | undefined;

    const result = await civicService.list(page, limit, { status, search, country, region, category });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/civic/recommended - Pétitions recommandées (pays / région utilisateur)
router.get('/recommended', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
    const data = await civicService.getRecommendedPetitions(userId, limit);
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/civic/creator/dashboard - Dashboard créateur (avant /:id)
router.get('/creator/dashboard', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const petitionId = req.query.petitionId as string | undefined;
    const data = await civicService.getCreatorDashboard(userId, petitionId);
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/civic/saved/list - Mes pétitions sauvegardées (avant /:id)
router.get('/saved/list', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await civicService.getSavedPetitions(userId, page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/civic/:id - Détails d'une pétition
router.get('/:id', async (req, res, next) => {
  try {
    const petitionId = param(req, 'id');
    const petition = await civicService.getById(petitionId);

    res.json({
      success: true,
      data: petition,
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/civic - Créer une pétition
router.post('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { title, description, goalSignatures, endDate, category, country, region, city, isNational, targetAuthorityEmail } = req.body;

    const petition = await civicService.create(userId, {
      title,
      description,
      goalSignatures,
      endDate: endDate ? new Date(endDate) : undefined,
      category,
      country,
      region,
      city,
      isNational,
      targetAuthorityEmail,
    });

    res.status(201).json({
      success: true,
      data: petition,
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/civic/:id/sign - Signer une pétition (email vérifié requis; reCAPTCHA si RECAPTCHA_SECRET défini)
router.post('/:id/sign', signLimiter, authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const petitionId = param(req, 'id');
    const userId = req.user!.id;
    const { comment, ipAddress, signerCity, signerCountry, recaptchaToken } = req.body;
    const ip = ipAddress || req.ip || req.socket?.remoteAddress;

    const signature = await civicService.sign(petitionId, userId, {
      comment,
      ipAddress: ip,
      signerCity,
      signerCountry,
      recaptchaToken,
    });

    res.status(201).json({
      success: true,
      data: signature,
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/civic/:id/comments - Commentaires d'une pétition
router.get('/:id/comments', async (req, res, next) => {
  try {
    const petitionId = param(req, 'id');
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await civicService.listComments(petitionId, page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/civic/:id/comments - Ajouter un commentaire
router.post('/:id/comments', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const petitionId = param(req, 'id');
    const userId = req.user!.id;
    const { content, parentId } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, error: { message: 'content requis' } });
    const comment = await civicService.addComment(petitionId, userId, content.trim(), parentId);
    res.status(201).json({ success: true, data: comment });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/civic/comments/:id/like - Like / unlike commentaire
router.post('/comments/:id/like', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const commentId = param(req, 'id');
    const userId = req.user!.id;
    const result = await civicService.likeComment(commentId, userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/civic/:id/share - Enregistrer un partage
router.post('/:id/share', validateBody(jsonObjectBodySchema), async (req, res, next) => {
  try {
    const petitionId = param(req, 'id');
    await civicService.recordShare(petitionId);
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/civic/:id/save - Sauvegarder une pétition
router.post('/:id/save', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const petitionId = param(req, 'id');
    const userId = req.user!.id;
    await civicService.savePetition(petitionId, userId);
    res.json({ success: true, data: { saved: true } });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/civic/:id/save - Retirer des sauvegardes
router.delete('/:id/save', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const petitionId = param(req, 'id');
    const userId = req.user!.id;
    await civicService.unsavePetition(petitionId, userId);
    res.json({ success: true, data: { saved: false } });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/civic/:id/report - Signaler une pétition
router.post('/:id/report', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const petitionId = param(req, 'id');
    const userId = req.user!.id;
    const { reason, description } = req.body;
    if (!reason?.trim()) return res.status(400).json({ success: false, error: { message: 'reason requis' } });
    const report = await moderationService.createReport(userId, {
      contentType: 'petition',
      contentId: petitionId,
      reason: reason.trim(),
      description: description?.trim(),
    });
    res.status(201).json({ success: true, data: report, message: 'Signalement enregistré.' });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/civic/:id/donate - Faire un don à une pétition
router.post('/:id/donate', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const petitionId = param(req, 'id');
    const userId = req.user!.id;
    const { amount, phone, message } = req.body;

    if (!amount || !phone) {
      return res.status(400).json({
        success: false,
        error: { message: 'amount et phone requis' },
      });
    }

    const result = await civicService.donate(petitionId, userId, {
      amount,
      phone,
      message,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Don créé. Redirigez vers paymentUrl pour compléter le paiement.',
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/civic/donations/:id/confirm - Confirmer un don (webhook)
router.post('/donations/:id/confirm', validateBody(jsonObjectBodySchema), async (req, res, next) => {
  try {
    const transactionId = param(req, 'id');
    const result = await civicService.confirmDonation(transactionId);

    res.json({
      success: true,
      data: result,
      message: 'Don confirmé',
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
