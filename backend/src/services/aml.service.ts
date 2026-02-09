import prisma from '../config/database.js';

const AML_THRESHOLD_XOF = Number(process.env.AML_THRESHOLD_XOF) || 1_000_000;

export async function checkAndFlagIfNeeded(
  referenceType: string,
  referenceId: string | null,
  userId: string,
  amount: number,
  currency: string
): Promise<{ flagged: boolean; flagId?: string }> {
  if (amount < AML_THRESHOLD_XOF) return { flagged: false };
  const flag = await prisma.transactionFlag.create({
    data: {
      reference_type: referenceType,
      reference_id: referenceId,
      user_id: userId,
      amount,
      currency: currency || 'XOF',
      reason: 'amount_threshold',
      status: 'pending',
    },
  });
  return { flagged: true, flagId: flag.id };
}

export async function listPendingFlags(page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.transactionFlag.findMany({
      where: { status: 'pending' },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.transactionFlag.count({ where: { status: 'pending' } }),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
