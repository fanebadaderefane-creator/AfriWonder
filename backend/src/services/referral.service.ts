/**
 * AfriWonder - Système de parrainage
 * 1 invité = early supporter | 5 = boost | 10 = priorité algo | 20 = badge | 50 = monétisation rapide
 */
import { randomBytes } from 'crypto';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

const REWARD_TIERS = [
  { invites: 1, type: 'early_supporter', value: 'badge' },
  { invites: 5, type: 'visibility_boost', value: 'boost' },
  { invites: 10, type: 'algorithm_priority', value: 'priority' },
  { invites: 20, type: 'special_badge', value: 'badge_special' },
  { invites: 50, type: 'fast_monetization', value: 'monetization_fast' },
];

function generateReferralCode(): string {
  return 'AW' + randomBytes(4).toString('hex').toUpperCase();
}

async function ensureReferralCodeColumn(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referral_code" TEXT`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_referral_code_key" ON "User"("referral_code")`).catch(() => {});
  } catch (e) {
    logger.warn('Referral: ensureReferralCodeColumn failed', { err: e instanceof Error ? e.message : String(e) });
  }
}

/** Fallback: get/create code via raw SQL when Prisma fails */
async function getOrCreateReferralCodeRaw(userId: string): Promise<string> {
  await ensureReferralCodeColumn();
  const rows = await prisma.$queryRawUnsafe<{ referral_code: string | null }[]>(
    `SELECT referral_code FROM "User" WHERE id = $1`,
    userId
  );
  const existing = rows[0]?.referral_code;
  if (existing) return existing;
  let code = generateReferralCode();
  let exists = await prisma.$queryRawUnsafe<{ id: string }[]>(`SELECT id FROM "User" WHERE referral_code = $1`, code);
  while (exists.length > 0) {
    code = generateReferralCode();
    exists = await prisma.$queryRawUnsafe<{ id: string }[]>(`SELECT id FROM "User" WHERE referral_code = $1`, code);
  }
  await prisma.$executeRawUnsafe(`UPDATE "User" SET referral_code = $1 WHERE id = $2`, code, userId);
  return code;
}

export async function getOrCreateReferralCode(userId: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referral_code: true },
    });
    if (user?.referral_code) return user.referral_code;
    let code = generateReferralCode();
    let exists = await prisma.user.findUnique({ where: { referral_code: code } });
    while (exists) {
      code = generateReferralCode();
      exists = await prisma.user.findUnique({ where: { referral_code: code } });
    }
    await prisma.user.update({
      where: { id: userId },
      data: { referral_code: code },
    });
    return code;
  } catch (err: any) {
    logger.warn('Referral: Prisma failed, using raw SQL fallback', { err: err?.message });
    return getOrCreateReferralCodeRaw(userId);
  }
}

export async function applyReferralCode(newUserId: string, code: string): Promise<{ success: boolean; referrerId?: string }> {
  const referrer = await prisma.user.findFirst({
    where: { referral_code: code.toUpperCase().trim() },
    select: { id: true },
  });
  if (!referrer || referrer.id === newUserId) return { success: false };

  const existing = await prisma.referral.findFirst({
    where: { referrer_id: referrer.id, referred_id: newUserId },
  });
  if (existing) return { success: true, referrerId: referrer.id };

  await prisma.referral.create({
    data: {
      referrer_id: referrer.id,
      referred_id: newUserId,
      status: 'completed',
      completed_at: new Date(),
    },
  });

  const count = await prisma.referral.count({ where: { referrer_id: referrer.id } });
  for (const tier of REWARD_TIERS) {
    if (count >= tier.invites) {
      const hasReward = await prisma.creatorReferralReward.findFirst({
        where: { user_id: referrer.id, reward_type: tier.type },
      });
      if (!hasReward) {
        await prisma.creatorReferralReward.create({
          data: {
            user_id: referrer.id,
            invites_count: tier.invites,
            reward_type: tier.type,
            reward_value: tier.value,
            claimed_at: new Date(),
          },
        });
        logger.info('Referral reward granted', { userId: referrer.id, tier: tier.type });
      }
    }
  }
  return { success: true, referrerId: referrer.id };
}

export async function getReferralStats(userId: string) {
  try {
    const [referrals, rewards, code] = await Promise.all([
      prisma.referral.findMany({
        where: { referrer_id: userId },
        include: { referred: { select: { id: true, username: true, email: true, created_at: true } } },
        orderBy: { created_at: 'desc' },
      }),
      prisma.creatorReferralReward.findMany({
        where: { user_id: userId },
        orderBy: { invites_count: 'asc' },
      }),
      getOrCreateReferralCode(userId),
    ]);

    return {
      code,
      totalReferrals: referrals.length,
      completedReferrals: referrals.filter((r) => r.status === 'completed').length,
      rewards,
      referrals: referrals.slice(0, 20),
    };
  } catch (err: any) {
    logger.warn('Referral: getReferralStats Prisma failed, using minimal fallback', { err: err?.message });
    const code = await getOrCreateReferralCodeRaw(userId);
    return {
      code,
      totalReferrals: 0,
      completedReferrals: 0,
      rewards: [],
      referrals: [],
    };
  }
}
