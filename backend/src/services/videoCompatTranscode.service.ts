/**
 * Compatibilité lecture navigateur (Firefox, WebView) : certains MP4 sont en HEVC / H.264 10 bits / pix_fmt exotique.
 * Chrome tolère plus ; on normalise en H.264 main + yuv420p + AAC + faststart quand ffprobe l’exige.
 */
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../config/cloudflare-r2.js';

const MAX_BYTES = Number(process.env.VIDEO_COMPAT_MAX_BYTES || String(120 * 1024 * 1024));

export type VideoStreamMeta = {
  codec_name: string;
  pix_fmt?: string;
  /** Profil ffprobe (nom ou indice) — High 10 / 4:4:4 refusés par Firefox en MP4 progressif. */
  profile?: string;
  profileNumber?: number;
};

type ProbeStream = {
  codec_type?: string;
  codec_name?: string;
  pix_fmt?: string;
  profile?: string | number;
};

function parseProbeStream(s: ProbeStream | undefined): VideoStreamMeta | null {
  if (!s?.codec_name) return null;
  const prof = s.profile;
  let profileNumber: number | undefined;
  let profile: string | undefined;
  if (typeof prof === 'number' && Number.isFinite(prof)) {
    profileNumber = prof;
    profile = String(prof);
  } else if (prof != null && String(prof).trim() !== '') {
    profile = String(prof).toLowerCase();
  }
  return {
    codec_name: String(s.codec_name).toLowerCase(),
    pix_fmt: s.pix_fmt ? String(s.pix_fmt).toLowerCase() : undefined,
    profile,
    profileNumber,
  };
}

export async function ffprobeVideoMetaFromFile(inputPath: string): Promise<VideoStreamMeta | null> {
  return new Promise((resolve) => {
    const args = [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=codec_name,pix_fmt,profile',
      '-of',
      'json',
      inputPath,
    ];
    const proc = spawn('ffprobe', args);
    let out = '';
    proc.stdout.on('data', (d: Buffer) => {
      out += d.toString();
    });
    proc.on('close', () => {
      try {
        const j = JSON.parse(out) as { streams?: ProbeStream[] };
        resolve(parseProbeStream(j?.streams?.[0]));
      } catch {
        resolve(null);
      }
    });
    proc.on('error', () => resolve(null));
  });
}

/** true = il faut ré-encoder pour Firefox / mobile courants */
export function videoMetaNeedsCompatTranscode(meta: VideoStreamMeta | null): boolean {
  if (!meta?.codec_name) return false;
  const c = meta.codec_name;
  if (c !== 'h264') return true;
  const pix = meta.pix_fmt || '';
  if (pix && pix !== 'yuv420p' && pix !== 'yuvj420p') return true;
  const n = meta.profileNumber;
  if (n != null && [110, 122, 244].includes(n)) return true;
  const p = meta.profile || '';
  if (p && /high[\s_-]*10|main[\s_-]*10|4:4:4|4:2:2|high[\s_-]*444|high[\s_-]*422/.test(p)) return true;
  return false;
}

/** Audio : Firefox n’accepte souvent que AAC (et parfois MP3) dans un MP4 progressif. */
function audioCodecNeedsCompatInMp4(audioCodec: string | null): boolean {
  if (!audioCodec) return false;
  const a = audioCodec.toLowerCase();
  if (a === 'aac') return false;
  if (a === 'mp3' || a === 'mp3float') return false;
  return true;
}

export type UrlStreamProbe = {
  video: VideoStreamMeta | null;
  audioCodec: string | null;
};

/**
 * ffprobe toutes les pistes : Firefox échoue aussi sur Opus/AMR/E-AC-3… dans le MP4 alors que Chrome lit.
 */
export async function ffprobeUrlStreams(url: string): Promise<UrlStreamProbe> {
  return new Promise((resolve) => {
    const args = [
      '-v',
      'error',
      '-show_entries',
      'stream=codec_type,codec_name,pix_fmt,profile',
      '-of',
      'json',
      url,
    ];
    const proc = spawn('ffprobe', args);
    let out = '';
    proc.stdout.on('data', (d: Buffer) => {
      out += d.toString();
    });
    proc.on('close', () => {
      try {
        const j = JSON.parse(out) as { streams?: ProbeStream[] };
        const streams = j.streams || [];
        let video: VideoStreamMeta | null = null;
        let audioCodec: string | null = null;
        for (const s of streams) {
          if (s.codec_type === 'video' && s.codec_name && !video) {
            video = parseProbeStream(s);
          }
          if (s.codec_type === 'audio' && s.codec_name && audioCodec === null) {
            audioCodec = String(s.codec_name).toLowerCase();
          }
        }
        resolve({ video, audioCodec });
      } catch {
        resolve({ video: null, audioCodec: null });
      }
    });
    proc.on('error', () => resolve({ video: null, audioCodec: null }));
  });
}

