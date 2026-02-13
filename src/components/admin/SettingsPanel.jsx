import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Settings, Shield, DollarSign, Download, Mail, AlertTriangle, ToggleLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPanel({ userRole }) {
  const queryClient = useQueryClient();
  const [marketplace, setMarketplace] = useState(true);
  const [payments, setPayments] = useState(true);
  const [videos, setVideos] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [emergency, setEmergency] = useState(false);

  const { data: killSwitch, isLoading } = useQuery({
    queryKey: ['admin-kill-switch'],
    queryFn: () => api.admin.getKillSwitch(),
  });

  const updateMutation = useMutation({
    mutationFn: (body) => api.admin.updateKillSwitch(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kill-switch'] });
      toast.success('Parametres mis a jour');
    },
    onError: (e) => toast.error(e?.apiMessage || 'Erreur'),
  });

  const { data: featureFlags = [] } = useQuery({
    queryKey: ['admin-feature-flags'],
    queryFn: () => api.admin.getFeatureFlags(),
  });

  const flagMutation = useMutation({
    mutationFn: ({ key, enabled }) => api.admin.setFeatureFlag(key, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['platform-feature-flags'] });
      toast.success('Module activé/désactivé');
    },
    onError: (e) => toast.error(e?.apiMessage || 'Erreur'),
  });

  const isSuperAdmin = userRole === 'super_admin';
  const state = killSwitch || {};
  const marketplaceEnabled = state.marketplace_enabled ?? true;
  const paymentsEnabled = state.payments_enabled ?? true;
  const videosEnabled = state.videos_enabled ?? true;
  const maintenanceMode = state.maintenance_mode ?? false;
  const emergencyMode = state.emergency_mode ?? false;

  const handleKillSwitch = (key, value) => {
    if (!isSuperAdmin) return;
    updateMutation.mutate({ [key]: value });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-6 flex items-center gap-2"><Settings className="w-5 h-5" /> Parametres plateforme</h3>

        {!isSuperAdmin && (
          <div className="p-3 bg-amber-500/20 rounded-lg flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5" /> Seul super_admin peut modifier le mode urgence et les kill switch.
          </div>
        )}

        <div className="space-y-4">
          <div className="p-4 bg-white/5 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2"><Shield className="w-4 h-4" /> Emergency / Kill Switch</h4>
            <p className="text-sm text-white/60 mb-3">En cas d attaque ou bug critique, couper immediatement.</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={marketplaceEnabled} disabled={!isSuperAdmin} onChange={(e) => handleKillSwitch('marketplace_enabled', e.target.checked)} />
                Marketplace active
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={paymentsEnabled} disabled={!isSuperAdmin} onChange={(e) => handleKillSwitch('payments_enabled', e.target.checked)} />
                Paiements actifs
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={videosEnabled} disabled={!isSuperAdmin} onChange={(e) => handleKillSwitch('videos_enabled', e.target.checked)} />
                Videos actives
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={maintenanceMode} disabled={!isSuperAdmin} onChange={(e) => handleKillSwitch('maintenance_mode', e.target.checked)} />
                Mode maintenance
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={emergencyMode} disabled={!isSuperAdmin} onChange={(e) => handleKillSwitch('emergency_mode', e.target.checked)} />
                Mode urgence (tout coupe)
              </label>
            </div>
          </div>

          <div className="p-4 bg-white/5 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2"><ToggleLeft className="w-4 h-4" /> Modules (Phase 2) — Réactiver en 1 clic</h4>
            <p className="text-sm text-white/60 mb-3">Modules cachés au lancement. Activer pour les afficher dans le menu.</p>
            {!isSuperAdmin && (
              <p className="text-sm text-amber-300/80 mb-2">Seul le super_admin peut activer/désactiver les modules.</p>
            )}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${!isSuperAdmin ? 'opacity-60 pointer-events-none' : ''}`}>
              {(featureFlags || []).map((f) => (
                <label key={f.key} className="flex items-center justify-between gap-2 p-2 bg-white/5 rounded-lg">
                  <span className="text-sm text-white/80 truncate">{f.description || f.key}</span>
                  <Switch
                    checked={!!f.enabled}
                    disabled={!isSuperAdmin}
                    onCheckedChange={(checked) => isSuperAdmin && flagMutation.mutate({ key: f.key, enabled: checked })}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="p-4 bg-white/5 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Commission plateforme</h4>
            <Input type="number" defaultValue="15" className="bg-white/10 border-white/20 text-white w-24" />
          </div>

          <div className="p-4 bg-white/5 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2"><Download className="w-4 h-4" /> Export (filtres date, type, pays, role)</h4>
            <p className="text-sm text-white/60 mb-3">Export JSON/CSV via API admin backup.</p>
            <Button className="bg-green-500 hover:bg-green-600 border-none">Export JSON</Button>
          </div>

          <div className="p-4 bg-white/5 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2"><Mail className="w-4 h-4" /> Broadcast (tous / vendeurs / createurs / pays / high spenders)</h4>
            <p className="text-sm text-white/60 mb-3">Planification et historique campagnes a venir.</p>
            <Button className="bg-blue-500 hover:bg-blue-600 border-none">Composer message</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
