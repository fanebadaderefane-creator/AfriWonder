import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import groupCallService from '../services/groupCall.service.js';
import liveService from '../services/live.service.js';

const router = Router();

// POST /api/group-calls — créer un appel groupe (retourne room_id pour signaling)
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const type = (req.body?.type === 'audio' ? 'audio' : 'video') as 'audio' | 'video';
    const rawGid = req.body?.conversation_group_id;
    const conversation_group_id =
      typeof rawGid === 'string' && rawGid.trim() ? rawGid.trim() : undefined;
    const call = await groupCallService.create(req.user!.id, type, { conversation_group_id });
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

// GET /api/group-calls/id/:callId/token — token Agora RTC (communication) pour participants actifs
router.get('/id/:callId/token', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const callId = param(req, 'callId');
    const userId = req.user!.id;
    const { call } = await groupCallService.assertActiveParticipant(callId, userId);
    const agora = await liveService.getAgoraToken(call.room_id, userId, 'host');
    if (!agora) {
      return res.json({
        success: true,
        data: {
          agora: null,
          callType: call.type,
          message: 'Agora non configuré (AGORA_APP_ID / AGORA_APP_CERTIFICATE)',
        },
      });
    }
    res.json({ success: true, data: { agora, callType: call.type } });
  } catch (e) {
    next(e);
  }
});

// GET /api/group-calls/id/:callId — détail appel (lobby / rafraîchissement participants)
router.get('/id/:callId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const callId = param(req, 'callId');
    const call = await groupCallService.getById(callId);
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
