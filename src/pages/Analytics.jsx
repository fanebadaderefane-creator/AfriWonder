import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, ArrowLeft, Eye, Heart } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { motion } from 'framer-motion';

const COLORS = ['#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6'];

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const [user, setUser] = useState(null);
  const [dateRange, _setDateRange] = useState('30d'); // 7d, 30d, 90d, all

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        if (!userId || userId === u.id) {
          setUser(u);
        } else {
          navigate(createPageUrl('Home'));
        }
      } catch (_e) {
        navigate(createPageUrl('Home'));
      }
    };
    getUser();
  }, [navigate, userId]);

  // Fetch videos analytics
  const { data: videosStats, _isLoading: videosLoading } = useQuery({
    queryKey: ['videosAnalytics', user?.id, dateRange],
    queryFn: async () => {
      if (!user?.id) return { videosCount: 0, totalViews: 0, totalLikes: 0, totalComments: 0, avgViewsPerVideo: 0, videos: [] };
      const [videos, views, likes, comments] = await Promise.all([
        api.videos.list({ creator_id: user.id }),
        api.entities.ViewHistory.filter({ user_id: user.id }),
        api.saves.list({ user_id: user.id }),
        api.videos.getComments({ author_id: user.id })
      ]);

      const totalViews = views?.length || 0;
      const totalLikes = likes?.length || 0;
      const totalComments = comments?.length || 0;
      const avgViewsPerVideo = videos?.length > 0 ? Math.round(totalViews / videos.length) : 0;
      return {
        videosCount: videos?.length || 0,
        totalViews,
        totalLikes,
        totalComments,
        avgViewsPerVideo,
        videos: videos?.sort((a, b) => (b.views_count || 0) - (a.views_count || 0)).slice(0, 10) || []
      };
    },
    enabled: !!user?.id
  });

  // Fetch followers analytics (personnes qui me suivent)
  const { data: followersStats } = useQuery({
    queryKey: ['followersAnalytics', user?.id],
    queryFn: async () => {
      if (!user?.id) return { totalFollowers: 0, newFollowersThisMonth: 0 };
      const res = await api.users.getFollowers(user.id, { page: 1, limit: 500 });
      const list = Array.isArray(res) ? res : res?.followers ?? [];
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const newThisMonth = list.filter(f => new Date(f.created_at || f.created_date || 0) > monthAgo).length;
      return {
        totalFollowers: list.length,
        newFollowersThisMonth: newThisMonth
      };
    },
    enabled: !!user?.id
  });

  // Engagement rate
  const engagementRate = videosStats?.videosCount > 0
    ? Math.round(((videosStats?.totalLikes + videosStats?.totalComments) / (videosStats?.totalViews || 1)) * 100)
    : 0;

  // Mock chart data
  const viewsChartData = [
    { name: 'Sem 1', views: 1200 },
    { name: 'Sem 2', views: 1900 },
    { name: 'Sem 3', views: 1500 },
    { name: 'Sem 4', views: 2200 }
  ];

  const engagementData = [
    { name: 'Likes', value: videosStats?.totalLikes || 0 },
    { name: 'Comments', value: videosStats?.totalComments || 0 },
    { name: 'Shares', value: Math.round((videosStats?.totalViews || 0) * 0.05) }
  ];

  if (!user || videosLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-10">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl('Profile'))}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl"
            aria-label="Retour"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Analyse</h1>
            <p className="text-xs text-gray-500">Vos performances</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl p-4 border-l-4 border-blue-600">
            <div className="text-2xl font-bold text-gray-900">{videosStats?.totalViews.toLocaleString()}</div>
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <Eye className="w-3 h-3" /> Vues totales
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl p-4 border-l-4 border-blue-500">
            <div className="text-2xl font-bold text-gray-900">{followersStats?.totalFollowers.toLocaleString()}</div>
            <p className="text-xs text-gray-600">Followers</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-xl p-4 border-l-4 border-pink-500">
            <div className="text-2xl font-bold text-gray-900">{videosStats?.totalLikes.toLocaleString()}</div>
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <Heart className="w-3 h-3" /> Likes
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-xl p-4 border-l-4 border-purple-500">
            <div className="text-2xl font-bold text-gray-900">{engagementRate}%</div>
            <p className="text-xs text-gray-600">Taux engagement</p>
          </motion.div>
        </div>

        <Tabs defaultValue="overview" className="bg-white rounded-xl">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100">
            <TabsTrigger value="overview">Aperçu</TabsTrigger>
            <TabsTrigger value="videos">Vidéos</TabsTrigger>
            <TabsTrigger value="growth">Croissance</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="p-4 space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Vues par semaine</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={viewsChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Engagement</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={engagementData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {engagementData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Videos */}
          <TabsContent value="videos" className="p-4 space-y-3">
            {videosStats?.videos?.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucune vidéo</p>
            ) : (
              videosStats?.videos?.map((video) => (
                <div key={video.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">{video.title}</h3>
                      <p className="text-xs text-gray-500">{new Date(video.created_date).toLocaleDateString('fr')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-gray-600">Vues</p>
                      <p className="font-bold text-gray-900">{(video.views_count || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Likes</p>
                      <p className="font-bold text-gray-900">{(video.likes_count || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Comments</p>
                      <p className="font-bold text-gray-900">{(video.comments_count || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Growth */}
          <TabsContent value="growth" className="p-4 space-y-4">
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-gray-900">Nouveaux followers ce mois</p>
              <p className="text-3xl font-bold text-blue-600">{followersStats?.newFollowersThisMonth || 0}</p>
              <p className="text-xs text-gray-600">Ratio: {followersStats?.totalFollowers > 0 ? Math.round((followersStats?.newFollowersThisMonth / followersStats?.totalFollowers) * 100) : 0}% du total</p>
            </div>

            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-gray-900">Vidéos performantes</p>
              <p className="text-3xl font-bold text-blue-600">{videosStats?.avgViewsPerVideo.toLocaleString()}</p>
              <p className="text-xs text-gray-600">Moyenne par vidéo</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

