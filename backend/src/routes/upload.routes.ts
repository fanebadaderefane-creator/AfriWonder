import { Router, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL, getR2ConfigDiagnostic, isR2Configured } from '../config/cloudflare-r2.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { randomUUID } from 'node:crypto';
import { maybeTranscodeMp4BufferForWeb } from '../services/videoCompatTranscode.service.js';
import { z } from 'zod';
import { validateBody } from '../utils/zodValidation.js';
import * as r2Multipart from '../services/r2Multipart.service.js';
import { getSupabaseAdmin, isSupabaseStorageConfigured } from '../config/supabase.js';
import { fileSignatureMatchesMime } from '../utils/fileSignature.js';

const router = Router();

const supabasePresignSchema = z.object({
  kind: z.string().max(32).optional().default('video'),
  filename: z.string().min(1).max(500),
});

const multipartInitSchema = z.object({
  kind: z.string().max(32).optional().default('video'),
  filename: z.string().min(1).max(500),
  contentType: z.string().min(1).max(200),
});

const multipartPartUrlSchema = z.object({
  key: z.string().min(1).max(1024),
  uploadId: z.string().min(1),
  partNumber: z.number().int().min(1).max(10000),
});

const multipartStatusSchema = z.object({
  key: z.string().min(1).max(1024),
  uploadId: z.string().min(1),
});

const multipartCompleteSchema = z.object({
  key: z.string().min(1).max(1024),
  uploadId: z.string().min(1),
  parts: z
    .array(
      z.object({
        PartNumber: z.number().int().min(1),
        ETag: z.string().min(1),
      })
    )
    .min(1),
});

const multipartAbortSchema = z.object({
  key: z.string().min(1).max(1024),
  uploadId: z.string().min(1),
});

const BYTES_PER_MB = 1024 * 1024;

/** Limite messagerie / médias (Mo). Défaut relevé pour le CDC ; au-delà de ~512 Mo le buffer mémoire multer peut saturer — prévoir upload direct vers R2 en production. */
function parseUploadMaxMb(envVal: string | undefined, defaultMb: number, hardCapMb: number): number {
  const n = Number(envVal);
  if (!Number.isFinite(n) || n < 1) return defaultMb;
  return Math.min(Math.round(n), hardCapMb);
}

const MAX_MEDIA_UPLOAD_MB = parseUploadMaxMb(process.env.UPLOAD_MAX_MEDIA_MB, 600, 2048);
const MAX_DOCUMENT_UPLOAD_MB = parseUploadMaxMb(process.env.UPLOAD_MAX_DOCUMENT_MB, 300, 2048);
const PRESIGN_EXPIRES_SEC = 10 * 60;
const ALLOWED_MEDIA_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/3gpp',
  'video/3gpp2',
  'audio/webm',
  'audio/x-m4a',
  'audio/m4a',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/wav',
  'audio/ogg',
]);
const ALLOWED_DOCUMENT_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]);

function validateUploadedFileSignature(
  file: Express.Multer.File,
  category: 'media' | 'document'
): { ok: true } | { ok: false; message: string } {
  const mime = String(file?.mimetype || '').toLowerCase().trim();
  const originalName = String(file?.originalname || 'file');

  if (mime === 'text/plain') return { ok: true };

  const isAllowedMime =
    category === 'media' ? ALLOWED_MEDIA_MIME.has(mime) : ALLOWED_DOCUMENT_MIME.has(mime);
  if (!isAllowedMime) {
    return { ok: false, message: 'Type de fichier non autorise' };
  }

  if (!fileSignatureMatchesMime(file.buffer, mime)) {
    logger.warn('Upload rejecte: signature fichier incoherente', {
      category,
      mime,
      originalName,
      size: file?.size,
    });
    return {
      ok: false,
      message:
        "Le contenu du fichier ne correspond pas a son type annonce. Renommez ou reconvertissez le fichier avant l'upload.",
    };
  }

  return { ok: true };
}

