import type { Prisma } from '@prisma/client';
import prisma from '../config/database.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/** Publications « photo » (modèle Video) à mélanger avec les posts Moments. */
const MOMENTS_PHOTO_MEDIA_TYPES = ['image', 'photo'] as const;

function buildMomentsPhotoVideoWhere(opts: { userId?: string; viewerId?: string }): Prisma.VideoWhereInput {
  const now = new Date();
  const base: Prisma.VideoWhereInput = {
    video_url: { not: { contains: 'example.com' } },
    algo_tier: { not: 'dead' },
    media_type: { in: [...MOMENTS_PHOTO_MEDIA_TYPES] },
    OR: [{ scheduled_at: null }, { scheduled_at: { lte: now } }],
  };
  if (!opts.userId) {
    return { ...base, visibility: 'public' };
  }
  const w: Prisma.VideoWhereInput = { ...base, creator_id: opts.userId };
  if (opts.viewerId && opts.userId && opts.viewerId !== opts.userId) {
    w.visibility = 'public';
  } else {
    w.visibility = { not: 'archived' };
  }
  return w;
}

/** Forme proche d’un `Post` API pour le client Moments (`feed.tsx`). */
function mapPhotoVideoToMomentRow(v: {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  visibility: string;
  scheduled_at: Date | null;
  comments_count: number;
  created_at: Date;
  updated_at: Date;
  creator: { id: string; username: string | null; full_name: string | null; profile_image: string | null };
}): Record<string, unknown> {
  const img =
    (typeof v.thumbnail_url === 'string' && v.thumbnail_url.trim()) || String(v.video_url || '').trim();
  const textParts = [v.title, v.description].map((x) => String(x || '').trim()).filter(Boolean);
  return {
    id: v.id,
    user_id: v.creator_id,
    text: textParts.join('\n\n') || '',
    created_at: v.created_at,
    updated_at: v.updated_at,
    visibility: v.visibility,
    scheduled_at: v.scheduled_at,
    is_pinned: false,
    image_url: img || null,
    images: img
      ? [{ id: `pvimg-${v.id}`, post_id: v.id, image_url: img, position: 0 }]
      : [],
    user: {
      id: v.creator.id,
      username: v.creator.username,
      full_name: v.creator.full_name,
      profile_image: v.creator.profile_image,
    },
    poll: null,
    _count: { comments: v.comments_count ?? 0 },
    moment_from_video: true,
  };
}

/** Normalise le champ `images` (tableau d’URLs) — évite perte si format inattendu côté client. */
function normalizeImageUrlsInput(images: unknown): string[] {
  if (images == null) return [];
  if (Array.isArray(images)) {
    return images.map((u) => String(u).trim()).filter((u) => u.length > 0);
  }
  if (typeof images === 'string') {
    const s = images.trim();
    if (!s) return [];
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map((u) => String(u).trim()).filter((u) => u.length > 0);
        }
      } catch {
        /* une seule URL en chaîne */
      }
    }
    return [s];
  }
  return [];
}

export async function createPost(userId: string, data: {
  text?: string;
  image_url?: string;
  images?: string[]; // CPO 2.5, 2.7 — carrousel multi-images (URLs)
  visibility?: string;
  scheduled_at?: string | Date | null;
  is_pinned?: boolean;
  poll?: { question: string; options: string[]; ends_at?: string | Date | null };
}) {
  const visibility = data.visibility && ['public', 'private', 'archived', 'close_friends'].includes(data.visibility) ? data.visibility : 'public';
  const scheduledAt = data.scheduled_at ? new Date(data.scheduled_at) : null;
  const imageUrls = normalizeImageUrlsInput(data.images);
  const firstImage = imageUrls.length > 0 ? imageUrls[0] : (data.image_url?.trim() || null);
  const post = await prisma.post.create({
    data: {
      user_id: userId,
      text: data.text?.trim() || null,
      image_url: firstImage,
      visibility,
      scheduled_at: scheduledAt,
      is_pinned: data.is_pinned ?? false,
    },
    include: {
      user: { select: { id: true, username: true, full_name: true, profile_image: true } },
    },
  });

  if (imageUrls.length > 0) {
    await prisma.postImage.createMany({
      data: imageUrls.map((image_url, position) => ({ post_id: post.id, image_url, position })),
    });
  }

  if (data.poll?.question?.trim() && Array.isArray(data.poll.options) && data.poll.options.length >= 2) {
    const options = data.poll.options.slice(0, 10).map((o) => String(o).trim()).filter(Boolean);
    if (options.length >= 2) {
      await prisma.postPoll.create({
        data: {
          post_id: post.id,
          question: data.poll.question.trim(),
          options,
          ends_at: data.poll.ends_at ? new Date(data.poll.ends_at) : null,
        },
      });
    }
  }

  const withPoll = await prisma.post.findUnique({
    where: { id: post.id },
    include: {
      user: { select: { id: true, username: true, full_name: true, profile_image: true } },
      poll: true,
      images: { orderBy: { position: 'asc' } },
    },
  });
  return withPoll!;
}

