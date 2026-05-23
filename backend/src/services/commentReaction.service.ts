import prisma from '../config/database.js';

/** Aligné sur `VideoService.REACTION_TYPES` (phase 23) + variantes commentaires. */
const TYPES = new Set([
  'like',
  'love',
  'fire',
  'laugh',
  'wow',
  'sad',
  'angry',
  'moving',
  'strong',
  'african',
]);

export async function setCommentReaction(userId: string, commentId: string, typeRaw: string) {
  const type = TYPES.has(typeRaw) ? typeRaw : 'like';

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true },
  });
  if (!comment) {
    const err: any = new Error('Commentaire introuvable');
    err.statusCode = 404;
    throw err;
  }

  const existing = await prisma.commentReaction.findUnique({
    where: {
      comment_id_user_id: { comment_id: commentId, user_id: userId },
    },
  });

  if (existing && existing.type === type) {
    await prisma.commentReaction.delete({ where: { id: existing.id } });
  } else if (existing) {
    await prisma.commentReaction.update({
      where: { id: existing.id },
      data: { type },
    });
  } else {
    await prisma.commentReaction.create({
      data: { comment_id: commentId, user_id: userId, type },
    });
  }

  const rows = await prisma.commentReaction.groupBy({
    by: ['type'],
    where: { comment_id: commentId },
    _count: { type: true },
  });
  const reaction_counts: Record<string, number> = {};
  for (const r of rows) {
    reaction_counts[r.type || 'like'] = r._count.type;
  }
  const mine = await prisma.commentReaction.findUnique({
    where: {
      comment_id_user_id: { comment_id: commentId, user_id: userId },
    },
    select: { type: true },
  });

  return { reaction_counts, my_reaction: mine?.type ?? null };
}
