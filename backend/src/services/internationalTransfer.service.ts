/**
 * CPO 5.23 — Transferts internationaux
 */
import prisma from '../config/database.js';

export interface CreateTransferInput {
  recipient_name: string;
  recipient_country: string;
  recipient_iban?: string;
  recipient_phone?: string;
  amount: number;
  currency?: string;
  target_currency?: string;
}

export async function create(senderId: string, input: CreateTransferInput) {
  if (!input.recipient_name?.trim() || !input.recipient_country?.trim() || input.amount <= 0) {
    const err: any = new Error('Données invalides (nom, pays, montant > 0)');
    err.statusCode = 400;
    throw err;
  }
  const reference = `INT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return prisma.internationalTransfer.create({
    data: {
      sender_id: senderId,
      recipient_name: input.recipient_name.trim(),
      recipient_country: input.recipient_country.trim(),
      recipient_iban: input.recipient_iban?.trim() || null,
      recipient_phone: input.recipient_phone?.trim() || null,
      amount: input.amount,
      currency: input.currency || 'XOF',
      target_currency: input.target_currency || null,
      status: 'pending',
      reference,
      fee: input.amount * 0.02,
      exchange_rate: input.target_currency ? 655.957 : null,
    },
  });
}

export async function listByUser(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.internationalTransfer.findMany({
      where: { sender_id: userId },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.internationalTransfer.count({ where: { sender_id: userId } }),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getById(id: string, userId: string) {
  const t = await prisma.internationalTransfer.findFirst({
    where: { id, sender_id: userId },
  });
  if (!t) {
    const err: any = new Error('Transfert introuvable');
    err.statusCode = 404;
    throw err;
  }
  return t;
}
