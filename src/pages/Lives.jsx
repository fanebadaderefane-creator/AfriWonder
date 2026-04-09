import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/api/expressClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Eye, Play, Radio, Search, Sparkles, Trophy, Wallet } from 'lucide-react';
import { createPageUrl } from "@/utils";
import { cn } from '@/lib/utils';
import BottomNav from '../components/navigation/BottomNav';
import { toast } from "sonner";

const LIVE_PAGE_BG = 'bg-[#070a12]';
const LIVE_SECTION =
  'rounded-[28px] bg-white/[0.035] shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl';
const LIVE_SECTION_PAD = 'p-5 sm:p-6';
const LIVE_SOFT_TILE = 'rounded-2xl bg-white/[0.05] transition-colors duration-200 hover:bg-white/[0.07]';
const LIVE_STAT_CELL = 'rounded-2xl bg-white/[0.06] p-4 sm:p-5';
/** Pastilles catégories / tri : cible tactile ≥44px, texte centré (descenders inclus). */
const LIVE_CHIP_BASE =
  'inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full px-3.5 text-[14px] font-medium leading-snug tracking-tight transition-colors touch-manipulation select-none active:scale-[0.98] sm:px-4';
function liveChipClass(active) {
  return cn(
    LIVE_CHIP_BASE,
    active
      ? 'bg-white/[0.14] text-white shadow-[0_4px_20px_rgba(0,0,0,0.22)] ring-2 ring-white/25'
      : 'bg-white/[0.07] text-white/78 hover:bg-white/[0.11] hover:text-white'
  );
}
const FALLBACK_LIVE_IMAGE = 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=900';

