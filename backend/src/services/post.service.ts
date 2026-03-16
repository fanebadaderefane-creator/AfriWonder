import prisma from '../config/database.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

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
  const imageUrls = Array.isArray(data.images) ? data.images.map((u) => String(u).trim()).filter(Boolean) : [];
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

  const [rows, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, full_name: true, profile_image: true } },
        poll: true,
        images: { orderBy: { position: 'asc' } },
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
  const imageUrls = Array.isArray(data.images) ? data.images.map((u) => String(u).trim()).filter(Boolean) : null;

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