export async function listPosts(options: {
  userId?: string;
  viewerId?: string;
  visibility?: string;
  page?: number;
  limit?: number;
  includeScheduled?: boolean;
}) {
  const page = Math.max(1, options.page ?? DEFAULT_PAGE);
  const limit = Math.min(50, Math.max(1, options.limit ?? DEFAULT_LIMIT));
  const skip = (page - 1) * limit;
  const where: any = {};
  if (options.userId) where.user_id = options.userId;
  if (options.visibility) {
    where.visibility = options.visibility;
  } else if (!options.userId) {
    where.visibility = 'public';
  } else if (options.viewerId && options.userId && options.viewerId !== options.userId) {
    where.OR = [
      { visibility: 'public' },
      { visibility: 'close_friends', user: { close_friends: { some: { friend_id: options.viewerId } } } },
    ];
  }
  if (!options.includeScheduled) {
    const now = new Date();
    where.AND = [
      ...(where.OR ? [{ OR: where.OR }] : []),
      { OR: [{ scheduled_at: null }, { scheduled_at: { lte: now } }] },
    ];
    delete where.OR;
  }

  const mergePhotoMoments =
    !options.includeScheduled &&
    options.visibility !== 'archived' &&
    options.visibility == null;

  if (!mergePhotoMoments) {
    const [rows, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, full_name: true, profile_image: true } },
          poll: true,
          images: { orderBy: { position: 'asc' } },
          _count: { select: { comments: true } },
        },
        orderBy: [{ is_pinned: 'desc' }, { created_at: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    const posts = await Promise.all(
      rows.map(async (post) => {
        const p = post as any;
        if (p.poll && p.poll.id) {
          p.poll_results = await getPollResults(p.poll.id);
          if (options.viewerId) {
            const myVote = await prisma.postPollVote.findUnique({
              where: { poll_id_user_id: { poll_id: p.poll.id, user_id: options.viewerId } },
              select: { option_index: true },
            });
            p.my_poll_vote = myVote?.option_index ?? null;
          }
        }
        return p;
      })
    );
    return { posts, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  const photoWhere = buildMomentsPhotoVideoWhere({
    userId: options.userId,
    viewerId: options.viewerId,
  });
  const poolSize = Math.min(300, Math.max(80, skip + limit * 3));

  const [postRows, photoVideos, postTotal, videoPhotoTotal] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, full_name: true, profile_image: true } },
        poll: true,
        images: { orderBy: { position: 'asc' } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ is_pinned: 'desc' }, { created_at: 'desc' }],
      take: poolSize,
      skip: 0,
    }),
    prisma.video.findMany({
      where: photoWhere,
      include: {
        creator: { select: { id: true, username: true, full_name: true, profile_image: true } },
      },
      orderBy: { created_at: 'desc' },
      take: poolSize,
      skip: 0,
    }),
    prisma.post.count({ where }),
    prisma.video.count({ where: photoWhere }),
  ]);

  const synthetic = photoVideos.map((v) => mapPhotoVideoToMomentRow(v as any));
  const combined = [...postRows, ...synthetic].sort((a, b) => {
    const ap = (a as { is_pinned?: boolean }).is_pinned ? 1 : 0;
    const bp = (b as { is_pinned?: boolean }).is_pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return new Date((b as { created_at: Date }).created_at).getTime()
      - new Date((a as { created_at: Date }).created_at).getTime();
  });
  const paged = combined.slice(skip, skip + limit);

  const posts = await Promise.all(
    paged.map(async (row) => {
      if ((row as { moment_from_video?: boolean }).moment_from_video) {
        return row;
      }
      const p = row as any;
      if (p.poll && p.poll.id) {
        p.poll_results = await getPollResults(p.poll.id);
        if (options.viewerId) {
          const myVote = await prisma.postPollVote.findUnique({
            where: { poll_id_user_id: { poll_id: p.poll.id, user_id: options.viewerId } },
            select: { option_index: true },
          });
          p.my_poll_vote = myVote?.option_index ?? null;
        }
      }
      return p;
    })
  );

  const total = postTotal + videoPhotoTotal;
  return { posts, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getPostById(postId: string, viewerId?: string) {
  const now = new Date();
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      AND: [
        {
          OR: [
            { visibility: 'public' },
            ...(viewerId ? [
              { user_id: viewerId },
              { visibility: 'private', user_id: viewerId },
              { visibility: 'close_friends', user: { close_friends: { some: { friend_id: viewerId } } } },
            ] : []),
          ],
        },
        {
          OR: [
            { scheduled_at: null },
            { scheduled_at: { lte: now } },
            ...(viewerId ? [{ user_id: viewerId }] : []),
          ],
        },
      ],
    },
    include: {
      user: { select: { id: true, username: true, full_name: true, profile_image: true } },
      poll: true,
      images: { orderBy: { position: 'asc' } },
      _count: { select: { comments: true } },
    },
  });
  if (post?.poll && viewerId) {
    const myVote = await prisma.postPollVote.findUnique({
      where: { poll_id_user_id: { poll_id: post.poll.id, user_id: viewerId } },
      select: { option_index: true },
    });
    (post as any).poll_results = await getPollResults(post.poll.id);
    (post as any).my_poll_vote = myVote?.option_index ?? null;
  } else if (post?.poll) {
    (post as any).poll_results = await getPollResults(post.poll.id);
  }
  return post;
}

