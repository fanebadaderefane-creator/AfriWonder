import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

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
router.post('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const creatorId = req.user!.id;
    const { brand_name, amount, currency, campaign_id, notes, deliverables, brief_url, brand_user_id, platform_fee_pct } =
      req.body || {};
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
        deliverables: deliverables !== undefined ? deliverables : undefined,
        brief_url: brief_url != null ? String(brief_url).trim() : undefined,
        brand_user_id: brand_user_id != null ? String(brand_user_id).trim() : undefined,
        platform_fee_pct:
          platform_fee_pct != null && !Number.isNaN(Number(platform_fee_pct)) ? Number(platform_fee_pct) : 0.1,
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
router.patch('/:id', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user!.id;
    const { brand_name, amount, currency, campaign_id, notes, status, deliverables, brief_url, brand_user_id, platform_fee_pct } =
      req.body || {};
    const existing = await prisma.brandDeal.findFirst({ where: { id, creator_id: userId } });
    if (!existing) return res.status(404).json({ success: false, error: { message: 'Non trouvé' } });
    const data: Record<string, unknown> = {};
    if (brand_name !== undefined) data.brand_name = String(brand_name).trim();
    if (amount !== undefined) data.amount = Number(amount);
    if (currency !== undefined) data.currency = currency;
    if (campaign_id !== undefined) data.campaign_id = campaign_id;
    if (notes !== undefined) data.notes = notes;
    if (deliverables !== undefined) data.deliverables = deliverables;
    if (brief_url !== undefined) data.brief_url = brief_url != null ? String(brief_url).trim() : null;
    if (brand_user_id !== undefined) data.brand_user_id = brand_user_id != null ? String(brand_user_id).trim() : null;
    if (platform_fee_pct !== undefined && !Number.isNaN(Number(platform_fee_pct))) data.platform_fee_pct = Number(platform_fee_pct);
    if (
      status !== undefined &&
      ['pending', 'active', 'completed', 'rejected', 'draft', 'signed', 'delivered', 'paid'].includes(status)
    ) {
      data.status = status;
    }
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
