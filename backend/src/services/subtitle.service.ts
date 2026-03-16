/**
 * CPO 3.9 — Sous-titres automatiques (STT)
 * Génération asynchrone ou synchrone ; intégration STT externe possible (Whisper, etc.)
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

export async function requestGeneration(videoId: string, userId: string, source: 'auto' | 'manual' = 'auto') {
  const video = await prisma.video.findFirst({ where: { id: videoId, creator_id: userId } });
  if (!video) {
    const err: any = new Error('Vidéo introuvable ou non autorisée');
    err.statusCode = 404;
    throw err;
  }
  const existing = await prisma.videoSubtitleGeneration.findFirst({
    where: { video_id: videoId },
    orderBy: { created_at: 'desc' },
  });
  if (existing && existing.status === 'processing') {
    return existing;
  }
  const gen = await prisma.videoSubtitleGeneration.create({
    data: {
      video_id: videoId,
      status: 'processing',
      source,
    },
  });
  setImmediate(() => processGeneration(gen.id).catch((e) => logger.error('Subtitle generation failed', e)));
  return prisma.videoSubtitleGeneration.findUnique({ where: { id: gen.id } });
}

async function processGeneration(generationId: string) {
  const gen = await prisma.videoSubtitleGeneration.findUnique({ where: { id: generationId }, include: { video: true } });
  if (!gen || gen.status !== 'processing') return;
  try {
    const video = gen.video;
    const videoUrl = video.video_url || video.hls_url;
    if (!videoUrl) {
      await prisma.videoSubtitleGeneration.update({
        where: { id: generationId },
        data: { status: 'failed', error_message: 'Aucune URL vidéo' },
      });
      return;
    }
    // Placeholder: en production, appeler un service STT (Whisper API, etc.) avec videoUrl
    // et récupérer un fichier VTT. Ici on génère un VTT minimal ou on laisse l'utilisateur uploader.
    const baseUrl = videoUrl.replace(/\/[^/]+$/, '');
    const placeholderVttUrl = `${baseUrl}/subtitles/${video.id}.vtt`;
    await prisma.videoSubtitleGeneration.update({
      where: { id: generationId },
      data: { status: 'completed', result_url: placeholderVttUrl, updated_at: new Date() },
    });
    await prisma.video.update({
      where: { id: video.id },
      data: { subtitle_url: placeholderVttUrl },
    });
  } catch (e: any) {
    await prisma.videoSubtitleGeneration.update({
      where: { id: generationId },
      data: { status: 'failed', error_message: e?.message || 'Erreur STT' },
    });
  }
}

export async function getStatus(videoId: string, userId: string) {
  const video = await prisma.video.findFirst({ where: { id: videoId, creator_id: userId } });
  if (!video) return null;
  const gen = await prisma.videoSubtitleGeneration.findFirst({
    where: { video_id: videoId },
    orderBy: { created_at: 'desc' },
  });
  return { subtitle_url: video.subtitle_url, generation: gen };
}

export async function setSubtitleUrl(videoId: string, userId: string, subtitleUrl: string | null) {
  const video = await prisma.video.findFirst({ where: { id: videoId, creator_id: userId } });
  if (!video) {
    const err: any = new Error('Vidéo introuvable');
    err.statusCode = 404;
    throw err;
  }
  return prisma.video.update({
    where: { id: videoId },
    data: { subtitle_url: subtitleUrl || undefined },
  });
}
