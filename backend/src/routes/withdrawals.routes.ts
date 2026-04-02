import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAnyAdmin, isAdminRole } from '../middleware/adminRbac.js';
import { param } from '../utils/params.js';
import withdrawalService from '../services/withdrawal.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// POST /api/withdrawals/request - Demander un retrait
router.post('/request', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { amount, orange_money_phone, phone, payment_method, paypal_email, pin } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: { message: 'Montant requis' },
      });
    }

    const withdrawal = await withdrawalService.requestWithdrawal(userId, {
      amount,
      orange_money_phone: orange_money_phone || phone,
      phone,
      payment_method: payment_method || 'orange_money',
      paypal_email,
      pin,
    });

    res.status(201).json({
      success: true,
      data: withdrawal,
      message: 'Demande de retrait crÃ©Ã©e. Elle sera traitÃ©e sous 24-48h.',
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/withdrawals - Mes retraits
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await withdrawalService.getUserWithdrawals(userId, page, limit);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/withdrawals/pending - Retraits en attente (Admin)
router.get('/pending', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await withdrawalService.getPendingWithdrawals(page, limit);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/withdrawals/:id/process - Traiter un retrait (Admin)
router.post('/:id/process', authenticate, requireAnyAdmin, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const adminId = req.user!.id;
    const withdrawalId = param(req, 'id');
    const { transaction_reference, notes } = req.body;

    const result = await withdrawalService.processWithdrawal(withdrawalId, adminId, {
      transaction_reference,
      notes,
    });

    res.json({
      success: true,
      data: result,
      message: 'Retrait traitÃ© avec succÃ¨s',
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/withdrawals/:id/cancel - Annuler un retrait
router.post('/:id/cancel', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const withdrawalId = param(req, 'id');
    const isAdmin = isAdminRole(req.user!.role || '');

    const withdrawal = await withdrawalService.cancelWithdrawal(withdrawalId, userId, isAdmin);

    res.json({
      success: true,
      data: withdrawal,
      message: 'Retrait annulÃ©. Le montant a Ã©tÃ© remboursÃ© dans votre wallet.',
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;


