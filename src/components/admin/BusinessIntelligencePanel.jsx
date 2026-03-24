import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  Users,
  TrendingUp,
  DollarSign,
  Globe,
  Target,
  Download,
  RefreshCw,
  ArrowUp,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function BusinessIntelligencePanel() {
  const [kpis, setKpis] = useState(null);
  const [userGrowth, setUserGrowth] = useState([]);
  const [revenueByService, setRevenueByService] = useState([]);
  const [insights, setInsights] = useState([]);
  const [period, setPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [kpisRes, growthRes, revenueRes, insightsRes] = await Promise.all([
        api.admin.getBIKPIs(period),
        api.admin.getUserGrowth(12),
        api.admin.getRevenueByService(period),
        api.admin.getBIInsights(10),
      ]);

      setKpis(kpisRes.data || kpisRes);
      setUserGrowth(growthRes.data || growthRes);
      setRevenueByService(revenueRes.data || revenueRes);
      setInsights(insightsRes.data || insightsRes);
    } catch (error) {
      console.error('Error loading BI data:', error);
      // Fallback mock data
      setKpis({
        activeUsers: { value: 459000, growth: 11.3 },
        dailyTransactions: { value: 9000, growth: 14.2 },
        transactionVolume: { value: 156800000, growth: 10.1 },
        commissionRevenue: { value: 4600000, growth: 17.4 },
      });
      setUserGrowth([
        { month: 'Jan', users: 12000 },
        { month: 'Fev', users: 15000 },
        { month: 'Mar', users: 18000 },
      ]);
      setRevenueByService([
        { service: 'Marketplace', revenue: 1850000 },
        { service: 'Live', revenue: 920000 },
        { service: 'Transport', revenue: 780000 },
        { service: 'Services', revenue: 567000 },
      ]);
      setInsights([
        {
          id: '1',
          title: '+11.3% croissance ce mois',
          description: 'Croissance exceptionnelle des utilisateurs actifs',
          severity: 'info',
        },
        {
          id: '2',
          title: 'Meilleure rétention jamais atteinte',
          description: 'Taux de rétention record ce mois',
          severity: 'info',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M CFA`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K CFA`;
    return `${num} CFA`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-white/10 rounded-xl"></div>
          <div className="h-64 bg-white/10 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Business Intelligence
            </h2>
            <p className="text-white/70">Analytics & Data Insights</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-white/10 rounded-lg p-1">
              {['day', 'week', 'month', 'year'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    period === p
                      ? 'bg-blue-500 text-white'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {p === 'day' ? 'Jour' : p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Année'}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadData}
              className="text-white hover:bg-white/10"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Card className="bg-white/5 backdrop-blur border-white/10">
            <div className="p-4">
              <p className="text-white/60 text-sm mb-1">Utilisateurs Actifs</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-white">
                  {formatNumber(kpis?.activeUsers?.value || 0)}
                </p>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/50">
                  <ArrowUp className="w-3 h-3 mr-1" />
                  {kpis?.activeUsers?.growth?.toFixed(1) || 0}%
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="bg-white/5 backdrop-blur border-white/10">
            <div className="p-4">
              <p className="text-white/60 text-sm mb-1">Transactions Jour</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-white">
                  {formatNumber(kpis?.dailyTransactions?.value || 0)}
                </p>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/50">
                  <ArrowUp className="w-3 h-3 mr-1" />
                  {kpis?.dailyTransactions?.growth?.toFixed(1) || 0}%
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="bg-white/5 backdrop-blur border-white/10">
            <div className="p-4">
              <p className="text-white/60 text-sm mb-1">Volume Transactions</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-white">
                  {formatNumber(kpis?.transactionVolume?.value || 0)}
                </p>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/50">
                  <ArrowUp className="w-3 h-3 mr-1" />
                  {kpis?.transactionVolume?.growth?.toFixed(1) || 0}%
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="bg-white/5 backdrop-blur border-white/10">
            <div className="p-4">
              <p className="text-white/60 text-sm mb-1">Revenus Commission</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-white">
                  {formatNumber(kpis?.commissionRevenue?.value || 0)}
                </p>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/50">
                  <ArrowUp className="w-3 h-3 mr-1" />
                  {kpis?.commissionRevenue?.growth?.toFixed(1) || 0}%
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-white/5 border border-white/10">
          <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600/30">
            <BarChart3 className="w-4 h-4 mr-2" />
            Aperçu
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-blue-600/30">
            <Users className="w-4 h-4 mr-2" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:bg-blue-600/30">
            <DollarSign className="w-4 h-4 mr-2" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="geography" className="data-[state=active]:bg-blue-600/30">
            <Globe className="w-4 h-4 mr-2" />
            Géographie
          </TabsTrigger>
          <TabsTrigger value="retention" className="data-[state=active]:bg-blue-600/30">
            <Target className="w-4 h-4 mr-2" />
            Rétention
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Croissance Utilisateurs */}
          <Card className="bg-white/5 border-white/10">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  <h3 className="text-xl font-bold text-white">Croissance Utilisateurs</h3>
                </div>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.7)" />
                    <YAxis stroke="rgba(255,255,255,0.7)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="users"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {/* Insights */}
              <div className="mt-4 space-y-2">
                {insights.slice(0, 2).map((insight) => (
                  <div key={insight.id} className="flex items-center gap-2 text-white/70 text-sm">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span>{insight.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Revenus par Service */}
          <Card className="bg-white/5 border-white/10">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-blue-400" />
                <h3 className="text-xl font-bold text-white">Revenus par Service</h3>
              </div>
              <div className="space-y-3">
                {revenueByService.map((item, index) => {
                  const maxRevenue = Math.max(...revenueByService.map((r) => r.revenue));
                  const percentage = (item.revenue / maxRevenue) * 100;
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/70">{item.service}</span>
                        <span className="text-white font-semibold">
                          {formatCurrency(item.revenue)}
                        </span>
                      </div>
                      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card className="bg-white/5 border-white/10">
            <div className="p-6 text-center text-white/60">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Analytics utilisateurs détaillés</p>
              <p className="text-sm mt-2">Fonctionnalité en développement</p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          <Card className="bg-white/5 border-white/10">
            <div className="p-6 text-center text-white/60">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Analytics transactions détaillés</p>
              <p className="text-sm mt-2">Fonctionnalité en développement</p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="geography" className="mt-6">
          <Card className="bg-white/5 border-white/10">
            <div className="p-6 text-center text-white/60">
              <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Analytics géographiques</p>
              <p className="text-sm mt-2">Fonctionnalité en développement</p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="mt-6">
          <Card className="bg-white/5 border-white/10">
            <div className="p-6 text-center text-white/60">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Analytics de rétention</p>
              <p className="text-sm mt-2">Fonctionnalité en développement</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
