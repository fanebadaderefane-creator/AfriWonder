import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import e2eeService from '../services/e2ee.service.js';

const router = Router();

router.use(authenticate);

// POST /api/e2ee/devices/register
router.post('/devices/register', async (req: AuthRequest, res, next) => {
  try {
    const result = await e2eeService.registerDevice(req.user!.id, req.body || {});
    res.status(201).json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/e2ee/devices/my
router.get('/devices/my', async (req: AuthRequest, res, next) => {
  try {
    const result = await e2eeService.getMyDevices(req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/e2ee/devices/public/:userId
router.get('/devices/public/:userId', async (req: AuthRequest, res, next) => {
  try {
    const result = await e2eeService.getUserPublicDevices(param(req, 'userId'));
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/e2ee/prekeys/upload
router.post('/prekeys/upload', async (req: AuthRequest, res, next) => {
  try {
    const result = await e2eeService.uploadPrekeys(req.user!.id, req.body || {});
    res.status(201).json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/e2ee/prekeys/health?deviceId=...
router.get('/prekeys/health', async (req: AuthRequest, res, next) => {
  try {
    const result = await e2eeService.getPrekeyHealth(req.user!.id, String(req.query.deviceId || ''));
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/e2ee/devices/rotate-signed-prekey
router.post('/devices/rotate-signed-prekey', async (req: AuthRequest, res, next) => {
  try {
    const result = await e2eeService.rotateSignedPrekey(req.user!.id, req.body || {});
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/e2ee/prekeys/consume
router.post('/prekeys/consume', async (req: AuthRequest, res, next) => {
  try {
    const prekeyRowId = req.body?.prekeyRowId || req.body?.prekey_row_id;
    const result = await e2eeService.consumePrekey(prekeyRowId, req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/e2ee/bundle/:userId
router.get('/bundle/:userId', async (req: AuthRequest, res, next) => {
  try {
    const result = await e2eeService.getBundle(param(req, 'userId'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/e2ee/messages/envelope
router.post('/messages/envelope', async (req: AuthRequest, res, next) => {
  try {
    const result = await e2eeService.storeEnvelope(req.user!.id, req.body || {});
    res.status(201).json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/e2ee/messages/sync
router.get('/messages/sync', async (req: AuthRequest, res, next) => {
  try {
    const result = await e2eeService.syncEnvelopes(req.user!.id, {
      deviceId: req.query.deviceId as string,
      since: req.query.since as string,
      limit: Number(req.query.limit || 100),
      conversationId: req.query.conversationId as string,
      groupId: req.query.groupId as string,
    });
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
});

export default router;
