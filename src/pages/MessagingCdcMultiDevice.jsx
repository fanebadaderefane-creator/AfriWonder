import React, { useMemo, useState } from 'react';
import { Monitor, Smartphone, Tablet, Watch, Laptop, Link2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api } from '@/api/expressClient';
import { useAuth } from '@/lib/AuthContext';
import MessagingCdcShell from '@/components/messaging/MessagingCdcShell';
import {
  CdcCallout,
  CdcFeatureRow,
  CdcImplBadge,
  useCdcPersistedJson,
  CdcSubsectionTitle,
  CdcRequirementChecklist,
  CdcTierLegend,
} from '@/components/messaging/MessagingCdcUi';

function newLinkId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `dev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function MessagingCdcMultiDevice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [linked, setLinked] = useCdcPersistedJson('linked_devices_demo', []);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const qrCells = useMemo(
    () => Array.from({ length: 36 }, (_, i) => (i * 13 + (i % 7)) % 2 === 0),
    []
  );

  const sessionsQuery = useQuery({
    queryKey: ['cdc-me-sessions'],
    enabled: Boolean(user?.id),
    queryFn: () => api.me.getSessions(),
    staleTime: 30_000,
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId) => api.me.revokeSession(sessionId),
    onSuccess: () => {
      toast.success('Session révoquée');
      queryClient.invalidateQueries({ queryKey: ['cdc-me-sessions'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Impossible de révoquer'),
  });

  const addDevice = () => {
    const c = code.replace(/\s/g, '');
    if (c.length < 4) {
      toast.message('Saisissez un code (démo)');
      return;
    }
    setLinked((prev) => [
      ...prev,
      {
        id: newLinkId(),
        label: 'Appareil lié (démo)',
        detail: `Code ${c.slice(0, 8)}`,
        at: new Date().toISOString(),
      },
    ]);
    setCode('');
    setOpen(false);
    toast.success('Appareil ajouté (simulation locale)');
  };

  return (
    <MessagingCdcShell title="Multi-appareils" subtitle="Web, mobile, tablette — cahier des charges">
      <CdcCallout variant="info">
        Cette PWA fonctionne déjà dans le navigateur. Les sessions actives peuvent être listées et révoquées via l’API ;
        l’appairage QR / code reste simulé localement jusqu’au backend dédié.
      </CdcCallout>

      <CdcSubsectionTitle>Exigences multi-appareils CDC</CdcSubsectionTitle>
      <CdcRequirementChecklist
        className="mt-2"
        items={[
          { status: 'ui', label: 'Écran complet : appareils types, démo liaison, liste sessions (API si connecté).' },
          { status: 'partial', label: 'Sync historique et clés E2EE entre clients : en cours côté produit.' },
          { status: 'server', label: 'Limite 4 appareils, révocation, journal de confiance, montre connectée.' },
        ]}
      />
      <CdcTierLegend className="mt-3" />

      <div className="mt-5 space-y-3">
        <CdcFeatureRow
          icon={Smartphone}
          title="Téléphone principal"
          description="Session courante ; notifications push et clés associées."
          tier="partial"
        />
        <CdcFeatureRow
          icon={Monitor}
          title="Jusqu’à quatre appareils liés"
          description="Tablette, navigateur, bureau — sans exiger que le téléphone reste allumé en permanence."
          tier="api"
        />
        <CdcFeatureRow
          icon={Laptop}
          title="Navigateur et futurs clients natifs"
          description="Même compte, même historique chiffré lorsque la sync serveur sera active."
          tier="partial"
        />
        <CdcFeatureRow
          icon={Tablet}
          title="Tablettes"
          description="Mise en page responsive ; mode deux colonnes possible sur grands écrans."
          tier="app"
        />
        <CdcFeatureRow
          icon={Watch}
          title="Montre connectée"
          description="Réponses courtes et notifications ; dépend des bridges natifs."
          tier="api"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[14px] font-medium text-white/90">Cet appareil</p>
          <CdcImplBadge tier="app" />
        </div>
        <p className="mt-1 text-[13px] text-white/45">Navigateur — session active sur cette page.</p>
      </div>

      <div className="mt-4 space-y-2">
        {linked.map((d) => (
          <div
            key={d.id}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3.5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20">
              <Laptop className="h-5 w-5 text-cyan-200" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-white/88">{d.label}</p>
              <p className="text-[12px] text-white/40">{d.detail}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-white/40 hover:text-rose-300"
              aria-label="Retirer l’appareil"
              onClick={() => setLinked((prev) => prev.filter((x) => x.id !== d.id))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[14px] font-medium text-white/90">Sessions actives</p>
          <CdcImplBadge tier="api" />
        </div>
        <p className="mt-1 text-[13px] text-white/45">Révoquez un appareil si vous ne le reconnaissez pas.</p>

        {sessionsQuery.isLoading ? (
          <div className="mt-4 rounded-2xl border border-white/[0.08] bg-black/20 px-3 py-6">
            <p className="text-[13px] text-white/55">Chargement…</p>
          </div>
        ) : null}

        {!sessionsQuery.isLoading && sessionsQuery.data && Array.isArray(sessionsQuery.data) && sessionsQuery.data.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-black/20 px-3 py-6 text-center">
            <p className="text-[13px] text-white/55">Aucune session</p>
          </div>
        ) : null}

        {!sessionsQuery.isLoading && sessionsQuery.data && Array.isArray(sessionsQuery.data) && sessionsQuery.data.length > 0 ? (
          <div className="mt-4 space-y-2">
            {sessionsQuery.data.map((s) => {
              const label = s.device_id || s.user_agent || s.id || 'Session';
              const atRaw = s.last_seen || s.created_at || '';
              const at = typeof atRaw === 'string' ? atRaw.slice(0, 16).replace('T', ' ') : '';
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-white/88">{label}</p>
                    {at ? <p className="mt-0.5 text-[12px] text-white/40">{at}</p> : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-white/40 hover:text-rose-300"
                    aria-label="Révoquer la session"
                    onClick={() => revokeSessionMutation.mutate(s.id)}
                    disabled={revokeSessionMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        className="mt-6 w-full rounded-2xl bg-cyan-600/90 py-5 text-white hover:bg-cyan-600"
        onClick={() => setOpen(true)}
      >
        <Link2 className="mr-2 inline h-5 w-5" />
        Lier un appareil (maquette)
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-white/10 bg-[#0c1220] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Appairage</DialogTitle>
            <DialogDescription className="text-white/50">
              Scannez un QR ou saisissez un code affiché sur votre autre appareil. Ici, seule la saisie de code est
              simulée.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <div className="grid h-36 w-36 grid-cols-6 gap-0.5 rounded-lg border border-white/15 bg-white p-2">
              {qrCells.map((on, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-[1px] ${on ? 'bg-slate-900' : 'bg-white'}`}
                />
              ))}
            </div>
          </div>
          <p className="text-center text-[11px] text-white/35">QR décoratif — données réelles à fournir par l’API</p>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code à 8 caractères…"
            className="border-white/15 bg-white/[0.06] text-white placeholder:text-white/35"
          />
          <DialogFooter>
            <Button type="button" variant="secondary" className="bg-white/10 text-white" onClick={() => setOpen(false)}>
              Fermer
            </Button>
            <Button type="button" className="bg-cyan-600 text-white hover:bg-cyan-600" onClick={addDevice}>
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MessagingCdcShell>
  );
}