function safeExtFromName(name: string): string {
  const ext = String(path.extname(name || '') || '').toLowerCase();
  if (!ext || ext.length > 10) return '';
  return ext.replace(/[^a-z0-9.]/g, '');
}

function kindToPrefix(kind: string): string {
  const k = String(kind || '').toLowerCase();
  if (k === 'image' || k === 'photo') return 'images';
  if (k === 'video') return 'videos';
  if (k === 'audio' || k === 'voice') return 'audio';
  if (k === 'document' || k === 'file') return 'documents';
  return 'uploads';
}

/**
 * Firefox refuse souvent les MP4 si R2 sert `application/octet-stream` (client presign envoie ce type par défaut).
 * On aligne le Content-Type sur l’extension pour les vidéos.
 */
function normalizePresignContentType(kind: string, filename: string, raw: string): string {
  const lower = String(raw || '').toLowerCase().trim();
  if (kindToPrefix(kind) !== 'videos') return lower || 'application/octet-stream';
  if (lower && lower !== 'application/octet-stream' && lower !== 'binary/octet-stream') return raw;
  const ext = safeExtFromName(filename).toLowerCase();
  if (ext === '.mp4' || ext === '.m4v') return 'video/mp4';
  if (ext === '.webm') return 'video/webm';
  if (ext === '.mov') return 'video/quicktime';
  if (ext === '.m3u8') return 'application/vnd.apple.mpegurl';
  return 'video/mp4';
}

/** Erreur AWS S3 / R2 (PutObject) — clés ou bucket incorrects */
function isR2AccessDenied(err: unknown): boolean {
  const e = err as { name?: string; message?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return (
    e?.name === 'AccessDenied' ||
    e?.Code === 'AccessDenied' ||
    /AccessDenied|Access Denied/i.test(String(e?.message ?? ''))
  );
}

function handleUploadStorageError(res: Response, err: unknown, next: NextFunction) {
  if (isR2AccessDenied(err)) {
    logger.error('R2 PutObject AccessDenied — vérifier clés API et permissions bucket', {
      hint: 'R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, politique du token API',
    });
    return res.status(503).json({
      success: false,
      error: {
        message:
          'Stockage média : accès refusé (Cloudflare R2). Vérifiez les variables R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME et que le token API a bien le droit d’écriture sur le bucket.',
        code: 'R2_ACCESS_DENIED',
      },
    });
  }
  next(err);
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || '').toLowerCase().trim();
    if (!ALLOWED_MEDIA_MIME.has(mime)) {
      cb(new Error('Type de fichier media non autorise'));
      return;
    }
    cb(null, true);
  },
  limits: {
    fileSize: MAX_MEDIA_UPLOAD_MB * BYTES_PER_MB,
  },
});

const uploadDocument = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || '').toLowerCase().trim();
    if (!ALLOWED_DOCUMENT_MIME.has(mime)) {
      cb(new Error('Type de document non autorise'));
      return;
    }
    cb(null, true);
  },
  limits: {
    fileSize: MAX_DOCUMENT_UPLOAD_MB * BYTES_PER_MB,
  },
});

/**
 * POST /api/upload/presign
 * Renvoie une URL pré-signée (PUT) pour upload direct vers R2 (scalable, pas de RAM serveur).
 * Body: { kind: 'video'|'audio'|'document'|'image', filename, contentType }
 * Response: { uploadUrl, file_url, key, expires_in }
 */
