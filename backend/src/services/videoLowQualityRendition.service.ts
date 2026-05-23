/**
 * MP4 ~480p / bitrate bas pour connexions instables (ex. Mali). Stocké sur R2, exposé via `low_quality_url`
 * et alias API `low_quality_playback_url` (aligné feed PWA).
 * Flutter : reproduire le même champ + pipeline transcode ou job async équivalent.
 */
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../config/cloudflare-r2.js';
import { isOurCdnVideoUrl } from './videoCompatTranscode.service.js';

const FFMPEG_REMOTE_RW_TIMEOUT_US = Math.max(
  15_000_000,
  Math.round((Number(process.env.VIDEO_LOW_Q_REMOTE_RW_TIMEOUT_MS || '120000') || 120000) * 1000)
);
const LOW_Q_TIMEOUT_MS = Math.max(60_000, Number(process.env.VIDEO_LOW_Q_TIMEOUT_MS || '360000') || 360000);
const LOW_Q_PRESET = (() => {
  const v = (process.env.VIDEO_LOW_Q_PRESET || 'veryfast').toLowerCase();
  const allowed = ['ultrafast', 'superfast', 'veryfast', 'fast', 'medium'];
  return allowed.includes(v) ? v : 'veryfast';
})();
const LOW_Q_CRF = String(Math.min(51, Math.max(18, Number(process.env.VIDEO_LOW_Q_CRF || '32') || 32)));
const LOW_Q_DELAY_MS = Math.max(5000, Number(process.env.VIDEO_LOW_QUALITY_DELAY_MS || '120000') || 120000);

const inFlight = new Set<string>();

function buildLowBandwidthFilter(): string {
  const baseW = 360;
  const baseH = 640;
  const zoomW = Math.round(baseW * 1.08);
  const zoomH = Math.round(baseH * 1.08);
  return `[0:v]scale=${baseW}:${baseH}:force_original_aspect_ratio=increase,crop=${baseW}:${baseH},scale=${zoomW}:${zoomH},crop=${baseW}:${baseH},format=yuv420p[v]`;
}

function runFfmpegLowQualityUrlToFile(inputUrl: string, outputPath: string): Promise<void> {
  const vf = buildLowBandwidthFilter();
  const args = [
    '-y',
    '-nostdin',
    '-reconnect',
    '1',
    '-reconnect_streamed',
    '1',
    '-reconnect_delay_max',
    '5',
    '-rw_timeout',
    String(FFMPEG_REMOTE_RW_TIMEOUT_US),
    '-threads',
    '0',
    '-i',
    inputUrl,
    '-filter_complex',
    vf,
    '-map',
    '[v]',
    '-map',
    '0:a?',
    '-c:v',
    'libx264',
    '-preset',
    LOW_Q_PRESET,
    '-crf',
    LOW_Q_CRF,
    '-profile:v',
    'main',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '64k',
    '-ac',
    '2',
    '-movflags',
    '+faststart',
    '-f',
    'mp4',
    outputPath,
  ];
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    let stderr = '';
    let settled = false;
    const killTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill('SIGKILL');
      reject(new Error(`ffmpeg low-quality dépassé ${Math.round(LOW_Q_TIMEOUT_MS / 1000)} s`));
    }, LOW_Q_TIMEOUT_MS);
    proc.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    proc.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(killTimer);
      reject(error);
    });
    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(killTimer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg low-quality ${code}: ${stderr.slice(-600)}`));
    });
  });
}

export async function runLowQualityRenditionForPublishedVideo(videoId: string): Promise<void> {
  if (process.env.VIDEO_LOW_QUALITY_RENDITION === '0') return;
  if (!r2Client || !R2_PUBLIC_URL) return;
  if (inFlight.has(videoId)) return;
  inFlight.add(videoId);
  const tmpOut = path.join(os.tmpdir(), `afw-lowq-${videoId}-${Date.now()}.mp4`);
  try {
    const row = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, video_url: true, low_quality_url: true, media_type: true },
    });
    if (!row || (row.media_type && row.media_type !== 'video')) return;
    const src = String(row.video_url || '').trim();
    if (!src || !isOurCdnVideoUrl(src)) return;
    if (row.low_quality_url && process.env.VIDEO_LOW_QUALITY_FORCE_REGEN !== '1') return;

    await runFfmpegLowQualityUrlToFile(src, tmpOut);
    const body = await fs.readFile(tmpOut);
    if (body.length < 512) {
      logger.warn('lowQuality rendition trop petit', { videoId });
      return;
    }

    const key = `videos/${Date.now()}-loq-${crypto.randomUUID()}.mp4`;
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: 'video/mp4',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    const base = R2_PUBLIC_URL.replace(/\/+$/, '');
    const lowUrl = `${base}/${key}`;

    await prisma.video.update({
      where: { id: videoId },
      data: { low_quality_url: lowUrl, updated_at: new Date() },
    });

    logger.info('lowQuality rendition enregistrée', { videoId, bytes: body.length });
  } catch (e) {
    logger.warn('runLowQualityRenditionForPublishedVideo', {
      videoId,
      err: (e as Error)?.message || String(e),
    });
  } finally {
    inFlight.delete(videoId);
    await fs.unlink(tmpOut).catch(() => {});
  }
}

export function scheduleLowQualityRenditionAfterPublish(videoId: string): void {
  if (process.env.VIDEO_LOW_QUALITY_RENDITION === '0') return;
  setTimeout(() => {
    runLowQualityRenditionForPublishedVideo(videoId).catch((e) =>
      logger.warn('scheduleLowQualityRenditionAfterPublish', { videoId, err: String(e) })
    );
  }, LOW_Q_DELAY_MS);
}
