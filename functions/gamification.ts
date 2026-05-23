import { api } from "@/api/expressClient";

const BADGE_DEFINITIONS: Record<string, { name: string; description: string; icon: string; category: string; points_reward: number }> = {
  first_upload: {
    name: "Premier Pas",
    description: "Télécharge votre première vidéo",
    icon: "🎬",
    category: "creator",
    points_reward: 100,
  },
  hundred_followers: {
    name: "Influenceur",
    description: "Atteins 100 abonnés",
    icon: "⭐",
    category: "social",
    points_reward: 500,
  },
  thousand_followers: {
    name: "Célébrité",
    description: "Atteins 1000 abonnés",
    icon: "👑",
    category: "social",
    points_reward: 1500,
  },
  five_sales: {
    name: "Entrepreneur",
    description: "Fais 5 ventes",
    icon: "💰",
    category: "commerce",
    points_reward: 300,
  },
  fifty_sales: {
    name: "Marchand",
    description: "Fais 50 ventes",
    icon: "🏪",
    category: "commerce",
    points_reward: 1000,
  },
  thousand_views: {
    name: "Viral",
    description: "Atteins 1000 vues",
    icon: "🚀",
    category: "viewer",
    points_reward: 250,
  },
};

export async function awardPoints(userId: string, action: string, amount = 0) {
  try {
    const pointsMap: Record<string, number> = {
      like: 5,
      comment: 10,
      share: 15,
      upload_video: 50,
      complete_profile: 100,
      make_purchase: 20,
      follow_user: 10,
      community_post: 15,
    };
    const pointsToAward = amount || pointsMap[action] || 0;
    if (pointsToAward === 0) return { success: false, error: "Action invalide" };

    const result = await api.gamification.awardPoints({ userId, action, amount: pointsToAward });
    await checkBadges(userId);
    return {
      success: true,
      points: pointsToAward,
      newTotal: result?.newTotal ?? 0,
    };
  } catch (error: any) {
    return { success: false, error: error?.message ?? String(error) };
  }
}

export async function checkBadges(userId: string) {
  try {
    const user = await api.auth.me();
    if (!user || user.id !== userId) return { success: false, badgesAwarded: [] };

    const [videosRes, followersRes, ordersRes, meData] = await Promise.all([
      api.videos.list({ creator_id: userId, page: 1, limit: 1000 }),
      api.users.getFollowers(userId),
      api.orders.list({ as: "seller", page: 1, limit: 500 }),
      api.gamification.getMe(),
    ]);

    const videos = Array.isArray(videosRes) ? videosRes : (videosRes as any)?.videos ?? (videosRes as any)?.data ?? [];
    const follows = Array.isArray(followersRes) ? followersRes : (followersRes as any)?.followers ?? [];
    const orders = Array.isArray(ordersRes) ? ordersRes : (ordersRes as any)?.orders ?? [];
    const totalViews = videos.reduce((sum: number, v: any) => sum + (v.views ?? 0), 0);

    const badges: string[] = [];
    if (videos.length === 1) badges.push("first_upload");
    const followerCount = Array.isArray(follows) ? follows.length : 0;
    if (followerCount >= 100) badges.push("hundred_followers");
    if (followerCount >= 1000) badges.push("thousand_followers");
    if (orders.length >= 5) badges.push("five_sales");
    if (orders.length >= 50) badges.push("fifty_sales");
    if (totalViews >= 1000) badges.push("thousand_views");

    const existingBadges = new Set((meData?.badges ?? []).map((b: any) => b.badge_id));
    for (const badgeKey of badges) {
      if (existingBadges.has(badgeKey)) continue;
      const badgeDef = BADGE_DEFINITIONS[badgeKey];
      if (!badgeDef) continue;
      await api.gamification.awardBadge({
        userId,
        badge_id: badgeKey,
        badge_name: badgeDef.name,
        badge_icon: badgeDef.icon,
        badge_description: badgeDef.description,
        category: badgeDef.category,
      });
      await awardPoints(userId, "badge_earned", badgeDef.points_reward);
    }
    return { success: true, badgesAwarded: badges };
  } catch (error: any) {
    return { success: false, error: error?.message ?? String(error) };
  }
}

export async function getUserStats(userId: string) {
  try {
    const data = await api.gamification.getMe();
    const stats = data ?? {
      total_points: 0,
      level: 1,
      current_level_points: 0,
      points_for_next_level: 1000,
    };
    return {
      success: true,
      stats: {
        ...stats,
        badges_count: data?.badges_count ?? data?.badges?.length ?? 0,
        next_level_progress: data?.next_level_progress ?? (stats.points_for_next_level > 0 ? (stats.current_level_points / stats.points_for_next_level) * 100 : 0),
      },
    };
  } catch (error: any) {
    return { success: false, error: error?.message ?? String(error) };
  }
}

export async function getLeaderboard(limit = 50) {
  try {
    const result = await api.leaderboard.get({ limit });
    const leaderboard = (result?.leaderboard ?? result ?? []).slice(0, limit);
    return { success: true, leaderboard };
  } catch (error: any) {
    return { success: false, error: error?.message ?? String(error), leaderboard: [] };
  }
}

export async function getUserBadges(userId: string) {
  try {
    const data = await api.gamification.getMe();
    const badges = data?.badges ?? [];
    return { success: true, badges: Array.isArray(badges) ? badges : [] };
  } catch (error: any) {
    return { success: false, error: error?.message ?? String(error), badges: [] };
  }
}

export function calculateLevel(totalPoints: number) {
  return Math.floor(totalPoints / 1000) + 1;
}

export function getPointsForNextLevel(currentPoints: number) {
  return (Math.floor(currentPoints / 1000) + 1) * 1000;
}
