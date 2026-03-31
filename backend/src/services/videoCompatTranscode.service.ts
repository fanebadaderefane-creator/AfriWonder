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
const FEED_SAFE_ZOOM = Math.max(1, Number(process.env.VIDEO_FEED_SAFE_ZOOM || '1.12'));
const FORCE_WEB_COMPAT_TRANSCODE_TIMEOUT_MS = Math.max(
  60_000,
  Number(process.env.VIDEO_COMPAT_FORCE_TIMEOUT_MS || '480000')
);
const FFMPEG_REMOTE_RW_TIMEOUT_US = Math.max(
  15_000_000,
  Math.round((Number(process.env.VIDEO_COMPAT_REMOTE_RW_TIMEOUT_MS || '90000') || 90000) * 1000)
);
const FFMPEG_PRESET = (() => {
  const v = (process.env.VIDEO_COMPAT_PRESET || 'fast').toLowerCase();
  const allowed = ['ultrafast', 'superfast', 'veryfast', 'fast', 'medium', 'slow'];
  return allowed.includes(v) ? v : 'fast';
})();
const FFMPEG_CRF = String(Math.min(51, Math.max(0, Number(process.env.VIDEO_COMPAT_CRF || '26') || 26)));

function buildVerticalComposeFilter(): string {
  // 1) Cover + crop en 9:16
  // 2) Zoom de sécurité (léger) pour rogner les bandes noires "encodées dans l'image"
  //    qui peuvent survivre au premier crop (sources TikTok/reupload fréquentes).
  const zoomW = Math.round(720 * FEED_SAFE_ZOOM);
  const zoomH = Math.round(1280 * FEED_SAFE_ZOOM);
  return `[0:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,scale=${zoomW}:${zoomH},crop=720:1280,format=yuv420p[v]`;
}

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
  /** Sonde incomplète ou ffprobe en échec : on tente quand même un transcodage (souvent HEVC mal détecté / CDN). */
  probeFailed?: boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

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
    proc.on('close', (code) => {
      if (code !== 0) {
        resolve({ video: null, audioCodec: null, probeFailed: true });
        return;
      }
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
        const probeFailed = !video && streams.length === 0;
        resolve({ video, audioCodec, ...(probeFailed ? { probeFailed: true } : {}) });
      } catch {
        resolve({ video: null, audioCodec: null, probeFailed: true });
      }
    });
    proc.on('error', () => resolve({ video: null, audioCodec: null, probeFailed: true }));
  });
}

/** Plusieurs tentatives (CDN / TLS / cold start R2). */
export async function ffprobeUrlStreamsWithRetry(
  url: string,
  attempts = 3,
  delayMs = 900
): Promise<UrlStreamProbe> {
  let last: UrlStreamProbe = { video: null, audioCodec: null, probeFailed: true };
  for (let i = 0; i < attempts; i++) {
    last = await ffprobeUrlStreams(url);
    if (last.video) break;
    if (last.probeFailed) {
      if (i < attempts - 1) await sleep(delayMs);
      continue;
    }
    break;
  }
  return last;
}

export function streamsNeedWebCompatTranscode(probe: UrlStreamProbe): boolean {
  if (probe.probeFailed) return true;
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
  const verticalComposeFilter = buildVerticalComposeFilter();
  const args = [
    '-y',
    '-threads', '0',
    '-i',
    inputPath,
    '-filter_complex',
    verticalComposeFilter,
    '-map',
    '[v]',
    '-map',
    '0:a?',
    '-c:v',
    'libx264',
    '-preset',
    FFMPEG_PRESET,
    '-crf',
    FFMPEG_CRF,
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
  const verticalComposeFilter = buildVerticalComposeFilter();
  const args = [
    '-y',
    '-nostdin',
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
    '-rw_timeout',
    String(FFMPEG_REMOTE_RW_TIMEOUT_US),
    '-threads', '0',
    '-i',
    inputUrl,
    '-filter_complex',
    verticalComposeFilter,
    '-map',
    '[v]',
    '-map',
    '0:a?',
    '-c:v',
    'libx264',
    '-preset',
    FFMPEG_PRESET,
    '-crf',
    FFMPEG_CRF,
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
    let settled = false;
    const killTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill('SIGKILL');
      reject(
        new Error(
          `ffmpeg a dépassé ${Math.round(
            FORCE_WEB_COMPAT_TRANSCODE_TIMEOUT_MS / 1000
          )} s sur la source distante (CDN/R2).`
        )
      );
    }, FORCE_WEB_COMPAT_TRANSCODE_TIMEOUT_MS);
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
      else reject(new Error(`ffmpeg url transcode ${code}: ${stderr.slice(-600)}`));
    });
  });
}

