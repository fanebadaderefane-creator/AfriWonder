/**
 * AfriWonder - Dashboard créateur
 * Revenus dons, revenus vidéos, vues totales, engagement, progression monétisation
 */
import prisma from '../config/database.js';
import * as monetizationService from './monetization.service.js';
import * as creatorBadgesService from './creatorBadges.service.js';
import { calculateVideoEarnings } from './qualifiedView.service.js';

export async function getCreatorDashboard(userId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    user,
    monetizationStatus,
    pendingRequest,
    badge,
    donationsStats,
    liveGiftStats,
    liveTipStats,
    recentLiveGifts,
    recentLiveTips,
    videoStats,
    totalQualifiedViews,
    viralBonuses,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        monetization_enabled: true,
        monetization_suspended_at: true,
        is_verified: true,
        created_at: true,
      },
    }),
    monetizationService.checkMonetizationEligibility(userId),
    prisma.monetizationRequest.findFirst({
      where: { creator_id: userId, status: 'pending' },
    }),
    creatorBadgesService.getCreatorBadge(userId),
    prisma.creatorSupport.aggregate({
      where: { creator_id: userId },
      _sum: { creator_earnings: true, amount_fcfa: true },
      _count: true,
    }),
    prisma.liveGift.aggregate({
      where: { creator_id: userId },
      _sum: { creator_earnings: true, total_amount: true },
      _count: true,
    }),
    prisma.liveTip.aggregate({
      where: { creator_id: userId },
      _sum: { creator_earnings: true, amount: true },
      _count: true,
    }),
    prisma.liveGift.findMany({
      where: { creator_id: userId },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        id: true,
        gift_name: true,
        creator_earnings: true,
        total_amount: true,
        quantity: true,
        created_at: true,
      },
    }),
    prisma.liveTip.findMany({
      where: { creator_id: userId },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        id: true,
        amount: true,
        creator_earnings: true,
        message: true,
        created_at: true,
      },
    }),
    prisma.video.aggregate({
      where: { creator_id: userId },
      _sum: { views: true, likes: true },
      _count: true,
    }),
    prisma.video.aggregate({
      where: { creator_id: userId },
      _sum: { qualified_views_count: true },
    }),
    prisma.viralBonus.findMany({
      where: { creator_id: userId },
      orderBy: { created_at: 'desc' },
    }),
  ]);

  const donationsRevenue = donationsStats._sum?.creator_earnings ?? 0;
  const liveGiftsRevenue = liveGiftStats._sum?.creator_earnings ?? 0;
  const liveTipsRevenue = liveTipStats._sum?.creator_earnings ?? 0;
  const videoRevenue = calculateVideoEarnings(totalQualifiedViews._sum?.qualified_views_count ?? 0);
  const totalViews = videoStats._sum?.views ?? 0;
  const totalLikes = videoStats._sum?.likes ?? 0;
  const videoCount = videoStats._count ?? 0;
  const engagementRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0;

  return {
    monetization: {
      enabled: user?.monetization_enabled ?? false,
      suspended: !!user?.monetization_suspended_at,
      pending_request: !!pendingRequest,
      status: monetizationStatus,
    },
    badge: badge
      ? { id: badge.id, name: badge.name, icon: badge.icon, description: badge.description }
      : null,
    revenues: {
      donations_fcfa: donationsRevenue,
      live_gifts_fcfa: liveGiftsRevenue,
      live_tips_fcfa: liveTipsRevenue,
      video_fcfa: videoRevenue,
      total_fcfa: donationsRevenue + liveGiftsRevenue + liveTipsRevenue + videoRevenue,
    },
    stats: {
      total_views: totalViews,
      qualified_views: totalQualifiedViews._sum?.qualified_views_count ?? 0,
      total_likes: totalLikes,
      video_count: videoCount,
      engagement_rate_pct: Math.round(engagementRate * 100) / 100,
      live_gifts_count: liveGiftStats._count ?? 0,
      live_tips_count: liveTipStats._count ?? 0,
    },
    recent_live_gifts: recentLiveGifts,
    recent_live_tips: recentLiveTips,
    viral_bonuses: viralBonuses || [],
  };
}
