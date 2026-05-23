import prisma from '../config/database.js';

function normHashtag(h: string): string {
  return String(h || '')
    .trim()
    .replace(/^#+/, '')
    .toLowerCase();
}

export async function listTrendingChallenges(limit = 15) {
  const take = Math.min(50, Math.max(1, limit));
  const rows = await prisma.videoChallenge.findMany({
    where: { is_active: true },
    orderBy: { created_at: 'desc' },
    take,
  });
  const withCounts = await Promise.all(
    rows.map(async (c) => {
      const participation = await prisma.video.count({
        where: { challenge_id: c.id },
      });
      return {
        id: c.id,
        hashtag: c.hashtag,
        title: c.title,
        description: c.description,
        sponsor_brand: c.sponsor_brand,
        is_sponsored: c.is_sponsored,
        revenue_share_note: c.revenue_share_note,
        created_at: c.created_at,
        expires_at: c.expires_at,
        participation_count: participation,
      };
    })
  );
  return withCounts;
}

export async function createChallenge(
  _creatorUserId: string,
  data: { hashtag: string; title: string; description?: string; sponsor_brand?: string; is_sponsored?: boolean; revenue_share_note?: string }
) {
  const hashtag = normHashtag(data.hashtag);
  if (!hashtag || hashtag.length < 2) {
    const err: any = new Error('Hashtag invalide');
    err.statusCode = 400;
    throw err;
  }
  const title = String(data.title || '').trim();
  if (!title) {
    const err: any = new Error('Titre requis');
    err.statusCode = 400;
    throw err;
  }
  const ch = await prisma.videoChallenge.create({
    data: {
      hashtag,
      title,
      description: data.description?.trim() || null,
      sponsor_brand: data.sponsor_brand?.trim() || null,
      is_sponsored: Boolean(data.is_sponsored),
      revenue_share_note: data.revenue_share_note?.trim() || null,
    },
  });
  return ch;
}

/** Associe une vidéo au challenge identifié par hashtag (créateur de la vidéo = appelant). */
export async function participateVideoInChallenge(userId: string, hashtagRaw: string, videoId: string) {
  const hashtag = normHashtag(hashtagRaw);
  const challenge = await prisma.videoChallenge.findUnique({
    where: { hashtag },
  });
  if (!challenge || !challenge.is_active) {
    const err: any = new Error('Challenge introuvable ou inactif');
    err.statusCode = 404;
    throw err;
  }
  if (challenge.expires_at && Date.now() > new Date(challenge.expires_at).getTime()) {
    const err: any = new Error('Challenge expiré');
    err.statusCode = 400;
    throw err;
  }
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { creator_id: true, challenge_id: true },
  });
  if (!video) {
    const err: any = new Error('Vidéo introuvable');
    err.statusCode = 404;
    throw err;
  }
  if (video.creator_id !== userId) {
    const err: any = new Error('Seul le créateur de la vidéo peut l’associer au challenge');
    err.statusCode = 403;
    throw err;
  }
  await prisma.video.update({
    where: { id: videoId },
    data: { challenge_id: challenge.id },
  });
  const tags = await prisma.videoHashtag.findMany({
    where: { video_id: videoId },
    select: { tag_name: true },
  });
  const hasChallengeTag = tags.some((t) => t.tag_name === hashtag);
  if (!hasChallengeTag) {
    await prisma.videoHashtag.create({
      data: { video_id: videoId, tag_name: hashtag },
    }).catch(() => {});
  }
  return { challenge_id: challenge.id, hashtag: challenge.hashtag, video_id: videoId };
}

/** Classement simple : vues × pondération + likes (MVP). */
export async function getChallengeLeaderboard(challengeId: string, limit = 20) {
  const take = Math.min(50, Math.max(1, limit));
  const videos = await prisma.video.findMany({
    where: { challenge_id: challengeId, visibility: 'public' },
    orderBy: [{ views: 'desc' }, { likes: 'desc' }],
    take,
    select: {
      id: true,
      title: true,
      thumbnail_url: true,
      views: true,
      likes: true,
      creator_id: true,
    },
  });
  return videos;
}
