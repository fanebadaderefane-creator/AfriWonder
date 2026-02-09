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
  rare: "bg-blue-100 text-blue-800 border-blue-300",
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

  // Fetch user badges
  const { data: badges } = useQuery({
    queryKey: ["userBadges", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const userBadges = await api.entities.UserBadge.filter({
        user_id: user.id
      });
      return userBadges || [];
    },
    enabled: !!user?.id
  });

  // Fetch user stats
  const { data: stats } = useQuery({
    queryKey: ["userStats", user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      const userPoints = await api.entities.UserPoints.filter({
        user_id: user.id
      });
      return userPoints?.[0] || {};
    },
    enabled: !!user?.id
  });

  const earnedBadgeIds = new Set(badges?.map(b => b.badge_id) || []);
  const allBadges = Object.entries(BADGE_DEFINITIONS).map(([id, def]) => ({
    id,
    ...def,
    earned: earnedBadgeIds.has(id)
  }));

  const _filteredBadges = filter === "all" 
    ? allBadges 
    : allBadges.filter(b => b[filter]);

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
        <Card className="mb-8 bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-orange-600">
                  {stats?.total_points || 0}
                </div>
                <p className="text-sm text-gray-600 mt-1">Points totaux</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-600">
                  {stats?.level || 1}
                </div>
                <p className="text-sm text-gray-600 mt-1">Niveau</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-600">
                  {badges?.length || 0}
                </div>
                <p className="text-sm text-gray-600 mt-1">Badges</p>
              </div>
            </div>
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
          {allBadges.map((badge, index) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={`transition-all ${
                  badge.earned ? "border-orange-300" : "opacity-60"
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
                    <p className="text-xs text-green-600 mt-3 font-semibold">
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

