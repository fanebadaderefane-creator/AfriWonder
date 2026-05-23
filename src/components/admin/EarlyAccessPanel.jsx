import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, UserPlus, Save, Plus, Minus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const PRESETS_USERS = [5000, 10000, 20000, 50000];
const PRESETS_MONETIZED = [25, 50, 100, 200];

export default function EarlyAccessPanel() {
  const queryClient = useQueryClient();
  const [newMax, setNewMax] = useState('');
  const [newMaxMonetized, setNewMaxMonetized] = useState('');

  const { data: config, isLoading, isError, refetch } = useQuery({
    queryKey: ['early-access-config'],
    queryFn: () => api.earlyAccess.getConfig(),
    retry: 1,
  });

  const { data: waitlist = [], isLoading: loadingWaitlist, isError: waitlistError, refetch: refetchWaitlist } = useQuery({
    queryKey: ['early-access-waitlist'],
    queryFn: () => api.earlyAccess.getWaitlist(),
    retry: 1,
  });

  const setMaxMutation = useMutation({
    mutationFn: (max) => api.earlyAccess.setMaxUsers(max),
    onSuccess: (_, newVal) => {
      queryClient.invalidateQueries(['early-access-config']);
      toast.success(`Limite utilisateurs mise à jour : ${newVal.toLocaleString('fr-FR')}`);
      setNewMax('');
    },
    onError: (e) => toast.error(e?.apiMessage || 'Erreur lors de la mise à jour'),
  });

  const setMaxMonetizedMutation = useMutation({
    mutationFn: (max) => api.earlyAccess.setMaxMonetizedCreators(max),
    onSuccess: (_, newVal) => {
      queryClient.invalidateQueries(['early-access-config']);
      toast.success(`Limite créateurs monétisés : ${newVal}`);
      setNewMaxMonetized('');
    },
    onError: (e) => toast.error(e?.apiMessage || 'Erreur lors de la mise à jour'),
  });

  const handleSetMax = (e) => {
    e?.preventDefault();
    const n = parseInt(String(newMax).replace(/\s/g, ''), 10);
    if (isNaN(n) || n < 1) {
      toast.error('Entrez un nombre valide (ex: 10 000)');
      return;
    }
    setMaxMutation.mutate(n);
  };

  const handleSetMaxMonetized = (e) => {
    e?.preventDefault();
    const n = parseInt(newMaxMonetized, 10);
    if (isNaN(n) || n < 1) {
      toast.error('Entrez un nombre valide (ex: 50)');
      return;
    }
    setMaxMonetizedMutation.mutate(n);
  };

  const handleRefresh = () => {
    refetch();
    refetchWaitlist();
    toast.info('Actualisation en cours...');
  };

  if (isError) {
    return (
      <div className="space-y-4 text-white/70">
        <p>Impossible de charger la configuration Early Access.</p>
        <Button onClick={() => refetch()} variant="outline" className="bg-white/10 border-white/20 text-white">
          Réessayer
        </Button>
      </div>
    );
  }

  const fallbackConfig = { maxUsers: 10000, totalUsers: 0, isFull: false, spotsLeft: 10000, monetizedCreators: 0, maxMonetizedCreators: 50 };
  const { maxUsers, totalUsers, isFull, spotsLeft, monetizedCreators, maxMonetizedCreators } = config || fallbackConfig;

  if (isLoading) {
    return <div className="text-white/70">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Early Access — Gestion des limites
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="text-white/70 hover:text-white"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Actualiser
          </Button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 rounded-lg bg-black/20">
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wide">Inscrits</p>
            <p className="text-2xl font-bold text-orange-400">{totalUsers?.toLocaleString('fr-FR') ?? 0}</p>
          </div>
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wide">Max utilisateurs</p>
            <p className="text-2xl font-bold">{maxUsers?.toLocaleString('fr-FR') ?? 0}</p>
          </div>
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wide">Créateurs monétisés</p>
            <p className="text-2xl font-bold text-green-400">{monetizedCreators ?? 0} / {maxMonetizedCreators ?? 50}</p>
          </div>
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wide">Statut</p>
            <p className={`text-sm font-medium ${isFull ? 'text-amber-400' : 'text-green-400'}`}>
              {isFull ? 'Complet' : `${spotsLeft?.toLocaleString('fr-FR') ?? 0} places`}
            </p>
          </div>
        </div>

        {/* Section 1 : Limite utilisateurs */}
        <div className="space-y-3 mb-6">
          <h4 className="text-sm font-semibold text-white/80">1. Limite maximale d'utilisateurs</h4>
          <p className="text-white/50 text-xs">Définit le nombre total d'inscriptions autorisées. Au-delà, les nouveaux utilisateurs rejoignent la liste d'attente.</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setMaxMutation.mutate(Math.max(1, (maxUsers ?? 10000) - 1000))}
              disabled={setMaxMutation.isPending}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              title="Diminuer de 1 000"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setMaxMutation.mutate((maxUsers ?? 10000) + 1000)}
              disabled={setMaxMutation.isPending}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              title="Augmenter de 1 000"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <span className="text-white/50 text-sm">± 1 000</span>
            <div className="flex gap-2 flex-wrap ml-2">
              {PRESETS_USERS.map((val) => (
                <Button
                  key={val}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMaxMutation.mutate(val)}
                  disabled={setMaxMutation.isPending}
                  className="bg-white/5 border-white/20 text-white hover:bg-orange-500/30"
                >
                  {val.toLocaleString('fr-FR')}
                </Button>
              ))}
            </div>
          </div>
          <form onSubmit={handleSetMax} className="flex gap-2 flex-wrap items-center">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Valeur personnalisée (ex: 15 000)"
              value={newMax}
              onChange={(e) => setNewMax(e.target.value.replace(/[^\d\s]/g, ''))}
              className="max-w-[160px] bg-white/10 border-white/20 text-white"
            />
            <Button type="submit" disabled={setMaxMutation.isPending || !newMax.trim()} className="bg-orange-500 hover:bg-orange-600">
              <Save className="w-4 h-4 mr-2" />
              Appliquer
            </Button>
          </form>
        </div>

        {/* Section 2 : Limite créateurs monétisés */}
        <div className="space-y-3 pt-4 border-t border-white/10">
          <h4 className="text-sm font-semibold text-white/80">2. Limite créateurs monétisés</h4>
          <p className="text-white/50 text-xs">Nombre maximum de créateurs pouvant activer la monétisation.</p>
          <div className="flex gap-2 flex-wrap">
            {PRESETS_MONETIZED.map((val) => (
              <Button
                key={val}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMaxMonetizedMutation.mutate(val)}
                disabled={setMaxMonetizedMutation.isPending}
                className="bg-white/5 border-white/20 text-white hover:bg-green-500/30"
              >
                {val}
              </Button>
            ))}
          </div>
          <form onSubmit={handleSetMaxMonetized} className="flex gap-2 flex-wrap items-center">
            <Input
              type="number"
              min={1}
              placeholder="Valeur personnalisée (ex: 75)"
              value={newMaxMonetized}
              onChange={(e) => setNewMaxMonetized(e.target.value)}
              className="max-w-[120px] bg-white/10 border-white/20 text-white"
            />
            <Button type="submit" disabled={setMaxMonetizedMutation.isPending || !newMaxMonetized.trim()} className="bg-green-500 hover:bg-green-600">
              <Save className="w-4 h-4 mr-2" />
              Appliquer
            </Button>
          </form>
        </div>
      </Card>

      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Liste d'attente ({waitlist.length})
        </h3>
        <p className="text-white/50 text-xs mb-4">Personnes inscrites en attente d'une place.</p>
        {loadingWaitlist ? (
          <p className="text-white/60">Chargement...</p>
        ) : waitlistError ? (
          <p className="text-amber-400">Impossible de charger la liste d'attente.</p>
        ) : waitlist.length === 0 ? (
          <p className="text-white/60">Aucune inscription en attente</p>
        ) : (
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Nom</th>
                  <th className="text-left py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.map((w) => (
                  <tr key={w.id} className="border-b border-white/10">
                    <td className="py-2">{w.email}</td>
                    <td className="py-2 text-white/70">{w.full_name || '-'}</td>
                    <td className="py-2 text-white/50 text-xs">
                      {new Date(w.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
