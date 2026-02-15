import React, { useState, useEffect } from "react";
import { api } from "@/api/expressClient";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, Upload, Share2, Coins } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "@/components/common/useTranslation";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";
import BulkUploadManager from "@/components/creator/BulkUploadManager";
import RevenueSharing from "@/components/creator/RevenueSharing";
import CreatorMonetizationDashboard from "@/components/creator/CreatorMonetizationDashboard";
import DailyMissionsCard from "@/components/creator/DailyMissionsCard";
import { toast } from "sonner";

export default function CreatorTools() {
  const { _t } = useTranslation();
  const [user, setUser] = useState(null);

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

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["creatorDashboard", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const [videosRes, analyticsRes] = await Promise.all([
        api.entities.Video.filter({ creator_id: user.id }),
        api.entities.VideoAnalytics.filter({ creator_id: user.id })
      ]);

      // Process analytics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentAnalytics = analyticsRes?.filter(
        a => new Date(a.date) >= thirtyDaysAgo
      ) || [];

      const stats = {
        total_videos: videosRes?.length || 0,
        total_views: recentAnalytics.reduce((sum, a) => sum + (a.views || 0), 0),
        total_engagement: recentAnalytics.reduce(
          (sum, a) => sum + ((a.likes || 0) + (a.comments || 0) + (a.shares || 0)),
          0
        ),
        avg_watch_time: Math.round(
          recentAnalytics.reduce((sum, a) => sum + (a.watch_time_minutes || 0), 0) /
            (recentAnalytics.length || 1)
        ),
        avg_engagement_rate: (
          recentAnalytics.reduce((sum, a) => sum + (a.engagement_rate || 0), 0) /
          (recentAnalytics.length || 1)
        ).toFixed(2),
        total_revenue: recentAnalytics.reduce((sum, a) => sum + (a.revenue || 0), 0)
      };

      const topVideos = videosRes
        ?.map(v => {
          const videoAnalytics = recentAnalytics.filter(a => a.video_id === v.id);
          return {
            ...v,
            views_30d: videoAnalytics.reduce((sum, a) => sum + (a.views || 0), 0),
            revenue_30d: videoAnalytics.reduce((sum, a) => sum + (a.revenue || 0), 0)
          };
        })
        .sort((a, b) => (b.views_30d || 0) - (a.views_30d || 0))
        .slice(0, 5) || [];

      // Daily data for trends
      const dailyData = {};
      recentAnalytics.forEach(a => {
        if (!dailyData[a.date]) {
          dailyData[a.date] = { views: 0, engagement: 0, revenue: 0 };
        }
        dailyData[a.date].views += a.views || 0;
        dailyData[a.date].engagement += (a.likes || 0) + (a.comments || 0) + (a.shares || 0);
        dailyData[a.date].revenue += a.revenue || 0;
      });

      const trendData = Object.entries(dailyData)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      return { stats, topVideos, trendData };
    },
    enabled: !!user?.id
  });

  const handleBulkUpload = async (video) => {
    try {
      await api.entities.Video.create({
        creator_id: user.id,
        creator_name: user.full_name,
        creator_avatar: user.avatar || "",
        ...video
      });
    } catch (_error) {
      throw error;
    }
  };

  const handleRevenueSetup = async (videoId, collaborators) => {
    try {
      for (const collab of collaborators) {
        await api.entities.CollaboratorRevenue.create({
          creator_id: user.id,
          video_id: videoId,
          collaborator_id: collab.id,
          collaborator_name: collab.name,
          contribution_percentage: collab.percentage
        });
      }
      toast.success("Partage de revenus configuré avec succès");
    } catch (_error) {
      toast.error("Erreur lors de la configuration");
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to={createPageUrl("Profile")}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Outils créateur
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <Tabs defaultValue="monetization" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="monetization" className="flex items-center gap-2">
              <Coins className="w-4 h-4" />
              Monétisation
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Téléchargement
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Partage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monetization" className="mt-6 space-y-6">
            <DailyMissionsCard />
            <CreatorMonetizationDashboard />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6">
            {dashboardData ? (
              <AnalyticsDashboard
                stats={dashboardData.stats}
                trendData={dashboardData.trendData}
                topVideos={dashboardData.topVideos}
              />
            ) : (
              <p className="text-center text-gray-500">Pas de données disponibles</p>
            )}
          </TabsContent>

          {/* Bulk Upload Tab */}
          <TabsContent value="bulk" className="mt-6">
            <BulkUploadManager onUpload={handleBulkUpload} />
          </TabsContent>

          {/* Revenue Sharing Tab */}
          <TabsContent value="revenue" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <RevenueSharing
                videoId="default"
                onSetup={handleRevenueSetup}
              />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