export function streamsNeedWebCompatTranscode(probe: UrlStreamProbe): boolean {
  if (probe.video && videoMetaNeedsCompatTranscode(probe.video)) return true;
  return audioCodecNeedsCompatInMp4(probe.audioCodec);
}

async function ffprobeFileStreams(inputPath: string): Promise<UrlStreamProbe> {
  return new Promise((resolve) => {
    const args = [
      '-v',
      'error',
      '-show_entries',
      'stream=codec_type,codec_name,pix_fmt,profile',
      '-of',
      'json',
      inputPath,
    ];
    const proc = spawn('ffprobe', args);
    let out = '';
    proc.stdout.on('data', (d: Buffer) => {
      out += d.toString();
    });
    proc.on('close', () => {
      try {
        const j = JSON.parse(out) as { streams?: ProbeStream[] };
        const streams = j.streams || [];
        let video: VideoStreamMeta | null = null;
        let audioCodec: string | null = null;
        for (const s of streams) {
          if (s.codec_type === 'video' && s.codec_name && !video) {
            video = parseProbeStream(s);
          }
          if (s.codec_type === 'audio' && s.codec_name && audioCodec === null) {
            audioCodec = String(s.codec_name).toLowerCase();
          }
        }
        resolve({ video, audioCodec });
      } catch {
        resolve({ video: null, audioCodec: null });
      }
    });
    proc.on('error', () => resolve({ video: null, audioCodec: null }));
  });
}

function runFfmpegTranscodeToCompatMp4(inputPath: string, outputPath: string): Promise<void> {
  const args = [
    '-y',
    '-i',
    inputPath,
    '-c:v',
    'libx264',
    '-profile:v',
    'main',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    '-f',
    'mp4',
    outputPath,
  ];
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    let stderr = '';
    proc.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-600)}`));
    });
  });
}

/**
 * Après lecture multipart : si le fichier n’est pas déjà H.264 + yuv420p, ré-encode avant envoi R2.
 */
export async function maybeTranscodeMp4BufferForWeb(buffer: Buffer, baseName: string): Promise<Buffer> {
  if (process.env.UPLOAD_VIDEO_SKIP_COMPAT_TRANSCODE === '1') return buffer;
  if (!buffer?.length || buffer.length > MAX_BYTES) return buffer;

  const safeBase = String(baseName || 'v').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const tmpIn = path.join(os.tmpdir(), `afw-cin-${Date.now()}-${safeBase}.mp4`);
  const tmpOut = path.join(os.tmpdir(), `afw-cout-${Date.now()}-${safeBase}.mp4`);

  try {
    await fs.writeFile(tmpIn, buffer);
    const probe = await ffprobeFileStreams(tmpIn);
    if (!streamsNeedWebCompatTranscode(probe)) return buffer;

    await runFfmpegTranscodeToCompatMp4(tmpIn, tmpOut);
    const out = await fs.readFile(tmpOut);
    if (out.length < 512) return buffer;
    logger.info('Vidéo transcodée pour compatibilité web (upload)', {
      baseName: safeBase,
      codec: probe.video?.codec_name,
      pix_fmt: probe.video?.pix_fmt,
      audio: probe.audioCodec,
    });
    return out;
  } catch (e) {
    logger.warn('Transcodage compat upload ignoré', { err: (e as Error)?.message, baseName: safeBase });
    return buffer;
  } finally {
    await fs.unlink(tmpIn).catch(() => {});
    await fs.unlink(tmpOut).catch(() => {});
  }
}

function isOurCdnVideoUrl(url: string): boolean {
  const u = url.trim();
  if (!u.startsWith('http')) return false;
  try {
    const host = new URL(u).hostname.toLowerCase();
    if (host === 'cdn.afriwonder.com' || host.endsWith('.cdn.afriwonder.com')) return true;
    if (host === 'cdn.africonnect.com' || host.endsWith('.cdn.africonnect.com')) return true;
    if (host === 'r2.dev' || host.endsWith('.r2.dev')) return true;
    if (host.endsWith('.cloudflarestorage.com')) return true;
    const base = (R2_PUBLIC_URL || '').replace(/\/+$/, '');
    if (base && u.startsWith(base)) return true;
  } catch {
    return false;
  }
  return false;
}

function runFfmpegTranscodeUrlToFile(inputUrl: string, outputPath: string): Promise<void> {
  const args = [
    '-y',
    '-i',
    inputUrl,
    '-c:v',
    'libx264',
    '-profile:v',
    'main',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    '-f',
    'mp4',
    outputPath,
  ];
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    let stderr = '';
    proc.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg url transcode ${code}: ${stderr.slice(-600)}`));
    });
  });
}

