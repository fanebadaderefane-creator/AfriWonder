import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  BarChart3,
  Eye,
  MousePointer,
  TrendingUp,
  Plus,
  Loader2,
  Megaphone,
  Pencil,
  Trash2,
  MapPin,
  Users,
  Image as ImageIcon,
  Play,
} from 'lucide-react';
import { getCountryFlagByName } from '@/constants/countries';
import { toast } from 'sonner';

const DURATION_OPTIONS = [
  { days: 1, label: '1 jour', price: 2000 },
  { days: 3, label: '3 jours', price: 5000 },
  { days: 7, label: '7 jours', price: 10000 },
  { days: 14, label: '14 jours', price: 18000 },
  { days: 30, label: '30 jours', price: 35000 },
  { days: 60, label: '60 jours', price: 60000 },
  { days: 90, label: '90 jours', price: 85000 },
];

const STATUS_LABELS = {
  draft: { label: 'Brouillon', color: 'bg-gray-500' },
  pending_review: { label: 'En attente', color: 'bg-blue-500' },
  active: { label: 'Active', color: 'bg-blue-500' },
  expired: { label: 'Expirée', color: 'bg-slate-500' },
};

const AD_TYPE_LABELS = {
  in_feed: 'Dans le feed',
  sponsored_video: 'Vidéo sponsorisée',
  business_campaign: 'Campagne business',
  story: 'Story',
};

const GENDER_LABELS = {
  male: 'Hommes',
  female: 'Femmes',
  all: 'Tous',
};

