/**
 * AfriWonder - Anti-fraude créateurs
 * Multi-comptes (IP/device), vues anormales, shadow ban, suspension gains
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import * as monetizationService from './monetization.service.js';

const MAX_ACCOUNTS_SAME_IP = 3;
const MAX_VIEWS_PER_HOUR_SPIKE = 500;
const ABNORMAL_VIEW_RATIO = 10; // Si vues/heure > 10x la moyenne

export async function checkMultiAccount(ip: string): Promise<{ suspicious: boolean; count: number }> {
  if (!ip) return { suspicious: false, count: 0 };
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const distinctUsers = await prisma.securityLog.findMany({
    where: {
      action: 'login',
      ip_address: ip,
      created_at: { gte: oneDayAgo },
    },
    select: { user_id: true },
    distinct: ['user_id'],
  });
  const count = distinctUsers.length;
  return { suspicious: count > MAX_ACCOUNTS_SAME_IP, count };
}

export async function checkAbnormalViews(videoId: string, newViewsLastHour: number): Promise<boolean> {
  if (newViewsLastHour > MAX_VIEWS_PER_HOUR_SPIKE) return true;
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { views: true, created_at: true },
  });
  if (!video || video.views < 1000) return false;
  const ageHours = Math.max(1, (Date.now() - video.created_at.getTime()) / (1000 * 60 * 60));
  const avgPerHour = video.views / ageHours;
  if (avgPerHour > 0 && newViewsLastHour > avgPerHour * ABNORMAL_VIEW_RATIO) return true;
  return false;
}

export async function shadowBanUser(userId: string, reason: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { shadow_banned: true },
  });
  await monetizationService.suspendMonetization(userId, reason);
  logger.warn('User shadow banned', { userId, reason });
}

export async function suspendGains(userId: string, reason: string): Promise<void> {
  await monetizationService.suspendMonetization(userId, reason);
  await prisma.suspiciousActivityAlert.create({
    data: {
      user_id: userId,
      alert_type: 'suspicious_views',
      severity: 'high',
      description: reason,
      metadata: { reason },
    },
  });
  logger.warn('Creator gains suspended', { userId, reason });
}

export async function isShadowBanned(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { shadow_banned: true },
  });
  return user?.shadow_banned ?? false;
}
