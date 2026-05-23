import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Megaphone, Check, X, Loader2, Image as ImageIcon, Play, MapPin, Users } from 'lucide-react';
import { getCountryFlagByName } from '@/constants/countries';
import { toast } from 'sonner';

const STATUS_FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'pending_review', label: 'En attente' },
  { value: 'active', label: 'Actives' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'expired', label: 'Expirées' },
];

const STATUS_LABELS = {
  draft: { label: 'Brouillon', color: 'bg-gray-500' },
  pending_review: { label: 'En attente', color: 'bg-amber-500' },
  active: { label: 'Active', color: 'bg-green-500' },
  expired: { label: 'Expirée', color: 'bg-slate-500' },
};

export default function AdsCampaignsPanel() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectReason, setRejectReason] = useState({});
  const [previewCreative, setPreviewCreative] = useState(null);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['admin-ads', statusFilter],
    queryFn: () => api.ads.getAdminCampaigns(statusFilter || undefined),
  });

  const approveMutation = useMutation({
    mutationFn: (campaignId) => api.ads.approveCampaign(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      toast.success('Campagne approuvée');
    },
    onError: (e) => toast.error(e?.apiMessage || 'Erreur'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ campaignId, reason }) => api.ads.rejectCampaign(campaignId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      toast.success('Campagne rejetée');
      setRejectReason({});
    },
    onError: (e) => toast.error(e?.apiMessage || 'Erreur'),
  });

  if (isLoading) {
    return (
      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
        </div>
      </Card>
    );
  }

  const pendingCount = statusFilter === '' ? campaigns.filter((c) => c.status === 'pending_review').length : (statusFilter === 'pending_review' ? campaigns.length : 0);

  return (
    <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Megaphone className="w-5 h-5" />
          Toutes les campagnes publicitaires
          {campaigns.length > 0 && (
            <Badge className="ml-2 bg-orange-500/80 text-white">{campaigns.length}</Badge>
          )}
          {pendingCount > 0 && (
            <Badge className="ml-2 bg-amber-500/80 text-white">{pendingCount} en attente</Badge>
          )}
        </CardTitle>
        <p className="text-white/60 text-sm mt-1">
          Vue d&apos;ensemble de toutes les campagnes. Filtrez par statut ou approuvez/rejetez celles en attente.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === f.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <p className="text-white/70">
            {statusFilter ? `Aucune campagne avec ce statut` : 'Aucune campagne publicitaire'}
          </p>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => {
              const countries = campaign.target_countries || [];
              const cities = campaign.target_cities || [];
              const ageMin = campaign.target_age_min;
              const ageMax = campaign.target_age_max;
              const gender = campaign.target_gender || 'all';
              const genderLabels = { male: 'Hommes', female: 'Femmes', all: 'Tous' };

              return (
                <div
                  key={campaign.id}
                  className="p-4 bg-white/5 rounded-xl border border-white/10"
                >
                  {/* En-tête : nom, statut, annonceur, prix — une ligne claire */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-white/10">
                    <div className="min-w-0 flex items-center gap-2">
                      <h4 className="font-semibold text-white truncate">{campaign.name}</h4>
                      <Badge className={(STATUS_LABELS[campaign.status] || STATUS_LABELS.draft).color + ' shrink-0'}>
                        {(STATUS_LABELS[campaign.status] || STATUS_LABELS.draft).label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="text-white/60 text-sm">
                        {campaign.advertiser?.username || campaign.advertiser?.email}
                      </p>
                      <p className="text-white/70 text-sm">
                        {campaign.price_fcfa?.toLocaleString()} FCFA · {campaign.duration_days} jours
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex gap-4 flex-1 min-w-0">
                      {campaign.creatives?.[0] && (
                        <div className="shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewCreative(campaign.creatives[0])}
                            className="relative block w-24 h-32 rounded-lg overflow-hidden border-2 border-white/20 hover:border-orange-500 transition-colors"
                          >
                            {campaign.creatives[0].media_type === 'video' ? (
                              <>
                                <img
                                  src={campaign.creatives[0].thumbnail_url || campaign.creatives[0].media_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                  <Play className="w-8 h-8 text-white" />
                                </div>
                              </>
                            ) : (
                              <img
                                src={campaign.creatives[0].media_url || campaign.creatives[0].thumbnail_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            )}
                          </button>
                          <p className="text-xs text-white/60 mt-1 text-center">Cliquer pour voir</p>
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Ciblage */}
                        {countries.length > 0 && (
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                            <span className="text-white/70">
                              {countries.length === 1
                                ? (() => {
                                    const f = getCountryFlagByName(countries[0]);
                                    return f ? `${f} ${countries[0]}` : countries[0];
                                  })()
                                : `${countries.length} pays : ${countries.slice(0, 3).map((c) => {
                                    const f = getCountryFlagByName(c);
                                    return f ? `${f} ${c}` : c;
                                  }).join(', ')}${countries.length > 3 ? '…' : ''}`}
                            </span>
                          </div>
                        )}
                        {cities.length > 0 && (
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                            <span className="text-white/70">
                              {cities.length === 1 ? cities[0] : `${cities.length} villes : ${cities.slice(0, 3).join(', ')}${cities.length > 3 ? '…' : ''}`}
                            </span>
                          </div>
                        )}
                        {(ageMin != null || ageMax != null || (gender && gender !== 'all')) && (
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <Users className="w-4 h-4 text-orange-400 shrink-0" />
                            {ageMin != null && ageMax != null && <span>{ageMin}–{ageMax} ans</span>}
                            {ageMin != null && ageMax == null && <span>{ageMin}+ ans</span>}
                            {ageMin == null && ageMax != null && <span>≤{ageMax} ans</span>}
                            {gender && gender !== 'all' && (
                              <span>· {genderLabels[gender] || gender}</span>
                            )}
                          </div>
                        )}
                        {campaign.creatives?.length > 0 && (
                          <div className="flex gap-2 flex-wrap pt-1">
                            {campaign.creatives.map((c) => (
                              <div key={c.id} className="flex items-center gap-1 text-white/70 text-sm">
                                {c.media_type === 'video' ? (
                                  <Play className="w-3 h-3" />
                                ) : (
                                  <ImageIcon className="w-3 h-3" />
                                )}
                                <span>{c.title || c.media_type}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {campaign.status === 'pending_review' && (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:shrink-0">
                        <Input
                          placeholder="Raison rejet (optionnel)"
                          value={rejectReason[campaign.id] || ''}
                          onChange={(e) =>
                            setRejectReason((prev) => ({ ...prev, [campaign.id]: e.target.value }))
                          }
                          className="w-full sm:w-40 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-400 text-red-400 hover:bg-red-500/20"
                            disabled={rejectMutation.isPending}
                            onClick={() =>
                              rejectMutation.mutate({
                                campaignId: campaign.id,
                                reason: rejectReason[campaign.id],
                              })
                            }
                          >
                            <X className="w-4 h-4 mr-1" />
                            Rejeter
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600"
                            disabled={approveMutation.isPending}
                            onClick={() => approveMutation.mutate(campaign.id)}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approuver
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {previewCreative && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewCreative(null)}
        >
          <div
            className="max-w-2xl w-full max-h-[90vh] bg-slate-900 rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 flex justify-between items-center border-b border-white/10">
              <span className="text-white font-medium">Aperçu du créatif</span>
              <Button variant="ghost" size="sm" onClick={() => setPreviewCreative(null)} className="text-white">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4 flex justify-center bg-black">
              {previewCreative.media_type === 'video' ? (
                <video
                  src={previewCreative.media_url}
                  poster={previewCreative.thumbnail_url}
                  controls
                  autoPlay
                  className="max-h-[70vh] w-full"
                />
              ) : (
                <img
                  src={previewCreative.media_url || previewCreative.thumbnail_url}
                  alt=""
                  className="max-h-[70vh] max-w-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
