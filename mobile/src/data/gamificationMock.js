/**
 * Données fictives Gamification / Leaderboard / Badges AfriWonder — démo
 */

export const MOCK_BADGES = [
  { id: 'first_upload', badge_id: 'first_upload', name: 'Premier Pas', description: 'Téléchargez votre première vidéo', icon: '🎬', category: 'creator', rarity: 'common', points: 100, earned: true },
  { id: 'hundred_followers', badge_id: 'hundred_followers', name: 'Influenceur', description: 'Atteignez 100 abonnés', icon: '⭐', category: 'social', rarity: 'rare', points: 500, earned: true },
  { id: 'thousand_followers', badge_id: 'thousand_followers', name: 'Célébrité', description: 'Atteignez 1000 abonnés', icon: '👑', category: 'social', rarity: 'epic', points: 1500, earned: false },
  { id: 'five_sales', badge_id: 'five_sales', name: 'Entrepreneur', description: 'Faites 5 ventes', icon: '💰', category: 'commerce', rarity: 'uncommon', points: 300, earned: true },
  { id: 'thousand_views', badge_id: 'thousand_views', name: 'Viral', description: 'Atteignez 1000 vues', icon: '🚀', category: 'viewer', rarity: 'uncommon', points: 250, earned: true },
  { id: 'verified', badge_id: 'verified', name: 'Utilisateur vérifié', description: 'Compte vérifié', icon: '✅', category: 'social', rarity: 'rare', points: 250, earned: false },
];

export const MOCK_USER_BADGES = [
  { id: 'b1', badge_id: 'first_upload', badge_name: 'Premier Pas', badge_icon: '🎬' },
  { id: 'b2', badge_id: 'hundred_followers', badge_name: 'Influenceur', badge_icon: '⭐' },
  { id: 'b3', badge_id: 'five_sales', badge_name: 'Entrepreneur', badge_icon: '💰' },
  { id: 'b4', badge_id: 'thousand_views', badge_name: 'Viral', badge_icon: '🚀' },
];

export const MOCK_USER_POINTS = { total_points: 2850 };
export const MOCK_USER_STATS = { videos: 12, followers: 89, likes: 340 };

export const MOCK_LEADERBOARD = [
  { user_id: 'user-1', user_name: 'Amadou Diallo', user_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', total_points: 12500, level: 15, badges_count: 12, rank: 1, country: 'ML', category: 'tech' },
  { user_id: 'user-2', user_name: 'Fatou Sall', user_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', total_points: 9800, level: 12, badges_count: 10, rank: 2, country: 'SN', category: 'business' },
  { user_id: 'user-3', user_name: 'Ibrahim Traoré', user_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', total_points: 8750, level: 11, badges_count: 9, rank: 3, country: 'BF', category: 'education' },
  { user_id: 'user-4', user_name: 'Aissatou Ba', user_avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', total_points: 7200, level: 9, badges_count: 8, rank: 4, country: 'CI', category: 'artisanat' },
  { user_id: 'user-5', user_name: 'Moussa Koné', user_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', total_points: 6500, level: 8, badges_count: 7, rank: 5, country: 'ML', category: 'agriculture' },
  { user_id: 'user-6', user_name: 'Mariam Coulibaly', user_avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop', total_points: 5800, level: 7, badges_count: 6, rank: 6, country: 'ML', category: 'sante' },
  { user_id: 'user-7', user_name: 'Ousmane Diop', user_avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop', total_points: 5200, level: 7, badges_count: 6, rank: 7, country: 'SN', category: 'finance' },
  { user_id: 'user-8', user_name: 'Aminata Keita', user_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', total_points: 4800, level: 6, badges_count: 5, rank: 8, country: 'GN', category: 'tech' },
  { user_id: 'user-9', user_name: 'Bakary Sangaré', user_avatar: 'https://images.unsplash.com/photo-1507591064344-4c6cef03da07?w=100&h=100&fit=crop', total_points: 4200, level: 6, badges_count: 5, rank: 9, country: 'ML', category: 'business' },
  { user_id: 'user-10', user_name: 'Kadiatou Touré', user_avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop', total_points: 3800, level: 5, badges_count: 4, rank: 10, country: 'CI', category: 'education' },
];
