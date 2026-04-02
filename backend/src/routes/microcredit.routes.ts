import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import microcreditService from '../services/microcredit.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// GET /api/microcredit - Liste des prêts
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;

    const result = await microcreditService.list(page, limit, { status });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/microcredit/:id/repayments - Échéances (avant :id pour priorité)
router.get('/:id/repayments', async (req, res, next) => {
  try {
    const loanId = param(req, 'id');
    const repayments = await microcreditService.getRepayments(loanId);
    res.json({ success: true, data: repayments });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/microcredit/:id - Détails d'un prêt
router.get('/:id', async (req, res, next) => {
  try {
    const loanId = param(req, 'id');
    const loan = await microcreditService.getById(loanId);

    res.json({
      success: true,
      data: loan,
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/microcredit/request - Créer une demande de prêt
router.post('/request', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { amount, purpose, repaymentPeriod, interestRate, business_plan } = req.body;

    const loan = await microcreditService.createRequest(userId, {
      amount,
      purpose,
      repaymentPeriod,
      interestRate,
      business_plan,
    });

    res.status(201).json({
      success: true,
      data: loan,
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/microcredit/:id/contribute - Contribuer à un prêt
router.post('/:id/contribute', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const loanId = param(req, 'id');
    const userId = req.user!.id;
    const { amount, phone } = req.body;

    if (!amount || !phone) {
      return res.status(400).json({
        success: false,
        error: { message: 'amount et phone requis' },
      });
    }

    const result = await microcreditService.contribute(loanId, userId, { amount, phone });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Contribution créée. Redirigez vers paymentUrl pour compléter le paiement.',
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/microcredit/contributions/:id/confirm - Confirmer une contribution (webhook)
router.post('/contributions/:id/confirm', validateBody(jsonObjectBodySchema), async (req, res, next) => {
  try {
    const contributionId = param(req, 'id');
    const contribution = await microcreditService.confirmContribution(contributionId);

    res.json({
      success: true,
      data: contribution,
      message: 'Contribution confirmée',
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/microcredit/repayments/:id/pay - Marquer une échéance comme payée (admin ou cron)
router.post('/repayments/:id/pay', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const repaymentId = param(req, 'id');
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: { message: 'Montant requis' } });
    }
    const result = await microcreditService.markRepaymentPaid(repaymentId, amount);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/microcredit/cron/check-overdue - Défauts (cron ou admin)
router.post('/cron/check-overdue', validateBody(jsonObjectBodySchema), async (req, res, next) => {
  try {
    const result = await microcreditService.checkOverdueAndMarkDefault();
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

export default router;
