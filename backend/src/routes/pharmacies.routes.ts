import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const city = req.query.city as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const where: Record<string, unknown> = {};
    if (city) where.city = { contains: city, mode: 'insensitive' };
    const [pharmacies, total] = await Promise.all([
      prisma.pharmacy.findMany({
        where,
        orderBy: { rating: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.pharmacy.count({ where }),
    ]);
    res.json({ success: true, data: { pharmacies, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = param(req, 'id');
    const pharmacy = await prisma.pharmacy.findUnique({ where: { id } });
    if (!pharmacy) return res.status(404).json({ success: false, message: 'Pharmacie non trouvée' });
    res.json({ success: true, data: pharmacy });
  } catch (e) {
    next(e);
  }
});

router.post('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { name, address, phone, city, opening_hours } = req.body;
    if (!name || !address || !phone) return res.status(400).json({ success: false, message: 'name, address et phone requis' });
    const pharmacy = await prisma.pharmacy.create({
      data: {
        name,
        address,
        phone,
        owner_id: userId,
        city: city ?? undefined,
        opening_hours: opening_hours ?? undefined,
      },
    });
    res.status(201).json({ success: true, data: pharmacy });
  } catch (e) {
    next(e);
  }
});

export default router;
