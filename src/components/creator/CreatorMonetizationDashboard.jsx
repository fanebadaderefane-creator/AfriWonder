import React from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Eye, Heart, Video, Users, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function CreatorMonetizationDashboard() {
  const queryClient = useQueryClient();
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['creator-dashboard'],
    queryFn: () => api.creatorDashboard.getDashboard(),
  });

  const requestMutation = useMutation({
    mutationFn: () => api.creatorDashboard.requestMonetization(),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message || 'Demande envoyée à AfriWonder');
        queryClient.invalidateQueries(['creator-dashboard']);
      } else {
        toast.error(res.message || 'Impossible d\'envoyer la demande');
      }
    },
    onError: (err) => toast.error(err.apiMessage || err.response?.data?.message || err.message),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const m = dashboard?.monetization;
  const status = m?.status;
  const conditions = status?.conditions || {};
  const revenues = dashboard?.revenues || {};
  const stats = dashboard?.stats || {};
  const badge = dashboard?.badge;

  const conditionItems = [
    { key: 'subscribers', label: 'Abonnés', current: conditions.subscribers?.current ?? 0, required: conditions.subscribers?.required ?? 2000, met: conditions.subscribers?.met },
    { key: 'views30d', label: 'Vues (30j)', current: conditions.views30d?.current ?? 0, required: conditions.views30d?.required ?? 100000, met: conditions.views30d?.met },
    { key: 'videos', label: 'Vidéos', current: conditions.videos?.current ?? 0, required: conditions.videos?.required ?? 10, met: conditions.videos?.met },
    { key: 'accountDays', label: 'Jours actif', current: conditions.accountDays?.current ?? 0, required: conditions.accountDays?.required ?? 14, met: conditions.accountDays?.met },
    { key: 'engagement', label: 'Engagement ≥5%', current: ((conditions.engagement?.current ?? 0) * 100).toFixed(2) + '%', required: '5%', met: conditions.engagement?.met },
    { key: 'verified', label: 'Compte vérifié', current: conditions.verified?.met ? 'Oui' : 'Non', required: 'Oui', met: conditions.verified?.met },
  ];

  return (
    <div className="space-y-6">
      {badge && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{badge.icon}</span>
              <div>
                <p className="font-bold text-lg">{badge.name}</p>
                <p className="text-sm text-gray-600">{badge.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Coins className="w-4 h-4" /> Revenus dons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {(revenues.donations_fcfa ?? 0).toLocaleString()} FCFA
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Video className="w-4 h-4" /> Revenus vidéos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {(revenues.video_fcfa ?? 0).toLocaleString()} FCFA
            </p>
            <p className="text-xs text-gray-500">Vues qualifiées: {stats.qualified_views ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(revenues.total_fcfa ?? 0).toLocaleString()} FCFA
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Vues totales</p>
                <p className="text-xl font-bold">{stats.total_views?.toLocaleString() ?? 0}</p>
              </div>
              <Eye className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Likes</p>
                <p className="text-xl font-bold">{stats.total_likes?.toLocaleString() ?? 0}</p>
              </div>
              <Heart className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Vidéos</p>
                <p className="text-xl font-bold">{stats.video_count ?? 0}</p>
              </div>
              <Video className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Engagement</p>
                <p className="text-xl font-bold">{stats.engagement_rate_pct ?? 0}%</p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

        {dashboard?.viral_bonuses?.length > 0 && (
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle>Bonus viraux (100K, 500K, 1M vues)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboard.viral_bonuses.map((b) => (
                  <div key={b.id} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <span>{b.milestone} vues</span>
                    <span className="font-bold">{b.amount_fcfa?.toLocaleString()} FCFA</span>
                    <Badge className={b.status === 'paid' ? 'bg-blue-100' : 'bg-blue-100'}>
                      {b.status === 'paid' ? 'Payé' : 'En attente'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Progression vers la monétisation</CardTitle>
          <p className="text-sm text-gray-500">
            2K abonnés • 100K vues/30j • 10 vidéos • 14j actif • engagement ≥5% • compte vérifié
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {conditionItems.map((c) => (
            <div key={c.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {c.met ? (
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-300" />
                )}
                <span>{c.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{c.current}</span>
                <span className="text-gray-400">/ {c.required}</span>
                {c.met && <Badge className="bg-blue-100 text-blue-800">OK</Badge>}
              </div>
            </div>
          ))}
          <div className="pt-4 border-t">
            {m?.enabled ? (
              <Badge className="bg-blue-100 text-blue-800 text-base px-4 py-2">Monétisation activée</Badge>
            ) : m?.pending_request ? (
              <Badge className="bg-blue-100 text-blue-800 text-base px-4 py-2">
                Demande envoyée — En attente de validation AfriWonder
              </Badge>
            ) : status?.eligible ? (
              <Button
                onClick={() => requestMutation.mutate()}
                disabled={requestMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {requestMutation.isPending ? 'Envoi...' : 'Demander la monétisation'}
              </Button>
            ) : (
              <p className="text-sm text-blue-600">{status?.reason || 'Conditions non remplies'}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
