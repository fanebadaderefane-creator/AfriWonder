/**
 * Plans d'épargne programmée.
 * Auto-débite le wallet selon la fréquence choisie. Un cron indépendant peut
 * appeler `runDueDebits()` pour traiter toutes les épargnes dues.
 */
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../utils/zodValidation.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';

const router = Router();

function addFrequency(base: Date, frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'): Date {
  const d = new Date(base);
  if (frequency === 'daily') d.setDate(d.getDate() + 1);
  else if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else if (frequency === 'biweekly') d.setDate(d.getDate() + 14);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

const createSchema = z.object({
  name: z.string().min(3).max(120),
  contribution_amount: z.number().positive(),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
  target_amount: z.number().positive().optional(),
  target_date: z.string().optional(),
});

// GET /api/savings — mes plans
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const plans = await prisma.savingsPlan.findMany({
      where: { user_id: req.user!.id },
      orderBy: { created_at: 'desc' },
      include: { transactions: { orderBy: { created_at: 'desc' }, take: 5 } },
    });
    res.json({ success: true, data: plans });
  } catch (err) { next(err); }
});

// POST /api/savings — créer un plan
router.post('/', authenticate, validateBody(createSchema), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as z.infer<typeof createSchema>;
    const plan = await prisma.savingsPlan.create({
      data: {
        user_id: req.user!.id,
        name: body.name.trim(),
        contribution_amount: body.contribution_amount,
        frequency: body.frequency,
        next_debit_at: addFrequency(new Date(), body.frequency),
        target_amount: body.target_amount,
        target_date: body.target_date ? new Date(body.target_date) : null,
      },
    });
    res.status(201).json({ success: true, data: plan });
  } catch (err) { next(err); }
});

// GET /api/savings/:id
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const plan = await prisma.savingsPlan.findFirst({
      where: { id, user_id: req.user!.id },
      include: { transactions: { orderBy: { created_at: 'desc' } } },
    });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan introuvable.' });
    return res.json({ success: true, data: plan });
  } catch (err) { return next(err); }
});

// POST /api/savings/:id/pause
router.post('/:id/pause', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const plan = await prisma.savingsPlan.updateMany({
      where: { id, user_id: req.user!.id },
      data: { status: 'paused' },
    });
    if (plan.count === 0) return res.status(404).json({ success: false, error: 'Plan introuvable.' });
    return res.json({ success: true });
  } catch (err) { return next(err); }
});

// POST /api/savings/:id/resume
router.post('/:id/resume', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const plan = await prisma.savingsPlan.findFirst({ where: { id, user_id: req.user!.id } });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan introuvable.' });
    await prisma.savingsPlan.update({
      where: { id },
      data: {
        status: 'active',
        next_debit_at: addFrequency(new Date(), plan.frequency as 'daily' | 'weekly' | 'biweekly' | 'monthly'),
      },
    });
    return res.json({ success: true });
  } catch (err) { return next(err); }
});

// POST /api/savings/:id/withdraw — retire le solde vers le wallet (sortie anticipée)
const withdrawSchema = z.object({ amount: z.number().positive() });

router.post('/:id/withdraw', authenticate, validateBody(withdrawSchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const { amount } = req.body as z.infer<typeof withdrawSchema>;
    const plan = await prisma.savingsPlan.findFirst({ where: { id, user_id: req.user!.id } });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan introuvable.' });
    if (plan.balance < amount) return res.status(400).json({ success: false, error: 'Solde insuffisant dans ce plan.' });

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findFirst({ where: { user_id: req.user!.id, wallet_type: 'user' } });
      if (!wallet) throw new Error('Portefeuille introuvable.');
      await tx.savingsPlan.update({
        where: { id },
        data: { balance: { decrement: amount } },
      });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      });
      return tx.savingsPlanTransaction.create({
        data: { plan_id: id, amount: -amount, kind: 'withdrawal', status: 'completed' },
      });
    });
    return res.json({ success: true, data: result });
  } catch (err) { return next(err); }
});

// POST /api/savings/:id/delete (archive / close)
router.post('/:id/close', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const plan = await prisma.savingsPlan.findFirst({ where: { id, user_id: req.user!.id } });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan introuvable.' });
    if (plan.balance > 0) {
      return res.status(400).json({ success: false, error: 'Retirez d\'abord votre solde avant de clôturer.' });
    }
    await prisma.savingsPlan.update({ where: { id }, data: { status: 'closed' } });
    return res.json({ success: true });
  } catch (err) { return next(err); }
});

export default router;
