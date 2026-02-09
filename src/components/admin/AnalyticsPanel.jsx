import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export default function AnalyticsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics-strategic'],
    queryFn: () => api.admin.getStrategicAnalytics({}),
  });

  if (isLoading || !data) return <div className="text-white/70">Chargement...</div>;

  return (
    <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
      <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Analytics</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Croissance revenus</p><p className="text-2xl font-bold">{data.growthRate ?? 0}%</p></div>
        <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Nouveaux users 7j</p><p className="text-2xl font-bold">{data.newUsersLast7d ?? 0}</p></div>
        <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">ARPU</p><p className="text-2xl font-bold">{(data.arpu ?? 0).toLocaleString()} XOF</p></div>
        <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Conversion</p><p className="text-2xl font-bold">{data.conversionMarketplace ?? 0}%</p></div>
      </div>
    </Card>
  );
}
