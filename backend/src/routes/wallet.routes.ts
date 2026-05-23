/**
 * Routes Portefeuille (Wallet) — opérations utilisateur générales.
 *
 * Endpoints :
 *   GET  /api/wallet/balance           → solde + limites + flag PIN
 *   POST /api/wallet/transfer          → transfert P2P interne (atomique)
 *   GET  /api/wallet/transactions      → historique (alias paiements)
 *
 * Sécurité :
 *   - `authenticate` obligatoire
 *   - `paymentLimiter` (10 req/h) sur le transfert pour limiter la fraude
 *   - `optionalIdempotencyMiddleware` pour éviter le double-clic / retry
 *   - Validation Zod stricte du body
 */
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../utils/zodValidation.js';
import { optionalIdempotencyMiddleware, saveIdempotencyResponse } from '../middleware/idempotency.js';
import { paymentLimiter } from '../middleware/rateLimiting.js';
import walletService from '../services/wallet.service.js';
import prisma from '../config/database.js';

const router = Router();

const transferSchema = z
  .object({
    recipient_user_id: z.string().uuid().optional(),
    recipient_username: z.string().min(2).max(64).optional(),
    recipient_phone: z.string().min(8).max(20).optional(),
    amount: z.number().positive().max(1_000_000),
    description: z.string().max(140).optional(),
    pin: z.string().min(4).max(8).optional(),
  })
  .refine(
    (data) => !!(data.recipient_user_id || data.recipient_username || data.recipient_phone),
    { message: 'Spécifier recipient_user_id, recipient_username ou recipient_phone' },
  );

router.get('/balance', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const balance = await walletService.getBalance(userId);
    res.json({ success: true, data: balance });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/transfer',
  authenticate,
  paymentLimiter,
  optionalIdempotencyMiddleware,
  validateBody(transferSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const result = await walletService.transferP2P(userId, req.body);

      const response = { success: true as const, data: result };
      // Mémoriser la réponse pour idempotence si Idempotency-Key fourni.
      const idempKey = req.headers['idempotency-key'];
      if (typeof idempKey === 'string' && idempKey.trim().length >= 8) {
        await saveIdempotencyResponse(idempKey.trim(), 200, response).catch(() => {});
      }
      res.json(response);
    } catch (err) {
      next(err);
    }
  },
);

router.get('/transactions', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10) || 20));
    const where = {
      user_id: userId,
      type: { in: ['wallet_transfer_in', 'wallet_transfer_out'] },
    };
    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);
    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
