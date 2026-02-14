import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck } from 'lucide-react';
import { toast } from 'sonner';

// CDC 2.2.4 - Villes prioritaires Mali pour points relais
const MALI_CITIES = ['Bamako', 'Sikasso', 'Ségou', 'Mopti', 'Kayes', 'Koulikoro', 'Gao', 'Tombouctou'];

export default function LogisticsPanel() {
  const queryClient = useQueryClient();
  const [rateForm, setRateForm] = useState({
    provider: 'DHL_MALI',
    destination_country: 'ML',
    base_cost: '1500',
    cost_per_kg: '500',
    estimated_delivery_days: '2',
  });
  const [pointForm, setPointForm] = useState({
    name: '',
    address: '',
    city: 'Bamako',
    country: 'ML',
  });

  const { data: providersData, isLoading: loadingProviders } = useQuery({
    queryKey: ['admin-logistics-providers'],
    queryFn: () => api.admin.getLogisticsProviders(),
  });
  const { data: rates = [], isLoading: loadingRates } = useQuery({
    queryKey: ['admin-logistics-rates'],
    queryFn: () => api.admin.listLogisticsRates({}),
  });
  const { data: pickupPoints = [], isLoading: loadingPoints } = useQuery({
    queryKey: ['admin-logistics-points'],
    queryFn: () => api.admin.listPickupPoints({}),
  });

  const createRate = useMutation({
    mutationFn: (payload) => api.admin.createLogisticsRate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-logistics-rates'] });
      queryClient.invalidateQueries({ queryKey: ['admin-logistics-providers'] });
      toast.success('Tarif logistique cree');
    },
    onError: (e) => toast.error(e?.apiMessage || 'Erreur creation tarif'),
  });

  const createPoint = useMutation({
    mutationFn: (payload) => api.admin.createPickupPoint(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-logistics-points'] });
      queryClient.invalidateQueries({ queryKey: ['admin-logistics-providers'] });
      toast.success('Point relais cree');
      setPointForm((s) => ({ ...s, name: '', address: '' }));
    },
    onError: (e) => toast.error(e?.apiMessage || 'Erreur creation point relais'),
  });

  const providers = providersData?.providers || [];
  const countryStats = useMemo(() => {
    const map = new Map();
    for (const p of pickupPoints) {
      const key = p.country || 'N/A';
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()].map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count);
  }, [pickupPoints]);

  if (loadingProviders || loadingRates || loadingPoints) {
    return <div className="text-white/70">Chargement logistique...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Logistique Marketplace
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-white/20 bg-white/10">
            <p className="text-sm text-white font-medium">Transporteurs actifs</p>
            <p className="text-2xl font-bold text-white">{providers.length}</p>
          </div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10">
            <p className="text-sm text-white font-medium">Tarifs actifs</p>
            <p className="text-2xl font-bold text-white">{rates.filter((r) => r.is_active).length}</p>
          </div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10">
            <p className="text-sm text-white font-medium">Points relais actifs</p>
            <p className="text-2xl font-bold text-white">{pickupPoints.filter((p) => p.is_active).length}</p>
          </div>
          <div className="p-4 rounded-lg border border-white/20 bg-white/10">
            <p className="text-sm text-white font-medium">Pays couverts</p>
            <p className="text-2xl font-bold text-white">{countryStats.length}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h4 className="font-semibold mb-3">Nouveau tarif de livraison</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20"
            value={rateForm.provider}
            onChange={(e) => setRateForm((s) => ({ ...s, provider: e.target.value }))}
            aria-label="Transporteur"
          >
            <option value="DHL_MALI">DHL Mali</option>
            <option value="MOTO">Livraison moto</option>
            <option value="SOCIETE_TRANSPORT_MALI">Société transport Mali</option>
            <option value="TCR_MALI">TCR Mali</option>
            <option value="CHRONOPOST">Chronopost</option>
            <option value="LAPOSTE">La Poste / Colissimo</option>
          </select>
          <input
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20"
            placeholder="Pays destination (ML)"
            value={rateForm.destination_country}
            onChange={(e) => setRateForm((s) => ({ ...s, destination_country: e.target.value.toUpperCase() }))}
          />
          <input
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20"
            placeholder="Base cost"
            value={rateForm.base_cost}
            onChange={(e) => setRateForm((s) => ({ ...s, base_cost: e.target.value }))}
          />
          <input
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20"
            placeholder="Cost per kg"
            value={rateForm.cost_per_kg}
            onChange={(e) => setRateForm((s) => ({ ...s, cost_per_kg: e.target.value }))}
          />
          <input
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20"
            placeholder="Delai (jours)"
            value={rateForm.estimated_delivery_days}
            onChange={(e) => setRateForm((s) => ({ ...s, estimated_delivery_days: e.target.value }))}
          />
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={createRate.isPending}
            onClick={() => createRate.mutate(rateForm)}
          >
            Ajouter tarif
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h4 className="font-semibold mb-3">Nouveau point relais</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20"
            placeholder="Nom du point"
            value={pointForm.name}
            onChange={(e) => setPointForm((s) => ({ ...s, name: e.target.value }))}
          />
          <input
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20"
            placeholder="Adresse"
            value={pointForm.address}
            onChange={(e) => setPointForm((s) => ({ ...s, address: e.target.value }))}
          />
          <select
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20"
            value={pointForm.city}
            onChange={(e) => setPointForm((s) => ({ ...s, city: e.target.value }))}
            aria-label="Ville du point relais"
          >
            {MALI_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20"
            placeholder="Pays"
            value={pointForm.country}
            onChange={(e) => setPointForm((s) => ({ ...s, country: e.target.value.toUpperCase() }))}
          />
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            disabled={createPoint.isPending || !pointForm.name || !pointForm.address}
            onClick={() => createPoint.mutate(pointForm)}
          >
            Ajouter point relais
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h4 className="font-semibold mb-3">Transporteurs et tarifs</h4>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {providers.length === 0 && <p className="text-white/60 text-sm">Aucun transporteur configure.</p>}
          {providers.map((p) => (
            <div key={p.name} className="p-3 rounded-lg border border-white/20 bg-white/10 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="text-xs text-white/70">{p.active_rates} tarifs actifs</p>
              </div>
              <Badge className="bg-emerald-600">{p.active_rates}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
