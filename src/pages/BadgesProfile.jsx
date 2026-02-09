import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Star, Lock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { badgeDefinitions } from '@/components/common/GamificationService';
import { motion } from 'framer-motion';

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

  // Fetch user badges
  const { data: userBadges, _isLoading: _badgesLoading } = useQuery({
    queryKey: ['userBadges', userId || user?.id],
    queryFn: () => api.entities.UserBadge.filter({ user_id: userId || user?.id }),
    enabled: !!(userId || user?.id)
  });

  // Fetch user points
  const { data: userPoints } = useQuery({
    queryKey: ['userPoints', userId || user?.id],
    queryFn: async () => {
      const points = await api.entities.UserPoints.filter({ user_id: userId || user?.id });
      return points?.[0]?.balance || 0;
    },
    enabled: !!(userId || user?.id)
  });

  // Fetch user stats
  const { data: userStats } = useQuery({
    queryKey: ['userStats', userId || user?.id],
    queryFn: async () => {
      const videos = await api.videos.list({ creator_id: userId || user?.id });
      const followers = await api.users.getFollowing({ following_id: userId || user?.id });
      const likes = await api.saves.list({ user_id: userId || user?.id });
      return {
        videos: videos?.length || 0,
        followers: followers?.length || 0,
        likes: likes?.length || 0
      };
    },
    enabled: !!(userId || user?.id)
  });

  const currentUserId = userId || user?.id;
  const earnedBadgeIds = userBadges?.map(b => b.badge_id) || [];
  const availableBadges = Object.entries(badgeDefinitions).map(([id, badge]) => ({
    id,
    ...badge
  }));

  const earnedBadges = availableBadges.filter(b => earnedBadgeIds.includes(b.id));
  const lockedBadges = availableBadges.filter(b => !earnedBadgeIds.includes(b.id));

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 pb-20">
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
        {/* Points & Stats */}
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Points totaux</p>
                <p className="text-4xl font-bold">{userPoints || 0}</p>
              </div>
              <Star className="w-16 h-16 opacity-30" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 text-center border-l-4 border-purple-500">
              <p className="text-2xl font-bold text-gray-900">{userStats?.videos || 0}</p>
              <p className="text-xs text-gray-600 mt-1">Vidéos</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center border-l-4 border-blue-500">
              <p className="text-2xl font-bold text-gray-900">{userStats?.followers || 0}</p>
              <p className="text-xs text-gray-600 mt-1">Followers</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center border-l-4 border-pink-500">
              <p className="text-2xl font-bold text-gray-900">{earnedBadges.length}</p>
              <p className="text-xs text-gray-600 mt-1">Badges</p>
            </div>
          </div>
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
                  className="bg-white rounded-2xl p-4 text-center border-2 border-green-500 shadow-lg"
                >
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <p className="font-bold text-sm text-gray-900">{badge.name}</p>
                  <p className="text-xs text-gray-600 mt-1">{badge.description}</p>
                  <div className="mt-3 flex items-center justify-center gap-1 text-amber-600 text-xs font-semibold">
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
                  <div className="mt-3 text-amber-600 text-xs font-semibold">+{badge.points}</div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Achievement tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
          <p className="font-semibold text-blue-900 text-sm">💡 Comment débloquer plus de badges</p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Publiez votre première vidéo</li>
            <li>• Atteindrez 100 followers</li>
            <li>• Créez 10 vidéos</li>
            <li>• Obtenez une vérification</li>
            <li>• Devenez créateur ou commerçant</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

