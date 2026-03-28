import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/api/expressClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Book,
  Briefcase,
  Calendar,
  ChevronRight,
  Compass,
  Dumbbell,
  Flame,
  GraduationCap,
  Hash,
  Laugh,
  Loader2,
  Music2,
  Search,
  Shirt,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
  Utensils,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { cn, getAbsoluteImageUrl, getVideoPrimarySourceUrl, getVideoPrimarySourceUrlForFrameGrab, isDeletedUser, isValidThumbnailUrl, MARKETPLACE_PLACEHOLDER_IMG, VIDEO_PLACEHOLDER_IMG } from "@/lib/utils";
import { getJSON, setJSON } from '@/utils/safeStorage';
import VideoFrameThumbnail from '../components/video/VideoFrameThumbnail';
import BottomNav from '../components/navigation/BottomNav';
import RecommendationEngine from '../components/common/RecommendationEngine';
import { toast } from 'sonner';

const DISCOVER_RECENT_SEARCHES_KEY = 'afw_discover_recent_searches';
const DISCOVER_RECENT_SEARCHES_LIMIT = 5;
/** Fond page — légèrement plus riche qu’un plat #000 */
const DISCOVER_PAGE_BG = 'bg-[#070a12]';
/** Section : volume sans cadre blanc (ombre + blur uniquement) */
const DISCOVER_SECTION =
  'rounded-[28px] bg-white/[0.035] shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl';
const DISCOVER_SECTION_PAD = 'p-5 sm:p-6';
/** Tuiles internes (stats, cartes) — pas de border nette */
const DISCOVER_SOFT_TILE = 'rounded-2xl bg-white/[0.05] transition-colors duration-200 hover:bg-white/[0.07]';
const DISCOVER_STAT_CELL = 'rounded-2xl bg-white/[0.06] p-4 sm:p-5';

const categories = [
  { id: 'trending', label: 'Tendances', icon: Flame, color: 'from-blue-500 to-indigo-500' },
  { id: 'musique', label: 'Musique', icon: Music2, color: 'from-purple-500 to-pink-500' },
  { id: 'danse', label: 'Danse', icon: Music2, color: 'from-pink-500 to-rose-500' },
  { id: 'cuisine', label: 'Cuisine', icon: Utensils, color: 'from-blue-400 to-indigo-500' },
  { id: 'mode', label: 'Mode', icon: Shirt, color: 'from-indigo-500 to-purple-500' },
  { id: 'business', label: 'Business', icon: Briefcase, color: 'from-emerald-500 to-teal-500' },
  { id: 'humour', label: 'Humour', icon: Laugh, color: 'from-yellow-500 to-amber-500' },
  { id: 'sport', label: 'Sport', icon: Dumbbell, color: 'from-blue-500 to-cyan-500' },
  { id: 'education', label: 'Education', icon: GraduationCap, color: 'from-green-500 to-emerald-500' },
];

