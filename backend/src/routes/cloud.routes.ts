import { Router } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { cloudService } from '../services/cloud.service.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50 MB

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const folder = req.query.folder as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const result = await cloudService.list(userId, folder, page, limit);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: { message: 'No file' } });
    const userId = req.user!.id;
    const folder = (req.body.folder as string) || '';
    const record = await cloudService.upload(userId, req.file, folder);
    res.status(201).json({ success: true, data: record });
  } catch (e) {
    next(e);
  }
});

router.delete('/:fileId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const fileId = req.params.fileId;
    await cloudService.delete(userId, fileId);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
