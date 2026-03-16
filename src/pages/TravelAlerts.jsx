// CPO 9.33 — Alertes prix voyage (vol / hôtel)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Plane, Building2, Trash2, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import BottomNav from '@/components/navigation/BottomNav';

export default function TravelAlerts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('flight');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate(createPageUrl('Landing')));
  }, [navigate]);

  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['me-travel-alerts', user?.id],
    queryFn: () => api.me.getTravelAlerts({ page: 1, limit: 50 }),
    enabled: !!user?.id,
  });
  const alerts = alertsData?.alerts ?? [];

  const createMutation = useMutation({
    mutationFn: () => api.me.createTravelAlert({
      type,
      origin: origin.trim() || undefined,
      destination: destination.trim(),
      target_price: parseFloat(targetPrice),
      check_in: checkIn || undefined,
      check_out: checkOut || undefined,
    }),
    onSuccess: () => {
      toast.success('Alerte créée');
      setShowForm(false);
      setOrigin('');
      setDestination('');
      setTargetPrice('');
      setCheckIn('');
      setCheckOut('');
      queryClient.invalidateQueries({ queryKey: ['me-travel-alerts'] });
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.me.deleteTravelAlert(id),
    onSuccess: () => {
      toast.success('Alerte supprimée');
      queryClient.invalidateQueries({ queryKey: ['me-travel-alerts'] });
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.message || 'Erreur'),
  });

  const handleSubmit = () => {
    if (!destination.trim() || !targetPrice || parseFloat(targetPrice) <= 0) {
      toast.error('Destination et prix cible requis');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl" aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-gray-900">Alertes prix voyage</h1>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-sm text-gray-600">
          Recevez une notification quand le prix baisse pour une destination (vol ou hôtel).
        </p>

        {!showForm ? (
          <Button onClick={() => setShowForm(true)} className="w-full">
            Ajouter une alerte
          </Button>
        ) : (
          <Card className="p-4 space-y-3">
            <div className="flex gap-2">
              <Button variant={type === 'flight' ? 'default' : 'outline'} size="sm" onClick={() => setType('flight')}>
                <Plane className="w-4 h-4 mr-1" /> Vol
              </Button>
              <Button variant={type === 'hotel' ? 'default' : 'outline'} size="sm" onClick={() => setType('hotel')}>
                <Building2 className="w-4 h-4 mr-1" /> Hôtel
              </Button>
            </div>
            {type === 'flight' && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">Origine (code aéroport)</label>
                <Input placeholder="ex. DKR" value={origin} onChange={(e) => setOrigin(e.target.value)} />
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Destination</label>
              <Input placeholder="ex. PAR ou Paris" value={destination} onChange={(e) => setDestination(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Prix cible (max)</label>
              <Input type="number" min="0" step="0.01" placeholder="0" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} />
            </div>
            {type === 'hotel' && (
              <>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Arrivée</label>
                  <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Départ</label>
                  <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
                </div>
              </>
            )}
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer l\'alerte'}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : alerts.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            Aucune alerte. Ajoutez une destination et un prix cible.
          </Card>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li key={a.id}>
                <Card className="p-4 flex items-center justify-between">
                  <div>
                    <span className="font-medium">{a.destination}</span>
                    {a.origin && <span className="text-gray-500 ml-1">← {a.origin}</span>}
                    <p className="text-sm text-gray-500">{a.type === 'hotel' ? 'Hôtel' : 'Vol'} — max {Number(a.target_price).toFixed(0)}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(a.id)} aria-label="Supprimer">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
