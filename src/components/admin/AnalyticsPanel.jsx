import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function AnalyticsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics-strategic'],
    queryFn: () => api.admin.getStrategicAnalytics({}),
  });
  const { data: httpMetrics } = useQuery({
    queryKey: ['admin-monitoring-http'],
    queryFn: () => api.admin.getMonitoringHttp(),
    refetchInterval: 30000,
  });
  const { data: errorMetrics } = useQuery({
    queryKey: ['admin-monitoring-errors'],
    queryFn: () => api.admin.getMonitoringErrors(),
    refetchInterval: 30000,
  });

  if (isLoading || !data) return <div className="text-white/70">Chargement...</div>;

  const topRoutes = Array.isArray(httpMetrics?.top_routes) ? httpMetrics.top_routes : [];
  const lastErrors = Array.isArray(errorMetrics?.lastErrors) ? errorMetrics.lastErrors : [];

  const handleExportCsv = async () => {
    try {
      const blob = await api.admin.exportStrategicAnalytics({});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kpi-strategic-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export KPI telecharge');
    } catch (e) {
      toast.error(e?.apiMessage || 'Erreur export KPI');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h3 className="font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Analytics</h3>
          <Button variant="outline" className="border-white/20 text-white" onClick={handleExportCsv}>
            Exporter CSV
          </Button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Croissance revenus</p><p className="text-2xl font-bold text-white">{data.growthRate ?? 0}%</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Nouveaux users 7j</p><p className="text-2xl font-bold text-white">{data.newUsersLast7d ?? 0}</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">ARPU</p><p className="text-2xl font-bold text-white">{(data.arpu ?? 0).toLocaleString()} XOF</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Conversion</p><p className="text-2xl font-bold text-white">{data.conversionMarketplace ?? 0}%</p></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">MAU 30j</p><p className="text-2xl font-bold text-white">{data.mau ?? 0}</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Retention 30j</p><p className="text-2xl font-bold text-white">{data.retentionRate30d ?? 0}%</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Retention 90j</p><p className="text-2xl font-bold text-white">{data.retentionRate90d ?? 0}%</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Abandon panier 7j</p><p className="text-2xl font-bold text-white">{data.cartAbandonmentRate7d ?? 0}%</p></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Nouveaux users 30j</p><p className="text-2xl font-bold text-white">{data.newUsers30d ?? 0}</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Users actives 30j</p><p className="text-2xl font-bold text-white">{data.activatedUsers30d ?? 0}</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Activation 30j</p><p className="text-2xl font-bold text-white">{data.activationRate30d ?? 0}%</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Activation 7j</p><p className="text-2xl font-bold text-white">{data.activationRate7d ?? 0}%</p></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Paiements tentes 30j</p><p className="text-2xl font-bold text-white">{data.paymentsAttempted30d ?? 0}</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Paiements reussis 30j</p><p className="text-2xl font-bold text-white">{data.paymentsSuccess30d ?? 0}</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Paiements echoues 30j</p><p className="text-2xl font-bold text-white">{data.paymentsFailed30d ?? 0}</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Succes paiement 30j</p><p className="text-2xl font-bold text-white">{data.paymentSuccessRate30d ?? 0}%</p></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Vendeurs total</p><p className="text-2xl font-bold text-white">{data.sellersTotal ?? 0}</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Vendeurs actifs 30j</p><p className="text-2xl font-bold text-white">{data.activeSellers30d ?? 0}</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Produits / vendeur</p><p className="text-2xl font-bold text-white">{data.avgProductsPerSeller ?? 0}</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Note moyenne vendeur</p><p className="text-2xl font-bold text-white">{data.avgSellerRating ?? 0}/5</p></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Annonces creees 30j</p><p className="text-2xl font-bold text-white">{data.listingsCreated30d ?? 0}</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Annonces vendues 30j</p><p className="text-2xl font-bold text-white">{data.soldListings30d ?? 0}</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Conversion annonce vente</p><p className="text-2xl font-bold text-white">{data.listingToSaleConversionRate30d ?? 0}%</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Delai traitement moyen</p><p className="text-2xl font-bold text-white">{data.avgOrderProcessingHours30d ?? 0}h</p></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">GMV 30j</p><p className="text-2xl font-bold text-white">{(data.gmv30d ?? 0).toLocaleString()} XOF</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Panier moyen 30j</p><p className="text-2xl font-bold text-white">{(data.avgBasket30d ?? 0).toLocaleString()} XOF</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Visiteurs 30j</p><p className="text-2xl font-bold text-white">{data.visitors30d ?? 0}</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Conv visiteur acheteur</p><p className="text-2xl font-bold text-white">{data.visitorToBuyerConversionRate30d ?? 0}%</p></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Revenus pub 30j</p><p className="text-2xl font-bold text-white">{(data.adsRevenue30d ?? 0).toLocaleString()} XOF</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Revenus gifts/tips 30j</p><p className="text-2xl font-bold text-white">{(data.giftsTipsRevenue30d ?? 0).toLocaleString()} XOF</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Revenus marketplace 30j</p><p className="text-2xl font-bold text-white">{(data.commissionRevenue30d ?? 0).toLocaleString()} XOF</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Revenus abonnements 30j</p><p className="text-2xl font-bold text-white">{(data.subscriptionRevenue30d ?? 0).toLocaleString()} XOF</p></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">Total revenus plateforme 30j</p><p className="text-2xl font-bold text-white">{(data.totalPlatformRevenue30d ?? 0).toLocaleString()} XOF</p></div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="text-sm text-white font-medium">NPS 30j</p><p className="text-2xl font-bold text-white">{data.nps30d ?? 0}</p></div>
        </div>
      </Card>

      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4">Monitoring API (temps reel)</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-white/20 bg-white/10">
            <p className="text-sm text-white font-medium">Requetes total</p>
            <p className="text-2xl font-bold text-white">{httpMetrics?.total_requests ?? 0}</p>
          </div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10">
            <p className="text-sm text-white font-medium">Taux erreurs</p>
            <p className="text-2xl font-bold text-white">{((httpMetrics?.error_rate ?? 0) * 100).toFixed(2)}%</p>
          </div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10">
            <p className="text-sm text-white font-medium">Latence p95</p>
            <p className="text-2xl font-bold text-white">{httpMetrics?.p95_ms != null ? `${Math.round(httpMetrics.p95_ms)} ms` : '-'}</p>
          </div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10">
            <p className="text-sm text-white font-medium">Erreurs 24h</p>
            <p className="text-2xl font-bold text-white">{errorMetrics?.countLast24h ?? 0}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4">Routes les plus sollicitees</h3>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {topRoutes.length === 0 && <p className="text-white/60 text-sm">Aucune metrique disponible.</p>}
          {topRoutes.slice(0, 10).map((r) => (
            <div key={r.route} className="p-3 bg-white/5 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{r.route}</p>
                <p className="text-xs text-white/60">{r.count} req • {(r.error_rate * 100).toFixed(2)}% erreurs</p>
              </div>
              <p className="text-sm font-semibold">{r.p95_ms != null ? `${Math.round(r.p95_ms)}ms` : '-'}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4">Dernieres erreurs</h3>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {lastErrors.length === 0 && <p className="text-white/60 text-sm">Aucune erreur recente.</p>}
          {lastErrors.slice(0, 8).map((e) => (
            <div key={`${e.timestamp}-${e.path}-${e.message}`} className="p-3 bg-white/5 rounded-lg">
              <p className="text-sm font-semibold">{e.method || '-'} {e.path || '-'}</p>
              <p className="text-xs text-white/70">{e.message}</p>
              <p className="text-xs text-white/50">{e.statusCode || '-'} • {e.timestamp}</p>
            </div>
          ))}
        </div>
      </Card>
      
    </div>
  );
}