function formatCompactNumber(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${Math.round(num / 1000)}K`;
  return String(num);
}

function DiscoverSectionHeader({ icon: Icon, title, subtitle, action }) {
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

function DiscoverEmptyState({ title, description }) {
  return (
    <div className="rounded-3xl bg-white/[0.03] px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]">
        <Compass className="h-6 w-6 text-white/45" strokeWidth={1.5} />
      </div>
      <p className="font-medium text-white/95">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-white/45">{description}</p>
    </div>
  );
}

function DiscoverVideoPoster({ video, index = 0, badge, badgeClassName }) {
  const title = video?.title || 'Sans titre';
  const creatorName = video?.creator_name || 'Createur';
  const primaryVideoUrl = getVideoPrimarySourceUrlForFrameGrab(video);
  const hasValidThumb = isValidThumbnailUrl(video?.thumbnail_url, getVideoPrimarySourceUrl(video));
  const [thumbError, setThumbError] = useState(false);
  const resolvedThumb = hasValidThumb && !thumbError ? getAbsoluteImageUrl(video.thumbnail_url) : '';

  return (
    <Link to={`${createPageUrl('VideoView')}?id=${video.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-[#1a202c] shadow-[0_20px_50px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-white/[0.08]"
      >
        {video.media_type === 'image' ? (
          <img
            src={getAbsoluteImageUrl(video.thumbnail_url || video.video_url)}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />
        ) : primaryVideoUrl ? (
          <VideoFrameThumbnail
            videoUrl={primaryVideoUrl}
            thumbnailUrl={video.thumbnail_url}
            alt={title}
            skipThumbnailOnly
          />
        ) : resolvedThumb ? (
          <img
            src={resolvedThumb}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
            onError={() => setThumbError(true)}
          />
        ) : (
          <img
            src={VIDEO_PLACEHOLDER_IMG}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        )}

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04)_0%,rgba(2,6,23,0.12)_48%,rgba(2,6,23,0.76)_100%)]" />

        {badge ? (
          <span className={cn("absolute left-2 top-2 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/95 backdrop-blur-md", badgeClassName)}>
            {badge}
          </span>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white/64">{creatorName}</p>
              <p className="line-clamp-2 text-sm font-semibold text-white">{title}</p>
            </div>
            <span className="shrink-0 rounded-full bg-black/45 px-2 py-1 text-[10px] font-medium text-white/88 backdrop-blur-md">
              {formatCompactNumber(video?.views)} vues
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function DiscoverCreatorRow({ creator, index, isInWonder, userId, onToggleWonder, isPending }) {
  const creatorId = creator.id || creator.creator_id;
  const creatorName = creator.full_name || creator.name || 'Utilisateur';
  const creatorHandle = creator.username || creator.email?.split('@')[0] || creator.handle || 'user';
  const creatorAvatar = creator.avatar || creator.profile_image || creator.creator_avatar;
  const subtitle = creator.totalViews != null
    ? `${formatCompactNumber(creator.totalViews)} vues • ${creator.videoCount || 0} videos`
    : creator.videoCount != null
      ? `${creator.videoCount} videos`
      : `@${creatorHandle}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className={DISCOVER_SOFT_TILE}
    >
      <Link
        to={`${createPageUrl('Profile')}?_userId=${creatorId}`}
        className="flex items-center gap-3 p-4"
      >
        <Avatar className="h-12 w-12 ring-1 ring-white/10 shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
          <AvatarImage src={creatorAvatar} />
          <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-800 text-sm font-semibold text-white">
            {creatorName?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-white">{creatorName}</p>
            {index < 3 ? (
              <span className="rounded-full bg-white/[0.1] px-2 py-0.5 text-[10px] font-semibold text-white/75">
                #{index + 1}
              </span>
            ) : null}
          </div>
          <p className="truncate text-sm text-white/54">{subtitle}</p>
        </div>

        {userId && userId !== creatorId ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleWonder(creatorId);
            }}
            disabled={isPending}
            className={cn(
              "shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition-colors",
              isInWonder
                ? "bg-white/[0.08] text-white/85 hover:bg-white/[0.12]"
                : "bg-white text-slate-950 hover:bg-white/92"
            )}
          >
            {isInWonder ? 'Dans son Wonder' : 'Wonder'}
          </button>
        ) : null}
      </Link>
    </motion.div>
  );
}

function DiscoverProductTile({ product, index }) {
  const imageSrc = getAbsoluteImageUrl(product.images?.[0] || product.image_url) || MARKETPLACE_PLACEHOLDER_IMG;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={DISCOVER_SOFT_TILE}
    >
      <Link to={`${createPageUrl('Product')}?id=${product.id}`} className="block overflow-hidden rounded-2xl">
        <div className="aspect-square overflow-hidden bg-black/15">
          <img
            src={imageSrc}
            alt={product.name || 'Produit'}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="space-y-2 p-4">
          <p className="line-clamp-2 text-sm font-semibold text-white">{product.name || product.title || 'Produit'}</p>
          <p className="text-base font-bold text-white">{product.price != null ? `${formatCompactNumber(product.price)} FCFA` : 'Prix sur demande'}</p>
          <div className="flex items-center justify-between gap-2 text-xs text-white/52">
            <span className="truncate">{product.location || 'AfriWonder Shop'}</span>
            <span className="rounded-full bg-white/[0.08] px-2 py-1 text-white/72">
              Acheter
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Discover() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('explore');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [recentSearches, setRecentSearches] = useState(() => {
    const cached = getJSON(DISCOVER_RECENT_SEARCHES_KEY, []);
    return Array.isArray(cached) ? cached.filter((item) => typeof item === 'string') : [];
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

  const { data: trendingVideos = [] } = useQuery({
    queryKey: ['trending-videos'],
    queryFn: async () => {
      const result = await api.videos.list({ page: 1, limit: 12 });
      return result.videos || [];
    },
  });

  const { data: recommendedVideos = [], isLoading: loadingRecommended, isError: recommendedError, refetch: refetchRecommended } = useQuery({
    queryKey: ['recommendedVideos', user?.id],
    queryFn: () => RecommendationEngine.getPersonalizedFeed(user.id, 20),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000
  });

  const { data: creatorRecommendations = [] } = useQuery({
    queryKey: ['creatorRecommendations', user?.id],
    queryFn: () => RecommendationEngine.getCreatorRecommendations(user.id, 10),
    enabled: !!user?.id
  });

  const { data: courseRecommendations = [] } = useQuery({
    queryKey: ['courseRecommendations', user?.id],
    queryFn: () => RecommendationEngine.getCourseRecommendations(user.id, 10),
    enabled: !!user?.id
  });

  const { data: eventRecommendations = [] } = useQuery({
    queryKey: ['eventRecommendations', user?.id],
    queryFn: () => RecommendationEngine.getEventRecommendations(user.id, 10),
    enabled: !!user?.id
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const result = await api.products.list({ page: 1, limit: 8 });
      return result.products || [];
    },
  });

  const { data: trendingHashtagsData = [] } = useQuery({
    queryKey: ['trending-hashtags'],
    queryFn: () => api.videos.getTrendingHashtags(15),
    staleTime: 2 * 60 * 1000,
  });
  const trendingHashtags = useMemo(() => {
    if (!Array.isArray(trendingHashtagsData)) return [];
    return trendingHashtagsData.map((h) => ({
      tag: h.tag || h.tag_name,
      count: h.countFormatted || (h.count >= 1000 ? `${(h.count / 1000).toFixed(0)}K` : String(h.count || '')),
      trending: (h.count || 0) >= 100,
    }));
  }, [trendingHashtagsData]);

  const { data: creatorsRaw = [] } = useQuery({
    queryKey: ['creators'],
    queryFn: () => api.entities.User.list('-created_date', 10),
  });
  const creators = useMemo(
    () => (Array.isArray(creatorsRaw) ? creatorsRaw.filter((u) => !isDeletedUser(u)) : []),
    [creatorsRaw]
  );

  const { data: filteredVideos = [] } = useQuery({
    queryKey: ['category-videos', selectedCategory],
    queryFn: async () => {
      const result = await api.videos.list({ category: selectedCategory, page: 1, limit: 20 });
      if (Array.isArray(result)) return result;
      return result?.videos || [];
    },
    enabled: !!selectedCategory && selectedCategory !== 'trending'
  });

  const { data: viralVideos = [] } = useQuery({
    queryKey: ['viral-videos'],
    queryFn: async () => {
      const result = await api.videos.list({ page: 1, limit: 100 });
      const videos = result.videos || [];
      return videos
        .map(v => ({
          ...v,
          engagementRate: v.views > 0 ? (v.likes + v.comments_count + v.shares) / v.views : 0
        }))
        .filter(v => v.views > 500)
        .sort((a, b) => b.engagementRate - a.engagementRate)
        .slice(0, 12);
    }
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => api.entities.Challenge.filter({ status: 'active' }, '-participants_count', 10)
  });

  const { data: trendingCreators = [] } = useQuery({
    queryKey: ['trending-creators'],
    queryFn: async () => {
      const result = await api.videos.list({ page: 1, limit: 25 });
      const allVideos = result.videos || [];
      const creatorStats = {};
      
      allVideos.forEach(v => {
        if (!creatorStats[v.creator_id]) {
          creatorStats[v.creator_id] = {
            id: v.creator_id,
            name: v.creator_name,
            avatar: v.creator_avatar,
            totalViews: 0,
            videoCount: 0
          };
        }
        creatorStats[v.creator_id].totalViews += v.views || 0;
        creatorStats[v.creator_id].videoCount += 1;
      });
      
      return Object.values(creatorStats)
        .sort((a, b) => b.totalViews - a.totalViews)
        .slice(0, 10);
    }
  });

  const { data: userFollows = [] } = useQuery({
    queryKey: ['user-follows', user?.id],
    queryFn: async () => {
      const result = await api.users.getFollowing(user.id, { page: 1, limit: 200 });
      return result?.following || [];
    },
    enabled: !!user?.id,
  });

  const queryClient = useQueryClient();
  const toggleWonderMutation = useMutation({
    mutationFn: (creatorId) => api.users.toggleWonder(creatorId),
    onSuccess: (response, creatorId) => {
      queryClient.invalidateQueries({ queryKey: ['user-follows', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['trending-creators'] });
      queryClient.invalidateQueries({ queryKey: ['creators'] });
      queryClient.invalidateQueries({ queryKey: ['follow-stats', creatorId] });
      const inWonder = response?.data?.inWonder ?? response?.inWonder;
      if (inWonder) toast.success('Vous etes maintenant dans son Wonder');
      else toast.success('Vous avez quitte son Wonder');
    },
    onError: () => toast.error('Connectez-vous pour ajouter à votre Wonder'),
  });

  const followingIds = new Set((userFollows || []).map((u) => u.id));
  const categoryOrTrendingVideos = useMemo(() => {
    const source =
      selectedCategory && selectedCategory !== 'trending'
        ? filteredVideos
        : trendingVideos;
    return Array.isArray(source) ? source : [];
  }, [selectedCategory, filteredVideos, trendingVideos]);

  const persistRecentSearch = (value) => {
    const query = String(value || '').trim();
    if (!query) return;

    setRecentSearches((prev) => {
      const next = [query, ...prev.filter((item) => item.toLowerCase() !== query.toLowerCase())]
        .slice(0, DISCOVER_RECENT_SEARCHES_LIMIT);
      setJSON(DISCOVER_RECENT_SEARCHES_KEY, next);
      return next;
    });
  };

  const submitSearch = (value) => {
    const query = String(value || '').trim();
    if (!query) return;
    persistRecentSearch(query);
    navigate(`${createPageUrl('Search')}?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className={`min-h-screen pb-24 text-white ${DISCOVER_PAGE_BG}`}>
      <div className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#070a12]/90 backdrop-blur-2xl">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-10 w-10 flex-shrink-0 rounded-full bg-white/[0.06] text-white/85 hover:bg-white/[0.10]"
                aria-label="Retour"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/38">Discover</p>
                <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.025em] text-white sm:text-[24px]">Explorer AfriWonder</h1>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/45">Tendances, créateurs, hashtags et produits — une seule expérience fluide.</p>
              </div>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/55">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>

          <form
            className="relative"
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch(searchQuery);
            }}
          >
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/34" />
            <Input
              type="search"
              placeholder="Rechercher videos, createurs, produits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 rounded-[28px] border-0 bg-white/[0.06] pl-11 pr-[104px] text-white shadow-inner shadow-black/20 ring-1 ring-white/[0.08] placeholder:text-white/35"
              aria-label="Rechercher videos, createurs et produits"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 inline-flex h-10 -translate-y-1/2 items-center rounded-full bg-white px-4 text-sm font-semibold text-slate-950 transition-transform duration-200 hover:bg-white/92 active:scale-[0.98]"
            >
              Rechercher
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {(recentSearches.length > 0 ? recentSearches.slice(0, 4).map((item) => ({ key: item, label: item, icon: Search, value: item })) : trendingHashtags.slice(0, 4).map((hashtag) => ({ key: hashtag.tag, label: `#${hashtag.tag}`, icon: Flame, value: `#${hashtag.tag}` }))).map((chip) => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => submitSearch(chip.value)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/[0.06] px-3.5 text-[13px] font-medium leading-snug text-white/75 transition-colors touch-manipulation hover:bg-white/[0.10] hover:text-white active:scale-[0.98] sm:px-4"
                >
                  <Icon className="h-4 w-4 shrink-0 text-white/48" />
                  <span className="min-w-0 max-w-[min(220px,78vw)] truncate">{chip.label}</span>
                </button>
              );
            })}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList
              className={cn(
                'grid min-h-[48px] w-full gap-1 rounded-full bg-white/[0.07] p-1.5 shadow-none',
                user ? 'grid-cols-4' : 'grid-cols-3'
              )}
            >
              <TabsTrigger
                value="explore"
                className="min-h-[40px] rounded-full text-[13px] font-medium leading-snug text-white/48 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                Explorer
              </TabsTrigger>
              {user ? (
                <TabsTrigger
                  value="recommended"
                  className="min-h-[40px] rounded-full text-[13px] font-medium leading-snug text-white/48 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                >
                  Pour vous
                </TabsTrigger>
              ) : null}
              <TabsTrigger
                value="shop"
                className="min-h-[40px] rounded-full text-[13px] font-medium leading-snug text-white/48 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                Boutique
              </TabsTrigger>
              <TabsTrigger
                value="creators"
                className="min-h-[40px] rounded-full text-[13px] font-medium leading-snug text-white/48 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                Créateurs
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 p-4">
        {activeTab === 'explore' && (
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { label: 'Videos virales', value: formatCompactNumber(viralVideos.length), icon: Flame },
                { label: 'Hashtags actifs', value: formatCompactNumber(trendingHashtags.length), icon: Hash },
                { label: 'Createurs en vue', value: formatCompactNumber(trendingCreators.length), icon: Users },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className={DISCOVER_STAT_CELL}>
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

            <section className={cn(DISCOVER_SECTION, DISCOVER_SECTION_PAD)}>
              <DiscoverSectionHeader icon={Compass} title="Categories" subtitle="Explorez rapidement les univers les plus regardes." />
              <div className="scrollbar-hide -mx-1 overflow-x-auto px-1 pb-2">
                <div className="flex gap-3">
                  {categories.map((cat, index) => {
                    const Icon = cat.icon;
                    const active = selectedCategory === cat.id;
                    return (
                      <motion.button
                        key={cat.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => setSelectedCategory((current) => (current === cat.id ? null : cat.id))}
                        className={cn(
                          'min-w-[88px] rounded-2xl p-3 text-left transition-all duration-200',
                          active
                            ? 'bg-white/[0.12] shadow-[0_12px_32px_rgba(0,0,0,0.25)] ring-1 ring-white/15'
                            : 'bg-white/[0.04] hover:bg-white/[0.07]'
                        )}
                      >
                        <div className={cn("mb-3 flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br", cat.color)}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-sm font-medium text-white">{cat.label}</p>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className={cn(DISCOVER_SECTION, DISCOVER_SECTION_PAD)}>
              <DiscoverSectionHeader
                icon={Flame}
                title="Videos virales"
                subtitle="Les contenus qui accelerent en ce moment."
              />
              {viralVideos.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {viralVideos.slice(0, 6).map((video, index) => (
                    <DiscoverVideoPoster key={video.id} video={video} index={index} badge="Viral" />
                  ))}
                </div>
              ) : (
                <DiscoverEmptyState title="Pas encore de videos virales" description="Les contenus a fort engagement apparaitront ici." />
              )}
            </section>

            {challenges.length > 0 ? (
              <section className={cn(DISCOVER_SECTION, DISCOVER_SECTION_PAD)}>
                <DiscoverSectionHeader icon={Sparkles} title="Defis tendances" subtitle="Des activations plus lisibles et plus engageantes." />
                <div className="space-y-3">
                  {challenges.map((challenge, index) => (
                    <motion.div
                      key={challenge.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="overflow-hidden rounded-2xl bg-[linear-gradient(135deg,rgba(20,31,59,0.95)_0%,rgba(27,45,88,0.88)_52%,rgba(11,17,29,0.92)_100%)] p-4 ring-1 ring-white/[0.07]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-white">{challenge.title}</p>
                          <p className="mt-1 text-sm text-white/65">{challenge._description}</p>
                        </div>
                        <span className="rounded-full bg-white/[0.1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75">
                          Defi
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-sm text-white/65">
                        <span className="rounded-full bg-white/[0.06] px-3 py-1">#{challenge.hashtag}</span>
                        <span className="rounded-full bg-white/[0.06] px-3 py-1">{formatCompactNumber(challenge.participants_count)} participants</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className={cn(DISCOVER_SECTION, DISCOVER_SECTION_PAD)}>
              <DiscoverSectionHeader icon={TrendingUp} title="Tendances" subtitle="Les hashtags qui structurent la decouverte du moment." />
              {trendingHashtags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {trendingHashtags.map((hashtag) => (
                    <Link
                      key={hashtag.tag}
                      to={`${createPageUrl('Search')}?q=${encodeURIComponent(`#${hashtag.tag}`)}`}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/[0.07] px-3.5 text-[14px] font-medium leading-snug text-white/82 transition-colors touch-manipulation hover:bg-white/[0.11] active:scale-[0.98] sm:px-4"
                    >
                      <Hash className="h-4 w-4 text-white/56" />
                      <span>#{hashtag.tag}</span>
                      <span className="text-xs text-white/44">{hashtag.count}</span>
                      {hashtag.trending ? <Flame className="h-3.5 w-3.5 text-white/64" /> : null}
                    </Link>
                  ))}
                </div>
              ) : (
                <DiscoverEmptyState title="Aucun hashtag actif" description="Les hashtags populaires remonteront ici au fil des publications." />
              )}
            </section>

            <section className={cn(DISCOVER_SECTION, DISCOVER_SECTION_PAD)}>
              <DiscoverSectionHeader
                icon={Compass}
                title={selectedCategory && selectedCategory !== 'trending' ? categories.find((c) => c.id === selectedCategory)?.label || 'Videos populaires' : 'Videos populaires'}
                subtitle={selectedCategory && selectedCategory !== 'trending' ? 'Selection de videos selon la categorie choisie.' : 'Les contenus qui attirent le plus d attention.'}
                action={selectedCategory ? (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="text-sm font-medium text-white/68 hover:text-white"
                  >
                    Reinitialiser
                  </button>
                ) : null}
              />
              {categoryOrTrendingVideos.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {categoryOrTrendingVideos.slice(0, 9).map((video, index) => (
                    <DiscoverVideoPoster key={video.id} video={video} index={index} />
                  ))}
                </div>
              ) : (
                <DiscoverEmptyState title="Aucune video disponible" description="Cette categorie sera alimentee des que de nouveaux contenus seront publies." />
              )}
            </section>

            <section className={cn(DISCOVER_SECTION, DISCOVER_SECTION_PAD)}>
              <DiscoverSectionHeader icon={Users} title="Createurs tendances" subtitle="Des profils mieux mis en avant et plus faciles a suivre." />
              <div className="space-y-2.5">
                {trendingCreators.slice(0, 5).map((creator, index) => (
                  <DiscoverCreatorRow
                    key={creator.id}
                    creator={creator}
                    index={index}
                    userId={user?.id}
                    isInWonder={followingIds.has(creator.id)}
                    onToggleWonder={(creatorId) => toggleWonderMutation.mutate(creatorId)}
                    isPending={toggleWonderMutation.isPending}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'recommended' && (
          <div className="space-y-6">
            <section className={cn(DISCOVER_SECTION, DISCOVER_SECTION_PAD)}>
              <DiscoverSectionHeader icon={Sparkles} title="Recommandations personnalisees" subtitle="Un espace plus propre pour votre decouverte personnelle." />

              {recommendedError ? (
                <div className="rounded-3xl bg-white/[0.03] px-6 py-12 text-center">
                  <p className="font-medium text-white">Une erreur s&apos;est produite.</p>
                  <p className="mt-1 text-sm text-white/48">Impossible de recuperer les recommandations pour le moment.</p>
                  <Button onClick={() => refetchRecommended()} className="mt-4 rounded-full bg-white text-slate-950 hover:bg-white/92">
                    Reessayer
                  </Button>
                </div>
              ) : loadingRecommended ? (
                <div className={cn('grid grid-cols-2 gap-3 rounded-2xl bg-white/[0.04] p-3 sm:grid-cols-3')}>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="aspect-[9/16] animate-pulse rounded-[22px] bg-white/[0.05]" />
                  ))}
                </div>
              ) : recommendedVideos.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {recommendedVideos.slice(0, 9).map((video, index) => (
                    <DiscoverVideoPoster key={video.id} video={video} index={index} badge="Pour vous" badgeClassName="bg-white/[0.10]" />
                  ))}
                </div>
              ) : (
                <DiscoverEmptyState title="Pas encore de recommandations" description="Regardez davantage de videos pour personnaliser cet espace." />
              )}
            </section>

            {creatorRecommendations.length > 0 ? (
              <section className={cn(DISCOVER_SECTION, DISCOVER_SECTION_PAD)}>
                <DiscoverSectionHeader icon={Users} title="Createurs a decouvrir" subtitle="Suggestions basees sur vos preferences recentes." />
                <div className="grid gap-3 sm:grid-cols-2">
                  {creatorRecommendations.map((creator, index) => (
                    <DiscoverCreatorRow
                      key={creator.creator_id}
                      creator={creator}
                      index={index}
                      userId={user?.id}
                      isInWonder={followingIds.has(creator.creator_id)}
                      onToggleWonder={(creatorId) => toggleWonderMutation.mutate(creatorId)}
                      isPending={toggleWonderMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {courseRecommendations.length > 0 ? (
              <section className={cn(DISCOVER_SECTION, DISCOVER_SECTION_PAD)}>
                <DiscoverSectionHeader icon={Book} title="Cours recommandes" subtitle="Une presentation plus claire des contenus d apprentissage." />
                <div className="grid gap-3 sm:grid-cols-2">
                  {courseRecommendations.slice(0, 4).map((course, index) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className={DISCOVER_SOFT_TILE}
                    >
                      <div className="p-4">
                        <p className="text-sm font-semibold text-white">{course.title}</p>
                        <p className="mt-1 text-sm text-white/54">{course.instructor_name || 'AfriWonder Learning'}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            ) : null}

            {eventRecommendations.length > 0 ? (
              <section className={cn(DISCOVER_SECTION, DISCOVER_SECTION_PAD)}>
                <DiscoverSectionHeader icon={Calendar} title="Evenements interessants" subtitle="Une lecture plus propre des evenements qui pourraient vous plaire." />
                <div className="grid gap-3 sm:grid-cols-2">
                  {eventRecommendations.slice(0, 4).map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className={DISCOVER_SOFT_TILE}
                    >
                      <div className="p-4">
                        <p className="text-sm font-semibold text-white">{event.title}</p>
                        <p className="mt-1 text-sm text-white/54">{event.location || 'Lieu a confirmer'}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}

        {activeTab === 'shop' && (
          <section className={cn(DISCOVER_SECTION, DISCOVER_SECTION_PAD)}>
            <DiscoverSectionHeader
              icon={ShoppingBag}
              title="Marketplace"
              subtitle="Une vitrine plus premium et plus cohereente avec le reste du produit."
              action={
                <Link to={createPageUrl('Marketplace')} className="inline-flex items-center gap-1 text-sm font-medium text-white/70 hover:text-white">
                  Voir tout <ChevronRight className="h-4 w-4" />
                </Link>
              }
            />
            {products.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product, index) => (
                  <DiscoverProductTile key={product.id} product={product} index={index} />
                ))}
              </div>
            ) : (
              <DiscoverEmptyState title="Boutique indisponible" description="Les produits recommandes s afficheront ici des qu ils seront disponibles." />
            )}
          </section>
        )}

        {activeTab === 'creators' && (
          <section className={cn(DISCOVER_SECTION, DISCOVER_SECTION_PAD)}>
            <DiscoverSectionHeader icon={Users} title="Tous les createurs" subtitle="Une liste plus lisible pour explorer les profils du moment." />
            {creators.length > 0 ? (
              <div className="space-y-2.5">
                {creators.map((creator, index) => (
                  <DiscoverCreatorRow
                    key={creator.id}
                    creator={creator}
                    index={index}
                    userId={user?.id}
                    isInWonder={followingIds.has(creator.id)}
                    onToggleWonder={(creatorId) => toggleWonderMutation.mutate(creatorId)}
                    isPending={toggleWonderMutation.isPending}
                  />
                ))}
              </div>
            ) : (
              <DiscoverEmptyState title="Aucun createur trouve" description="Les profils recommandes apparaitront ici une fois disponibles." />
            )}
          </section>
        )}
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