router.post('/presign', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!isR2Configured() || !r2Client || !R2_PUBLIC_URL) {
      const missing = getR2ConfigDiagnostic();
      return res.status(503).json({
        success: false,
        error: { message: 'Stockage R2 non configuré', code: 'R2_NOT_CONFIGURED', missing },
      });
    }

    const kind = String(req.body?.kind || 'uploads');
    const filename = String(req.body?.filename || '');
    const contentType = normalizePresignContentType(
      kind,
      filename,
      String(req.body?.contentType || 'application/octet-stream')
    );
    const prefix = kindToPrefix(kind);
    const ext = safeExtFromName(filename);
    const userId = String(req.user?.id || 'user');
    const now = Date.now();
    const key = `${prefix}/${userId}/${now}-${randomUUID()}${ext || ''}`;

    const cmd = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      ACL: 'public-read' as any,
      Metadata: {
        uploader_user_id: userId,
        kind: String(prefix),
        original_name: filename ? filename.slice(0, 160) : '',
      },
    });

    const uploadUrl = await getSignedUrl(r2Client, cmd, { expiresIn: PRESIGN_EXPIRES_SEC });
    const base = R2_PUBLIC_URL.replace(/\/+$/, '');
    const file_url = `${base}/${key}`;

    return res.json({
      success: true,
      data: { uploadUrl, file_url, key, expires_in: PRESIGN_EXPIRES_SEC },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/upload/supabase/presign
 * Upload direct vers Supabase Storage (migration Phase 1) — PUT sur signedUrl, puis file_url publique si bucket public.
 */
router.post('/supabase/presign', authenticate, validateBody(supabasePresignSchema), async (req: AuthRequest, res, next) => {
  try {
    if (!isSupabaseStorageConfigured()) {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Supabase Storage non configuré (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET)',
          code: 'SUPABASE_STORAGE_NOT_CONFIGURED',
        },
      });
    }
    const admin = getSupabaseAdmin();
    const bucket = String(process.env.SUPABASE_STORAGE_BUCKET || '').trim();
    if (!admin || !bucket) {
      return res.status(503).json({ success: false, error: { message: 'Client Supabase indisponible' } });
    }

    const userId = String(req.user?.id || 'user');
    const { kind, filename } = req.body as z.infer<typeof supabasePresignSchema>;
    const prefix = kindToPrefix(kind);
    const ext = safeExtFromName(filename);
    const objectPath = `${prefix}/${userId}/${Date.now()}-${randomUUID()}${ext || ''}`;

    const signed = await admin.storage.from(bucket).createSignedUploadUrl(objectPath, { upsert: true });
    if (signed.error || !signed.data) {
      logger.error('Supabase createSignedUploadUrl', { message: signed.error?.message });
      return res.status(502).json({
        success: false,
        error: { message: signed.error?.message || 'Erreur Supabase Storage' },
      });
    }

    const { data: pub } = admin.storage.from(bucket).getPublicUrl(objectPath);

    return res.json({
      success: true,
      data: {
        signedUrl: signed.data.signedUrl,
        token: signed.data.token,
        path: signed.data.path,
        bucket,
        /** URL publique si le bucket est public ; sinon utiliser signedUrl côté lecture */
        file_url: pub.publicUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Crée un nom de fichier ASCII-safe à partir d'un nom original
 * Transforme les accents en ASCII et supprime les caractères spéciaux
 * Exemple: "Les soninké ont été à l'honneur.mp4" -> "les_soninke_ont_ete_a_l_honneur.mp4"
 * 
 * ⚠️ IMPORTANT : Ne jamais convertir latin1 → utf8 (multer donne déjà UTF-8 correct)
 * ⚠️ Ne jamais stocker d'accents sur un CDN (causes MEDIA_ERR_SRC_NOT_SUPPORTED)
 */
function createSafeFilename(originalName: string): string {
  if (!originalName) return 'file';

  const lastDot = originalName.lastIndexOf('.');
  const extension = lastDot !== -1 ? originalName.slice(lastDot) : '';
  const nameWithoutExt = lastDot !== -1 ? originalName.slice(0, lastDot) : originalName;

  // 1️⃣ Normaliser Unicode (décompose accents)
  let safe = nameWithoutExt.normalize('NFD');

  // 2️⃣ Supprimer les accents (combining marks)
  safe = safe.replace(/[\u0300-\u036f]/g, '');

  // 3️⃣ Remplacer tout caractère non ASCII safe
  safe = safe
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

  if (!safe) safe = 'file';

  return safe + extension.toLowerCase();
}

async function generateVideoThumbnailToR2(fileBuffer: Buffer, safeName: string): Promise<string | undefined> {
  if (!r2Client || !R2_PUBLIC_URL) return undefined;

  const tmpDir = os.tmpdir();
  const baseName = safeName.replace(/\.[^/.]+$/, '');
  const inputPath = path.join(tmpDir, `${Date.now()}-${baseName}-src.tmp`);
  const outputPath = path.join(tmpDir, `${Date.now()}-${baseName}-thumb.jpg`);

  try {
    await fs.promises.writeFile(inputPath, fileBuffer);

    const ffmpegArgs = [
      '-y',
      '-i', inputPath,
      '-ss', '00:00:01.000',
      '-vframes', '1',
      '-vf', 'scale=720:-1:force_original_aspect_ratio=decrease',
      outputPath,
    ];

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('ffmpeg', ffmpegArgs);
      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
    });

    const thumbBuffer = await fs.promises.readFile(outputPath);
    const thumbFileName = `${Date.now()}-${baseName}-thumb.jpg`;
    const thumbKey = `thumbnails/${thumbFileName}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: thumbKey,
      Body: thumbBuffer,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await r2Client.send(command);

    const encodedThumbName = encodeURIComponent(thumbFileName);
    const thumbUrl = `${R2_PUBLIC_URL}/thumbnails/${encodedThumbName}`;
    return thumbUrl;
  } catch (err) {
    logger.warn('Thumbnail generation from video failed', { err: (err as Error)?.message || String(err) });
    return undefined;
  } finally {
    fs.promises.unlink(inputPath).catch(() => {});
    fs.promises.unlink(outputPath).catch(() => {});
  }
}

router.post('/image', authenticate, upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    if (!r2Client || !R2_PUBLIC_URL) {
      const why = getR2ConfigDiagnostic();
      if (!R2_PUBLIC_URL.trim()) why.push('R2_PUBLIC_URL (vide ou absent)');
      logger.warn('Upload image refusé: R2 non configuré', { missing: why });
      return res.status(503).json({ error: 'Upload non disponible : R2 non configuré (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL)' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileValidation = validateUploadedFileSignature(req.file, 'media');
    if (!fileValidation.ok) {
      return res.status(400).json({ success: false, error: fileValidation.message });
    }

    // Créer un nom de fichier ASCII-safe (évite les problèmes d'encodage)
    const originalName = req.file.originalname || 'image.jpg';
    const safeName = createSafeFilename(originalName);
    const fileName = `${Date.now()}-${safeName}`;
    
    // Stocker dans R2 avec le nom propre
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: `images/${fileName}`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await r2Client.send(command);

    // Encoder UNE SEULE FOIS l'URL
    const encodedFileName = encodeURIComponent(fileName);
    const fileUrl = `${R2_PUBLIC_URL}/images/${encodedFileName}`;

    res.json({
      success: true,
      data: {
        file_url: fileUrl,
      },
    });
  } catch (error) {
    return handleUploadStorageError(res, error, next);
  }
});

router.post('/video', authenticate, upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    if (!r2Client || !R2_PUBLIC_URL) {
      const why = getR2ConfigDiagnostic();
      if (!R2_PUBLIC_URL.trim()) why.push('R2_PUBLIC_URL (vide ou absent)');
      logger.warn('Upload vidéo refusé: R2 non configuré', { missing: why });
      return res.status(503).json({ error: 'Upload non disponible : R2 non configuré (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL)' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Créer un nom de fichier ASCII-safe (évite les problèmes d'encodage)
    // ⚠️ IMPORTANT : Ne jamais garder les accents dans les noms de fichiers CDN
    // Cela cause des erreurs MEDIA_ERR_SRC_NOT_SUPPORTED (errorCode: 4)
    const fileValidation = validateUploadedFileSignature(req.file, 'media');
    if (!fileValidation.ok) {
      return res.status(400).json({ success: false, error: fileValidation.message });
    }
    const originalName = req.file.originalname || 'video.mp4';
    const safeName = createSafeFilename(originalName);
    const fileName = `${Date.now()}-${safeName}`;

    const mime = (req.file.mimetype || '').toLowerCase();
    const ext = path.extname(safeName).toLowerCase();
    const looksLikeMp4Family =
      mime.includes('mp4') || mime.includes('quicktime') || ['.mp4', '.m4v', '.mov'].includes(ext);

    let uploadBody: Buffer = req.file.buffer;
    let uploadContentType = (req.file.mimetype || '').trim() || 'video/mp4';
    if (looksLikeMp4Family) {
      const ctLow = uploadContentType.toLowerCase();
      if (!ctLow || ctLow === 'application/octet-stream') {
        uploadContentType = 'video/mp4';
      }
      uploadBody = await maybeTranscodeMp4BufferForWeb(req.file.buffer, safeName);
      if (uploadBody !== req.file.buffer) {
        uploadContentType = 'video/mp4';
      }
    }

    // Stocker dans R2 avec le nom ASCII-safe
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: `videos/${fileName}`,
      Body: uploadBody,
      ContentType: uploadContentType,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await r2Client.send(command);

    // Générer une miniature à partir de la vidéo si possible
    let thumbnailUrl: string | undefined;
    try {
      thumbnailUrl = await generateVideoThumbnailToR2(uploadBody, safeName);
    } catch {
      thumbnailUrl = undefined;
    }

    // Encoder l'URL (même si le nom est déjà safe, c'est une bonne pratique)
    const encodedFileName = encodeURIComponent(fileName);
    const fileUrl = `${R2_PUBLIC_URL}/videos/${encodedFileName}`;

    res.json({
      success: true,
      data: {
        file_url: fileUrl,
        thumbnail_url: thumbnailUrl,
      },
    });
  } catch (error) {
    return handleUploadStorageError(res, error, next);
  }
});

/** Vocaux / messages audio — pas de miniature vidéo (évite ffmpeg sur du webm/opus). */
/** Documents (PDF, Office, etc.) — clé R2 `documents/`. */
router.post('/document', authenticate, uploadDocument.single('file'), async (req: AuthRequest, res, next) => {
  try {
    if (!r2Client || !R2_PUBLIC_URL) {
      const why = getR2ConfigDiagnostic();
      if (!R2_PUBLIC_URL.trim()) why.push('R2_PUBLIC_URL (vide ou absent)');
      logger.warn('Upload document refusé: R2 non configuré', { missing: why });
      return res.status(503).json({ error: 'Upload non disponible : R2 non configuré (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL)' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileValidation = validateUploadedFileSignature(req.file, 'document');
    if (!fileValidation.ok) {
      return res.status(400).json({ success: false, error: fileValidation.message });
    }
    const originalName = req.file.originalname || 'document.bin';
    const safeName = createSafeFilename(originalName);
    const fileName = `${Date.now()}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: `documents/${fileName}`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype || 'application/octet-stream',
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await r2Client.send(command);

    const encodedFileName = encodeURIComponent(fileName);
    const fileUrl = `${R2_PUBLIC_URL}/documents/${encodedFileName}`;

    res.json({
      success: true,
      data: {
        file_url: fileUrl,
        original_name: originalName,
      },
    });
  } catch (error) {
    return handleUploadStorageError(res, error, next);
  }
});

router.post('/audio', authenticate, upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    if (!r2Client || !R2_PUBLIC_URL) {
      const why = getR2ConfigDiagnostic();
      if (!R2_PUBLIC_URL.trim()) why.push('R2_PUBLIC_URL (vide ou absent)');
      logger.warn('Upload audio refusé: R2 non configuré', { missing: why });
      return res.status(503).json({ error: 'Upload non disponible : R2 non configuré (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL)' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileValidation = validateUploadedFileSignature(req.file, 'media');
    if (!fileValidation.ok) {
      return res.status(400).json({ success: false, error: fileValidation.message });
    }
    const originalName = req.file.originalname || 'voice.webm';
    const safeName = createSafeFilename(originalName);
    const fileName = `${Date.now()}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: `voice/${fileName}`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype || 'audio/webm',
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await r2Client.send(command);

    const encodedFileName = encodeURIComponent(fileName);
    const fileUrl = `${R2_PUBLIC_URL}/voice/${encodedFileName}`;

    res.json({
      success: true,
      data: {
        file_url: fileUrl,
      },
    });
  } catch (error) {
    return handleUploadStorageError(res, error, next);
  }
});

/**
 * Multipart upload Cloudflare R2 (S3-compatible) — gros fichiers / faible mémoire.
 */
router.post('/multipart/init', authenticate, validateBody(multipartInitSchema), async (req: AuthRequest, res, next) => {
  try {
    if (!isR2Configured() || !r2Client) {
      return res.status(503).json({
        success: false,
        error: { message: 'R2 non configuré', code: 'R2_NOT_CONFIGURED', missing: getR2ConfigDiagnostic() },
      });
    }
    const userId = String(req.user?.id || 'user');
    const { kind, filename, contentType } = req.body as z.infer<typeof multipartInitSchema>;
    const key = r2Multipart.buildObjectKey(kind, userId, filename);
    const ct = normalizePresignContentType(kind, filename, contentType);
    const out = await r2Multipart.createMultipartUpload(key, ct);
    logger.info('Multipart upload initialisé', {
      userId,
      kind,
      key,
      uploadId: out.uploadId,
      contentType: ct,
    });
    return res.json({ success: true, data: { ...out, contentType: ct } });
  } catch (err) {
    return handleUploadStorageError(res, err, next);
  }
});

router.post('/multipart/part-url', authenticate, validateBody(multipartPartUrlSchema), async (req: AuthRequest, res, next) => {
  try {
    if (!isR2Configured() || !r2Client) {
      return res.status(503).json({ success: false, error: { message: 'R2 non configuré' } });
    }
    const { key, uploadId, partNumber } = req.body as z.infer<typeof multipartPartUrlSchema>;
    const data = await r2Multipart.presignUploadPart(key, uploadId, partNumber);
    return res.json({ success: true, data });
  } catch (err) {
    return handleUploadStorageError(res, err, next);
  }
});

router.post('/multipart/status', authenticate, validateBody(multipartStatusSchema), async (req: AuthRequest, res, next) => {
  try {
    if (!isR2Configured() || !r2Client) {
      return res.status(503).json({ success: false, error: { message: 'R2 non configuré' } });
    }
    const { key, uploadId } = req.body as z.infer<typeof multipartStatusSchema>;
    const data = await r2Multipart.listMultipartUploadedParts(key, uploadId);
    return res.json({ success: true, data });
  } catch (err) {
    return handleUploadStorageError(res, err, next);
  }
});

router.post('/multipart/complete', authenticate, validateBody(multipartCompleteSchema), async (req: AuthRequest, res, next) => {
  try {
    if (!isR2Configured() || !r2Client) {
      return res.status(503).json({ success: false, error: { message: 'R2 non configuré' } });
    }
    const { key, uploadId, parts } = req.body as z.infer<typeof multipartCompleteSchema>;
    const data = await r2Multipart.completeMultipartUpload(key, uploadId, parts);
    logger.info('Multipart upload complété', {
      userId: String(req.user?.id || ''),
      key,
      uploadId,
      partsCount: parts.length,
      fileUrl: data.file_url,
    });
    return res.json({ success: true, data });
  } catch (err) {
    return handleUploadStorageError(res, err, next);
  }
});

router.post('/multipart/abort', authenticate, validateBody(multipartAbortSchema), async (req: AuthRequest, res, next) => {
  try {
    const { key, uploadId } = req.body as z.infer<typeof multipartAbortSchema>;
    await r2Multipart.abortMultipartUpload(key, uploadId);
    logger.warn('Multipart upload aborté', {
      userId: String(req.user?.id || ''),
      key,
      uploadId,
    });
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
