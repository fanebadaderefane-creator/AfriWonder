import React, { useMemo } from 'react';
import { CalendarClock, ChevronRight, Loader2, MessageCircle, Users, UsersRound } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { api } from '@/api/expressClient';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import MessagingCdcShell from '@/components/messaging/MessagingCdcShell';
import { CdcCallout, CdcSubsectionTitle, CdcRequirementChecklist, CdcTierLegend } from '@/components/messaging/MessagingCdcUi';

const ROW =
  'flex w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3.5 text-left shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition hover:bg-white/[0.07] active:scale-[0.99] [touch-action:manipulation]';

export function MessagingCdcScheduledPanel() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const isPageVisible = usePageVisibility();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['scheduled-messages', user?.id],
    queryFn: () => api.messages.listScheduledMessages(),
    enabled: Boolean(user?.id),
    /** Job serveur ~1 min : rafraîchir la liste quand l’onglet est visible (livraison automatique). */
    refetchInterval: isPageVisible ? 90_000 : false,
  });

  const items = useMemo(() => {
    const raw = data?.items;
    return Array.isArray(raw) ? raw : [];
  }, [data]);

  const openItem = (item) => {
    if (item.channel === 'group' && item.group_id) {
      navigate(`${createPageUrl('GroupChat')}?groupId=${encodeURIComponent(item.group_id)}`);
      return;
    }
    if (item.channel === 'dm' && item.other_user_id) {
      navigate(`${createPageUrl('Chat')}?_userId=${encodeURIComponent(item.other_user_id)}`);
    }
  };

  return (
    <MessagingCdcShell
      title="Messages programmés"
      subtitle="Envoi différé — CDC"
    >
      <CdcCallout variant="info">
        Liste branchée sur l’API lorsque vous êtes connecté ; rafraîchissement périodique pour refléter la livraison
        automatique côté serveur.
      </CdcCallout>

      <CdcSubsectionTitle>Périmètre CDC</CdcSubsectionTitle>
      <CdcRequirementChecklist
        className="mt-2"
        items={[
          { status: 'ui', label: 'Programmation depuis Chat et GroupChat (minuteur dans le compositeur).' },
          { status: 'ui', label: 'Vue agrégée ici avec lien vers la conversation concernée.' },
          { status: 'server', label: 'Files d’attente, fuseaux, annulation serveur unifiée multi-canal.' },
        ]}
      />
      <CdcTierLegend className="mt-3" />

      {!user?.id && !isLoadingAuth ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
          <p className="text-[14px] leading-relaxed text-white/75">
            Connectez-vous pour voir vos messages programmés (discussions privées et groupes).
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4 w-full rounded-xl bg-white/[0.08] text-white hover:bg-white/[0.12]"
            onClick={() => navigate(createPageUrl('Landing'))}
          >
            Connexion
          </Button>
        </div>
      ) : null}

      {user?.id ? (
        <>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.06] bg-black/20 py-16">
              <Loader2 className="h-9 w-9 animate-spin text-orange-300/70" aria-hidden />
              <p className="text-[13px] text-white/45">Chargement…</p>
            </div>
          ) : null}

          {isError ? (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.08] p-4">
              <p className="text-[14px] text-red-200/90">
                {error?.response?.data?.error?.message
                  || error?.response?.data?.message
                  || error?.apiMessage
                  || error?.message
                  || 'Impossible de charger la liste.'}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3 rounded-xl bg-white/[0.1] text-white hover:bg-white/[0.14]"
                onClick={() => refetch()}
              >
                Réessayer
              </Button>
            </div>
          ) : null}

          {!isLoading && !isError && items.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-14 text-center">
              <CalendarClock className="h-12 w-12 text-orange-300/40" />
              <p className="mt-4 text-[15px] font-medium text-white/55">Aucun message programmé</p>
              <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-white/38">
                Planifiez un envoi depuis une conversation : icône minuteur dans le chat privé ou le groupe.
              </p>
            </div>
          ) : null}

          {!isLoading && !isError && items.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {items.map((item) => {
                const when = item.scheduled_at ? new Date(item.scheduled_at) : null;
                const whenLabel =
                  when && !Number.isNaN(when.getTime())
                    ? format(when, "d MMM yyyy 'à' HH:mm", { locale: fr })
                    : '—';
                const title =
                  item.channel === 'group'
                    ? item.group_name || 'Groupe'
                    : item.peer_display_name || 'Discussion privée';
                const Icon = item.channel === 'group' ? UsersRound : MessageCircle;
                return (
                  <li key={`${item.channel}-${item.message_id}`}>
                    <button
                      type="button"
                      className={cn(ROW, 'w-full')}
                      onClick={() => openItem(item)}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-200/90">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-white/90">{title}</p>
                        <p className="mt-0.5 truncate text-[13px] text-white/45">{item.preview || 'Message'}</p>
                        <p className="mt-1 text-[12px] text-orange-200/55">
                          <CalendarClock className="mr-1 inline h-3.5 w-3.5 align-text-bottom opacity-80" />
                          {whenLabel}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-white/25" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </>
      ) : null}

      <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
        <p className="text-[14px] leading-relaxed text-white/75">
          La programmation est disponible dans chaque conversation : icône <strong className="text-white/90">minuteur</strong>{' '}
          dans le chat privé et le chat de groupe.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            className="flex-1 rounded-xl bg-white/[0.08] text-white hover:bg-white/[0.12]"
            onClick={() => navigate(createPageUrl('Inbox'))}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Ouvrir les messages
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="flex-1 rounded-xl bg-white/[0.08] text-white hover:bg-white/[0.12]"
            onClick={() => navigate(createPageUrl('MessagingCdcHub'))}
          >
            <Users className="mr-2 h-4 w-4" />
            Hub CDC
          </Button>
        </div>
      </div>
    </MessagingCdcShell>
  );
}

export default function MessagingCdcScheduled() {
  return <Navigate to={`${createPageUrl('MessagingCdcHub')}?section=scheduled`} replace />;
}
