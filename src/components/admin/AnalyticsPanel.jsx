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
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Croissance revenus</p><p className="text-2xl font-bold">{data.growthRate ?? 0}%</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Nouveaux users 7j</p><p className="text-2xl font-bold">{data.newUsersLast7d ?? 0}</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">ARPU</p><p className="text-2xl font-bold">{(data.arpu ?? 0).toLocaleString()} XOF</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Conversion</p><p className="text-2xl font-bold">{data.conversionMarketplace ?? 0}%</p></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">MAU 30j</p><p className="text-2xl font-bold">{data.mau ?? 0}</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Retention 30j</p><p className="text-2xl font-bold">{data.retentionRate30d ?? 0}%</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Retention 90j</p><p className="text-2xl font-bold">{data.retentionRate90d ?? 0}%</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Abandon panier 7j</p><p className="text-2xl font-bold">{data.cartAbandonmentRate7d ?? 0}%</p></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Nouveaux users 30j</p><p className="text-2xl font-bold">{data.newUsers30d ?? 0}</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Users actives 30j</p><p className="text-2xl font-bold">{data.activatedUsers30d ?? 0}</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Activation 30j</p><p className="text-2xl font-bold">{data.activationRate30d ?? 0}%</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Activation 7j</p><p className="text-2xl font-bold">{data.activationRate7d ?? 0}%</p></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Paiements tentes 30j</p><p className="text-2xl font-bold">{data.paymentsAttempted30d ?? 0}</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Paiements reussis 30j</p><p className="text-2xl font-bold">{data.paymentsSuccess30d ?? 0}</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Paiements echoues 30j</p><p className="text-2xl font-bold">{data.paymentsFailed30d ?? 0}</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Succes paiement 30j</p><p className="text-2xl font-bold">{data.paymentSuccessRate30d ?? 0}%</p></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Vendeurs total</p><p className="text-2xl font-bold">{data.sellersTotal ?? 0}</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Vendeurs actifs 30j</p><p className="text-2xl font-bold">{data.activeSellers30d ?? 0}</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Produits / vendeur</p><p className="text-2xl font-bold">{data.avgProductsPerSeller ?? 0}</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Note moyenne vendeur</p><p className="text-2xl font-bold">{data.avgSellerRating ?? 0}/5</p></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Annonces creees 30j</p><p className="text-2xl font-bold">{data.listingsCreated30d ?? 0}</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Annonces vendues 30j</p><p className="text-2xl font-bold">{data.soldListings30d ?? 0}</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Conversion annonce vente</p><p className="text-2xl font-bold">{data.listingToSaleConversionRate30d ?? 0}%</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Delai traitement moyen</p><p className="text-2xl font-bold">{data.avgOrderProcessingHours30d ?? 0}h</p></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">GMV 30j</p><p className="text-2xl font-bold">{(data.gmv30d ?? 0).toLocaleString()} XOF</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Panier moyen 30j</p><p className="text-2xl font-bold">{(data.avgBasket30d ?? 0).toLocaleString()} XOF</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Visiteurs 30j</p><p className="text-2xl font-bold">{data.visitors30d ?? 0}</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Conv visiteur acheteur</p><p className="text-2xl font-bold">{data.visitorToBuyerConversionRate30d ?? 0}%</p></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Revenus pub 30j</p><p className="text-2xl font-bold">{(data.adsRevenue30d ?? 0).toLocaleString()} XOF</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Revenus gifts/tips 30j</p><p className="text-2xl font-bold">{(data.giftsTipsRevenue30d ?? 0).toLocaleString()} XOF</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Revenus marketplace 30j</p><p className="text-2xl font-bold">{(data.commissionRevenue30d ?? 0).toLocaleString()} XOF</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Revenus abonnements 30j</p><p className="text-2xl font-bold">{(data.subscriptionRevenue30d ?? 0).toLocaleString()} XOF</p></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">Total revenus plateforme 30j</p><p className="text-2xl font-bold">{(data.totalPlatformRevenue30d ?? 0).toLocaleString()} XOF</p></div>
          <div className="p-4 bg-white/5 rounded-lg"><p className="text-sm text-white/70">NPS 30j</p><p className="text-2xl font-bold">{data.nps30d ?? 0}</p></div>
        </div>
      </Card>

      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4">Monitoring API (temps reel)</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white/5 rounded-lg">
            <p className="text-sm text-white/70">Requetes total</p>
            <p className="text-2xl font-bold">{httpMetrics?.total_requests ?? 0}</p>
          </div>
          <div className="p-4 bg-white/5 rounded-lg">
            <p className="text-sm text-white/70">Taux erreurs</p>
            <p className="text-2xl font-bold">{((httpMetrics?.error_rate ?? 0) * 100).toFixed(2)}%</p>
          </div>
          <div className="p-4 bg-white/5 rounded-lg">
            <p className="text-sm text-white/70">Latence p95</p>
            <p className="text-2xl font-bold">{httpMetrics?.p95_ms != null ? `${Math.round(httpMetrics.p95_ms)} ms` : '-'}</p>
          </div>
          <div className="p-4 bg-white/5 rounded-lg">
            <p className="text-sm text-white/70">Erreurs 24h</p>
            <p className="text-2xl font-bold">{errorMetrics?.countLast24h ?? 0}</p>
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
