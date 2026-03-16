/**
 * CPO 5.39 — Préautorisation carte (hold montant avant capture)
 */
import prisma from '../config/database.js';

export async function create(userId: string, amount: number, options?: { order_id?: string; reference?: string; expires_in_hours?: number }) {
  if (!amount || amount <= 0) {
    const err: any = new Error('Montant invalide');
    err.statusCode = 400;
    throw err;
  }
  let expiresAt: Date | null = null;
  if (options?.expires_in_hours) {
    expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + options.expires_in_hours);
  }
  return prisma.paymentPreauth.create({
    data: {
      user_id: userId,
      amount,
      currency: 'XOF',
      order_id: options?.order_id || null,
      reference: options?.reference || null,
      status: 'pending',
      expires_at: expiresAt,
    },
  });
}

export async function capture(preauthId: string, userId: string) {
  const p = await prisma.paymentPreauth.findFirst({ where: { id: preauthId, user_id: userId } });
  if (!p) {
    const err: any = new Error('Préautorisation introuvable');
    err.statusCode = 404;
    throw err;
  }
  if (p.status !== 'pending') {
    const err: any = new Error('Préautorisation déjà traitée ou expirée');
    err.statusCode = 400;
    throw err;
  }
  if (p.expires_at && new Date() > p.expires_at) {
    await prisma.paymentPreauth.update({ where: { id: preauthId }, data: { status: 'expired' } });
    const err: any = new Error('Préautorisation expirée');
    err.statusCode = 400;
    throw err;
  }
  return prisma.paymentPreauth.update({
    where: { id: preauthId },
    data: { status: 'captured', captured_at: new Date() },
  });
}

export async function cancel(preauthId: string, userId: string) {
  const p = await prisma.paymentPreauth.findFirst({ where: { id: preauthId, user_id: userId } });
  if (!p) {
    const err: any = new Error('Préautorisation introuvable');
    err.statusCode = 404;
    throw err;
  }
  if (p.status !== 'pending') {
    return p;
  }
  return prisma.paymentPreauth.update({
    where: { id: preauthId },
    data: { status: 'cancelled' },
  });
}

export async function listByUser(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.paymentPreauth.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.paymentPreauth.count({ where: { user_id: userId } }),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
