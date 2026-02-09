import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import sellerProfileService from '../services/sellerProfile.service.js';

const router = Router();

// GET /api/seller-profile/me — Mon profil vendeur
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const profile = await sellerProfileService.getByUserId(userId);
    res.json({ success: true, data: profile });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/seller-profile — Devenir vendeur (créer le compte vendeur)
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const profile = await sellerProfileService.register(userId, req.body);
    res.status(201).json({ success: true, data: profile, message: 'Compte vendeur créé' });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/seller-profile — Mettre à jour mon profil vendeur
router.put('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const profile = await sellerProfileService.update(userId, req.body);
    res.json({ success: true, data: profile });
  } catch (error: any) {
    next(error);
  }
});

export default router;
