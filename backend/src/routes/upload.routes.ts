import { Router } from 'express';
import multer from 'multer';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL, getR2ConfigDiagnostic } from '../config/cloudflare-r2.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB
  },
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
    next(error);
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
    const originalName = req.file.originalname || 'video.mp4';
    const safeName = createSafeFilename(originalName);
    const fileName = `${Date.now()}-${safeName}`;
    
    // Stocker dans R2 avec le nom ASCII-safe
    // Le nom est déjà propre (pas d'accents, pas de caractères spéciaux)
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: `videos/${fileName}`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype || 'video/mp4',
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await r2Client.send(command);

    // Générer une miniature à partir de la vidéo si possible
    let thumbnailUrl: string | undefined;
    try {
      thumbnailUrl = await generateVideoThumbnailToR2(req.file.buffer, safeName);
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
    next(error);
  }
});

export default router;

