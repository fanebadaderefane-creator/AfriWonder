import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import * as addressService from '../services/address.service.js';
import { validateBody } from '../utils/zodValidation.js';
import { addressCreateBodySchema, addressUpdateBodySchema } from '../schemas/addressesAdsAirtime.schemas.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const list = await addressService.listByUser(req.user!.id);
    res.json({ success: true, data: list });
  } catch (e) {
    next(e);
  }
});

router.post('/', authenticate, validateBody(addressCreateBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { street, city, country, postal_code, phone, type, is_default } = req.body;
    const address = await addressService.create(req.user!.id, {
      street,
      city,
      country,
      postal_code,
      phone,
      type,
      is_default,
    });
    res.status(201).json({ success: true, data: address });
  } catch (e) {
    next(e);
  }
});

router.put('/:id', authenticate, validateBody(addressUpdateBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { street, city, country, postal_code, phone, type, is_default } = req.body;
    const address = await addressService.update(param(req, 'id'), req.user!.id, {
      street,
      city,
      country,
      postal_code,
      phone,
      type,
      is_default,
    });
    res.json({ success: true, data: address });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await addressService.remove(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) {
    next(e);
  }
});

export default router;