/**
 * Après création en base (upload presign ou ancien flux) : ffprobe sur l’URL publique ; si besoin, nouvel MP4 sur R2 + mise à jour video_url.
 */
const compatTranscodeInFlight = new Set<string>();

export async function runCompatTranscodeForPublishedVideo(videoId: string, videoUrl: string): Promise<void> {
  if (process.env.VIDEO_PUBLISH_COMPAT_TRANSCODE === '0') return;
  if (!r2Client || !R2_PUBLIC_URL) return;
  const url = String(videoUrl || '').trim();
  if (!isOurCdnVideoUrl(url)) return;

  if (compatTranscodeInFlight.has(videoId)) return;
  compatTranscodeInFlight.add(videoId);

  const pipelineAttempts = Math.min(4, Math.max(1, Number(process.env.VIDEO_COMPAT_PUBLISH_RETRIES || '3') || 3));
  const backoff = [0, 2000, 5000];

  try {
    const probe = await ffprobeUrlStreamsWithRetry(url, 3, 900);
    if (!streamsNeedWebCompatTranscode(probe)) return;

    let lastErr: string | undefined;
    for (let attempt = 0; attempt < pipelineAttempts; attempt++) {
      if (attempt > 0) await sleep(backoff[Math.min(attempt - 1, backoff.length - 1)] ?? 3000);
      const tmpOut = path.join(os.tmpdir(), `afw-pub-${videoId}-${Date.now()}-${attempt}.mp4`);
      try {
        await runFfmpegTranscodeUrlToFile(url, tmpOut);
        const body = await fs.readFile(tmpOut);
        if (body.length < 512) {
          lastErr = 'fichier trop petit';
          continue;
        }

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
          attempt: attempt + 1,
          codec: probe.video?.codec_name,
          pix_fmt: probe.video?.pix_fmt,
          audio: probe.audioCodec,
          probeFailed: probe.probeFailed,
        });
        return;
      } catch (e) {
        lastErr = (e as Error)?.message || String(e);
        logger.warn('Compat transcode post-publish tentative échouée', {
          videoId,
          attempt: attempt + 1,
          err: lastErr,
        });
      } finally {
        await fs.unlink(tmpOut).catch(() => {});
      }
    }
    logger.warn('Compat transcode post-publish échoué (toutes tentatives)', { videoId, lastErr });
  } finally {
    compatTranscodeInFlight.delete(videoId);
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

const forceCompatTranscodeInFlight = new Set<string>();

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
function humanizeTranscodeError(raw: string): string {
  const m = raw || '';
  if (
    /ENOENT|spawn .*ffmpeg|ffmpeg.*n'est pas reconnu|n'est pas reconnu en tant que commande|not recognized as an internal or external command/i.test(
      m
    )
  ) {
    return 'ffmpeg est introuvable sur ce serveur. Installez FFmpeg, vérifiez PATH (ou redémarrez le terminal après installation), puis réessayez.';
  }
  if (/spawn .*ffprobe|ffprobe.*ENOENT/i.test(m)) {
    return 'ffprobe est introuvable (livré avec FFmpeg). Installez FFmpeg et vérifiez le PATH.';
  }
  return m.length > 400 ? `${m.slice(0, 400)}…` : m;
}

export async function forceWebCompatTranscodePublishedVideo(videoId: string): Promise<ForceWebCompatResult> {
  const startedAt = Date.now();
  if (forceCompatTranscodeInFlight.has(videoId)) {
    logger.warn('forceWebCompatTranscodePublishedVideo skipped', {
      videoId,
      duration_ms: Date.now() - startedAt,
      reason: 'Une réparation est déjà en cours',
    });
    return {
      ok: false,
      skipped: 'Une réparation de lecture web est déjà en cours pour cette vidéo. Attendez la fin avant de réessayer.',
    };
  }
  if (!r2Client || !R2_PUBLIC_URL) {
    logger.warn('forceWebCompatTranscodePublishedVideo skipped', {
      videoId,
      duration_ms: Date.now() - startedAt,
      reason: 'R2 non configuré',
    });
    return { ok: false, skipped: 'R2 non configuré' };
  }

  const tmpOut = path.join(os.tmpdir(), `afw-force-${videoId}-${Date.now()}.mp4`);
  try {
    forceCompatTranscodeInFlight.add(videoId);
    logger.info('forceWebCompatTranscodePublishedVideo started', { videoId });
    let row: { id: string; video_url: string | null } | null;
    try {
      row = await prisma.video.findUnique({
        where: { id: videoId },
        select: { id: true, video_url: true },
      });
    } catch (dbErr: any) {
      const msg = dbErr?.message || String(dbErr);
      logger.warn('forceWebCompatTranscodePublishedVideo DB read', { videoId, err: msg });
      return {
        ok: false,
        error: /P1001|Can't reach database|database server/i.test(msg)
          ? 'Base de données indisponible. Réessayez plus tard.'
          : humanizeTranscodeError(msg),
      };
    }

    if (!row) {
      logger.warn('forceWebCompatTranscodePublishedVideo video missing', {
        videoId,
        duration_ms: Date.now() - startedAt,
      });
      return { ok: false, error: 'Vidéo introuvable' };
    }

    const url = String(row.video_url || '').trim();
    if (!isOurCdnVideoUrl(url)) {
      logger.warn('forceWebCompatTranscodePublishedVideo skipped', {
        videoId,
        duration_ms: Date.now() - startedAt,
        reason: 'URL hors CDN/R2',
      });
      return {
        ok: false,
        skipped: 'La vidéo doit être hébergée sur le CDN AfriWonder / R2 (URL publique du bucket).',
      };
    }

    logger.info('forceWebCompatTranscodePublishedVideo ffmpeg start', { videoId });
    await runFfmpegTranscodeUrlToFile(url, tmpOut);
    const body = await fs.readFile(tmpOut);
    logger.info('forceWebCompatTranscodePublishedVideo ffmpeg done', {
      videoId,
      duration_ms: Date.now() - startedAt,
      output_bytes: body.length,
    });
    if (body.length < 512) {
      return { ok: false, error: 'Transcodage produit un fichier trop petit' };
    }

    const key = `videos/${Date.now()}-webfix-${crypto.randomUUID()}.mp4`;
    logger.info('forceWebCompatTranscodePublishedVideo R2 upload start', { videoId, key });
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: 'video/mp4',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
    logger.info('forceWebCompatTranscodePublishedVideo R2 upload done', {
      videoId,
      key,
      duration_ms: Date.now() - startedAt,
    });

    const base = R2_PUBLIC_URL.replace(/\/+$/, '');
    const newUrl = `${base}/${key}`;

    try {
      logger.info('forceWebCompatTranscodePublishedVideo DB update start', { videoId });
      await prisma.video.update({
        where: { id: videoId },
        data: { video_url: newUrl, updated_at: new Date() },
      });
      logger.info('forceWebCompatTranscodePublishedVideo DB update done', {
        videoId,
        duration_ms: Date.now() - startedAt,
      });
    } catch (dbErr: any) {
      const msg = dbErr?.message || String(dbErr);
      logger.warn('forceWebCompatTranscodePublishedVideo DB update', { videoId, err: msg, newUrl });
      return {
        ok: false,
        error:
          'Fichier transcodé envoyé sur le stockage, mais la mise à jour en base a échoué. Vérifiez la base de données.',
      };
    }

    logger.info('Réparation lecture web (transcodage forcé)', {
      videoId,
      duration_ms: Date.now() - startedAt,
    });
    return { ok: true, newUrl };
  } catch (e) {
    const msg = (e as Error)?.message || String(e);
    logger.warn('forceWebCompatTranscodePublishedVideo', {
      videoId,
      err: msg,
      duration_ms: Date.now() - startedAt,
    });
    return { ok: false, error: humanizeTranscodeError(msg) };
  } finally {
    forceCompatTranscodeInFlight.delete(videoId);
    await fs.unlink(tmpOut).catch(() => {});
  }
}
