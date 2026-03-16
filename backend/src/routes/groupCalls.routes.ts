import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import groupCallService from '../services/groupCall.service.js';

const router = Router();

// POST /api/group-calls — créer un appel groupe (retourne room_id pour signaling)
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const type = (req.body?.type === 'audio' ? 'audio' : 'video') as 'audio' | 'video';
    const call = await groupCallService.create(req.user!.id, type);
    res.status(201).json({ success: true, data: call });
  } catch (e: any) {
    next(e);
  }
});

// GET /api/group-calls/room/:roomId — infos appel par room_id
router.get('/room/:roomId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const roomId = param(req, 'roomId');
    const call = await groupCallService.getByRoomId(roomId);
    if (!call) return res.status(404).json({ success: false, error: { message: 'Appel non trouvé' } });
    res.json({ success: true, data: call });
  } catch (e) {
    next(e);
  }
});

// POST /api/group-calls/:callId/join
router.post('/:callId/join', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const callId = param(req, 'callId');
    const result = await groupCallService.join(callId, req.user!.id);
    res.json({ success: true, data: result });
  } catch (e: any) {
    next(e);
  }
});

// POST /api/group-calls/:callId/leave
router.post('/:callId/leave', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const callId = param(req, 'callId');
    const result = await groupCallService.leave(callId, req.user!.id);
    res.json({ success: true, data: result });
  } catch (e: any) {
    next(e);
  }
});

export default router;
