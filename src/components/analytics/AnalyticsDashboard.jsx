import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Eye, Heart, DollarSign } from "lucide-react";
import { motion } from "framer-motion";

const StatCard = ({ icon: Icon, label, value, change, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value.toLocaleString()}</p>
            {change !== undefined && (
              <p className={`text-xs mt-2 ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
                {change >= 0 ? "↑" : "↓"} {Math.abs(change)}% vs hier
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default function AnalyticsDashboard({ stats, trendData, topVideos }) {
  const chartColors = ["#f97316", "#ef4444", "#ec4899", "#a855f7", "#3b82f6"];

  return (
    <div className="space-y-6">
      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Eye}
          label="Vues (30j)"
          value={stats.total_views || 0}
          change={12}
          color="bg-blue-500"
        />
        <StatCard
          icon={Heart}
          label="Engagements"
          value={stats.total_engagement || 0}
          change={8}
          color="bg-red-500"
        />
        <StatCard
          icon={DollarSign}
          label="Revenus (30j)"
          value={stats.total_revenue || 0}
          change={15}
          color="bg-green-500"
        />
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Tendance (30 derniers jours)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="views" stroke="#f97316" name="Vues" />
              <Line type="monotone" dataKey="engagement" stroke="#ec4899" name="Engagements" />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Revenus" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Videos */}
      <Card>
        <CardHeader>
          <CardTitle>Meilleures vidéos (30j)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topVideos?.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-sm">{video.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {video.views_30d?.toLocaleString() || 0} vues
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange-600">
                    {video.revenue_30d?.toFixed(2) || 0} FCFA
                  </p>
                  <p className="text-xs text-gray-500">revenus</p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Engagement Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribution des engagements</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={[
                  { name: "Likes", value: stats.total_engagement * 0.5 },
                  { name: "Comments", value: stats.total_engagement * 0.3 },
                  { name: "Shares", value: stats.total_engagement * 0.2 }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value.toFixed(0)}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {[0, 1, 2].map((index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}