export async function votePoll(pollId: string, userId: string, optionIndex: number) {
  const poll = await prisma.postPoll.findUnique({
    where: { id: pollId },
    select: { id: true, post_id: true, options: true, ends_at: true },
  });
  if (!poll) return null;
  const opts = poll.options as string[];
  if (optionIndex < 0 || optionIndex >= opts.length) return null;
  if (poll.ends_at && new Date() > poll.ends_at) return null;
  await prisma.postPollVote.upsert({
    where: { poll_id_user_id: { poll_id: pollId, user_id: userId } },
    create: { poll_id: pollId, user_id: userId, option_index: optionIndex },
    update: { option_index: optionIndex },
  });
  return getPollResults(pollId);
}

export async function getPollResults(pollId: string) {
  const poll = await prisma.postPoll.findUnique({
    where: { id: pollId },
    include: { votes: { select: { option_index: true } } },
  });
  if (!poll) return null;
  const opts = (poll.options as string[]) || [];
  const counts: number[] = opts.map(() => 0);
  for (const v of poll.votes) {
    if (v.option_index >= 0 && v.option_index < counts.length) counts[v.option_index]++;
  }
  return {
    question: poll.question,
    options: opts.map((text, i) => ({ index: i, text, count: counts[i] })),
    total_votes: counts.reduce((a, b) => a + b, 0),
  };
}

export async function updatePost(postId: string, userId: string, data: {
  text?: string;
  image_url?: string;
  images?: string[]; // CPO 2.5, 2.7 — remplacer le carrousel
  visibility?: string;
  scheduled_at?: string | Date | null;
  is_pinned?: boolean;
}) {
  const post = await prisma.post.findFirst({ where: { id: postId, user_id: userId } });
  if (!post) return null;
  const visibility = data.visibility && ['public', 'private', 'archived', 'close_friends'].includes(data.visibility) ? data.visibility : undefined;
  const scheduledAt = data.scheduled_at !== undefined ? (data.scheduled_at ? new Date(data.scheduled_at) : null) : undefined;
  const imageUrls = data.images !== undefined ? normalizeImageUrlsInput(data.images) : null;

  if (imageUrls !== null) {
    await prisma.postImage.deleteMany({ where: { post_id: postId } });
    if (imageUrls.length > 0) {
      await prisma.postImage.createMany({
        data: imageUrls.map((image_url, position) => ({ post_id: postId, image_url, position })),
      });
    }
  }

  const updatePayload: any = {
    ...(data.text !== undefined && { text: data.text?.trim() || null }),
    ...(visibility && { visibility }),
    ...(scheduledAt !== undefined && { scheduled_at: scheduledAt }),
    ...(data.is_pinned !== undefined && { is_pinned: data.is_pinned }),
  };
  if (imageUrls !== null) {
    updatePayload.image_url = imageUrls.length > 0 ? imageUrls[0] : null;
  } else if (data.image_url !== undefined) {
    updatePayload.image_url = data.image_url?.trim() || null;
  }

  return prisma.post.update({
    where: { id: postId },
    data: updatePayload,
    include: {
      user: { select: { id: true, username: true, full_name: true, profile_image: true } },
      poll: true,
      images: { orderBy: { position: 'asc' } },
      _count: { select: { comments: true } },
    },
  });
}

