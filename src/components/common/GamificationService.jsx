import { api } from '@/api/expressClient';

export const badgeDefinitions = {
  'first_video': { name: '📹 Première vidéo', points: 100, icon: '📹', description: 'Publier sa première vidéo' },
  'verified': { name: '✅ Utilisateur vérifié', points: 250, icon: '✅', description: 'Compte vérifié' },
  '10_videos': { name: '🎬 10 vidéos', points: 500, icon: '🎬', description: 'Publier 10 vidéos' },
  '100_followers': { name: '👥 100 followers', points: 750, icon: '👥', description: 'Atteindre 100 followers' },
  '1k_followers': { name: '⭐ 1K followers', points: 1500, icon: '⭐', description: 'Atteindre 1000 followers' },
  '10k_followers': { name: '🏆 10K followers', points: 5000, icon: '🏆', description: 'Atteindre 10000 followers' },
  'creator': { name: '🎥 Créateur', points: 1000, icon: '🎥', description: 'Avoir 1000+ followers et 10+ vidéos' },
  'merchant': { name: '🛍️ Commerçant', points: 2000, icon: '🛍️', description: 'Vendre 10+ produits' },
  'educator': { name: '📚 Éducateur', points: 1500, icon: '📚', description: 'Créer un cours avec 100+ étudiants' },
  'influencer': { name: '✨ Influenceur', points: 5000, icon: '✨', description: 'Atteindre 100K followers' },
  'early_adopter': { name: '⏰ Adoptant précoce', points: 500, icon: '⏰', description: 'Rejoindre dans les 100 premiers' },
  'community_helper': { name: '🤝 Aide communautaire', points: 300, icon: '🤝', description: 'Aider 50+ personnes' },
};

export async function awardPoints(userId, points, _reason) {
  try {
    let userPoints = await api.entities.UserPoints.filter({ user_id: userId });
    
    if (userPoints?.length > 0) {
      await api.entities.UserPoints.update(userPoints[0].id, {
        balance: userPoints[0].balance + points
      });
    } else {
      await api.entities.UserPoints.create({
        user_id: userId,
        balance: points
      });
    }

    return { success: true, points };
  } catch (_error) {
    console.error('Error awarding points:', error);
    return { success: false, error: error.message };
  }
}

export async function awardBadge(userId, badgeId) {
  try {
    const badgeDefinition = badgeDefinitions[badgeId];
    if (!badgeDefinition) return { success: false, error: 'Badge not found' };

    // Check if user already has badge
    const existing = await api.entities.UserBadge.filter({
      user_id: userId,
      badge_id: badgeId
    });

    if (existing?.length > 0) {
      return { success: false, error: 'Badge already awarded' };
    }

    // Award badge
    await api.entities.UserBadge.create({
      user_id: userId,
      badge_id: badgeId,
      badge_name: badgeDefinition.name,
      badge_icon: badgeDefinition.icon,
      awarded_date: new Date().toISOString()
    });

    // Award points
    await awardPoints(userId, badgeDefinition.points, `Badge awarded: ${badgeId}`);

    return { success: true, badge: badgeDefinition };
  } catch (_error) {
    console.error('Error awarding badge:', error);
    return { success: false, error: error.message };
  }
}

export async function checkAndAwardBadges(userId) {
  try {
    // Get user data
    const user = await api.auth.me();
    const videos = await api.videos.list({ page: 1, limit: 50 });
    const followers = await api.users.getFollowing(userId);
    const userBadges = await api.entities.UserBadge.filter({ user_id: userId });
    const badges = userBadges.map(b => b.badge_id);

    const newBadges = [];

    // First video badge
    if (videos?.length > 0 && !badges.includes('first_video')) {
      const result = await awardBadge(userId, 'first_video');
      if (result.success) newBadges.push(result.badge);
    }

    // 10 videos badge
    if (videos?.length >= 10 && !badges.includes('10_videos')) {
      const result = await awardBadge(userId, '10_videos');
      if (result.success) newBadges.push(result.badge);
    }

    // Followers badges
    if (followers?.length >= 100 && !badges.includes('100_followers')) {
      const result = await awardBadge(userId, '100_followers');
      if (result.success) newBadges.push(result.badge);
    }

    if (followers?.length >= 1000 && !badges.includes('1k_followers')) {
      const result = await awardBadge(userId, '1k_followers');
      if (result.success) newBadges.push(result.badge);
    }

    if (followers?.length >= 10000 && !badges.includes('10k_followers')) {
      const result = await awardBadge(userId, '10k_followers');
      if (result.success) newBadges.push(result.badge);
    }

    // Creator badge
    if (followers?.length >= 1000 && videos?.length >= 10 && !badges.includes('creator')) {
      const result = await awardBadge(userId, 'creator');
      if (result.success) newBadges.push(result.badge);
    }

    // Verified badge
    if (user?.role === 'admin' || user?.verified === true && !badges.includes('verified')) {
      const result = await awardBadge(userId, 'verified');
      if (result.success) newBadges.push(result.badge);
    }

    return { success: true, newBadges };
  } catch (_error) {
    console.error('Error checking badges:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserStats(userId) {
  try {
    const videos = await api.videos.list({ page: 1, limit: 50 });
    const followers = await api.users.getFollowing(userId);
    const badges = await api.entities.UserBadge.filter({ user_id: userId });
    const points = await api.entities.UserPoints.filter({ user_id: userId });

    return {
      videosCount: videos?.length || 0,
      followersCount: followers?.length || 0,
      badgesCount: badges?.length || 0,
      pointsBalance: points?.[0]?.balance || 0
    };
  } catch (_error) {
    console.error('Error getting user stats:', error);
    return { videosCount: 0, followersCount: 0, badgesCount: 0, pointsBalance: 0 };
  }
}


