/**
 * AfriWonder - Badges créateurs: Bronze, Silver, Gold, Elite
 * Bronze 2K | Silver 10K | Gold 50K | Elite 100K+
 */
import prisma from '../config/database.js';

const BADGES = [
  { id: 'creator_bronze', name: 'Bronze', icon: '🥉', minSubs: 2000, description: '2K abonnés' },
  { id: 'creator_silver', name: 'Silver', icon: '🥈', minSubs: 10000, description: '10K abonnés' },
  { id: 'creator_gold', name: 'Gold', icon: '🥇', minSubs: 50000, description: '50K abonnés' },
  { id: 'creator_elite', name: 'Elite', icon: '💎', minSubs: 100000, description: '100K+ abonnés' },
] as const;

export type CreatorBadgeTier = (typeof BADGES)[number]['id'];

export function getBadgeForSubscribers(subscribers: number): (typeof BADGES)[number] | null {
  let best: (typeof BADGES)[number] | null = null;
  for (const b of BADGES) {
    if (subscribers >= b.minSubs) best = b;
  }
  return best;
}

export async function getCreatorBadge(userId: string): Promise<(typeof BADGES)[number] | null> {
  const count = await prisma.follow.count({ where: { following_id: userId } });
  return getBadgeForSubscribers(count);
}

export async function ensureCreatorBadge(userId: string): Promise<void> {
  const badge = await getCreatorBadge(userId);
  if (!badge) return;

  const existing = await prisma.userBadge.findFirst({
    where: { user_id: userId, badge_id: badge.id },
  });
  if (existing) return;

  await prisma.userBadge.create({
    data: {
      user_id: userId,
      badge_id: badge.id,
      badge_name: badge.name,
      badge_icon: badge.icon,
      badge_description: badge.description,
      category: 'creator',
    },
  });
}

export function getAllBadges() {
  return [...BADGES];
}
