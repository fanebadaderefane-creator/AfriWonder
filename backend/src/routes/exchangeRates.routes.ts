import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import exchangeRateService from '../services/exchangeRate.service.js';

const router = Router();

// GET /api/exchange-rates - liste des taux de change
router.get('/', async (_req, res, next) => {
  try {
    const rates = await exchangeRateService.getAllRates();
    res.json({ success: true, data: rates });
  } catch (e) {
    next(e);
  }
});

router.get('/rates', async (_req, res, next) => {
  try {
    const rates = await exchangeRateService.getAllRates();
    res.json({ success: true, data: rates });
  } catch (e) {
    next(e);
  }
});

router.get('/convert', async (req, res, next) => {
  try {
    const amount = parseFloat(req.query.amount as string) || 0;
    const from = (req.query.from as string) || 'XOF';
    const to = (req.query.to as string) || 'XOF';
    const result = await exchangeRateService.convert(amount, from, to);
    res.json({ success: true, data: { amount, from, to, converted: result } });
  } catch (e) {
    next(e);
  }
});

router.put('/rates', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin required' });
    }
    const { from_currency, to_currency, rate } = req.body;
    const updated = await exchangeRateService.setRate(from_currency, to_currency, rate);
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

export default router;
