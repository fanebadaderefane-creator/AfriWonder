/**
 * Cartes virtuelles — UI de gestion pour les utilisateurs.
 * Le modèle `VirtualCard` existait déjà ; on expose ici les routes publiques
 * minimales (liste / création / blocage / limites).
 *
 * Note : pour une émission réelle (Stripe Issuing / Marqeta), il faut un
 * partenaire bancaire. On crée la carte en `virtual` / `pending` et on la
 * passe à `active` quand l'intégration partenaire confirme.
 */
import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../utils/zodValidation.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';

const router = Router();

function generateLast4(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

const createSchema = z.object({
  spending_limit: z.number().positive().optional(),
});

const limitSchema = z.object({
  spending_limit: z.number().positive().nullable(),
});

// GET /api/virtual-cards — mes cartes
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const cards = await prisma.virtualCard.findMany({
      where: { user_id: req.user!.id },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: cards });
  } catch (err) { next(err); }
});

// POST /api/virtual-cards — créer une carte virtuelle
router.post('/', authenticate, validateBody(createSchema), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as z.infer<typeof createSchema>;
    // Limite par user : max 3 cartes actives
    const active = await prisma.virtualCard.count({
      where: { user_id: req.user!.id, status: 'active' },
    });
    if (active >= 3) {
      return res.status(400).json({ success: false, error: 'Limite atteinte (3 cartes actives maximum).' });
    }
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 2);
    const card = await prisma.virtualCard.create({
      data: {
        user_id: req.user!.id,
        last4: generateLast4(),
        brand: 'virtual',
        status: 'active',
        expires_at: expires,
        spending_limit: body.spending_limit,
        external_id: `afw_vc_${crypto.randomBytes(6).toString('hex')}`,
      },
    });
    return res.status(201).json({ success: true, data: card });
  } catch (err) { return next(err); }
});

// POST /api/virtual-cards/:id/block — bloquer / débloquer
router.post('/:id/block', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const card = await prisma.virtualCard.findFirst({ where: { id, user_id: req.user!.id } });
    if (!card) return res.status(404).json({ success: false, error: 'Carte introuvable.' });
    const newStatus = card.status === 'blocked' ? 'active' : 'blocked';
    const updated = await prisma.virtualCard.update({
      where: { id },
      data: { status: newStatus },
    });
    return res.json({ success: true, data: updated });
  } catch (err) { return next(err); }
});

// PATCH /api/virtual-cards/:id/limit — changer la limite
router.patch('/:id/limit', authenticate, validateBody(limitSchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const { spending_limit } = req.body as z.infer<typeof limitSchema>;
    const card = await prisma.virtualCard.findFirst({ where: { id, user_id: req.user!.id } });
    if (!card) return res.status(404).json({ success: false, error: 'Carte introuvable.' });
    const updated = await prisma.virtualCard.update({
      where: { id },
      data: { spending_limit },
    });
    return res.json({ success: true, data: updated });
  } catch (err) { return next(err); }
});

// DELETE /api/virtual-cards/:id — supprimer (expire la carte)
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const card = await prisma.virtualCard.updateMany({
      where: { id, user_id: req.user!.id },
      data: { status: 'expired' },
    });
    if (card.count === 0) return res.status(404).json({ success: false, error: 'Carte introuvable.' });
    return res.json({ success: true });
  } catch (err) { return next(err); }
});

export default router;
