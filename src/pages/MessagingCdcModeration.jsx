import React, { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserX, ShieldAlert, Forward, Flag } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const DEFAULT_MOD = {
  silentLeave: false,
  forwardLimit: true,
};

function mergeModFromUser(user) {
  const raw = user?.messaging_cdc_moderation;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...DEFAULT_MOD, ...raw };
  }
  return { ...DEFAULT_MOD };
}

export function MessagingCdcModerationPanel() {
  const { user, checkAuth } = useAuth();
  const [local, setLocal] = useCdcPersistedJson('moderation_toggles', DEFAULT_MOD);

  const serverBacked = Boolean(user?.id);
  const effective = useMemo(
    () => (serverBacked ? mergeModFromUser(user) : local),
    [serverBacked, user, local]
  );

  const persistMutation = useMutation({
    mutationFn: (payload) => api.auth.updateMe(payload),
    onSuccess: async () => {
      await checkAuth();
      toast.success('Préférences enregistrées');
    },
    onError: (e) =>
      toast.error(e?.response?.data?.error?.message || e?.message || 'Enregistrement impossible'),
  });

  const saveModerationPatch = (patch) => {
    if (!user?.id) return;
    const next = { ...mergeModFromUser(user), ...patch };
    persistMutation.mutate({ messaging_cdc_moderation: next });
  };

  return (
    <MessagingCdcShell title="Modération" subtitle="Groupes et communautés — cahier des charges">
      <CdcCallout variant="info">
        Connecté : stockage dans{' '}
        <code className="text-white/50">User.messaging_cdc_moderation</code>. Côté serveur : sortie de groupe sans
        diffusion <code className="text-white/50">group:members-updated</code> si « silencieux » ; transfert groupe
        limité à une autre destination par message source si « limiter le transfert » est actif.
      </CdcCallout>

      <CdcSubsectionTitle>Périmètre CDC modération</CdcSubsectionTitle>
      <CdcRequirementChecklist
        className="mt-2"
        items={[
          { status: 'ui', label: 'Préférences silencieux + limite transfert persistées et appliquées côté groupe.' },
          { status: 'partial', label: 'Signalement unifié groupe / DM ; admin « supprimer pour tous » partout.' },
          { status: 'server', label: 'Audit, quotas, workflows modération communautés.' },
        ]}
      />
      <CdcTierLegend className="mt-3" />

      <div className="mt-5 space-y-0 divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.035]">
        <div className="flex gap-3 p-4">
          <UserX className="mt-0.5 h-5 w-5 shrink-0 text-orange-300/90" />
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label htmlFor="silent-leave" className="text-[14px] text-white/88">
                Quitter un groupe silencieusement
              </Label>
              <p className="mt-1 text-[12px] text-white/42">Sans notifier tous les membres (option CDC).</p>
            </div>
            <Switch
              id="silent-leave"
              checked={Boolean(effective.silentLeave)}
              disabled={serverBacked && persistMutation.isPending}
              onCheckedChange={(v) => {
                if (serverBacked) saveModerationPatch({ silentLeave: v });
                else setLocal((p) => ({ ...p, silentLeave: v }));
              }}
            />
          </div>
        </div>
        <div className="flex gap-3 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-300/90" />
          <div>
            <p className="text-[14px] font-medium text-white/88">Administrateurs — supprimer pour tous</p>
            <p className="mt-1 text-[12px] text-white/42">
              Retrait du message pour tous les membres ; déjà partiellement couvert pour les admins groupe.
            </p>
          </div>
        </div>
        <div className="flex gap-3 p-4">
          <Forward className="mt-0.5 h-5 w-5 shrink-0 text-sky-300/90" />
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label htmlFor="fwd-limit" className="text-[14px] text-white/88">
                Limiter le transfert (une cible à la fois)
              </Label>
              <p className="mt-1 text-[12px] text-white/42">Réduit la viralité des rumeurs — règle serveur.</p>
            </div>
            <Switch
              id="fwd-limit"
              checked={effective.forwardLimit !== false}
              disabled={serverBacked && persistMutation.isPending}
              onCheckedChange={(v) => {
                if (serverBacked) saveModerationPatch({ forwardLimit: v });
                else setLocal((p) => ({ ...p, forwardLimit: v }));
              }}
            />
          </div>
        </div>
        <div className="flex gap-3 p-4">
          <Flag className="mt-0.5 h-5 w-5 shrink-0 text-amber-300/90" />
          <div>
            <p className="text-[14px] font-medium text-white/88">Signalement</p>
            <p className="mt-1 text-[12px] text-white/42">
              Contact ou conversation : flux présent en chat privé ; harmonisation groupe à finaliser.
            </p>
          </div>
        </div>
      </div>
    </MessagingCdcShell>
  );
}

export default function MessagingCdcModeration() {
  return <Navigate to={`${createPageUrl('MessagingCdcHub')}?section=moderation`} replace />;
}
