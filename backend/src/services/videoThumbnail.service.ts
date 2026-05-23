import { spawn } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../config/cloudflare-r2.js';

const FFMPEG_REMOTE_RW_TIMEOUT_US = Math.max(
  15_000_000,
  Math.round((Number(process.env.VIDEO_THUMB_REMOTE_RW_TIMEOUT_MS || '60000') || 60000) * 1000)
);
const THUMB_TIMEOUT_MS = Math.max(20_000, Number(process.env.VIDEO_THUMB_TIMEOUT_MS || '90000') || 90000);

function runFfmpegThumbFromUrlToFile(inputUrl: string, outputPath: string, timeSec: number): Promise<void> {
  const seek = Math.max(0, Math.floor(timeSec));
  const args = [
    '-y',
    '-nostdin',
    '-hide_banner',
    '-loglevel',
    'error',
    '-reconnect',
    '1',
    '-reconnect_streamed',
    '1',
    '-reconnect_delay_max',
    '5',
    '-rw_timeout',
    String(FFMPEG_REMOTE_RW_TIMEOUT_US),
    // Fast seek for remote inputs
    '-ss',
    String(seek),
    '-i',
    inputUrl,
    '-frames:v',
    '1',
    '-vf',
    'scale=720:-1:force_original_aspect_ratio=decrease',
    outputPath,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    let settled = false;
    const killTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill('SIGKILL');
      reject(new Error(`ffmpeg thumbnail dépassé ${Math.round(THUMB_TIMEOUT_MS / 1000)} s`));
    }, THUMB_TIMEOUT_MS);

    proc.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(killTimer);
      reject(err);
    });
    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(killTimer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg thumbnail exit ${code}`));
    });
  });
}

export async function generateThumbnailForVideoId(
  videoId: string,
  options: { timeSec?: number; force?: boolean } = {}
): Promise<{ ok: boolean; thumbnail_url?: string; skipped?: string; error?: string }> {
  if (!r2Client || !R2_PUBLIC_URL) return { ok: false, error: 'R2 non configuré' };

  const id = String(videoId || '').trim();
  if (!id) return { ok: false, error: 'videoId requis' };

  const row = await prisma.video.findUnique({
    where: { id },
    select: {
      id: true,
      media_type: true,
      visibility: true,
      thumbnail_url: true,
      low_quality_url: true,
      video_url: true,
      hls_url: true,
      updated_at: true,
    },
  });
  if (!row) return { ok: false, error: 'Vidéo introuvable' };
  if (row.media_type && row.media_type !== 'video') return { ok: false, error: 'Ce média n’est pas une vidéo' };

  const force = Boolean(options.force);
  if (!force && row.thumbnail_url) {
    return { ok: true, thumbnail_url: row.thumbnail_url, skipped: 'THUMBNAIL_ALREADY_PRESENT' };
  }

  const srcCandidates = [row.low_quality_url, row.video_url, row.hls_url]
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  const src = srcCandidates[0] || '';
  if (!src) return { ok: false, error: 'Aucune source vidéo disponible' };

  const timeSec = Number.isFinite(options.timeSec) ? Number(options.timeSec) : 1;
  const tmpDir = os.tmpdir();
  const outputPath = path.join(tmpDir, `afw-thumb-${id}-${Date.now()}.jpg`);

  try {
    await runFfmpegThumbFromUrlToFile(src, outputPath, timeSec);
    const buf = await fs.readFile(outputPath);
    if (!buf || buf.length < 512) {
      return { ok: false, error: 'Miniature générée trop petite' };
    }

    const key = `thumbnails/${Date.now()}-${id}-${crypto.randomUUID()}.jpg`;
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buf,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    const base = R2_PUBLIC_URL.replace(/\/+$/, '');
    const thumbUrl = `${base}/${key}`;

    await prisma.video.update({
      where: { id },
      data: { thumbnail_url: thumbUrl, updated_at: new Date() },
    });

    return { ok: true, thumbnail_url: thumbUrl };
  } catch (e) {
    const msg = (e as Error)?.message || String(e);
    logger.warn('generateThumbnailForVideoId failed', { videoId: id, err: msg });
    return { ok: false, error: msg };
  } finally {
    await fs.unlink(outputPath).catch(() => {});
  }
}

export function pickLiveReplaySrc(row: {
  replay_url: string | null;
  playback_url: string | null;
  stream_url: string;
}): string {
  const candidates = [row.replay_url, row.playback_url, row.stream_url]
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  for (const c of candidates) {
    if (c.startsWith('rtmp://') || c.startsWith('rtmps://')) continue;
    return c;
  }
  return '';
}

const liveThumbInFlight = new Map<string, Promise<void>>();

/**
 * Miniature replay live (frame FFmpeg depuis replay_url / playback_url) — même pipeline que les vidéos feed.
 */
export async function generateThumbnailForLiveStreamId(
  liveId: string,
  options: { timeSec?: number; force?: boolean; userId?: string | null; internal?: boolean } = {},
): Promise<{ ok: boolean; thumbnail_url?: string; skipped?: string; error?: string }> {
  if (!r2Client || !R2_PUBLIC_URL) return { ok: false, error: 'R2 non configuré' };

  const id = String(liveId || '').trim();
  if (!id) return { ok: false, error: 'liveId requis' };

  const row = await prisma.liveStream.findUnique({
    where: { id },
    select: {
      id: true,
      creator_id: true,
      thumbnail_url: true,
      replay_url: true,
      playback_url: true,
      stream_url: true,
    },
  });
  if (!row) return { ok: false, error: 'Live introuvable' };

  if (!options.internal && options.userId && row.creator_id !== options.userId) {
    return { ok: false, error: 'Non autorisé' };
  }

  const force = Boolean(options.force);
  if (!force && row.thumbnail_url) {
    return { ok: true, thumbnail_url: row.thumbnail_url, skipped: 'THUMBNAIL_ALREADY_PRESENT' };
  }

  const src = pickLiveReplaySrc(row);
  if (!src) return { ok: false, error: 'Aucune source vidéo replay disponible' };

  const existing = liveThumbInFlight.get(id);
  if (existing) {
    if (options.internal) {
      return { ok: true, skipped: 'ALREADY_IN_FLIGHT' };
    }
    await existing.catch(() => {});
    const after = await prisma.liveStream.findUnique({
      where: { id },
      select: { thumbnail_url: true },
    });
    if (after?.thumbnail_url) return { ok: true, thumbnail_url: after.thumbnail_url, skipped: 'IN_FLIGHT_DONE' };
  }

  const timeSec = Number.isFinite(options.timeSec) ? Number(options.timeSec) : 2;
  const tmpDir = os.tmpdir();
  const outputPath = path.join(tmpDir, `afw-live-thumb-${id}-${Date.now()}.jpg`);

  const task = (async () => {
    try {
      await runFfmpegThumbFromUrlToFile(src, outputPath, timeSec);
      const buf = await fs.readFile(outputPath);
      if (!buf || buf.length < 512) {
        logger.warn('generateThumbnailForLiveStreamId: fichier trop petit', { liveId: id });
        return;
      }

      const key = `thumbnails/live-${Date.now()}-${id}-${crypto.randomUUID()}.jpg`;
      await r2Client!.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
          Body: buf,
          ContentType: 'image/jpeg',
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );

      const base = R2_PUBLIC_URL!.replace(/\/+$/, '');
      const thumbUrl = `${base}/${key}`;

      await prisma.liveStream.update({
        where: { id },
        data: { thumbnail_url: thumbUrl, updated_at: new Date() },
      });
    } catch (e) {
      const msg = (e as Error)?.message || String(e);
      logger.warn('generateThumbnailForLiveStreamId failed', { liveId: id, err: msg });
    } finally {
      await fs.unlink(outputPath).catch(() => {});
      liveThumbInFlight.delete(id);
    }
  })();

  liveThumbInFlight.set(id, task);

  if (options.internal) {
    void task;
    return { ok: true, skipped: 'PROCESSING_ASYNC' };
  }

  try {
    await task;
    const updated = await prisma.liveStream.findUnique({
      where: { id },
      select: { thumbnail_url: true },
    });
    if (updated?.thumbnail_url) return { ok: true, thumbnail_url: updated.thumbnail_url };
    return { ok: false, error: 'Génération sans URL finale' };
  } catch (e) {
    const msg = (e as Error)?.message || String(e);
    return { ok: false, error: msg };
  }
}

