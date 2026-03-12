/**
 * Service de transcodage vidéo HLS — CDC Super-App AfriWonder.
 * Création de jobs, traitement FFmpeg (multi-bitrate), mise à jour vidéo (hls_url).
 */

import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import https from 'https';
import http from 'http';

const QUALITIES = [
  { name: '360p', width: 640, height: 360, bitrate: '800k' },
  { name: '480p', width: 842, height: 480, bitrate: '1400k' },
  { name: '720p', width: 1280, height: 720, bitrate: '2800k' },
];

const HLS_TIME = 4;
const AUDIO_BITRATE = '128k';

export interface CreateJobInput {
  video_id: string;
  source_url: string;
}

export async function createJob(input: CreateJobInput) {
  const existing = await prisma.transcodingJob.findFirst({
    where: { video_id: input.video_id, status: { in: ['pending', 'processing'] } },
  });
  if (existing) {
    return { job: existing, created: false };
  }

  const job = await prisma.transcodingJob.create({
    data: {
      video_id: input.video_id,
      source_url: input.source_url,
      status: 'pending',
      qualities: QUALITIES.map((q) => ({ ...q, status: 'pending' })),
    },
  });
  return { job, created: true };
}

export async function getPendingJobs(limit: number = 5) {
  return prisma.transcodingJob.findMany({
    where: { status: 'pending' },
    orderBy: { created_at: 'asc' },
    take: limit,
  });
}

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = createWriteStream(destPath);
    protocol
      .get(url, { timeout: 120000 }, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          const loc = res.headers.location;
          if (loc) return downloadFile(loc, destPath).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', (err) => {
        file.close();
        reject(err);
      });
  });
}

/**
 * Génère la commande FFmpeg pour HLS multi-qualité (3 rendus).
 */
function buildFfmpegArgs(inputPath: string, outputDir: string): string[] {
  const segPattern = path.join(outputDir, 'seg_%v_%03d.ts');
  const outPattern = path.join(outputDir, 'out_%v.m3u8');
  const filter =
    '[0:v]split=3[v1][v2][v3];[v1]scale=640:360[v1o];[v2]scale=842:480[v2o];[v3]scale=1280:720[v3o]';
  return [
    '-y', '-i', inputPath,
    '-filter_complex', filter,
    '-map', '[v1o]', '-b:v:0', '800k', '-map', '[v2o]', '-b:v:1', '1400k', '-map', '[v3o]', '-b:v:2', '2800k',
    '-map', 'a:0?', '-c:a', 'aac', '-b:a', AUDIO_BITRATE,
    '-f', 'hls', '-hls_time', String(HLS_TIME), '-hls_playlist_type', 'vod',
    '-hls_segment_filename', segPattern, '-master_pl_name', 'master.m3u8',
    '-var_stream_map', 'v:0 v:1 v:2', outPattern,
  ];
}

/**
 * Exécute FFmpeg et attend la fin.
 */
function runFfmpeg(inputPath: string, outputDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = buildFfmpegArgs(inputPath, outputDir);
    const proc = spawn('ffmpeg', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    proc.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exit ${code}: ${stderr.slice(-500)}`));
    });
    proc.on('error', (err) => reject(err));
  });
}

/**
 * Traite un job : télécharge la source, lance FFmpeg, met à jour le job et la vidéo.
 * outputBaseUrl : URL de base où les fichiers HLS seront servis (ex. https://cdn.example.com/videos/{videoId}/).
 * Si non fourni, on utilise un chemin local relatif (pour tests).
 */
export async function processJob(
  jobId: string,
  options: {
    workDir?: string;
    outputBaseUrl?: string;
    uploadToStorage?: (videoId: string, localDir: string) => Promise<string>;
  } = {}
): Promise<{ success: boolean; hls_manifest_url?: string; error?: string }> {
  const workDir = options.workDir || path.join(process.cwd(), 'tmp', 'transcode', jobId);
  const job = await prisma.transcodingJob.findUnique({ where: { id: jobId }, include: { video: true } });
  if (!job || !job.video) {
    return { success: false, error: 'Job or video not found' };
  }
  if (job.status !== 'pending') {
    return { success: false, error: `Job status is ${job.status}` };
  }

  await prisma.transcodingJob.update({
    where: { id: jobId },
    data: { status: 'processing', updated_at: new Date() },
  });

  const inputPath = path.join(workDir, 'input.mp4');
  const outputDir = path.join(workDir, 'hls');

  try {
    await fs.mkdir(path.dirname(inputPath), { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });

    await downloadFile(job.source_url, inputPath);
    await runFfmpeg(inputPath, outputDir);

    const masterPath = path.join(outputDir, 'master.m3u8');
    await fs.access(masterPath);

    let hlsManifestUrl: string;
    if (options.uploadToStorage) {
      hlsManifestUrl = await options.uploadToStorage(job.video_id, outputDir);
    } else if (options.outputBaseUrl) {
      const base = options.outputBaseUrl.replace(/\/$/, '');
      hlsManifestUrl = `${base}/${job.video_id}/master.m3u8`;
    } else {
      hlsManifestUrl = `file://${masterPath}`;
    }

    await prisma.transcodingJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        hls_manifest_url: hlsManifestUrl,
        completed_at: new Date(),
        updated_at: new Date(),
        error_message: null,
      },
    });

    await prisma.video.update({
      where: { id: job.video_id },
      data: { hls_url: hlsManifestUrl, updated_at: new Date() },
    });

    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch (_) {}

    return { success: true, hls_manifest_url: hlsManifestUrl };
  } catch (err: any) {
    const message = err?.message || String(err);
    logger.error('Transcoding job failed', { jobId, error: message });
    await prisma.transcodingJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        error_message: message.slice(0, 2000),
        updated_at: new Date(),
      },
    });
    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch (_) {}
    return { success: false, error: message };
  }
}
