import prisma from '../config/database.js';

export type BlacklistType = 'user' | 'device' | 'ip';

export async function isBlacklisted(type: BlacklistType, value: string, checkExpiry = true): Promise<boolean> {
  if (!value?.trim()) return false;
  const now = new Date();
  const where: any = { type, value: value.trim() };
  if (checkExpiry) where.OR = [{ expires_at: null }, { expires_at: { gt: now } }];
  const entry = await prisma.blacklistEntry.findFirst({ where });
  return !!entry;
}

export async function addToBlacklist(type: BlacklistType, value: string, opts?: { reason?: string; createdBy?: string; expiresAt?: Date }): Promise<void> {
  await prisma.blacklistEntry.create({
    data: { type, value: value.trim(), reason: opts?.reason, created_by: opts?.createdBy, expires_at: opts?.expiresAt },
  });
}

export async function checkUserBlacklisted(userId: string): Promise<boolean> {
  return isBlacklisted('user', userId);
}

export async function checkIpBlacklisted(ip: string | undefined): Promise<boolean> {
  return ip ? isBlacklisted('ip', ip) : false;
}

export async function checkDeviceBlacklisted(deviceId: string | undefined): Promise<boolean> {
  return deviceId ? isBlacklisted('device', deviceId) : false;
}
