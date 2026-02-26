import React, { useState, useEffect } from "react";
import { api } from "@/api/expressClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "@/components/common/useTranslation";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MOCK_BADGES, MOCK_USER_STATS, MOCK_USER_BADGES } from "@/data/gamificationMock";

const BADGE_DEFINITIONS = {
  first_upload: {
    name: "Premier Pas",
    description: "Télécharge votre première vidéo",
    icon: "🎬",
    category: "creator",
    rarity: "common"
  },
  hundred_followers: {
    name: "Influenceur",
    description: "Atteins 100 abonnés",
    icon: "⭐",
    category: "social",
    rarity: "rare"
  },
  thousand_followers: {
    name: "Célébrité",
    description: "Atteins 1000 abonnés",
    icon: "👑",
    category: "social",
    rarity: "epic"
  },
  five_sales: {
    name: "Entrepreneur",
    description: "Fais 5 ventes",
    icon: "💰",
    category: "commerce",
    rarity: "uncommon"
  },
  fifty_sales: {
    name: "Marchand",
    description: "Fais 50 ventes",
    icon: "🏪",
    category: "commerce",
    rarity: "rare"
  },
  thousand_views: {
    name: "Viral",
    description: "Atteins 1000 vues",
    icon: "🚀",
    category: "viewer",
    rarity: "uncommon"
  }
};

const rarityColors = {
  common: "bg-gray-100 text-gray-800 border-gray-300",
  uncommon: "bg-green-100 text-green-800 border-green-300",
  rare: "bg-[#f97316]/20 text-[#f97316] border-[#f97316]/50",
  epic: "bg-purple-100 text-purple-800 border-purple-300",
  legendary: "bg-yellow-100 text-yellow-800 border-yellow-300"
};

export default function Achievements() {
  const { _t } = useTranslation();
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await api.auth.me();
        setUser(currentUser);
      } catch (_error) {
        console.error("Not authenticated");
      }
    };

    fetchUser();
  }, []);

  // Fetch user badges — production ready : utilise API réelle, mockées seulement en cas d'erreur
  const { data: badges, isLoading: badgesLoading } = useQuery({
    queryKey: ["userBadges", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const userBadges = await api.entities.UserBadge.filter({
          user_id: user.id
        });
        // Retourner les vraies données même si vide (pas de fallback mock)
        return userBadges || [];
      } catch (_e) {
        // Seulement en cas d'erreur API, utiliser les mockées pour la démo
        console.warn('API error, using demo data:', _e);
        return MOCK_USER_BADGES;
      }
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache 30s
  });

  // Fetch user stats — production ready : utilise API réelle, mockées seulement en cas d'erreur
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["userStats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const userPoints = await api.entities.UserPoints.filter({
          user_id: user.id
        });
        // Retourner les vraies données même si null (pas de fallback mock)
        return userPoints?.[0] || null;
      } catch (_e) {
        // Seulement en cas d'erreur API, utiliser les mockées pour la démo
        console.warn('API error, using demo data:', _e);
        return MOCK_USER_STATS;
      }
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache 30s
  });

  const earnedBadgeIds = new Set(badges?.map(b => b.badge_id) || []);
  const isUsingMockData = badges === MOCK_USER_BADGES || stats === MOCK_USER_STATS;
  
  // Utiliser les badges mockés avec les définitions existantes
  const allBadges = MOCK_BADGES.map(badge => ({
    id: badge.badge_id,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    category: badge.category,
    rarity: badge.rarity,
    earned: earnedBadgeIds.has(badge.badge_id) || (isUsingMockData && badge.earned)
  }));

  const filteredBadges = filter === "all" 
    ? allBadges 
    : allBadges.filter(b => b.category === filter);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to={createPageUrl("Profile")}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Badges & Accomplissements
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Stats */}
        <Card className="mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            {(badgesLoading || statsLoading) ? (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
                </div>
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
                </div>
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
                </div>
              </div>
            ) : (
              <>
                {isUsingMockData && (
                  <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 text-center">
                    📊 Mode démo — Données fictives pour illustration
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-[#f97316]">
                      {stats?.total_points ?? 0}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Points totaux</p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-[#f97316]">
                      {stats?.level ?? 1}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Niveau</p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-[#f97316]">
                      {badges?.length ?? 0}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Badges</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            Tous
          </Button>
          <Button
            size="sm"
            variant={filter === "creator" ? "default" : "outline"}
            onClick={() => setFilter("creator")}
          >
            Créateur
          </Button>
          <Button
            size="sm"
            variant={filter === "social" ? "default" : "outline"}
            onClick={() => setFilter("social")}
          >
            Social
          </Button>
          <Button
            size="sm"
            variant={filter === "commerce" ? "default" : "outline"}
            onClick={() => setFilter("commerce")}
          >
            Commerce
          </Button>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBadges.map((badge, index) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={`transition-all ${
                  badge.earned ? "border-[#f97316] shadow-md" : "opacity-60 border-gray-200"
                }`}
              >
                <CardContent className="p-6 text-center">
                  <div className="text-6xl mb-4">{badge.icon}</div>
                  {!badge.earned && (
                    <Lock className="w-8 h-8 text-gray-400 absolute top-4 right-4" />
                  )}
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    {badge.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {badge.description}
                  </p>
                  <Badge className={rarityColors[badge.rarity]}>
                    {badge.rarity}
                  </Badge>
                  {badge.earned && (
                    <p className="text-xs text-[#f97316] mt-3 font-semibold">
                      ✓ Déverrouillé
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

