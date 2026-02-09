import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  DollarSign,
  Star,
  Download,
  Lightbulb,
  ShoppingCart,
  MapPin,
} from 'lucide-react';
import { motion } from 'framer-motion';

const PERIODS = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
  { value: '12m', label: '12 mois' },
];

export default function SellerDashboard() {
  const [period, setPeriod] = useState('30d');

  const { data: dashboard, isLoading, isError, error } = useQuery({
    queryKey: ['seller-analytics', period],
    queryFn: () => api.seller.getAnalytics({ period }),
  });

  const { data: productAnalytics } = useQuery({
    queryKey: ['seller-analytics-products', period],
    queryFn: () => api.seller.getProductAnalytics({ period }),
  });

  const { data: insights } = useQuery({
    queryKey: ['seller-insights', period],
    queryFn: () => api.seller.getInsights({ period }),
  });

  const { data: geography } = useQuery({
    queryKey: ['seller-geography', period],
    queryFn: () => api.seller.getGeography({ period }),
  });

  const handleExportCsv = async () => {
    try {
      const blob = await api.seller.exportCsv({ period });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-vendeur-${period}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_e) {
      // toast optional
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <p className="text-gray-500">Chargement des statistiques...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">Impossible de charger les statistiques.</p>
          <p className="text-sm text-gray-500 mt-1">{error?.message || 'Vérifiez votre connexion et que le backend est démarré.'}</p>
        </div>
      </div>
    );
  }

  const kpis = dashboard?.kpis || {};
  const comparison = dashboard?.comparison || {};
  const salesByDay = dashboard?.sales_by_day || [];
  const COLORS = ['#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#6366f1', '#14b8a6'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50 p-4 safe-area-pb"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Tableau de bord vendeur</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Comparison badges */}
        <div className="flex flex-wrap gap-3 mb-6">
          {comparison.revenue_growth_pct != null && (
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                comparison.revenue_growth_pct >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {comparison.revenue_growth_pct >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              Revenu: {comparison.revenue_growth_pct >= 0 ? '+' : ''}{comparison.revenue_growth_pct}% vs période précédente
            </span>
          )}
          {comparison.orders_growth_pct != null && (
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                comparison.orders_growth_pct >= 0 ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
              }`}
            >
              Commandes: {comparison.orders_growth_pct >= 0 ? '+' : ''}{comparison.orders_growth_pct}%
            </span>
          )}
          {comparison.conversion_growth_pct != null && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              Conversion: {comparison.conversion_growth_pct >= 0 ? '+' : ''}{comparison.conversion_growth_pct}%
            </span>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Revenu</p>
                    <p className="text-xl font-bold text-orange-600">
                      {Number(kpis.total_revenue || 0).toLocaleString('fr-FR')} XOF
                    </p>
                  </div>
                  <DollarSign className="w-10 h-10 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Commandes</p>
                    <p className="text-xl font-bold text-blue-600">{kpis.total_orders ?? 0}</p>
                    <p className="text-xs text-green-600">{kpis.completed_orders ?? 0} livrées</p>
                  </div>
                  <Package className="w-10 h-10 text-blue-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Produits</p>
                    <p className="text-xl font-bold text-green-600">{kpis.total_products ?? 0}</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-green-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">En attente</p>
                    <p className="text-xl font-bold text-red-600">{kpis.pending_orders ?? 0}</p>
                  </div>
                  <Users className="w-10 h-10 text-red-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Paniers abandonnés</p>
                    <p className="text-xl font-bold text-amber-600">{kpis.abandoned_carts_count ?? 0}</p>
                    <p className="text-xs text-gray-500">
                      {Number(kpis.abandoned_carts_lost_value || 0).toLocaleString('fr-FR')} XOF perdus
                    </p>
                  </div>
                  <ShoppingCart className="w-10 h-10 text-amber-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div className="lg:col-span-2" whileHover={{ boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
            <Card>
              <CardHeader>
                <CardTitle>Ventes par jour</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(value) => [Number(value).toLocaleString('fr-FR'), '']} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#f97316" name="Revenu (XOF)" />
                    <Line type="monotone" dataKey="orders" stroke="#3b82f6" name="Commandes" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {geography && geography.length > 0 && (
            <motion.div whileHover={{ boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Répartition géo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={geography}
                        dataKey="revenue"
                        nameKey="country"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ country, revenue }) => `${country}: ${Number(revenue).toLocaleString('fr-FR')}`}
                      >
                        {geography.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [Number(v).toLocaleString('fr-FR') + ' XOF', 'Revenu']} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Product analytics */}
        {productAnalytics && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 produits</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={(productAnalytics.top_10 || []).slice(0, 5)}
                    layout="vertical"
                    margin={{ left: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [Number(v).toLocaleString('fr-FR'), 'Revenu']} />
                    <Bar dataKey="revenue" fill="#f97316" name="Revenu (XOF)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Faible performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(productAnalytics.low_performance || []).slice(0, 5).map((p) => (
                  <div key={p.product_id} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                    <span className="truncate flex-1">{p.name}</span>
                    <span className="text-amber-600">{p.conversion_rate?.toFixed(1) ?? 0}% conv.</span>
                  </div>
                ))}
                {(!productAnalytics.low_performance || productAnalytics.low_performance.length === 0) && (
                  <p className="text-sm text-gray-500">Aucun</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>À booster</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(productAnalytics.to_boost || []).slice(0, 5).map((p) => (
                  <div key={p.product_id} className="flex justify-between text-sm p-2 bg-orange-50 rounded">
                    <span className="truncate flex-1">{p.name}</span>
                    <Badge variant="secondary">{p.add_to_cart_count} panier</Badge>
                  </div>
                ))}
                {(!productAnalytics.to_boost || productAnalytics.to_boost.length === 0) && (
                  <p className="text-sm text-gray-500">Aucun</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Insights */}
        {insights?.insights?.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {insights.insights.map((text, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-amber-500">•</span>
                    {text}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Recent orders & Abandoned carts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {dashboard?.recent_orders?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Commandes récentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboard.recent_orders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold text-sm">#{String(order.id).slice(0, 8)}</p>
                      <p className="text-xs text-gray-600">{order.buyer_name || 'Client'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">
                        {Number(order.total_amount || 0).toLocaleString('fr-FR')} XOF
                      </p>
                      <Badge
                        className={
                          order.status === 'delivered' || order.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {dashboard?.abandoned_carts?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Paniers abandonnés récents</CardTitle>
                <p className="text-xs text-gray-500">
                  Taux récupération: {kpis.abandoned_carts_recovery_rate_pct ?? 0}%
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboard.abandoned_carts.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{Number(c.total_value).toLocaleString('fr-FR')} XOF</p>
                      <p className="text-xs text-gray-500">
                        {new Date(c.abandoned_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Badge variant={c.recovered ? 'default' : 'secondary'}>
                      {c.recovered ? 'Récupéré' : 'Non récupéré'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}
