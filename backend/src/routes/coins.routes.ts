import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import coinsService from '../services/coins.service.js';
import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

router.get('/packages', async (_req, res, next) => {
  try {
    const packages = await coinsService.listPackages();
    res.json({ success: true, data: { packages } });
  } catch (e) {
    next(e);
  }
});

router.get('/economy', (_req, res) => {
  res.json({ success: true, data: coinsService.getCoinEconomyInfo() });
});

router.post('/exchange-to-fcfa', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const raw = (req.body || {}).coins ?? (req.body || {}).amount;
    const coins = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
    const data = await coinsService.exchangeCoinsToSellerFcfa(req.user!.id, coins);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/balance', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = await coinsService.getBalance(req.user!.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/purchase', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { packageId, payment_method, phone, returnUrl } = req.body || {};
    if (!packageId) {
      return res.status(400).json({ success: false, error: 'packageId requis' });
    }
    const data = await coinsService.initiatePurchase(req.user!.id, {
      packageId: String(packageId),
      payment_method: payment_method,
      phone,
      returnUrl,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/purchase/status/:referenceId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = await coinsService.getPurchaseStatus(req.params.referenceId, req.user!.id);
    if (!data) return res.status(404).json({ success: false, error: 'Transaction coins introuvable' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/purchase/confirm', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { referenceId } = req.body || {};
    if (!referenceId) return res.status(400).json({ success: false, error: 'referenceId requis' });
    const data = await coinsService.confirmPurchase(String(referenceId), req.user!.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/history', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(String(req.query.page || 1), 10) || 1;
    const limit = parseInt(String(req.query.limit || 20), 10) || 20;
    const data = await coinsService.getHistory(req.user!.id, page, limit);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/missions/daily-coins', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = await coinsService.claimDailyCoinsMission(req.user!.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/** E — IAP : crédit idempotent sur `transaction_id` ; en prod valider les reçus App Store / Play avant crédit. */
router.post('/iap/credit', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { transaction_id, platform, package_id } = (req.body || {}) as Record<string, unknown>;
    if (!transaction_id || !package_id) {
      return res.status(400).json({ success: false, error: 'transaction_id et package_id requis' });
    }
    const plat = String(platform) === 'ios' ? 'ios' : 'android';
    const data = await coinsService.creditIapCoinPurchase(req.user!.id, {
      transaction_id: String(transaction_id),
      platform: plat,
      package_id: String(package_id),
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
