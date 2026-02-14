import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, UserPlus, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function EarlyAccessPanel() {
  const queryClient = useQueryClient();
  const [newMax, setNewMax] = useState('');

  const { data: config, isLoading } = useQuery({
    queryKey: ['early-access-config'],
    queryFn: () => api.earlyAccess.getConfig(),
  });

  const { data: waitlist = [], isLoading: loadingWaitlist } = useQuery({
    queryKey: ['early-access-waitlist'],
    queryFn: () => api.earlyAccess.getWaitlist(),
  });

  const setMaxMutation = useMutation({
    mutationFn: (max) => api.earlyAccess.setMaxUsers(max),
    onSuccess: () => {
      queryClient.invalidateQueries(['early-access-config']);
      toast.success('Limite mise à jour');
      setNewMax('');
    },
    onError: (e) => toast.error(e?.apiMessage || 'Erreur'),
  });

  const handleSetMax = (e) => {
    e?.preventDefault();
    const n = parseInt(newMax, 10);
    if (isNaN(n) || n < 1) {
      toast.error('Nombre invalide');
      return;
    }
    setMaxMutation.mutate(n);
  };

  if (isLoading || !config) {
    return <div className="text-white/70">Chargement...</div>;
  }

  const { maxUsers, totalUsers, isFull, spotsLeft } = config;

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Early Access — Limite d'utilisateurs
        </h3>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-white/60 text-sm">Utilisateurs inscrits</p>
            <p className="text-2xl font-bold text-orange-400">{totalUsers.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-white/60 text-sm">Maximum configuré</p>
            <p className="text-2xl font-bold">{maxUsers.toLocaleString()}</p>
          </div>
        </div>
        <p className={`text-sm mb-4 ${isFull ? 'text-amber-400' : 'text-green-400'}`}>
          {isFull ? 'Early Access complet — inscriptions bloquées' : `${spotsLeft} places restantes`}
        </p>
        <form onSubmit={handleSetMax} className="flex gap-2 flex-wrap">
          <Input
            type="number"
            min={1}
            placeholder="Nouveau max (ex: 2000)"
            value={newMax}
            onChange={(e) => setNewMax(e.target.value)}
            className="max-w-[180px] bg-white/10 border-white/20 text-white"
          />
          <Button
            type="submit"
            disabled={setMaxMutation.isPending}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Save className="w-4 h-4 mr-2" />
            {setMaxMutation.isPending ? 'Enregistrement...' : 'Mettre à jour'}
          </Button>
        </form>
      </Card>

      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Liste d'attente ({waitlist.length})
        </h3>
        {loadingWaitlist ? (
          <p className="text-white/60">Chargement...</p>
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
