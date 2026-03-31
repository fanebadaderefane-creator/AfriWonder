import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsDashboardCharts({ trendData, stats, chartColors }) {
  return (
    <>
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
              <Line type="monotone" dataKey="views" stroke="#2563eb" name="Vues" />
              <Line type="monotone" dataKey="engagement" stroke="#ec4899" name="Engagements" />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Revenus" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
                  { name: "Shares", value: stats.total_engagement * 0.2 },
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
    </>
  );
}
