import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Link2, LayoutList, Search, UsersRound } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/api/expressClient';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import MessagingCdcShell from '@/components/messaging/MessagingCdcShell';
import {
  CdcCallout,
  CdcFeatureRow,
  CdcImplBadge,
  CdcSubsectionTitle,
  CdcRequirementChecklist,
  CdcTierLegend,
} from '@/components/messaging/MessagingCdcUi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function MessagingCdcCommunities() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [q, setQ] = useState('');

  const communitiesQuery = useQuery({
    queryKey: ['cdc-communities', q.trim()],
    enabled: Boolean(user?.id),
    queryFn: () =>
      api.communities.list({
        page: 1,
        limit: 12,
        filters: q.trim() ? { search: q.trim() } : {},
      }),
    staleTime: 20_000,
  });

  const communities = useMemo(() => {
    const data = communitiesQuery.data;
    return data?.communities && Array.isArray(data.communities) ? data.communities : [];
  }, [communitiesQuery.data]);

  const joinMutation = useMutation({
    mutationFn: (communityId) => api.communities.join(communityId),
    onSuccess: () => {
      toast.success('Communauté rejointe');
      queryClient.invalidateQueries({ queryKey: ['cdc-communities'] });
    },
    onError: (e) =>
      toast.error(
        e?.response?.data?.error?.message ||
          e?.response?.data?.message ||
          e?.message ||
          'Impossible de rejoindre'
      ),
  });

  const leaveMutation = useMutation({
    mutationFn: (communityId) => api.communities.leave(communityId),
    onSuccess: () => {
      toast.success('Communauté quittée');
      queryClient.invalidateQueries({ queryKey: ['cdc-communities'] });
    },
    onError: (e) =>
      toast.error(
        e?.response?.data?.error?.message ||
          e?.response?.data?.message ||
          e?.message ||
          'Impossible de quitter'
      ),
  });

  return (
    <MessagingCdcShell title="Communautés" subtitle="Regrouper plusieurs groupes — CDC">
      <CdcCallout variant="info">
        Une communauté regroupe plusieurs groupes. Recherche et rejoindre / quitter via API ; état membre avec{' '}
        <code className="text-white/50">is_member</code> sur la liste (authentifié).
      </CdcCallout>

      <CdcSubsectionTitle>Périmètre CDC communautés</CdcSubsectionTitle>
      <CdcRequirementChecklist
        className="mt-2"
        items={[
          { status: 'ui', label: 'Liste, recherche, adhésion et indicateur membre côté client.' },
          { status: 'partial', label: 'Canal annonces, rôles et sous-groupes : UX à densifier avec l’API.' },
          { status: 'server', label: 'Invitation seule, audit modération, quotas et pont vers messagerie groupe.' },
        ]}
      />
      <CdcTierLegend className="mt-3" />

      <div className="mt-5 space-y-3">
        <CdcFeatureRow
          icon={LayoutList}
          title="Structure"
          description="Sous-groupes thématiques + canal annonces ; modération centralisée."
          tier="api"
        />
        <CdcFeatureRow
          icon={Megaphone}
          title="Annonces"
          description="Notifications ciblées pour les messages importants du canal officiel."
          tier="api"
        />
        <CdcFeatureRow
          icon={Link2}
          title="Liens d’invitation"
          description="Rôle prédéfini (membre / admin) — aligné sur les invitations des groupes."
          tier="partial"
        />
      </div>

      <div className="mt-5 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une communauté…"
          className="h-11 rounded-xl border-white/12 bg-white/[0.06] pl-10 text-white placeholder:text-white/35"
          disabled={!user?.id}
        />
      </div>

      <div className="mt-5 space-y-2">
        {communitiesQuery.isLoading ? (
          <div className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-10">
            <p className="text-[13px] text-white/55">Chargement…</p>
          </div>
        ) : null}

        {communitiesQuery.isError ? (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.08] px-4 py-10">
            <p className="text-[14px] text-red-100/90">
              {communitiesQuery.error?.response?.data?.error?.message ||
                communitiesQuery.error?.response?.data?.message ||
                communitiesQuery.error?.message ||
                'Chargement impossible'}
            </p>
          </div>
        ) : null}

        {!communitiesQuery.isLoading && !communitiesQuery.isError && communities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-12 text-center">
            <UsersRound className="mx-auto h-10 w-10 text-fuchsia-300/35" />
            <p className="mt-4 text-[15px] font-medium text-white/55">Aucune communauté</p>
            <p className="mt-2 text-[13px] text-white/38">Essayez une autre recherche.</p>
          </div>
        ) : null}

        {!communitiesQuery.isLoading && !communitiesQuery.isError && communities.length > 0 ? (
          <ul className="space-y-2">
            {communities.map((c) => {
              const isJoined = Boolean(c.is_member);
              return (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3.5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-200">
                    <span className="text-sm font-bold">{String(c.name || '?').slice(0, 1).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-white/90">{c.name}</p>
                    <p className="mt-0.5 truncate text-[12px] text-white/45">
                      {c.creator?.username ? `@${c.creator.username}` : 'Créateur'} · {c.members_count || 0} membres
                    </p>
                    <p className="mt-1 flex items-center gap-2">
                      <CdcImplBadge tier={c.is_private ? 'partial' : 'api'} />
                      <span className="text-[11px] text-white/35">{c.category || '—'}</span>
                    </p>
                  </div>
                  {isJoined ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-full bg-white/[0.07] text-white hover:bg-white/[0.11]"
                      onClick={() => leaveMutation.mutate(c.id)}
                      disabled={leaveMutation.isPending}
                    >
                      Quitter
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="rounded-full bg-fuchsia-600/90 text-white hover:bg-fuchsia-600"
                      onClick={() => joinMutation.mutate(c.id)}
                      disabled={joinMutation.isPending}
                    >
                      Rejoindre
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <Button
        type="button"
        variant="secondary"
        className="mt-6 w-full rounded-xl border border-white/12 bg-white/[0.07] text-white hover:bg-white/[0.1]"
        onClick={() => navigate(createPageUrl('Inbox'))}
      >
        Ouvrir Messages (groupes)
      </Button>
    </MessagingCdcShell>
  );
}
