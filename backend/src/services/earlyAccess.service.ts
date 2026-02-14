import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

const DEFAULT_MAX_USERS = 1000;

async function getMaxUsers(): Promise<number> {
  const row = await prisma.platformSettings.findUnique({
    where: { key: 'early_access_max_users' },
  });
  if (!row || row.value == null) return DEFAULT_MAX_USERS;
  const v = row.value as number;
  return typeof v === 'number' ? v : DEFAULT_MAX_USERS;
}

export async function getEarlyAccessConfig() {
  const [maxUsers, totalUsers] = await Promise.all([
    getMaxUsers(),
    prisma.user.count({ where: { account_suspended: false } }),
  ]);
  const isFull = totalUsers >= maxUsers;
  return {
    maxUsers,
    totalUsers,
    isFull,
    spotsLeft: Math.max(0, maxUsers - totalUsers),
  };
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
