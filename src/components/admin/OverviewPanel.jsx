import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Activity, Mail, Download, UserCheck, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OverviewPanel() {
  const navigate = useNavigate();
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.admin.getDashboard(),
  });

  if (isLoading || !dashboard) {
    return <div className="text-white/70">Chargement...</div>;
  }

  const stats = dashboard.stats || {};
  const recentOrders = dashboard.recentOrders || [];
  const totalRevenue = stats.totalRevenue ?? 0;
  const totalUsers = stats.totalUsers ?? 0;
  const totalOrders = stats.totalOrders ?? 0;
  const totalVideos = stats.totalVideos ?? 0;

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Activity className="w-5 h-5" /> Actions rapides</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Button className="bg-blue-500 hover:bg-blue-600 border-none"><Mail className="w-4 h-4 mr-2" />Notification</Button>
          <Button className="bg-purple-500 hover:bg-purple-600 border-none"><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button className="bg-green-500 hover:bg-green-600 border-none" onClick={() => navigate('/Home')}><UserCheck className="w-4 h-4 mr-2" />KYC</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 border-none"><Shield className="w-4 h-4 mr-2" />Moderation</Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl border-none">
          <p className="text-sm opacity-90">Revenu total</p>
          <p className="text-2xl font-bold">{totalRevenue >= 1e6 ? (totalRevenue / 1e6).toFixed(2) + 'M' : totalRevenue >= 1e3 ? (totalRevenue / 1e3).toFixed(0) + 'K' : Math.round(totalRevenue)} XOF</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl border-none">
          <p className="text-sm opacity-90">Utilisateurs</p>
          <p className="text-2xl font-bold">{totalUsers >= 1000 ? (totalUsers / 1000).toFixed(1) + 'K' : totalUsers}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-xl border-none">
          <p className="text-sm opacity-90">Commandes</p>
          <p className="text-2xl font-bold">{totalOrders}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-xl border-none">
          <p className="text-sm opacity-90">Videos</p>
          <p className="text-2xl font-bold">{totalVideos >= 1000 ? (totalVideos / 1000).toFixed(1) + 'K' : totalVideos}</p>
        </Card>
      </div>

      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Package className="w-5 h-5" /> Commandes recentes</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {recentOrders.length === 0 && <p className="text-white/60 text-sm">Aucune commande recente.</p>}
          {recentOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
              <div>
                <p className="text-sm font-semibold">#{order.id.slice(0, 8)}</p>
                <p className="text-xs text-white/60">{(order.total_amount ?? 0).toLocaleString()} XOF {order.user?.username && ' • ' + order.user.username}</p>
              </div>
              <Badge>{order.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
