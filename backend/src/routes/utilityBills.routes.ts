/**
 * Factures utilitaires — agrégateur (EDM, Somagep, Canal+, Orange TV, Malitel…).
 *
 * Le seed de migration insère 6 providers par défaut. Chaque provider expose son
 * `fields_schema` pour dire quels champs saisir (numéro contrat, décodeur, etc.).
 *
 * Paiement : on crée une `UtilityBillPayment` en 'pending', puis selon la
 * `payment_method` on redirige vers le provider (wallet / OM / Wave / MTN / Moov).
 * Quand le paiement aboutit, on passe `status='paid'` et on renvoie une quittance.
 */
import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { authenticate, AuthRequest, optionalAuth } from '../middleware/auth.js';
import { validateBody } from '../utils/zodValidation.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';
import { Prisma } from '@prisma/client';

const router = Router();

// GET /api/utility-bills/providers — liste des providers actifs
router.get('/providers', optionalAuth, async (req, res, next) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const where: Record<string, unknown> = { is_active: true };
    if (category) where.category = category;
    const providers = await prisma.utilityBillProvider.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: {
        id: true, slug: true, name: true, category: true,
        logo_url: true, country: true, fields_schema: true,
      },
    });
    res.json({ success: true, data: providers });
  } catch (err) { next(err); }
});

// POST /api/utility-bills/payments — créer un paiement de facture
const paySchema = z.object({
  provider_id: z.string().uuid(),
  account_ref: z.string().min(3).max(64),
  amount_fcfa: z.number().positive(),
  payment_method: z.enum(['wallet', 'orange_money', 'wave', 'mtn_money', 'moov_money']),
  metadata: z.record(z.unknown()).optional(),
});

router.post('/payments', authenticate, validateBody(paySchema), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as z.infer<typeof paySchema>;
    const provider = await prisma.utilityBillProvider.findUnique({ where: { id: body.provider_id } });
    if (!provider || !provider.is_active) return res.status(404).json({ success: false, error: 'Provider indisponible.' });

    const reference = `BILL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Paiement immédiat par wallet (atomique) — les autres méthodes sont pending en attente du webhook provider
    if (body.payment_method === 'wallet') {
      const wallet = await prisma.wallet.findFirst({ where: { user_id: req.user!.id, wallet_type: 'user' } });
      if (!wallet) return res.status(400).json({ success: false, error: 'Portefeuille introuvable.' });
      if (wallet.balance < body.amount_fcfa) return res.status(400).json({ success: false, error: 'Solde insuffisant.' });

      const payment = await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: body.amount_fcfa } },
        });
        await tx.transaction.create({
          data: {
            user_id: req.user!.id,
            amount: -body.amount_fcfa,
            type: 'bill_payment',
            status: 'completed',
            currency: 'XOF',
            description: `Facture ${provider.name} — ${body.account_ref}`,
          },
        });
        return tx.utilityBillPayment.create({
          data: {
            user_id: req.user!.id,
            provider_id: provider.id,
            account_ref: body.account_ref,
            amount_fcfa: body.amount_fcfa,
            payment_method: 'wallet',
            status: 'paid',
            reference,
            metadata: (body.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          },
        });
      });
      return res.status(201).json({ success: true, data: payment });
    }

    // Mobile money / Orange money / Wave : crée en pending, client redirigé vers l'écran dédié
    const payment = await prisma.utilityBillPayment.create({
      data: {
        user_id: req.user!.id,
        provider_id: provider.id,
        account_ref: body.account_ref,
        amount_fcfa: body.amount_fcfa,
        payment_method: body.payment_method,
        status: 'pending',
        reference,
        metadata: (body.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
    return res.status(201).json({ success: true, data: payment });
  } catch (err) { return next(err); }
});

// GET /api/utility-bills/payments — mes paiements de factures
router.get('/payments', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const payments = await prisma.utilityBillPayment.findMany({
      where: { user_id: req.user!.id },
      include: { provider: true },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: payments });
  } catch (err) { next(err); }
});

// GET /api/utility-bills/payments/:id
router.get('/payments/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const p = await prisma.utilityBillPayment.findFirst({
      where: { id, user_id: req.user!.id },
      include: { provider: true },
    });
    if (!p) return res.status(404).json({ success: false, error: 'Paiement introuvable.' });
    return res.json({ success: true, data: p });
  } catch (err) { return next(err); }
});

export default router;
