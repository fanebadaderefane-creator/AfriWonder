import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { VideoRecommendationEngine } from "@/functions/videoRecommendationEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Eye, Clock, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const StatCard = ({ icon: Icon, label, value, change }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-4 rounded-lg border border-gray-200"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {change && <p className="text-xs text-green-600 mt-1">↑ {change}% depuis hier</p>}
      </div>
      <Icon className="w-8 h-8 text-orange-500" />
    </div>
  </motion.div>
);

export default function VideoAnalyticsDisplay({ videoId, days = 30 }) {
  const [timeRange, setTimeRange] = useState(days);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["videoAnalytics", videoId, timeRange],
    queryFn: () => VideoRecommendationEngine.getVideoAnalytics(videoId, timeRange)
  });

  const { data: dailyData } = useQuery({
    queryKey: ["videoDailyAnalytics", videoId],
    queryFn: async () => {
      // Generate sample daily data for chart
      const data = [];
      for (let i = timeRange; i > 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        data.push({
          date: date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
          views: Math.floor(Math.random() * 500) + 100,
          engagement: Math.floor(Math.random() * 50) + 10,
          watchTime: Math.floor(Math.random() * 200) + 50
        });
      }
      return data;
    }
  });

  if (isLoading) {
    return <Skeleton className="h-96 rounded-lg" />;
  }

  if (!analytics) {
    return <div className="text-center text-gray-500 py-8">Données d'analyse non disponibles</div>;
  }

  const genderData = Object.entries(analytics.audienceGender || {}).map(([name, value]) => ({
    name,
    value
  }));

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        {[7, 30, 90].map(range => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              timeRange === range
                ? "bg-orange-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {range === 7 ? "7 jours" : range === 30 ? "30 jours" : "90 jours"}
          </button>
        ))}
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Eye} label="Vues totales" value={analytics.totalViews.toLocaleString()} />
        <StatCard icon={Clock} label="Temps de visionnage" value={Math.round(analytics.totalWatchTime)} change={12} />
        <StatCard icon={Users} label="Engagement" value={`${analytics.averageEngagementRate.toFixed(1)}%`} />
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList>
          <TabsTrigger value="trends">Tendances</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Vues et engagement</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="views" stroke="#f97316" name="Vues" />
                  <Line type="monotone" dataKey="engagement" stroke="#ef4444" name="Engagement" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audience">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Sexe de l'audience</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#f97316" />
                      <Cell fill="#ec4899" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top sources de trafic</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{analytics.topTrafficSource}</span>
                    <span className="font-bold">45%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Recherche</span>
                    <span className="font-bold">30%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Recommandations</span>
                    <span className="font-bold">25%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement">
          <Card>
            <CardHeader>
              <CardTitle>Métriques d'engagement par jour</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="engagement" fill="#f97316" name="Engagement" />
                  <Bar dataKey="watchTime" fill="#ef4444" name="Temps (min)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}