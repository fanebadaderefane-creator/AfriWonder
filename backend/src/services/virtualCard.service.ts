/**
 * CPO 5.9 — Cartes virtuelles
 */
import prisma from '../config/database.js';

export async function list(userId: string) {
  return prisma.virtualCard.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });
}

export async function create(userId: string, options?: { spending_limit?: number }) {
  const last4 = String(Math.floor(1000 + Math.random() * 9000));
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 2);
  return prisma.virtualCard.create({
    data: {
      user_id: userId,
      last4,
      brand: 'virtual',
      status: 'active',
      expires_at: expiresAt,
      spending_limit: options?.spending_limit ?? null,
    },
  });
}

export async function revoke(cardId: string, userId: string) {
  const card = await prisma.virtualCard.findFirst({ where: { id: cardId, user_id: userId } });
  if (!card) {
    const err: any = new Error('Carte introuvable');
    err.statusCode = 404;
    throw err;
  }
  return prisma.virtualCard.update({
    where: { id: cardId },
    data: { status: 'blocked' },
  });
}