export async function deletePost(postId: string, userId: string) {
  const post = await prisma.post.findFirst({ where: { id: postId, user_id: userId } });
  if (!post) return false;
  await prisma.post.delete({ where: { id: postId } });
  return true;
}

export async function listArchivedPosts(userId: string, page?: number, limit?: number) {
  return listPosts({ userId, visibility: 'archived', page, limit });
}

const MAX_POST_COMMENT_LEN = 2000;
const POST_COMMENT_REACTION_TYPES = new Set(['like', 'love', 'fire', 'laugh', 'wow', 'sad', 'angry', 'moving', 'strong', 'african']);

const POST_COMMENT_USER_INCLUDE = {
  select: { id: true, username: true, full_name: true, profile_image: true },
} as const;

function sumReactionCounts(counts: Record<string, number> | null | undefined) {
  if (!counts) return 0;
  return Object.values(counts).reduce((sum, n) => sum + (typeof n === 'number' ? n : 0), 0);
}

async function getPostCommentReactionSummary(commentIds: string[], viewerId?: string) {
  const reactionMap = new Map<string, Record<string, number>>();
  const myReactionMap = new Map<string, string | null>();
  if (commentIds.length === 0) return { reactionMap, myReactionMap };

  const grouped = await prisma.postCommentReaction.groupBy({
    by: ['comment_id', 'type'],
    where: { comment_id: { in: commentIds } },
    _count: { type: true },
  });
  for (const row of grouped) {
    const counts = reactionMap.get(row.comment_id) ?? {};
    counts[row.type || 'like'] = row._count.type;
    reactionMap.set(row.comment_id, counts);
  }

  if (viewerId) {
    const mine = await prisma.postCommentReaction.findMany({
      where: { user_id: viewerId, comment_id: { in: commentIds } },
      select: { comment_id: true, type: true },
    });
    for (const row of mine) myReactionMap.set(row.comment_id, row.type ?? null);
  }

  return { reactionMap, myReactionMap };
}

async function enrichPostCommentTree<T extends {
  id: string;
  user_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
  parent_id: string | null;
  user: { id: string; username: string | null; full_name: string | null; profile_image: string | null };
  replies?: Array<any>;
}>(comments: T[], viewerId?: string) {
  const allIds: string[] = [];
  for (const comment of comments) {
    allIds.push(comment.id);
    if (Array.isArray(comment.replies)) {
      for (const reply of comment.replies) allIds.push(reply.id);
    }
  }
  const { reactionMap, myReactionMap } = await getPostCommentReactionSummary(allIds, viewerId);

  const mapOne = (comment: any) => {
    const reaction_counts = reactionMap.get(comment.id) ?? {};
    const my_reaction = myReactionMap.get(comment.id) ?? null;
    return {
      ...comment,
      reaction_counts,
      reactions_count: sumReactionCounts(reaction_counts),
      my_reaction,
    };
  };

  return comments.map((comment) => ({
    ...mapOne(comment),
    replies: Array.isArray(comment.replies) ? comment.replies.map(mapOne) : [],
  }));
}

