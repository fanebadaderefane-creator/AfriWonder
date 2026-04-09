import { Router } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { cloudService } from '../services/cloud.service.js';
import { fileSignatureMatchesMime } from '../utils/fileSignature.js';
import { logger } from '../utils/logger.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50 MB

/** Aligné sur upload.routes (médias + PDF) — cloud = stockage utilisateur général. */
const CLOUD_ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/webm',
  'audio/mpeg',
  'application/pdf',
]);

function validateCloudUpload(file: Express.Multer.File): { ok: true } | { ok: false; message: string } {
  const mime = String(file?.mimetype || '').toLowerCase().trim();
  if (!CLOUD_ALLOWED_MIME.has(mime)) {
    return { ok: false, message: 'Type de fichier non autorise pour le cloud' };
  }
  if (!fileSignatureMatchesMime(file.buffer, mime)) {
    logger.warn('cloud upload: signature incoherente', { mime, size: file?.size });
    return {
      ok: false,
      message:
        "Le contenu du fichier ne correspond pas a son type annonce. Reconvertissez le fichier avant l'upload.",
    };
  }
  return { ok: true };
}

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
    const check = validateCloudUpload(req.file);
    if (!check.ok) {
      return res.status(400).json({ success: false, error: { message: check.message } });
    }
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
    const fileId = typeof req.params.fileId === 'string' ? req.params.fileId : req.params.fileId?.[0];
    if (!fileId) return res.status(400).json({ success: false, error: { message: 'fileId requis' } });
    await cloudService.delete(userId, fileId);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
