import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import MessagingCdcShell from '@/components/messaging/MessagingCdcShell';
import {
  CdcCallout,
  useCdcPersistedJson,
  CdcSubsectionTitle,
  CdcRequirementChecklist,
  CdcTierLegend,
} from '@/components/messaging/MessagingCdcUi';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/expressClient';

const DEFAULT_PRIVACY = {
  e2e: false,
  read: true,
  lastSeen: true,
  viewOnce: false,
  ephemeral: false,
  lock: false,
  backup: false,
  forward: false,
};

const rows = [
  { id: 'e2e', label: 'Indicateur chiffrement de bout en bout', hint: 'Préférence compte (messaging_e2e_enabled) ; implémentation clés à finaliser.' },
  { id: 'read', label: 'Accusés de lecture (deux coches)', hint: 'Appliqué côté serveur aux conversations ; synchronisé avec le compte si vous êtes connecté.' },
  { id: 'lastSeen', label: 'Dernière connexion visible', hint: 'Contacts, certaines personnes, ou personne.' },
  { id: 'viewOnce', label: 'Médias « voir une fois » par défaut', hint: 'Comportement à la capture et conservation serveur.' },
  { id: 'ephemeral', label: 'Durée éphémère par défaut (24 h / 7 j / 90 j)', hint: 'S’applique aux nouvelles conversations.' },
  { id: 'lock', label: 'Verrouiller l’ouverture de l’app', hint: 'Code, biométrie — surtout sur builds natifs.' },
  { id: 'backup', label: 'Sauvegardes cloud chiffrées', hint: 'Mot de passe dédié aux archives.' },
  { id: 'forward', label: 'Limiter le transfert (une conversation cible)', hint: 'Modération et traçabilité.' },
];

const SERVER_SYNC_IDS = new Set(['e2e', 'read']);

export function MessagingCdcPrivacyPanel() {
  const navigate = useNavigate();
  const { user, checkAuth } = useAuth();
  const [local, setLocal] = useCdcPersistedJson('privacy_toggles', DEFAULT_PRIVACY);

  const persistMutation = useMutation({
    mutationFn: (payload) => api.auth.updateMe(payload),
    onSuccess: async () => {
      await checkAuth();
      toast.success('Réglage enregistré');
    },
    onError: (e) =>
      toast.error(e?.response?.data?.error?.message || e?.message || 'Enregistrement impossible'),
  });

  return (
    <MessagingCdcShell title="Confidentialité — messagerie" subtitle="Réglages cible — maquette">
      <CdcCallout variant="info">
        Connecté : chiffrement (préférence E2E) et accusés de lecture sont enregistrés sur votre compte (
        <code className="text-white/55">PUT /users/me</code>
        ). Les autres options restent locales jusqu’à branchement serveur.
      </CdcCallout>

      <CdcSubsectionTitle>Périmètre CDC confidentialité messagerie</CdcSubsectionTitle>
      <CdcRequirementChecklist
        className="mt-2"
        items={[
          { status: 'ui', label: 'Interrupteurs E2E + accusés synchronisés compte ; autres toggles locaux (maquette).' },
          { status: 'partial', label: 'View once, éphémère par défaut, transfert limité : alignement Réglages + API.' },
          { status: 'server', label: 'Verrouillage app, sauvegardes cloud, politique rétention messages.' },
        ]}
      />
      <CdcTierLegend className="mt-3" />

      <Button
        type="button"
        variant="ghost"
        className="mb-4 h-auto w-full justify-start rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-[13px] text-sky-200/95 hover:bg-white/[0.08]"
        onClick={() => navigate(createPageUrl('Settings'))}
      >
        Réglages compte (notifications, confidentialité générale) →
      </Button>

      <div className="space-y-0 divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.035]">
        {rows.map((r) => {
          const serverBacked = SERVER_SYNC_IDS.has(r.id) && Boolean(user?.id);
          const checked = serverBacked
            ? r.id === 'read'
              ? user.messaging_read_receipts_enabled !== false
              : Boolean(user.messaging_e2e_enabled)
            : Boolean(local[r.id]);
          const busy = persistMutation.isPending && serverBacked;

          return (
            <div key={r.id} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 pr-2">
                <Label htmlFor={`cdc-${r.id}`} className="text-[14px] font-medium text-white/88">
                  {r.label}
                </Label>
                <p className="mt-1 text-[12px] leading-snug text-white/40">{r.hint}</p>
              </div>
              <Switch
                id={`cdc-${r.id}`}
                checked={checked}
                disabled={busy}
                onCheckedChange={(v) => {
                  if (serverBacked) {
                    if (r.id === 'read') persistMutation.mutate({ messaging_read_receipts_enabled: v });
                    else persistMutation.mutate({ messaging_e2e_enabled: v });
                  } else {
                    setLocal((prev) => ({ ...prev, [r.id]: v }));
                  }
                }}
              />
            </div>
          );
        })}
      </div>
    </MessagingCdcShell>
  );
}

export default function MessagingCdcPrivacy() {
  return <Navigate to={`${createPageUrl('MessagingCdcHub')}?section=privacy`} replace />;
}
