import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';

const router = Router();

// GET /api/brand-deals — mes collaborations (créateur)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const creatorId = req.user!.id;
    const page = Math.max(1, parseInt(String(req.query.page || 1), 10));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || 20), 10)));
    const status = req.query.status as string | undefined;

    const where: { creator_id: string; status?: string } = { creator_id: creatorId };
    if (status && ['pending', 'active', 'completed', 'rejected'].includes(status)) where.status = status;

    const [deals, total] = await Promise.all([
      prisma.brandDeal.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.brandDeal.count({ where }),
    ]);

    res.json({
      success: true,
      data: { deals, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/brand-deals — créer (créateur enregistre une collaboration)
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const creatorId = req.user!.id;
    const { brand_name, amount, currency, campaign_id, notes } = req.body || {};
    if (!brand_name || !String(brand_name).trim()) {
      return res.status(400).json({ success: false, error: { message: 'brand_name requis' } });
    }
    const deal = await prisma.brandDeal.create({
      data: {
        creator_id: creatorId,
        brand_name: String(brand_name).trim(),
        amount: amount != null ? Number(amount) : undefined,
        currency: currency ?? undefined,
        campaign_id: campaign_id ?? undefined,
        notes: notes ?? undefined,
        status: 'pending',
      },
    });
    res.status(201).json({ success: true, data: deal });
  } catch (e) {
    next(e);
  }
});

// GET /api/brand-deals/:id
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const deal = await prisma.brandDeal.findFirst({
      where: { id, creator_id: userId },
    });
    if (!deal) return res.status(404).json({ success: false, error: { message: 'Non trouvé' } });
    res.json({ success: true, data: deal });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/brand-deals/:id
router.patch('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const { brand_name, amount, currency, campaign_id, notes, status } = req.body || {};
    const existing = await prisma.brandDeal.findFirst({ where: { id, creator_id: userId } });
    if (!existing) return res.status(404).json({ success: false, error: { message: 'Non trouvé' } });
    const data: Record<string, unknown> = {};
    if (brand_name !== undefined) data.brand_name = String(brand_name).trim();
    if (amount !== undefined) data.amount = Number(amount);
    if (currency !== undefined) data.currency = currency;
    if (campaign_id !== undefined) data.campaign_id = campaign_id;
    if (notes !== undefined) data.notes = notes;
    if (status !== undefined && ['pending', 'active', 'completed', 'rejected'].includes(status)) data.status = status;
    const updated = await prisma.brandDeal.update({
      where: { id },
      data: data as any,
    });
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/brand-deals/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const existing = await prisma.brandDeal.findFirst({ where: { id, creator_id: userId } });
    if (!existing) return res.status(404).json({ success: false, error: { message: 'Non trouvé' } });
    await prisma.brandDeal.delete({ where: { id } });
    res.json({ success: true, message: 'Supprimé' });
  } catch (e) {
    next(e);
  }
});

export default router;
