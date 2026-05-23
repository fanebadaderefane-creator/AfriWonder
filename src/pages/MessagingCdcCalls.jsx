import React, { useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Phone, Video, Users, ScreenShare, Sparkles, CalendarClock, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
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

const DEFAULT_LOG = [
  { id: 'l1', kind: 'out', label: 'Audio · Amadou K.', at: 'Hier · 18:42', duration: '12 min' },
  { id: 'l2', kind: 'missed', label: 'Vidéo · manqué', at: 'Lun · 09:05', duration: '—' },
  { id: 'l3', kind: 'in', label: 'Audio · groupe Travail', at: 'Dim · 20:11', duration: '4 min' },
];

function formatDurationSec(sec) {
  if (sec == null || Number(sec) <= 0) return '—';
  const n = Number(sec);
  const m = Math.floor(n / 60);
  const s = n % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h} h ${mm} min`;
  }
  if (m > 0) return `${m} min ${s > 0 ? `${s} s` : ''}`.trim();
  return `${s} s`;
}

function directStatusLabel(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'completed') return 'Terminé';
  if (s === 'pending' || s === 'missed') return 'Manqué';
  if (s === 'declined' || s === 'rejected') return 'Refusé';
  if (s === 'cancelled') return 'Annulé';
  if (s === 'ended') return 'Terminé';
  if (s === 'active') return 'En cours';
  return status || '—';
}

function statusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'pending' || s === 'missed' || s === 'declined' || s === 'rejected') {
    return 'bg-rose-500/20 text-rose-200';
  }
  return 'bg-teal-500/20 text-teal-100';
}

function generateCallId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function MessagingCdcCallsPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [demoLog, setDemoLog] = useCdcPersistedJson('calls_demo_log', DEFAULT_LOG);

  const historyQuery = useQuery({
    queryKey: ['cdc-me-call-history', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => api.me.getCallHistory(1, 40),
    staleTime: 30_000,
  });

  const apiItems = useMemo(() => {
    const raw = historyQuery.data?.items;
    return Array.isArray(raw) ? raw : [];
  }, [historyQuery.data]);

  return (
    <MessagingCdcShell title="Appels" subtitle="Audio, vidéo, groupe — cahier des charges">
      <CdcCallout variant="info">
        Connecté : l’historique ci-dessous provient de <code className="text-white/55">GET /api/me/call-history</code>{' '}
        (appels 1-1 enregistrés et salons groupe auxquels vous avez participé). La section démo locale reste disponible
        en dessous pour la formation.
      </CdcCallout>

      <CdcSubsectionTitle>Exigences appels CDC</CdcSubsectionTitle>
      <CdcRequirementChecklist
        className="mt-2"
        items={[
          { status: 'ui', label: 'Démarrage appel depuis conversation et lobby groupe (DirectCall, GroupCallLobby).' },
          { status: 'partial', label: 'Qualité adaptative réseau, reprise après coupure : à renforcer.' },
          { status: 'server', label: 'Écran partagé, effets vidéo, rappels planifiés, agrégation temps réel avancée.' },
        ]}
      />
      <CdcTierLegend className="mt-3" />

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button
          type="button"
          className="h-auto flex-col gap-2 rounded-2xl bg-emerald-600/85 py-5 text-white hover:bg-emerald-600"
          onClick={() => navigate(createPageUrl('DirectCall'))}
        >
          <Phone className="h-7 w-7" />
          <span className="text-sm font-medium">Appel 1-à-1</span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-auto flex-col gap-2 rounded-2xl border border-white/12 bg-white/[0.07] py-5 text-white hover:bg-white/[0.1]"
          onClick={() => navigate(createPageUrl('GroupCallLobby'))}
        >
          <Users className="h-7 w-7 text-white/80" />
          <span className="text-sm font-medium">Salon appel groupe</span>
          <span className="text-[10px] font-normal text-white/45">GroupCallLobby</span>
        </Button>
      </div>

      <Button
        type="button"
        variant="ghost"
        className="mt-3 w-full rounded-xl text-[13px] text-white/50 hover:bg-white/[0.06] hover:text-white/75"
        onClick={() => navigate(createPageUrl('Inbox'))}
      >
        Ou ouvrir Messages pour lancer depuis un fil
      </Button>

      <CdcSubsectionTitle className="!mt-8">Historique compte</CdcSubsectionTitle>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        {user?.id ? <CdcImplBadge tier="app" /> : <CdcImplBadge tier="api" />}
      </div>

      {!user?.id ? (
        <div className="mt-2 rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-8 text-center text-[14px] text-white/45">
          Connectez-vous pour charger le journal d’appels.
        </div>
      ) : null}

      {user?.id && historyQuery.isLoading ? (
        <div className="mt-2 flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-black/20 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-teal-300/60" aria-hidden />
          <p className="text-[13px] text-white/45">Chargement du journal…</p>
        </div>
      ) : null}

      {user?.id && historyQuery.isError ? (
        <div className="mt-2 rounded-2xl border border-red-500/25 bg-red-500/[0.08] px-4 py-4 text-[14px] text-red-100/90">
          {historyQuery.error?.response?.data?.error?.message ||
            historyQuery.error?.message ||
            'Impossible de charger l’historique.'}
        </div>
      ) : null}

      {user?.id && !historyQuery.isLoading && !historyQuery.isError && apiItems.length === 0 ? (
        <div className="mt-2 rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-10 text-center text-[14px] text-white/45">
          Aucun appel enregistré pour l’instant. Les appels directs payants et les salons groupe apparaîtront ici après
          usage.
        </div>
      ) : null}

      {user?.id && !historyQuery.isLoading && !historyQuery.isError && apiItems.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {apiItems.map((row) => {
            const refDate = row.ended_at || row.started_at;
            const d = refDate ? new Date(refDate) : null;
            const whenLabel =
              d && !Number.isNaN(d.getTime()) ? format(d, "d MMM yyyy 'à' HH:mm", { locale: fr }) : '—';
            const canRecallDm = row.channel === 'dm' && row.peer?.id;
            const title =
              row.channel === 'group'
                ? `Groupe · ${row.group?.name || 'Salon'}`
                : `${row.direction === 'out' ? 'Sortant' : 'Entrant'} · ${row.peer?.full_name || row.peer?.username || 'Contact'}`;
            const sub = `${directStatusLabel(row.status)}${row.channel === 'group' && row.call_type ? ` · ${row.call_type}` : ''}`;
            return (
              <li
                key={row.id}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-3"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${statusTone(row.status)}`}
                >
                  {row.channel === 'group' ? <Users className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-white/90">{title}</p>
                  <p className="truncate text-[12px] text-white/40">
                    {whenLabel} · {formatDurationSec(row.duration_sec)} · {sub}
                  </p>
                </div>
                {canRecallDm ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-xl text-white/70 hover:bg-white/[0.09] hover:text-white"
                      onClick={() =>
                        navigate(
                          `${createPageUrl('DirectCall')}?mode=outgoing&receiverId=${encodeURIComponent(
                            row.peer.id
                          )}&type=audio&callId=${generateCallId()}`
                        )
                      }
                      aria-label="Rappeler en audio"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-xl text-white/70 hover:bg-white/[0.09] hover:text-white"
                      onClick={() =>
                        navigate(
                          `${createPageUrl('DirectCall')}?mode=outgoing&receiverId=${encodeURIComponent(
                            row.peer.id
                          )}&type=video&callId=${generateCallId()}`
                        )
                      }
                      aria-label="Rappeler en vidéo"
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <CdcSubsectionTitle className="!mt-8">Exemples locaux (démo)</CdcSubsectionTitle>
      <div className="mt-2 flex items-center justify-end gap-2">
        <CdcImplBadge tier="demo" />
      </div>

      <div className="mt-2 space-y-2">
        {demoLog.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-8 text-center text-[14px] text-white/45">
            Aucune ligne de démo (vous pouvez réinitialiser les données d’exemple depuis un navigateur vierge ou
            réimporter le jeu par défaut en réinitialisant le stockage CDC).
          </div>
        ) : (
          demoLog.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-3"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  row.kind === 'missed' ? 'bg-rose-500/20 text-rose-200' : 'bg-teal-500/20 text-teal-100'
                }`}
              >
                <Phone className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-white/90">{row.label}</p>
                <p className="text-[12px] text-white/40">
                  {row.at} · {row.duration}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {demoLog.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 text-[12px] text-white/45 hover:text-white"
          onClick={() => setDemoLog([])}
        >
          Effacer la démo locale
        </Button>
      ) : null}

      <CdcSubsectionTitle className="!mt-8">Fonctions cible CDC (backend)</CdcSubsectionTitle>
      <div className="mt-2 space-y-3">
        <CdcFeatureRow
          icon={ScreenShare}
          title="Partage d’écran avec audio"
          description="Visioconférence professionnelle ; contrôle des permissions micro et écran."
          tier="api"
        />
        <CdcFeatureRow
          icon={Video}
          title="Effets vidéo et arrière-plans"
          description="Filtres légers et floutage pour la vie privée."
          tier="api"
        />
        <CdcFeatureRow
          icon={CalendarClock}
          title="Planification et rappels d’appel"
          description="Invitation planifiée avec notification avant l’heure."
          tier="api"
        />
        <CdcFeatureRow
          icon={Smile}
          title="Réactions pendant l’appel"
          description="Emoji en overlay sans couper le flux audio."
          tier="api"
        />
        <CdcFeatureRow
          icon={Sparkles}
          title="Journal unifié"
          description="Agrégation 1-1 et groupe via GET /api/me/call-history ; durée groupe dérivée de la fin d’appel ou de left_at participant."
          tier="partial"
        />
      </div>

      <CdcCallout variant="neutral" className="mt-5">
        La pagination serveur est disponible via <code className="text-white/45">page</code> et{' '}
        <code className="text-white/45">limit</code> ; l’écran charge les 40 entrées les plus récentes pour l’instant.
      </CdcCallout>
    </MessagingCdcShell>
  );
}

export default function MessagingCdcCalls() {
  return <Navigate to={`${createPageUrl('MessagingCdcHub')}?section=calls`} replace />;
}
