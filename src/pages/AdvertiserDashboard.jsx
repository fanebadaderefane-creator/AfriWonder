import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  BarChart3,
  Eye,
  MousePointer,
  TrendingUp,
  Plus,
  Loader2,
  Megaphone,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_LABELS = {
  draft: { label: 'Brouillon', color: 'bg-gray-500' },
  pending_review: { label: 'En attente', color: 'bg-amber-500' },
  active: { label: 'Active', color: 'bg-green-500' },
  expired: { label: 'Expirée', color: 'bg-slate-500' },
};

export default function AdvertiserDashboard() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ads-campaigns', page],
    queryFn: () => api.ads.getCampaigns({ page, limit: 20 }),
  });

  const campaigns = data?.campaigns || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900/20 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-red-400">{error?.apiMessage || 'Erreur de chargement'}</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-4">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900/20 to-slate-900 pb-24">
      <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-amber-600 border-b border-white/20 shadow-xl z-40">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Megaphone className="w-6 h-6" />
                Mes campagnes publicitaires
              </h1>
              <p className="text-white/80 text-xs">Statistiques et gestion</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Résumé global */}
        <Card className="bg-white/5 border-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Résumé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/60 text-sm">Total campagnes</p>
                <p className="text-2xl font-bold text-white">{pagination.total}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/60 text-sm">Actives</p>
                <p className="text-2xl font-bold text-green-400">
                  {campaigns.filter((c) => c.status === 'active').length}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/60 text-sm">Vues totales</p>
                <p className="text-2xl font-bold text-orange-400">
                  {campaigns.reduce((s, c) => s + (c.total_views || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/60 text-sm">Clics total</p>
                <p className="text-2xl font-bold text-amber-400">
                  {campaigns.reduce((s, c) => s + (c.total_clicks || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des campagnes */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Campagnes</h2>
          <Button
            size="sm"
            className="bg-orange-500 hover:bg-orange-600"
            onClick={() => toast.info('Création de campagne bientôt disponible')}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nouvelle
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="bg-white/5 border-white/10 p-8 text-center">
            <Megaphone className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/70">Aucune campagne pour le moment</p>
            <p className="text-white/50 text-sm mt-2">
              Créez une campagne pour promouvoir votre contenu dans le feed
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => {
              const status = STATUS_LABELS[campaign.status] || STATUS_LABELS.draft;
              const convRate =
                campaign.total_views > 0
                  ? ((campaign.total_clicks / campaign.total_views) * 100).toFixed(2)
                  : '0';
              const daysLeft = campaign.ends_at
                ? Math.max(0, Math.ceil((new Date(campaign.ends_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
                : 0;

              return (
                <Card
                  key={campaign.id}
                  className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => {
                    api.ads.getCampaignStats(campaign.id).then((stats) => {
                      toast.info(`${campaign.name}: ${stats.total_views || 0} vues, ${stats.total_clicks || 0} clics`);
                    });
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-white">{campaign.name}</h3>
                          <Badge className={status.color}>{status.label}</Badge>
                          {campaign.status === 'active' && daysLeft > 0 && (
                            <span className="text-white/60 text-sm">{daysLeft}j restants</span>
                          )}
                        </div>
                        <p className="text-white/60 text-sm mt-1">
                          {campaign.duration_days} jours · {campaign.price_fcfa?.toLocaleString()} FCFA
                        </p>
                      </div>
                      <div className="flex gap-6">
                        <div className="flex items-center gap-2 text-white/80">
                          <Eye className="w-4 h-4" />
                          <span>{campaign.total_views || 0}</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/80">
                          <MousePointer className="w-4 h-4" />
                          <span>{campaign.total_clicks || 0}</span>
                        </div>
                        <div className="flex items-center gap-2 text-amber-400">
                          <TrendingUp className="w-4 h-4" />
                          <span>{convRate}% CTR</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Précédent
            </Button>
            <span className="flex items-center px-4 text-white/70">
              {page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