/**
 * Après création en base (upload presign ou ancien flux) : ffprobe sur l’URL publique ; si besoin, nouvel MP4 sur R2 + mise à jour video_url.
 */
export async function runCompatTranscodeForPublishedVideo(videoId: string, videoUrl: string): Promise<void> {
  if (process.env.VIDEO_PUBLISH_COMPAT_TRANSCODE === '0') return;
  if (!r2Client || !R2_PUBLIC_URL) return;
  const url = String(videoUrl || '').trim();
  if (!isOurCdnVideoUrl(url)) return;

  const probe = await ffprobeUrlStreams(url);
  if (!streamsNeedWebCompatTranscode(probe)) return;

  const tmpOut = path.join(os.tmpdir(), `afw-pub-${videoId}-${Date.now()}.mp4`);
  try {
    await runFfmpegTranscodeUrlToFile(url, tmpOut);
    const body = await fs.readFile(tmpOut);
    if (body.length < 512) return;

    const key = `videos/${Date.now()}-web-${crypto.randomUUID()}.mp4`;
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
    const newUrl = `${base}/${key}`;

    await prisma.video.update({
      where: { id: videoId },
      data: { video_url: newUrl, updated_at: new Date() },
    });

    logger.info('Vidéo republiée en H.264 web (post-publish)', {
      videoId,
      codec: probe.video?.codec_name,
      pix_fmt: probe.video?.pix_fmt,
      audio: probe.audioCodec,
    });
  } catch (e) {
    logger.warn('Compat transcode post-publish échoué', { videoId, err: (e as Error)?.message });
  } finally {
    await fs.unlink(tmpOut).catch(() => {});
  }
}

export function scheduleCompatTranscodeAfterPublish(videoId: string, videoUrl: string): void {
  if (process.env.VIDEO_PUBLISH_COMPAT_TRANSCODE === '0') return;
  setImmediate(() => {
    runCompatTranscodeForPublishedVideo(videoId, videoUrl).catch((e) =>
      logger.warn('scheduleCompatTranscodeAfterPublish', { videoId, err: String(e) })
    );
  });
}

export type ForceWebCompatResult = {
  ok: boolean;
  newUrl?: string;
  error?: string;
  skipped?: string;
};

/**
 * Ré-encode **systématiquement** en H.264 main + yuv420p + AAC + faststart (même si ffprobe disait « OK »).
 * Cas réels : fichier lisible par Chrome mais pas Firefox, moov/buffer bizarre, métadonnées mensongères.
 */
export async function forceWebCompatTranscodePublishedVideo(videoId: string): Promise<ForceWebCompatResult> {
  if (!r2Client || !R2_PUBLIC_URL) {
    return { ok: false, skipped: 'R2 non configuré' };
  }

  const row = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, video_url: true },
  });
  if (!row) return { ok: false, error: 'Vidéo introuvable' };

  const url = String(row.video_url || '').trim();
  if (!isOurCdnVideoUrl(url)) {
    return {
      ok: false,
      skipped: 'La vidéo doit être hébergée sur le CDN AfriWonder / R2 (URL publique du bucket).',
    };
  }

  const tmpOut = path.join(os.tmpdir(), `afw-force-${videoId}-${Date.now()}.mp4`);
  try {
    await runFfmpegTranscodeUrlToFile(url, tmpOut);
    const body = await fs.readFile(tmpOut);
    if (body.length < 512) {
      return { ok: false, error: 'Transcodage produit un fichier trop petit' };
    }

    const key = `videos/${Date.now()}-webfix-${crypto.randomUUID()}.mp4`;
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
    const newUrl = `${base}/${key}`;

    await prisma.video.update({
      where: { id: videoId },
      data: { video_url: newUrl, updated_at: new Date() },
    });

    logger.info('Réparation lecture web (transcodage forcé)', { videoId });
    return { ok: true, newUrl };
  } catch (e) {
    const msg = (e as Error)?.message || String(e);
    logger.warn('forceWebCompatTranscodePublishedVideo', { videoId, err: msg });
    return { ok: false, error: msg };
  } finally {
    await fs.unlink(tmpOut).catch(() => {});
  }
}