export default function AdvertiserDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [editCampaign, setEditCampaign] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', duration_days: 7 });
  const [deleteCampaign, setDeleteCampaign] = useState(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ads-campaigns', page],
    queryFn: () => api.ads.getCampaigns({ page, limit: 20 }),
  });

  const campaigns = data?.campaigns || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }) => api.ads.updateCampaign(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-campaigns'] });
      setEditCampaign(null);
      toast.success('Campagne mise à jour');
    },
    onError: (err) => {
      toast.error(err?.apiMessage ?? err?.message ?? 'Erreur');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.ads.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-campaigns'] });
      setDeleteCampaign(null);
      toast.success('Campagne supprimée');
    },
    onError: (err) => {
      toast.error(err?.apiMessage ?? err?.message ?? 'Erreur');
    },
  });

  const openEdit = (c) => {
    setEditCampaign(c);
    setEditForm({ name: c.name, duration_days: c.duration_days });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editCampaign || !editForm.name.trim()) return;
    updateMutation.mutate({
      id: editCampaign.id,
      name: editForm.name.trim(),
      duration_days: editForm.duration_days,
    });
  };

  const handleDeleteConfirm = () => {
    if (deleteCampaign) deleteMutation.mutate(deleteCampaign.id);
  };

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-blue-400">{error?.apiMessage || 'Erreur de chargement'}</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-4">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 pb-24">
      <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 border-b border-white/20 shadow-xl z-40">
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
                <p className="text-2xl font-bold text-blue-400">
                  {campaigns.filter((c) => c.status === 'active').length}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/60 text-sm">Vues totales</p>
                <p className="text-2xl font-bold text-blue-400">
                  {campaigns.reduce((s, c) => s + (c.total_views || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/60 text-sm">Clics total</p>
                <p className="text-2xl font-bold text-blue-400">
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
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate(createPageUrl('CreateAdCampaign'))}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nouvelle
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
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

              const countries = campaign.target_countries || [];
              const cities = campaign.target_cities || [];
              const ageMin = campaign.target_age_min;
              const ageMax = campaign.target_age_max;
              const gender = campaign.target_gender || 'all';
              const adType = AD_TYPE_LABELS[campaign.ad_type] || campaign.ad_type || 'Dans le feed';
              const creatives = campaign.creatives || [];

              return (
                <Card
                  key={campaign.id}
                  className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer overflow-hidden"
                  onClick={() => {
                    if (campaign.status !== 'draft') {
                      api.ads.getCampaignStats(campaign.id).then((stats) => {
                        toast.info(`${campaign.name}: ${stats.total_views || 0} vues, ${stats.total_clicks || 0} clics`);
                      }).catch(() => toast.error('Impossible de charger les stats'));
                    }
                  }}
                >
                  <CardContent className="p-4">
                    {/* En-tête : nom, statut, durée restante — une seule ligne claire */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-semibold text-white truncate">{campaign.name}</h3>
                        <Badge className={`${status.color} shrink-0`}>{status.label}</Badge>
                        {campaign.status === 'active' && daysLeft > 0 && (
                          <span className="text-blue-400 text-sm shrink-0">{daysLeft}j restants</span>
                        )}
                      </div>
                      {campaign.status === 'draft' && (
                        <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/20"
                            onClick={() => openEdit(campaign)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-blue-400/80 hover:text-blue-400 hover:bg-red-500/20"
                            onClick={() => setDeleteCampaign(campaign)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Infos principales : durée, prix, type */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/70 mb-3">
                      <span>{campaign.duration_days} jours</span>
                      <span>{campaign.price_fcfa?.toLocaleString()} FCFA</span>
                      <span>{adType}</span>
                    </div>

                    {/* Ciblage : pays, villes, âge, sexe */}
                    <div className="space-y-2 mb-3">
                      {countries.length > 0 && (
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
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
                          <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          <span className="text-white/70">
                            {cities.length === 1 ? cities[0] : `${cities.length} villes : ${cities.slice(0, 3).join(', ')}${cities.length > 3 ? '…' : ''}`}
                          </span>
                        </div>
                      )}
                      {(ageMin != null || ageMax != null || (gender && gender !== 'all')) && (
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <Users className="w-4 h-4 text-blue-400 shrink-0" />
                          {ageMin != null && ageMax != null && (
                            <span>{ageMin}–{ageMax} ans</span>
                          )}
                          {ageMin != null && ageMax == null && <span>{ageMin}+ ans</span>}
                          {ageMin == null && ageMax != null && <span>≤{ageMax} ans</span>}
                          {gender && gender !== 'all' && (
                            <span>· {GENDER_LABELS[gender] || gender}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Créatifs */}
                    {creatives.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {creatives.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10 text-white/80 text-xs"
                          >
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

                    {/* Stats : vues, clics, CTR */}
                    <div className="flex flex-wrap gap-4 pt-3 border-t border-white/10">
                      <div className="flex items-center gap-2 text-white/80">
                        <Eye className="w-4 h-4" />
                        <span>{campaign.total_views || 0} vues</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/80">
                        <MousePointer className="w-4 h-4" />
                        <span>{campaign.total_clicks || 0} clics</span>
                      </div>
                      <div className="flex items-center gap-2 text-blue-400">
                        <TrendingUp className="w-4 h-4" />
                        <span>{convRate}% CTR</span>
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

      {/* Modal Modifier */}
      <Dialog open={!!editCampaign} onOpenChange={(open) => !open && setEditCampaign(null)}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Modifier la campagne</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label className="text-white/80">Nom</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                className="mt-1 bg-white/10 border-white/20"
                placeholder="Nom de la campagne"
              />
            </div>
            <div>
              <Label className="text-white/80">Durée</Label>
              <Select
                value={String(editForm.duration_days)}
                onValueChange={(v) => setEditForm((p) => ({ ...p, duration_days: parseInt(v) }))}
              >
                <SelectTrigger className="mt-1 bg-white/10 border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.days} value={String(opt.days)}>
                      {opt.label} — {opt.price.toLocaleString()} FCFA
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditCampaign(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={updateMutation.isPending || !editForm.name.trim()}>
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Supprimer */}
      <AlertDialog open={!!deleteCampaign} onOpenChange={(open) => !open && setDeleteCampaign(null)}>
        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la campagne ?</AlertDialogTitle>
            <AlertDialogDescription>
              La campagne &quot;{deleteCampaign?.name}&quot; sera définitivement supprimée. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white/80">Annuler</AlertDialogCancel>
            <Button
              variant="destructive"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
