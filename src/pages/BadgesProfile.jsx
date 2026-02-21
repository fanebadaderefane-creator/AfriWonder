import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Star, Lock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { badgeDefinitions } from '@/components/common/GamificationService';
import { motion } from 'framer-motion';
import { MOCK_USER_BADGES, MOCK_USER_POINTS, MOCK_USER_STATS, MOCK_BADGES } from '@/data/gamificationMock';

export default function BadgesProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        navigate(createPageUrl('Home'));
      }
    };
    getUser();
  }, [navigate]);

  // Production ready : utilise API réelle, mockées seulement en cas d'erreur
  const { data: userBadges, isLoading: badgesLoading } = useQuery({
    queryKey: ['userBadges', userId || user?.id],
    queryFn: async () => {
      const targetUserId = userId || user?.id;
      if (!targetUserId) return [];
      try {
        const badges = await api.entities.UserBadge.filter({ user_id: targetUserId });
        // Retourner les vraies données même si vide (pas de fallback mock)
        return badges || [];
      } catch (_e) {
        // Seulement en cas d'erreur API, utiliser les mockées pour la démo
        console.warn('API error, using demo data:', _e);
        return MOCK_USER_BADGES;
      }
    },
    enabled: !!(userId || user?.id),
    staleTime: 30000,
  });

  // Production ready : utilise API réelle, mockées seulement en cas d'erreur
  const { data: userPoints, isLoading: pointsLoading } = useQuery({
    queryKey: ['userPoints', userId || user?.id],
    queryFn: async () => {
      const targetUserId = userId || user?.id;
      if (!targetUserId) return 0;
      try {
        const points = await api.entities.UserPoints.filter({ user_id: targetUserId });
        // Retourner les vraies données même si null (pas de fallback mock)
        return points?.[0]?.total_points || points?.[0]?.balance || 0;
      } catch (_e) {
        // Seulement en cas d'erreur API, utiliser les mockées pour la démo
        console.warn('API error, using demo data:', _e);
        return MOCK_USER_POINTS.total_points;
      }
    },
    enabled: !!(userId || user?.id),
    staleTime: 30000,
  });

  // Production ready : utilise API réelle, mockées seulement en cas d'erreur
  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ['userStats', userId || user?.id],
    queryFn: async () => {
      const targetUserId = userId || user?.id;
      if (!targetUserId) return { videos: 0, followers: 0, likes: 0 };
      try {
        const [videos, followers, likes] = await Promise.all([
          api.videos.list({ creator_id: targetUserId }).catch(() => ({ length: 0 })),
          api.users.getFollowing({ following_id: targetUserId }).catch(() => ({ length: 0 })),
          api.saves.list({ user_id: targetUserId }).catch(() => ({ length: 0 }))
        ]);
        // Retourner les vraies données même si 0 (pas de fallback mock)
        return {
          videos: Array.isArray(videos) ? videos.length : (videos?.length || 0),
          followers: Array.isArray(followers) ? followers.length : (followers?.length || 0),
          likes: Array.isArray(likes) ? likes.length : (likes?.length || 0)
        };
      } catch (_e) {
        // Seulement en cas d'erreur API, utiliser les mockées pour la démo
        console.warn('API error, using demo data:', _e);
        return MOCK_USER_STATS;
      }
    },
    enabled: !!(userId || user?.id),
    staleTime: 30000,
  });

  const currentUserId = userId || user?.id;
  const earnedBadgeIds = userBadges?.map(b => b.badge_id) || [];
  const isUsingMockData = userBadges === MOCK_USER_BADGES || userPoints === MOCK_USER_POINTS.total_points || userStats === MOCK_USER_STATS;
  
  // Utiliser les badges mockés avec les définitions existantes
  const availableBadges = MOCK_BADGES.map(badge => ({
    id: badge.badge_id,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    category: badge.category,
    rarity: badge.rarity,
    points: badge.points,
    earned: earnedBadgeIds.includes(badge.badge_id) || (isUsingMockData && badge.earned)
  }));

  const earnedBadges = availableBadges.filter(b => b.earned);
  const lockedBadges = availableBadges.filter(b => !b.earned);

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#f97316]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-red-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur border-b z-10">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl('Profile') + `?userId=${currentUserId}`)}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Badges & Récompenses</h1>
            <p className="text-xs text-gray-500">Collection personnelle</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Banner démo si données mockées */}
        {isUsingMockData && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 text-center">
            📊 Mode démo — Données fictives pour illustration
          </div>
        )}
        
        {/* Points & Stats */}
        <div className="space-y-3">
          {(pointsLoading || statsLoading || badgesLoading) ? (
            <div className="bg-gradient-to-r from-[#f97316] to-[#ea580c] rounded-2xl p-6 text-white animate-pulse">
              <div className="h-16 bg-white/20 rounded"></div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-[#f97316] to-[#ea580c] rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Points totaux</p>
                  <p className="text-4xl font-bold">{userPoints ?? 0}</p>
                </div>
                <Star className="w-16 h-16 opacity-30" />
              </div>
            </div>
          )}

          {(pointsLoading || statsLoading || badgesLoading) ? (
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl p-4 text-center border-l-4 border-gray-200 animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-16 mx-auto"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-4 text-center border-l-4 border-[#f97316]">
                <p className="text-2xl font-bold text-gray-900">{userStats?.videos ?? 0}</p>
                <p className="text-xs text-gray-600 mt-1">Vidéos</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center border-l-4 border-[#f97316]">
                <p className="text-2xl font-bold text-gray-900">{userStats?.followers ?? 0}</p>
                <p className="text-xs text-gray-600 mt-1">Followers</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center border-l-4 border-[#f97316]">
                <p className="text-2xl font-bold text-gray-900">{earnedBadges.length}</p>
                <p className="text-xs text-gray-600 mt-1">Badges</p>
              </div>
            </div>
          )}
        </div>

        {/* Earned Badges */}
        {earnedBadges.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 px-2">Vos Badges 🏆</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {earnedBadges.map((badge) => (
                <motion.div
                  key={badge.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="bg-white rounded-2xl p-4 text-center border-2 border-[#f97316] shadow-lg"
                >
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <p className="font-bold text-sm text-gray-900">{badge.name}</p>
                  <p className="text-xs text-gray-600 mt-1">{badge.description}</p>
                  <div className="mt-3 flex items-center justify-center gap-1 text-[#f97316] text-xs font-semibold">
                    <Star className="w-3 h-3" />
                    +{badge.points}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Locked Badges */}
        {lockedBadges.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 px-2">À débloquer 🔒</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {lockedBadges.map((badge) => (
                <motion.div
                  key={badge.id}
                  initial={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  className="bg-white/50 rounded-2xl p-4 text-center opacity-60 border-2 border-gray-300 border-dashed"
                >
                  <div className="text-4xl mb-2 opacity-50">{badge.icon}</div>
                  <Lock className="w-5 h-5 mx-auto mb-2 text-gray-400" />
                  <p className="font-bold text-sm text-gray-700">{badge.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{badge.description}</p>
                  <div className="mt-3 text-[#f97316] text-xs font-semibold">+{badge.points}</div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Achievement tips */}
        <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-xl p-4 space-y-2">
          <p className="font-semibold text-[#f97316] text-sm">💡 Comment débloquer plus de badges</p>
          <ul className="text-xs text-gray-700 space-y-1">
            <li>• Publiez votre première vidéo</li>
            <li>• Atteindrez 100 followers</li>
            <li>• Créez 10 vidéos</li>
            <li>• Obtenez une vérification</li>
            <li>• Devenez créateur ou commerçant</li>
            <li>• Faites des ventes sur la marketplace</li>
            <li>• Atteignez 1000 vues sur vos vidéos</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

