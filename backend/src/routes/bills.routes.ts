import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import prisma from '../config/database.js';

const router = Router();

router.post('/pay', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { bill_type, provider, account_number, customer_name, amount, payment_method, due_date, bill_period, fees } = req.body;
    if (!bill_type || !provider || !account_number || amount == null) {
      return res.status(400).json({ success: false, message: 'bill_type, provider, account_number et amount requis' });
    }
    const payment = await prisma.billPayment.create({
      data: {
        user_id: userId,
        bill_type: String(bill_type),
        provider: String(provider),
        account_number: String(account_number),
        customer_name: customer_name ?? undefined,
        amount: Number(amount),
        payment_method: ['wallet', 'mobile_money', 'card'].includes(payment_method) ? payment_method : 'wallet',
        due_date: due_date ? new Date(due_date) : undefined,
        bill_period: bill_period ?? undefined,
        fees: fees != null ? Number(fees) : 0,
        status: 'pending',
      },
    });
    res.status(201).json({ success: true, data: payment });
  } catch (e) {
    next(e);
  }
});

router.get('/payments', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const [list, total] = await Promise.all([
      prisma.billPayment.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.billPayment.count({ where: { user_id: userId } }),
    ]);
    res.json({ success: true, data: { payments: list, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
  } catch (e) {
    next(e);
  }
});

export default router;
