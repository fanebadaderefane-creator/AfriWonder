import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

const DEFAULT_MAX_USERS = 10000;

async function getMaxUsers(): Promise<number> {
  try {
    const row = await prisma.platformSettings.findUnique({
      where: { key: 'early_access_max_users' },
    });
    if (!row || row.value == null) return DEFAULT_MAX_USERS;
    const v = row.value as number;
    return typeof v === 'number' ? v : DEFAULT_MAX_USERS;
  } catch {
    return DEFAULT_MAX_USERS;
  }
}

const DEFAULT_MAX_MONETIZED = 50;

async function getMaxMonetizedCreators(): Promise<number> {
  try {
    const row = await prisma.platformSettings.findUnique({
      where: { key: 'early_access_max_monetized_creators' },
    });
    if (!row || row.value == null) return DEFAULT_MAX_MONETIZED;
    const v = row.value as number;
    return typeof v === 'number' ? v : DEFAULT_MAX_MONETIZED;
  } catch {
    return DEFAULT_MAX_MONETIZED;
  }
}

async function getMonetizedCount(): Promise<number> {
  try {
    return await prisma.user.count({ where: { monetization_enabled: true } });
  } catch {
    try {
      const r = await prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count FROM "User" WHERE monetization_enabled = true`;
      return r[0]?.count ?? 0;
    } catch {
      return 0;
    }
  }
}

async function getTotalUsersCount(): Promise<number> {
  try {
    const r = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(`SELECT COUNT(*)::int as count FROM "User"`);
    const n = r[0]?.count;
    return typeof n === 'bigint' ? Number(n) : (n ?? 0);
  } catch {
    try {
      return await prisma.user.count();
    } catch {
      return 0;
    }
  }
}

export async function getEarlyAccessConfig() {
  try {
    const [maxUsers, totalUsers, monetizedCount, maxMonetized] = await Promise.all([
      getMaxUsers(),
      getTotalUsersCount(),
      getMonetizedCount(),
      getMaxMonetizedCreators(),
    ]);
    const isFull = totalUsers >= maxUsers;
    return {
      maxUsers,
      totalUsers,
      isFull,
      spotsLeft: Math.max(0, maxUsers - totalUsers),
      monetizedCreators: monetizedCount,
      maxMonetizedCreators: maxMonetized,
    };
  } catch (err) {
    logger.warn('getEarlyAccessConfig failed', { err: err instanceof Error ? err.message : String(err) });
    return {
      maxUsers: DEFAULT_MAX_USERS,
      totalUsers: 0,
      isFull: false,
      spotsLeft: DEFAULT_MAX_USERS,
      monetizedCreators: 0,
      maxMonetizedCreators: DEFAULT_MAX_MONETIZED,
    };
  }
}

export async function joinWaitlist(email: string, fullName?: string) {
  const existing = await prisma.earlyAccessWaitlist.findUnique({
    where: { email },
  });
  if (existing) {
    return { success: true, message: 'Vous êtes déjà sur la liste d\'attente.' };
  }
  await prisma.earlyAccessWaitlist.create({
    data: { email, full_name: fullName },
  });
  logger.info('Early Access waitlist join', { email });
  return { success: true, message: 'Vous avez rejoint la liste d\'attente. Nous vous contacterons bientôt !' };
}

export async function setMaxMonetizedCreators(max: number, adminId: string) {
  const existing = await prisma.platformSettings.findUnique({
    where: { key: 'early_access_max_monetized_creators' },
  });
  if (existing) {
    await prisma.platformSettings.update({
      where: { key: 'early_access_max_monetized_creators' },
      data: { value: max },
    });
  } else {
    await prisma.platformSettings.create({
      data: {
        id: 'ps-early_access_max_monetized',
        key: 'early_access_max_monetized_creators',
        value: max,
      },
    });
  }
  logger.info('Early Access max monetized creators updated', { max, adminId });
  return { maxMonetizedCreators: max };
}

export async function setMaxUsers(max: number, adminId: string) {
  const existing = await prisma.platformSettings.findUnique({
    where: { key: 'early_access_max_users' },
  });
  if (existing) {
    await prisma.platformSettings.update({
      where: { key: 'early_access_max_users' },
      data: { value: max },
    });
  } else {
    await prisma.platformSettings.create({
      data: { id: 'ps-early_access_max_users', key: 'early_access_max_users', value: max },
    });
  }
  logger.info('Early Access max users updated', { max, adminId });
  return { maxUsers: max };
}

export async function canRegister(): Promise<{ allowed: boolean; message?: string }> {
  const { totalUsers, maxUsers, isFull } = await getEarlyAccessConfig();
  if (isFull) {
    return {
      allowed: false,
      message: 'Early Access complet pour le moment. Rejoignez la liste d\'attente.',
    };
  }
  return { allowed: true };
}
