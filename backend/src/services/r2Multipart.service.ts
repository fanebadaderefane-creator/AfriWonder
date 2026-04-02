import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL, isR2Configured } from '../config/cloudflare-r2.js';
import { randomUUID } from 'node:crypto';
import path from 'path';

const PRESIGN_PART_SEC = 60 * 60;

function safeExt(filename: string): string {
  const ext = path.extname(filename || '').toLowerCase();
  if (!ext || ext.length > 10) return '';
  return ext.replace(/[^a-z0-9.]/g, '');
}

function kindPrefix(kind: string): string {
  const k = String(kind || '').toLowerCase();
  if (k === 'image' || k === 'photo') return 'images';
  if (k === 'video') return 'videos';
  if (k === 'audio' || k === 'voice') return 'audio';
  if (k === 'document' || k === 'file') return 'documents';
  return 'uploads';
}

export function buildObjectKey(kind: string, userId: string, filename: string): string {
  const prefix = kindPrefix(kind);
  const ext = safeExt(filename);
  return `${prefix}/${userId}/${Date.now()}-${randomUUID()}${ext || ''}`;
}

export async function createMultipartUpload(key: string, contentType: string) {
  if (!r2Client || !isR2Configured()) throw new Error('R2 non configuré');
  const out = await r2Client.send(
    new CreateMultipartUploadCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType || 'application/octet-stream',
    })
  );
  const uploadId = out.UploadId;
  if (!uploadId) throw new Error('CreateMultipartUpload: pas d\'uploadId');
  return { uploadId, key, bucket: R2_BUCKET_NAME };
}

export async function presignUploadPart(key: string, uploadId: string, partNumber: number) {
  if (!r2Client) throw new Error('R2 non configuré');
  const cmd = new UploadPartCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });
  const uploadUrl = await getSignedUrl(r2Client, cmd, { expiresIn: PRESIGN_PART_SEC });
  return { uploadUrl, partNumber, expiresIn: PRESIGN_PART_SEC };
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: Array<{ PartNumber: number; ETag: string }>
) {
  if (!r2Client) throw new Error('R2 non configuré');
  const completed = parts
    .map((p) => {
      let etag = String(p.ETag || '').trim();
      if (etag && !etag.startsWith('"')) etag = `"${etag.replace(/"/g, '')}"`;
      return { PartNumber: p.PartNumber, ETag: etag };
    })
    .sort((a, b) => a.PartNumber - b.PartNumber);

  await r2Client.send(
    new CompleteMultipartUploadCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: completed },
    })
  );

  const base = R2_PUBLIC_URL.replace(/\/+$/, '');
  const file_url = `${base}/${key}`;
  return { file_url, key };
}

export async function abortMultipartUpload(key: string, uploadId: string) {
  if (!r2Client) return;
  try {
    await r2Client.send(
      new AbortMultipartUploadCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
      })
    );
  } catch {
    /* ignore */
  }
}
