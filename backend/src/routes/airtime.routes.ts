import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import prisma from '../config/database.js';
import { validateBody } from '../utils/zodValidation.js';
import { airtimeRechargeBodySchema } from '../schemas/addressesAdsAirtime.schemas.js';

const router = Router();

router.post('/recharge', authenticate, validateBody(airtimeRechargeBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { phone_number, operator, amount, payment_method, recipient_name, is_self_recharge } = req.body;
    const recharge = await prisma.airtimeRecharge.create({
      data: {
        user_id: userId,
        phone_number: String(phone_number),
        operator: String(operator),
        amount: Number(amount),
        payment_method: payment_method ?? 'wallet',
        recipient_name: recipient_name ?? undefined,
        is_self_recharge: is_self_recharge !== false,
        status: 'pending',
      },
    });
    res.status(201).json({ success: true, data: recharge });
  } catch (e) {
    next(e);
  }
});

router.get('/recharges', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const [list, total] = await Promise.all([
      prisma.airtimeRecharge.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.airtimeRecharge.count({ where: { user_id: userId } }),
    ]);
    res.json({ success: true, data: { recharges: list, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
  } catch (e) {
    next(e);
  }
});

export default router;
