import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import directCallService from '../services/directCall.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// POST /api/calls/initiate - Initier un appel payant
router.post('/initiate', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { receiverId, phone, estimatedDuration } = req.body;

    if (!receiverId || !phone) {
      return res.status(400).json({
        success: false,
        error: { message: 'receiverId et phone requis' },
      });
    }

    const result = await directCallService.initiateCall(userId, receiverId, {
      phone,
      estimatedDuration,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Appel initié. Redirigez vers paymentUrl pour compléter le paiement.',
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/calls/:id/end - Terminer un appel
router.post('/:id/end', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const callId = param(req, 'id');
    const { duration } = req.body; // Durée en secondes

    if (!duration) {
      return res.status(400).json({
        success: false,
        error: { message: 'duration requis (en secondes)' },
      });
    }

    const result = await directCallService.endCall(callId, duration);

    res.json({
      success: true,
      data: result,
      message: 'Appel terminé et paiement traité',
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

