import fs from 'fs/promises';
import path from 'path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL, isR2Configured } from '../config/cloudflare-r2.js';
import { logger } from '../utils/logger.js';

/** Stockage indisponible (R2 absent et repli local dev désactivé). */
export class MediaStorageUnavailableError extends Error {
  readonly code = 'MEDIA_STORAGE_UNAVAILABLE';
  constructor() {
    super('Stockage média indisponible');
    this.name = 'MediaStorageUnavailableError';
  }
}

/** Autorise l’écriture disque locale pour les DM en dev (sans Cloudflare R2). */
export function isLocalDevMediaUploadEnabled(): boolean {
  const forced = String(process.env.ALLOW_LOCAL_DM_UPLOAD || '').toLowerCase();
  if (forced === '1' || forced === 'true' || forced === 'yes') return true;
  if (forced === '0' || forced === 'false' || forced === 'no') return false;
  return process.env.NODE_ENV !== 'production';
}

export function resolvePublicBackendOrigin(): string {
  const fromEnv = (process.env.PUBLIC_BACKEND_URL || process.env.BACKEND_PUBLIC_URL || '').trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  const port = String(process.env.PORT || '3000');
  return `http://localhost:${port}`;
}

const LOCAL_ROOT = path.join(process.cwd(), '.data', 'local-uploads');

export type MediaUploadFolder = 'images' | 'videos' | 'voice' | 'documents';

/**
 * Persiste un buffer média sur R2 (prod) ou sur disque local (dev) et renvoie une URL HTTP(S) publique.
 */
export async function persistUploadedMediaBuffer(input: {
  buffer: Buffer;
  folder: MediaUploadFolder;
  safeFileName: string;
  contentType: string;
}): Promise<string> {
  if (isR2Configured() && r2Client) {
    const fileName = `${Date.now()}-${input.safeFileName}`;
    const key = `${input.folder}/${fileName}`;
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: input.buffer,
        ContentType: input.contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    const encodedFileName = encodeURIComponent(fileName);
    const base = R2_PUBLIC_URL.replace(/\/+$/, '');
    const publicFolder = input.folder === 'voice' ? 'voice' : input.folder;
    return `${base}/${publicFolder}/${encodedFileName}`;
  }

  if (!isLocalDevMediaUploadEnabled()) {
    throw new MediaStorageUnavailableError();
  }

  const fileName = `${Date.now()}-${randomUUID()}-${input.safeFileName}`;
  const rel = `${input.folder}/${fileName}`;
  const abs = path.join(LOCAL_ROOT, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, input.buffer);
  logger.info('Média DM enregistré localement (dev)', { rel, bytes: input.buffer.length });
  const urlPath = rel.split(path.sep).join('/');
  return `${resolvePublicBackendOrigin()}/api/local-uploads/${urlPath}`;
}

/** Les messages DM ne doivent référencer que des URLs réseau persistantes (pas blob:/file:). */
export function assertPersistableMediaUrl(mediaUrl: string): void {
  const u = mediaUrl.trim();
  if (!/^https?:\/\//i.test(u)) {
    throw new Error('URL média invalide : une adresse http(s) publique est requise');
  }
}
