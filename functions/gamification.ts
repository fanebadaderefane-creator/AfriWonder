import { legacyApi } from "@/api/legacyClient";

const BADGE_DEFINITIONS = {
  first_upload: {
    name: "Premier Pas",
    description: "Télécharge votre première vidéo",
    icon: "🎬",
    category: "creator",
    requirement_type: "first_upload",
    requirement_value: 1,
    rarity: "common",
    points_reward: 100
  },
  hundred_followers: {
    name: "Influenceur",
    description: "Atteins 100 abonnés",
    icon: "⭐",
    category: "social",
    requirement_type: "follower_count",
    requirement_value: 100,
    rarity: "rare",
    points_reward: 500
  },
  thousand_followers: {
    name: "Célébrité",
    description: "Atteins 1000 abonnés",
    icon: "👑",
    category: "social",
    requirement_type: "follower_count",
    requirement_value: 1000,
    rarity: "epic",
    points_reward: 1500
  },
  five_sales: {
    name: "Entrepreneur",
    description: "Fais 5 ventes",
    icon: "💰",
    category: "commerce",
    requirement_type: "sales_count",
    requirement_value: 5,
    rarity: "uncommon",
    points_reward: 300
  },
  fifty_sales: {
    name: "Marchand",
    description: "Fais 50 ventes",
    icon: "🏪",
    category: "commerce",
    requirement_type: "sales_count",
    requirement_value: 50,
    rarity: "rare",
    points_reward: 1000
  },
  thousand_views: {
    name: "Viral",
    description: "Atteins 1000 vues",
    icon: "🚀",
    category: "viewer",
    requirement_type: "total_views",
    requirement_value: 1000,
    rarity: "uncommon",
    points_reward: 250
  }
};

// Award points for actions
export async function awardPoints(userId, action, amount = 0) {
  try {
    const pointsMap = {
      like: 5,
      comment: 10,
      share: 15,
      upload_video: 50,
      complete_profile: 100,
      make_purchase: 20,
      follow_user: 10,
      community_post: 15
    };

    const pointsToAward = amount || pointsMap[action] || 0;
    if (pointsToAward === 0) return { success: false, error: "Action invalide" };

    // Get or create user points
    let userPoints = await legacyApi.entities.UserPoints.filter({ user_id: userId });
    
    if (!userPoints || userPoints.length === 0) {
      userPoints = await legacyApi.entities.UserPoints.create({
        user_id: userId,
        total_points: pointsToAward,
        lifetime_points: pointsToAward,
        level: 1,
        current_level_points: pointsToAward,
        points_for_next_level: 1000
      });
    } else {
      userPoints = userPoints[0];
      const newTotal = userPoints.total_points + pointsToAward;
      const newLifetime = userPoints.lifetime_points + pointsToAward;
      let newLevel = userPoints.level;
      let newCurrent = userPoints.current_level_points + pointsToAward;

      // Check for level up
      if (newCurrent >= userPoints.points_for_next_level) {
        newLevel += 1;
        newCurrent -= userPoints.points_for_next_level;
      }

      await legacyApi.entities.UserPoints.update(userPoints.id, {
        total_points: newTotal,
        lifetime_points: newLifetime,
        level: newLevel,
        current_level_points: newCurrent,
        last_points_awarded: new Date().toISOString()
      });
    }

    // Check badges
    await checkBadges(userId);

    return { success: true, points: pointsToAward, newTotal: userPoints.total_points + pointsToAward };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Check and award badges
export async function checkBadges(userId) {
  try {
    const user = await legacyApi.auth.me();
    if (!user || user.id !== userId) return;

    const videos = await legacyApi.entities.Video.filter({ creator_id: userId });
    const follows = await legacyApi.entities.Follow.filter({ following_id: userId });
    const orders = await legacyApi.entities.Order.filter({ seller_id: userId });
    const totalViews = videos?.reduce((sum, v) => sum + (v.views_count || 0), 0) || 0;

    const badges = [];

    // Check first upload
    if (videos && videos.length === 1) {
      badges.push("first_upload");
    }

    // Check follower milestones
    const followerCount = follows?.length || 0;
    if (followerCount >= 100) badges.push("hundred_followers");
    if (followerCount >= 1000) badges.push("thousand_followers");

    // Check sales
    const salesCount = orders?.length || 0;
    if (salesCount >= 5) badges.push("five_sales");
    if (salesCount >= 50) badges.push("fifty_sales");

    // Check views
    if (totalViews >= 1000) badges.push("thousand_views");

    // Award new badges
    for (const badgeKey of badges) {
      const badgeDef = BADGE_DEFINITIONS[badgeKey];
      if (!badgeDef) continue;

      // Check if user already has badge
      const existing = await legacyApi.entities.UserBadge.filter({
        user_id: userId,
        badge_id: badgeKey
      });

      if (!existing || existing.length === 0) {
        // Award badge
        await legacyApi.entities.UserBadge.create({
          user_id: userId,
          badge_id: badgeKey,
          badge_name: badgeDef.name,
          badge_icon: badgeDef.icon,
          badge_description: badgeDef.description,
          category: badgeDef.category,
          earned_date: new Date().toISOString()
        });

        // Award points
        await awardPoints(userId, "badge_earned", badgeDef.points_reward);
      }
    }

    return { success: true, badgesAwarded: badges };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get user stats
export async function getUserStats(userId) {
  try {
    const userPoints = await legacyApi.entities.UserPoints.filter({ user_id: userId });
    const badges = await legacyApi.entities.UserBadge.filter({ user_id: userId });

    const stats = userPoints?.[0] || {
      total_points: 0,
      level: 1,
      current_level_points: 0,
      points_for_next_level: 1000
    };

    return {
      success: true,
      stats: {
        ...stats,
        badges_count: badges?.length || 0,
        next_level_progress: (stats.current_level_points / stats.points_for_next_level) * 100
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get leaderboard
export async function getLeaderboard(limit = 50) {
  try {
    const allPoints = await legacyApi.entities.UserPoints.list();
    
    if (!allPoints) {
      return { success: true, leaderboard: [] };
    }

    const sorted = allPoints
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, limit);

    const leaderboard = await Promise.all(
      sorted.map(async (entry, index) => {
        const user = await legacyApi.entities.User.filter({ id: entry.user_id });
        return {
          rank: index + 1,
          user_id: entry.user_id,
          user_name: user?.[0]?.full_name || "Anonyme",
          user_avatar: user?.[0]?.avatar || "",
          total_points: entry.total_points,
          level: entry.level,
          badges_count: entry.badges_count || 0
        };
      })
    );

    return { success: true, leaderboard };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get user badges
export async function getUserBadges(userId) {
  try {
    const badges = await legacyApi.entities.UserBadge.filter({ user_id: userId });
    return { success: true, badges: badges || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Calculate level from points
export function calculateLevel(totalPoints) {
  const pointsPerLevel = 1000;
  return Math.floor(totalPoints / pointsPerLevel) + 1;
}

// Get next level points needed
export function getPointsForNextLevel(currentPoints) {
  const currentLevel = calculateLevel(currentPoints);
  return currentLevel * 1000;
}