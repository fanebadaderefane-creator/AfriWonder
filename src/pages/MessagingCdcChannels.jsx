import React, { useMemo, useState } from 'react';
import { Search, Bell, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import MessagingCdcShell from '@/components/messaging/MessagingCdcShell';
import {
  CdcCallout,
  CdcImplBadge,
  CdcSubsectionTitle,
  CdcRequirementChecklist,
  CdcTierLegend,
} from '@/components/messaging/MessagingCdcUi';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/expressClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export default function MessagingCdcChannels() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [q, setQ] = useState('');
  const [tab, setTab] = useState('foryou');

  const followingQuery = useQuery({
    queryKey: ['cdc-channels-following', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => api.users.getFollowing(user.id, { page: 1, limit: 30 }),
    staleTime: 20_000,
  });

  const suggestedQuery = useQuery({
    queryKey: ['cdc-channels-suggested', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => api.me.getSuggestedFollows(20),
    staleTime: 20_000,
  });

  const followingIds = useMemo(() => {
    const rows = followingQuery.data?.following;
    if (!Array.isArray(rows)) return new Set();
    return new Set(rows.map((u) => u.id));
  }, [followingQuery.data]);

  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();

    const list = tab === 'subs'
      ? (followingQuery.data?.following || [])
      : (suggestedQuery.data || []);

    const normalized = Array.isArray(list) ? list : [];
    const filtered = qq
      ? normalized.filter((u) => {
          const name = String(u.full_name || u.username || '').toLowerCase();
          const handle = u.username ? `@${u.username}`.toLowerCase() : '';
          return name.includes(qq) || handle.includes(qq);
        })
      : normalized;

    return filtered.map((u) => ({
      id: u.id,
      name: u.full_name || u.username || 'Créateur',
      handle: u.username ? `@${u.username}` : '',
      blurb: 'Chaîne (créateur) — publications à brancher',
    }));
  }, [q, tab, followingQuery.data, suggestedQuery.data]);

  const followMutation = useMutation({
    mutationFn: (targetId) => api.users.toggleFollow(targetId),
    onSuccess: (res) => {
      const pending = res?.requestPending === true;
      toast.success(pending ? 'Demande de suivi envoyée' : 'Suivi mis à jour');
      queryClient.invalidateQueries({ queryKey: ['cdc-channels-following', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['cdc-channels-suggested', user?.id] });
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.message || 'Action impossible'),
  });

  return (
    <MessagingCdcShell title="Chaînes" subtitle="Créateurs, médias, organisations — intégration">
      <CdcCallout variant="info">
        Les « chaînes » s’appuient sur suivis et suggestions de créateurs (API actuelle). Le fil de publications type
        chaîne sera la prochaine couche backend.
      </CdcCallout>

      <CdcSubsectionTitle>Périmètre CDC chaînes</CdcSubsectionTitle>
      <CdcRequirementChecklist
        className="mt-2"
        items={[
          { status: 'ui', label: 'Découverte, recherche, suivi / demande (compte privé) dans cet écran.' },
          { status: 'server', label: 'Fil publications, réactions canal, modération et analytics créateur.' },
        ]}
      />
      <CdcTierLegend className="mt-3" />

      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une chaîne…"
          className="h-11 rounded-xl border-white/12 bg-white/[0.06] pl-10 text-white placeholder:text-white/35"
          disabled={!user?.id}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={tab === 'foryou' ? 'secondary' : 'ghost'}
          className={tab === 'foryou' ? 'rounded-full bg-white text-slate-900 hover:bg-white/90' : 'rounded-full text-white/65 hover:bg-white/10'}
          onClick={() => setTab('foryou')}
          disabled={!user?.id}
        >
          Pour vous
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === 'subs' ? 'secondary' : 'ghost'}
          className={tab === 'subs' ? 'rounded-full bg-white text-slate-900 hover:bg-white/90' : 'rounded-full text-white/65 hover:bg-white/10'}
          onClick={() => setTab('subs')}
          disabled={!user?.id}
        >
          Abonnements
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="ml-auto rounded-full text-white/55 hover:bg-white/10"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['cdc-channels-following', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['cdc-channels-suggested', user?.id] });
            toast.message('Actualisation…');
          }}
          disabled={!user?.id}
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Actualiser
        </Button>
      </div>

      <div className="mt-5 space-y-2">
        {!user?.id ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-12 text-center">
            <p className="text-[15px] font-medium text-white/55">Connectez-vous pour voir vos chaînes</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-12 text-center">
            <Bell className="mx-auto h-10 w-10 text-white/25" />
            <p className="mt-4 text-[15px] font-medium text-white/55">Aucun résultat</p>
            <p className="mt-2 text-[13px] text-white/38">Modifiez la recherche ou l’onglet.</p>
          </div>
        ) : (
          rows.map((c) => {
            const isFollowing = followingIds.has(c.id);
            return (
              <div
                key={c.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3.5 sm:flex-row sm:items-center"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-lg font-bold text-sky-100">
                  {c.name.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white/92">{c.name}</p>
                  <p className="text-[13px] text-sky-200/80">{c.handle}</p>
                  <p className="mt-1 text-[13px] text-white/45">{c.blurb}</p>
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                  <CdcImplBadge tier="api" />
                  <Button
                    type="button"
                    size="sm"
                    className={isFollowing ? 'rounded-full bg-white/15 text-white hover:bg-white/20' : 'rounded-full bg-sky-600 text-white hover:bg-sky-600'}
                    onClick={() => followMutation.mutate(c.id)}
                    disabled={followMutation.isPending}
                  >
                    {isFollowing ? 'Abonné' : 'Suivre'}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </MessagingCdcShell>
  );
}
