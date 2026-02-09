import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Star, Medal, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "@/components/common/useTranslation";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { api } from "@/api/expressClient";

const COUNTRY_OPTIONS = [
  { value: '', label: 'Tous les pays' },
  { value: 'SN', label: 'Sénégal' },
  { value: 'CI', label: "Côte d'Ivoire" },
  { value: 'CM', label: 'Cameroun' },
  { value: 'ML', label: 'Mali' },
  { value: 'BF', label: 'Burkina Faso' },
  { value: 'NE', label: 'Niger' },
  { value: 'TG', label: 'Togo' },
  { value: 'BJ', label: 'Bénin' },
  { value: 'GA', label: 'Gabon' },
  { value: 'CD', label: 'RD Congo' },
  { value: 'FR', label: 'France' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'Toutes catégories' },
  { value: 'tech', label: 'Technologie' },
  { value: 'business', label: 'Business' },
  { value: 'education', label: 'Éducation' },
  { value: 'artisanat', label: 'Artisanat' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'sante', label: 'Santé' },
  { value: 'finance', label: 'Finance' },
];

export default function Leaderboard() {
  const { _t } = useTranslation();
  const [timeRange, setTimeRange] = useState("all");
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");

  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ["leaderboard", timeRange, country, category],
    queryFn: async () => {
      const res = await api.leaderboard.get({
        range: timeRange,
        country: country || undefined,
        category: category || undefined,
      });
      return res;
    }
  });

  const leaderboard = Array.isArray(leaderboardData?.leaderboard) ? leaderboardData.leaderboard : (Array.isArray(leaderboardData) ? leaderboardData : []);

  const getMedalColor = (rank) => {
    if (rank === 1) return "text-yellow-500";
    if (rank === 2) return "text-gray-400";
    if (rank === 3) return "text-orange-600";
    return "text-gray-600";
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="w-8 h-8" />
            Classement
          </h1>
          <p className="text-orange-100 mt-2">
            Les meilleurs créateurs et contributeurs
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Période : Global / Hebdo / Mensuel / Annuel */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'Global' },
            { value: 'weekly', label: 'Hebdo' },
            { value: 'monthly', label: 'Mensuel' },
            { value: 'annual', label: 'Annuel' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTimeRange(value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                timeRange === value
                  ? 'bg-white text-orange-600 shadow'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filtres Pays et Catégorie */}
        <div className="flex flex-wrap gap-3">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
          >
            {COUNTRY_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="points" className="w-full">
          <TabsList>
            <TabsTrigger value="points">Points</TabsTrigger>
            <TabsTrigger value="level">Niveaux</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
          </TabsList>

          {/* Points Leaderboard */}
          <TabsContent value="points" className="space-y-4 mt-6">
            {isLoading ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Chargement du classement...
                </CardContent>
              </Card>
            ) : leaderboard.length > 0 ? (
              <div className="space-y-3">
                {leaderboard.map((entry, index) => (
                  <motion.div
                    key={entry.user_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link to={createPageUrl(`Profile?_userId=${entry.user_id}`)}>
                      <Card className={`hover:shadow-lg transition-shadow cursor-pointer ${index < 3 ? 'ring-2 ring-orange-200 bg-orange-50/50' : ''}`}>
                        <CardContent className="p-4 flex items-center gap-4">
                          {/* Rank */}
                          <div className="flex-shrink-0">
                            {index < 3 ? (
                              <div className="relative">
                                <Crown className={`w-8 h-8 ${getMedalColor(index + 1)}`} />
                              </div>
                            ) : (
                              <div className="w-8 h-8 flex items-center justify-center font-bold text-gray-500">
                                #{entry.rank}
                              </div>
                            )}
                          </div>

                          {/* User Info - Top 3 avec avatar glow */}
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`relative ${index < 3 ? 'ring-2 ring-orange-400 ring-offset-2 rounded-full' : ''}`}>
                              <img
                                src={entry.user_avatar || "https://via.placeholder.com/48"}
                                alt={entry.user_name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {entry.user_name}
                              </h3>
                              <p className="text-sm text-gray-500">
                                Niveau {entry.level} • {entry.badges_count} badges
                              </p>
                            </div>
                          </div>

                          {/* Points */}
                          <div className="text-right">
                            <div className="text-2xl font-bold text-orange-600">
                              {entry.total_points.toLocaleString()}
                            </div>
                            <p className="text-xs text-gray-500">points</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Aucun classement disponible
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Level Leaderboard */}
          <TabsContent value="level" className="space-y-4 mt-6">
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                Les utilisateurs avec le plus haut niveau
              </CardContent>
            </Card>
          </TabsContent>

          {/* Badges Leaderboard */}
          <TabsContent value="badges" className="space-y-4 mt-6">
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                Les utilisateurs avec le plus de badges
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-blue-600" />
              Comment gagner des points?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p>• Télécharger une vidéo: +50 points</p>
            <p>• Faire un commentaire: +10 points</p>
            <p>• Partager du contenu: +15 points</p>
            <p>• Recevoir un J'aime: +5 points</p>
            <p>• Débloquer un badge: +points bonus</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}