export async function listPostComments(
  postId: string,
  viewerId: string | undefined,
  page = 1,
  limit = 50,
) {
  const post = await getPostById(postId, viewerId);
  if (!post) return null;
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;
  const whereRoot = { post_id: postId, parent_id: null as string | null };
  const [rows, total] = await Promise.all([
    prisma.postComment.findMany({
      where: whereRoot,
      include: {
        user: POST_COMMENT_USER_INCLUDE,
        replies: {
          include: { user: POST_COMMENT_USER_INCLUDE },
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: safeLimit,
    }),
    prisma.postComment.count({ where: whereRoot }),
  ]);
  return {
    comments: await enrichPostCommentTree(rows, viewerId),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
}

export async function addPostComment(postId: string, userId: string, content: string, parentId?: string | null) {
  const text = (content ?? '').trim();
  if (!text) {
    const err: any = new Error('Message vide');
    err.statusCode = 400;
    throw err;
  }
  if (text.length > MAX_POST_COMMENT_LEN) {
    const err: any = new Error(`Message trop long (max ${MAX_POST_COMMENT_LEN} caractères)`);
    err.statusCode = 400;
    throw err;
  }
  const post = await getPostById(postId, userId);
  if (!post) {
    const err: any = new Error('Publication introuvable ou non visible');
    err.statusCode = 404;
    throw err;
  }
  if (parentId) {
    const parent = await prisma.postComment.findFirst({
      where: { id: parentId, post_id: postId },
      select: { id: true },
    });
    if (!parent) {
      const err: any = new Error('Commentaire parent introuvable');
      err.statusCode = 400;
      throw err;
    }
  }
  return prisma.postComment.create({
    data: {
      post_id: postId,
      user_id: userId,
      content: text.slice(0, MAX_POST_COMMENT_LEN),
      parent_id: parentId || null,
    },
    include: { user: POST_COMMENT_USER_INCLUDE },
  });
}

export async function updatePostComment(commentId: string, userId: string, content: string) {
  const comment = await prisma.postComment.findUnique({
    where: { id: commentId },
    select: { id: true, user_id: true },
  });
  if (!comment) {
    const err: any = new Error('Commentaire introuvable');
    err.statusCode = 404;
    throw err;
  }
  if (comment.user_id !== userId) {
    const err: any = new Error('Vous ne pouvez modifier que vos propres commentaires');
    err.statusCode = 403;
    throw err;
  }
  const text = String(content ?? '').trim();
  if (!text) {
    const err: any = new Error('Message vide');
    err.statusCode = 400;
    throw err;
  }
  if (text.length > MAX_POST_COMMENT_LEN) {
    const err: any = new Error(`Message trop long (max ${MAX_POST_COMMENT_LEN} caractères)`);
    err.statusCode = 400;
    throw err;
  }
  return prisma.postComment.update({
    where: { id: commentId },
    data: { content: text.slice(0, MAX_POST_COMMENT_LEN) },
    include: { user: POST_COMMENT_USER_INCLUDE },
  });
}

export async function deletePostComment(commentId: string, userId: string) {
  const comment = await prisma.postComment.findUnique({
    where: { id: commentId },
    select: { id: true, user_id: true },
  });
  if (!comment) {
    const err: any = new Error('Commentaire introuvable');
    err.statusCode = 404;
    throw err;
  }
  if (comment.user_id !== userId) {
    const err: any = new Error('Vous ne pouvez supprimer que vos propres commentaires');
    err.statusCode = 403;
    throw err;
  }
  const replies = await prisma.postComment.findMany({
    where: { parent_id: commentId },
    select: { id: true },
  });
  const ids = [commentId, ...replies.map((row) => row.id)];
  await prisma.postComment.deleteMany({ where: { id: { in: ids } } });
  return { deleted: ids.length };
}

export async function setPostCommentReaction(userId: string, commentId: string, typeRaw: string) {
  const type = POST_COMMENT_REACTION_TYPES.has(typeRaw) ? typeRaw : 'like';
  const comment = await prisma.postComment.findUnique({
    where: { id: commentId },
    select: { id: true },
  });
  if (!comment) {
    const err: any = new Error('Commentaire introuvable');
    err.statusCode = 404;
    throw err;
  }
  const existing = await prisma.postCommentReaction.findUnique({
    where: { comment_id_user_id: { comment_id: commentId, user_id: userId } },
  });
  if (existing && existing.type === type) {
    await prisma.postCommentReaction.delete({ where: { id: existing.id } });
  } else if (existing) {
    await prisma.postCommentReaction.update({ where: { id: existing.id }, data: { type } });
  } else {
    await prisma.postCommentReaction.create({
      data: { comment_id: commentId, user_id: userId, type },
    });
  }
  const { reactionMap, myReactionMap } = await getPostCommentReactionSummary([commentId], userId);
  return {
    reaction_counts: reactionMap.get(commentId) ?? {},
    my_reaction: myReactionMap.get(commentId) ?? null,
  };
}
