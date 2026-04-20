import type { Prisma } from '@prisma/client';
import prisma from '../config/database.js';

const POLL_TTL_MS = 24 * 60 * 60 * 1000;

function normalizeOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    const err: any = new Error('options doit être un tableau de 2 à 4 libellés');
    err.statusCode = 400;
    throw err;
  }
  const labels = raw.map((x) => String(x ?? '').trim()).filter(Boolean);
  if (labels.length < 2 || labels.length > 4) {
    const err: any = new Error('Entre 2 et 4 options');
    err.statusCode = 400;
    throw err;
  }
  return labels;
}

export async function getVideoPollPayload(videoId: string, viewerUserId?: string | null) {
  const poll = await prisma.videoPoll.findUnique({
    where: { video_id: videoId },
    include: { votes: true },
  });
  if (!poll) return null;

  const options = Array.isArray(poll.options) ? (poll.options as string[]) : [];
  const counts = new Array(Math.max(options.length, 0)).fill(0);
  for (const v of poll.votes) {
    const i = v.option_index;
    if (i >= 0 && i < counts.length) counts[i] += 1;
  }
  const expired = Date.now() > new Date(poll.expires_at).getTime();
  let my_vote: number | null = null;
  if (viewerUserId) {
    const mine = poll.votes.find((x) => x.user_id === viewerUserId);
    if (mine) my_vote = mine.option_index;
  }

  return {
    id: poll.id,
    video_id: poll.video_id,
    options,
    counts,
    total_votes: poll.votes.length,
    expires_at: poll.expires_at,
    expired,
    my_vote,
  };
}

export async function createVideoPoll(creatorId: string, videoId: string, optionsRaw: unknown) {
  const options = normalizeOptions(optionsRaw);
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { creator_id: true },
  });
  if (!video) {
    const err: any = new Error('Vidéo introuvable');
    err.statusCode = 404;
    throw err;
  }
  if (video.creator_id !== creatorId) {
    const err: any = new Error('Seul le créateur peut ajouter un sondage');
    err.statusCode = 403;
    throw err;
  }
  const existing = await prisma.videoPoll.findUnique({ where: { video_id: videoId } });
  if (existing) {
    const err: any = new Error('Cette vidéo a déjà un sondage');
    err.statusCode = 400;
    throw err;
  }
  const expires_at = new Date(Date.now() + POLL_TTL_MS);
  await prisma.videoPoll.create({
    data: {
      video_id: videoId,
      options: options as unknown as Prisma.InputJsonValue,
      expires_at,
    },
  });
  return getVideoPollPayload(videoId, creatorId);
}

export async function voteVideoPoll(userId: string, videoId: string, option_index: number) {
  const poll = await prisma.videoPoll.findUnique({
    where: { video_id: videoId },
    include: { votes: { where: { user_id: userId } } },
  });
  if (!poll) {
    const err: any = new Error('Sondage introuvable');
    err.statusCode = 404;
    throw err;
  }
  if (Date.now() > new Date(poll.expires_at).getTime()) {
    const err: any = new Error('Sondage expiré');
    err.statusCode = 400;
    throw err;
  }
  const options = Array.isArray(poll.options) ? (poll.options as string[]) : [];
  if (!Number.isInteger(option_index) || option_index < 0 || option_index >= options.length) {
    const err: any = new Error('Option invalide');
    err.statusCode = 400;
    throw err;
  }

  await prisma.$transaction([
    prisma.videoPollVote.deleteMany({ where: { poll_id: poll.id, user_id: userId } }),
    prisma.videoPollVote.create({
      data: { poll_id: poll.id, user_id: userId, option_index },
    }),
  ]);

  return getVideoPollPayload(videoId, userId);
}
