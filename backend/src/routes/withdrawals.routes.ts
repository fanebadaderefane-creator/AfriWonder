import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import withdrawalService from '../services/withdrawal.service.js';

const router = Router();

// POST /api/withdrawals/request - Demander un retrait
router.post('/request', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { amount, orange_money_phone, pin } = req.body;

    if (!amount || !orange_money_phone) {
      return res.status(400).json({
        success: false,
        error: { message: 'Montant et numéro Orange Money requis' },
      });
    }

    const withdrawal = await withdrawalService.requestWithdrawal(userId, {
      amount,
      orange_money_phone,
      pin,
    });

    res.status(201).json({
      success: true,
      data: withdrawal,
      message: 'Demande de retrait créée. Elle sera traitée sous 24-48h.',
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
router.get('/pending', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // TODO: Vérifier que l'utilisateur est admin
    // if (req.user!.role !== 'admin') {
    //   return res.status(403).json({ success: false, error: { message: 'Accès refusé' } });
    // }

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
router.post('/:id/process', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // TODO: Vérifier que l'utilisateur est admin
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
      message: 'Retrait traité avec succès',
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/withdrawals/:id/cancel - Annuler un retrait
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const withdrawalId = param(req, 'id');
    const isAdmin = req.user!.role === 'admin';

    const withdrawal = await withdrawalService.cancelWithdrawal(withdrawalId, userId, isAdmin);

    res.json({
      success: true,
      data: withdrawal,
      message: 'Retrait annulé. Le montant a été remboursé dans votre wallet.',
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