function formatCompactNumber(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${Math.round(num / 1000)}K`;
  return String(num);
}

function formatSchedule(date) {
  if (!date) return '';
  try {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function getCreatorName(live) {
  return live?.creator?.username || live?.creator_name || 'Createur';
}

function getCreatorInitial(live) {
  return getCreatorName(live)?.[0]?.toUpperCase() || 'C';
}

function getLiveCover(live) {
  return live?.thumbnail_url || FALLBACK_LIVE_IMAGE;
}

function filterLiveCollection(items, searchTerm, regionFilter) {
  const normalizedSearch = (searchTerm || '').trim().toLowerCase();
  const normalizedRegion = (regionFilter || '').trim().toLowerCase();

  return (Array.isArray(items) ? items : []).filter((live) => {
    const haystack = [
      live?.title,
      live?.description,
      live?.category,
      live?.region,
      live?.creator_name,
      live?.creator?.username,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
    const matchesRegion = !normalizedRegion || String(live?.region || '').toLowerCase().includes(normalizedRegion);
    return matchesSearch && matchesRegion;
  });
}

function LiveSectionHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2.5">
          {Icon ? <Icon className="h-4 w-4 text-white/50" strokeWidth={1.75} /> : null}
          <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-white">{title}</h2>
        </div>
        {subtitle ? <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-white/42">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function LiveStatusPill({ type, viewers }) {
  if (type === 'replay') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/95 backdrop-blur-md">
        <Play className="h-3.5 w-3.5" />
        Replay
      </span>
    );
  }

  if (type === 'scheduled') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/95 backdrop-blur-md">
        <Calendar className="h-3.5 w-3.5" />
        Programme
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#ef4444]/88 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md">
      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
      Live
      <span className="ml-1 text-white/90 normal-case tracking-normal">{formatCompactNumber(viewers)} spect.</span>
    </span>
  );
}

function LiveHeroCard({ live }) {
  if (!live) return null;

  return (
    <Link to={`${createPageUrl('LiveViewer')}?id=${live.id}`}>
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="relative aspect-[1.45] overflow-hidden rounded-[28px] bg-black/25 shadow-[0_28px_80px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-white/[0.08]"
      >
        <img
          src={getLiveCover(live)}
          className="h-full w-full object-cover"
          alt={live.title || ''}
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.08)_0%,rgba(2,6,23,0.16)_46%,rgba(2,6,23,0.86)_100%)]" />

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <LiveStatusPill type="live" viewers={live.viewers_count || 0} />
          {live.category ? (
            <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white/88 backdrop-blur-md">
              {live.category}
            </span>
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-white/52">A la une</p>
              <h2 className="line-clamp-2 text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">{live.title || 'Live en cours'}</h2>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.12] text-sm font-semibold text-white ring-1 ring-white/15 shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
                  {getCreatorInitial(live)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{getCreatorName(live)}</p>
                  <p className="truncate text-sm text-white/58">{live.region || 'AfriWonder Live'}</p>
                </div>
              </div>
            </div>

            <div className="hidden shrink-0 sm:block">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">
                <Play className="h-4 w-4" />
                Regarder
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function LiveStreamCard({ live, type = 'live' }) {
  return (
    <Link to={`${createPageUrl('LiveViewer')}?id=${live.id}`}>
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="overflow-hidden rounded-2xl bg-black/15 shadow-[0_20px_50px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-white/[0.08]"
      >
        <div className="relative aspect-video overflow-hidden bg-black/20">
          <img
            src={getLiveCover(live)}
            className={cn('h-full w-full object-cover', type === 'replay' ? 'opacity-82' : '')}
            alt={live.title || ''}
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04)_0%,rgba(2,6,23,0.10)_44%,rgba(2,6,23,0.78)_100%)]" />
          <div className="absolute left-3 top-3">
            <LiveStatusPill type={type} viewers={live.viewers_count || 0} />
          </div>
          {type === 'replay' ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/92 text-slate-900 shadow-[0_16px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/30">
                <Play className="ml-0.5 h-7 w-7" />
              </div>
            </div>
          ) : (
            <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-xs text-white/88 backdrop-blur-md">
              <Eye className="h-3.5 w-3.5" />
              {formatCompactNumber(live.viewers_count || 0)}
            </div>
          )}
        </div>

        <div className="space-y-2 bg-white/[0.03] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-sm font-semibold text-white ring-1 ring-white/10">
              {getCreatorInitial(live)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 font-semibold text-white">{live.title || 'Live AfriWonder'}</h3>
              <p className="truncate text-sm text-white/54">{getCreatorName(live)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
            {live.category ? <span className="rounded-full bg-white/[0.08] px-2.5 py-1">{live.category}</span> : null}
            {live.region ? <span className="rounded-full bg-white/[0.08] px-2.5 py-1">{live.region}</span> : null}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function ScheduledLiveCard({ live, canStart, onStart }) {
  return (
    <div className={cn('p-4', LIVE_SOFT_TILE)}>
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-sm font-semibold text-white ring-1 ring-white/10">
          {getCreatorInitial(live)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-white">{live.title || 'Live programme'}</h3>
              <p className="truncate text-sm text-white/54">{getCreatorName(live)}</p>
            </div>
            <Badge className="border-0 bg-white/[0.08] text-white/78">Programme</Badge>
          </div>
          <p className="mt-2 text-sm text-white/52">{formatSchedule(live.scheduled_at || live.started_at)}</p>
          {live.category ? <p className="mt-1 text-xs text-white/42">{live.category}</p> : null}
        </div>
      </div>

      {canStart ? (
        <div className="mt-4 flex justify-end">
          <Button onClick={onStart} className="rounded-full bg-white text-slate-950 hover:bg-white/92">
            <Radio className="mr-2 h-4 w-4" />
            Demarrer
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function LiveEmptyState({ user }) {
  return (
    <div className="rounded-3xl bg-white/[0.03] px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06]">
        <Radio className="h-7 w-7 text-white/45" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-white/95">Aucun live pour le moment</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/45">
        {user ? 'Programmez un direct ou revenez dans quelques instants.' : 'Connectez-vous pour lancer ou suivre les prochains directs.'}
      </p>
    </div>
  );
}

export default function Lives() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sortBy, setSortBy] = useState('viewers');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [liveForm, setLiveForm] = useState({
    title: '',
    description: '',
    scheduled_time: ''
  });

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {}
    };
    getUser();
  }, []);

  const { data: listResult } = useQuery({
    queryKey: ['live-streams', sortBy, categoryFilter, regionFilter],
    queryFn: async () => {
      const params = { page: 1, limit: 50, sortBy };
      if (categoryFilter) params.category = categoryFilter;
      if (regionFilter) params.region = regionFilter;
      const res = await api.live.list(params);
      return res?.streams ?? res?.data?.streams ?? [];
    },
    refetchInterval: 10000,
    networkMode: 'offlineFirst',
    retry: 1,
    staleTime: 2 * 60 * 1000,
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ['live-recommendations', user?.id],
    queryFn: () => api.live.getRecommendations({ limit: 5 }),
    enabled: !!user,
    refetchInterval: 30000,
    networkMode: 'offlineFirst',
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const { data: discoveryData } = useQuery({
    queryKey: ['live-discovery', user?.id],
    queryFn: async () => {
      const [popular, trending, followed, categories] = await Promise.all([
        api.live.getDiscovery({ type: 'popular', limit: 10 }),
        api.live.getDiscovery({ type: 'trending', limit: 10 }),
        user?.id ? api.live.getDiscovery({ type: 'followed', limit: 10 }) : Promise.resolve({ streams: [] }),
        api.live.getCategories().catch(() => ({ categories: [] })),
      ]);
      return {
        popular: popular?.streams ?? popular?.data?.streams ?? [],
        trending: trending?.streams ?? trending?.data?.streams ?? [],
        followed: followed?.streams ?? followed?.data?.streams ?? [],
        categories: categories?.categories ?? categories ?? [],
      };
    },
    enabled: true,
    refetchInterval: 15000,
    networkMode: 'offlineFirst',
    retry: 1,
    staleTime: 2 * 60 * 1000,
  });

  const liveStreams = listResult ?? [];
  const popularStreams = discoveryData?.popular ?? [];
  const trendingStreams = discoveryData?.trending ?? [];
  const followedStreams = discoveryData?.followed ?? [];
  const categories = discoveryData?.categories ?? [];

  const createLiveMutation = useMutation({
    mutationFn: async (data) => {
      const stream = await api.live.start({
        title: data.title,
        description: data.description || '',
        category: data.category || 'general',
        status: 'scheduled',
        scheduled_at: data.scheduled_time ? new Date(data.scheduled_time).toISOString() : undefined
      });
      return stream;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
      toast.success('Live programme avec succes');
      setShowCreateForm(false);
      setLiveForm({ title: '', description: '', scheduled_time: '' });
    },
    onError: (err) => {
      toast.error(err?.apiMessage || err?.message || 'Erreur');
    }
  });

  const activeLives = useMemo(() => liveStreams.filter((l) => l.status === 'live'), [liveStreams]);
  const scheduledLives = useMemo(() => liveStreams.filter((l) => l.status === 'scheduled'), [liveStreams]);
  const endedLivesWithReplay = useMemo(() => liveStreams.filter((l) => l.status === 'ended' && l.replay_url), [liveStreams]);

  const filteredRecommendations = useMemo(
    () => filterLiveCollection(recommendations, searchQuery, regionFilter),
    [recommendations, searchQuery, regionFilter]
  );
  const filteredFollowed = useMemo(
    () => filterLiveCollection(followedStreams, searchQuery, regionFilter),
    [followedStreams, searchQuery, regionFilter]
  );
  const filteredPopular = useMemo(
    () => filterLiveCollection(popularStreams.length > 0 ? popularStreams : activeLives, searchQuery, regionFilter),
    [popularStreams, activeLives, searchQuery, regionFilter]
  );
  const filteredScheduled = useMemo(
    () => filterLiveCollection(scheduledLives, searchQuery, regionFilter),
    [scheduledLives, searchQuery, regionFilter]
  );
  const filteredReplays = useMemo(
    () => filterLiveCollection(endedLivesWithReplay, searchQuery, regionFilter),
    [endedLivesWithReplay, searchQuery, regionFilter]
  );
  const filteredTrending = useMemo(
    () => filterLiveCollection(trendingStreams, searchQuery, regionFilter),
    [trendingStreams, searchQuery, regionFilter]
  );

  const featuredStream = filteredPopular[0] || filteredTrending[0];
  const totalVisibleLives = filteredPopular.length + filteredScheduled.length + filteredReplays.length + filteredFollowed.length + filteredRecommendations.length;

  return (
    <div
      className={`min-h-screen pb-[calc(96px+env(safe-area-inset-bottom,0px))] text-white ${LIVE_PAGE_BG}`}
    >
      {/** En-tête dans le flux normal : il défile avec la page (pas sticky / pas colonne scroll séparée). */}
      <div className="border-b border-white/[0.06] bg-[#070a12] pt-[env(safe-area-inset-top,0px)] shadow-[0_6px_30px_rgba(0,0,0,0.25)] backdrop-blur-2xl">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(createPageUrl('Home')))}
                className="h-10 w-10 flex-shrink-0 rounded-full bg-white/[0.06] text-white/85 hover:bg-white/[0.10]"
                aria-label="Retour"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/38">Live</p>
                <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.025em] text-white sm:text-[24px]">AfriWonder Live</h1>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/45">
                  Directs, programmes et replays — une expérience fluide et lisible.
                </p>
              </div>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/55">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/34" />
              <Input
                type="text"
                placeholder="Rechercher un live, un createur, une categorie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 rounded-[28px] border-0 bg-white/[0.06] pl-11 pr-4 text-white shadow-inner shadow-black/20 ring-1 ring-white/[0.08] placeholder:text-white/35"
              />
            </div>

            {user ? (
              <div className="flex shrink-0 flex-wrap gap-2 sm:flex-nowrap lg:max-w-none">
                <Button
                  onClick={() => navigate(createPageUrl('StartLive'))}
                  className="h-12 min-w-0 flex-1 rounded-full bg-white px-4 text-sm font-semibold text-slate-950 hover:bg-white/92 sm:h-14 sm:flex-none sm:rounded-[24px] sm:px-5"
                >
                  <Radio className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">Go live</span>
                </Button>
                <Button
                  onClick={() => setShowCreateForm((value) => !value)}
                  variant="outline"
                  className="h-12 flex-1 rounded-full border-0 bg-white/[0.06] text-white/80 ring-1 ring-white/[0.08] hover:bg-white/[0.10] hover:text-white sm:h-14 sm:flex-1 sm:rounded-[24px] lg:min-w-[140px]"
                >
                  <Calendar className="mr-2 h-4 w-4 shrink-0" />
                  Programmer
                </Button>
                <Button
                  onClick={() => navigate(createPageUrl('Wallet'))}
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 shrink-0 rounded-full border-0 bg-white/[0.06] text-white/78 ring-1 ring-white/[0.08] hover:bg-white/[0.10] hover:text-white sm:h-14 sm:w-14 sm:rounded-[24px]"
                  aria-label="Wallet"
                >
                  <Wallet className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              { label: 'En direct', value: formatCompactNumber(filteredPopular.length || activeLives.length), icon: Radio },
              { label: 'Programmes', value: formatCompactNumber(filteredScheduled.length || scheduledLives.length), icon: Calendar },
              { label: 'Replays', value: formatCompactNumber(filteredReplays.length || endedLivesWithReplay.length), icon: Play },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className={LIVE_STAT_CELL}>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.08]">
                    <Icon className="h-[18px] w-[18px] text-white/55" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-semibold tracking-tight text-white">{value}</p>
                    <p className="text-[13px] text-white/42">{label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {categories.length > 0 ? (
            <div className="scrollbar-hide -mx-1 mt-4 overflow-x-auto overscroll-x-contain px-1 pb-2 pt-0.5">
              <div className="flex w-max items-center gap-2">
                <button type="button" onClick={() => setCategoryFilter('')} className={liveChipClass(!categoryFilter)}>
                  Tout
                </button>
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category.id}
                    onClick={() => setCategoryFilter(categoryFilter === category.id ? '' : category.id)}
                    className={liveChipClass(categoryFilter === category.id)}
                    title={category.name}
                  >
                    <span className="min-w-0 max-w-[min(200px,72vw)] truncate sm:max-w-[240px]">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-3">
            {['viewers', 'recent', 'popularity', 'duration'].map((value) => (
              <button key={value} type="button" onClick={() => setSortBy(value)} className={liveChipClass(sortBy === value)}>
                {value === 'viewers' ? 'Spectateurs' : value === 'recent' ? 'Récent' : value === 'popularity' ? 'Populaire' : 'Durée'}
              </button>
            ))}

            <div className="w-full min-w-0 sm:ml-auto sm:w-[min(100%,240px)] sm:max-w-[260px]">
              <Input
                type="text"
                placeholder="Région"
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                aria-label="Filtrer par région"
                className="min-h-[44px] h-12 rounded-full border-0 bg-white/[0.07] px-4 text-[14px] font-medium leading-snug text-white shadow-none ring-1 ring-white/[0.12] placeholder:text-white/45 focus-visible:ring-2 focus-visible:ring-white/30"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 p-4">
        {featuredStream ? <LiveHeroCard live={featuredStream} /> : null}

        {popularStreams.length > 0 ? (
          <section className={cn(LIVE_SECTION, LIVE_SECTION_PAD)}>
            <LiveSectionHeader
              icon={Trophy}
              title="Top createurs"
              subtitle="Les lives qui performent le mieux en ce moment."
            />
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {popularStreams.slice(0, 6).map((stream, index) => (
                <div key={stream.id} className="flex items-center gap-3 rounded-full bg-white/[0.06] px-3 py-2 ring-1 ring-white/[0.08]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.1] text-sm font-semibold text-white ring-1 ring-white/10">
                    {getCreatorInitial(stream)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{getCreatorName(stream)}</p>
                    <p className="text-xs text-white/46">#{index + 1} du moment</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {showCreateForm ? (
          <motion.section
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(LIVE_SECTION, LIVE_SECTION_PAD)}
          >
            <LiveSectionHeader icon={Calendar} title="Programmer un live" subtitle="Planifiez proprement votre prochain direct." />
            <div className="space-y-3">
              <Input
                placeholder="Titre du live"
                value={liveForm.title}
                onChange={(e) => setLiveForm({ ...liveForm, title: e.target.value })}
                className="border-0 bg-white/[0.06] text-white ring-1 ring-white/[0.08] placeholder:text-white/35"
              />
              <Textarea
                placeholder="Description"
                value={liveForm.description}
                onChange={(e) => setLiveForm({ ...liveForm, description: e.target.value })}
                className="border-0 bg-white/[0.06] text-white ring-1 ring-white/[0.08] placeholder:text-white/35"
              />
              <Input
                type="datetime-local"
                value={liveForm.scheduled_time}
                onChange={(e) => setLiveForm({ ...liveForm, scheduled_time: e.target.value })}
                className="border-0 bg-white/[0.06] text-white ring-1 ring-white/[0.08]"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => createLiveMutation.mutate(liveForm)}
                  disabled={createLiveMutation.isPending || !liveForm.title.trim()}
                  className="flex-1 rounded-full bg-white text-slate-950 hover:bg-white/92"
                >
                  {createLiveMutation.isPending ? 'Programmation...' : 'Programmer'}
                </Button>
                <Button
                  onClick={() => setShowCreateForm(false)}
                  variant="outline"
                  className="flex-1 rounded-full border-0 bg-white/[0.06] text-white/80 ring-1 ring-white/[0.08] hover:bg-white/[0.10] hover:text-white"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </motion.section>
        ) : null}

        {filteredRecommendations.length > 0 ? (
          <section className={cn(LIVE_SECTION, LIVE_SECTION_PAD)}>
            <LiveSectionHeader icon={Sparkles} title="Recommande pour vous" subtitle="Une selection plus claire de directs susceptibles de vous interesser." />
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredRecommendations.map((live) => (
                <LiveStreamCard key={live.id} live={live} type="live" />
              ))}
            </div>
          </section>
        ) : null}

        {filteredFollowed.length > 0 ? (
          <section className={cn(LIVE_SECTION, LIVE_SECTION_PAD)}>
            <LiveSectionHeader icon={Radio} title="Suivis en direct" subtitle="Les createurs que vous suivez et qui sont actuellement en live." />
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredFollowed.map((live) => (
                <LiveStreamCard key={live.id} live={live} type="live" />
              ))}
            </div>
          </section>
        ) : null}

        {filteredPopular.length > 0 ? (
          <section className={cn(LIVE_SECTION, LIVE_SECTION_PAD)}>
            <LiveSectionHeader
              icon={Radio}
              title="En direct"
              subtitle="Les lives les plus regardes en ce moment."
              action={
                filteredTrending.length > 0 ? (
                  <span className="text-sm text-white/54">{formatCompactNumber(filteredTrending.length)} tendances</span>
                ) : null
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredPopular.map((live) => (
                <LiveStreamCard key={live.id} live={live} type="live" />
              ))}
            </div>
          </section>
        ) : null}

        {filteredScheduled.length > 0 ? (
          <section className={cn(LIVE_SECTION, LIVE_SECTION_PAD)}>
            <LiveSectionHeader icon={Calendar} title="Lives programmes" subtitle="Les prochains directs deja planifies." />
            <div className="space-y-2.5">
              {filteredScheduled.map((live) => (
                <ScheduledLiveCard
                  key={live.id}
                  live={live}
                  canStart={user?.id === live.creator_id}
                  onStart={async () => {
                    try {
                      await api.live.startScheduled(live.id);
                      toast.success('Live demarre, redirection...');
                      navigate(`${createPageUrl('LiveStream')}?id=${live.id}`);
                    } catch (err) {
                      toast.error(err?.apiMessage || err?.message || 'Erreur');
                    }
                  }}
                />
              ))}
            </div>
          </section>
        ) : null}

        {filteredReplays.length > 0 ? (
          <section className={cn(LIVE_SECTION, LIVE_SECTION_PAD)}>
            <LiveSectionHeader icon={Play} title="Replays" subtitle="Les meilleurs directs a revoir sans friction." />
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredReplays.map((live) => (
                <LiveStreamCard key={live.id} live={live} type="replay" />
              ))}
            </div>
          </section>
        ) : null}

        {totalVisibleLives === 0 ? <LiveEmptyState user={user} /> : null}
      </div>

      <BottomNav />

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @supports selector(::-webkit-scrollbar) {
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

