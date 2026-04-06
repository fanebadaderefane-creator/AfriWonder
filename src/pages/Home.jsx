/* cspell:disable-file */
// AfriWonder full review PR - CodeRabbit
import React, { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import { FEED_PAGE_SIZE } from '@/constants/feed';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/expressClient';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CommentSheet from '../components/video/CommentSheet';
import TipModal from '../components/video/TipModal';
import ShareSheet from '../components/video/ShareSheet';
import GiftPurchaseModal from '../components/live/GiftPurchaseModal';
import TopHeader from '../components/navigation/TopHeader';
import BottomNav from '../components/navigation/BottomNav';
import AfriWonderLogo from '../components/common/AfriWonderLogo';
import FeedEmptyState from '@/features/feed/components/FeedEmptyState';
import FeedFollowingStrip from '@/features/feed/components/FeedFollowingStrip';
import FeedPullToRefresh from '@/features/feed/components/FeedPullToRefresh';
import FeedStartupCurtain from '@/features/feed/components/FeedStartupCurtain';
import FeedTopBannerRail from '@/features/feed/components/FeedTopBannerRail';
import FeedVideoSlide from '@/features/feed/components/FeedVideoSlide';
import FeedVideoSkeleton from '@/features/feed/components/FeedVideoSkeleton';
import {
  extractMainFeedVideoItems,
  getFeedPosterUrl,
  normalizeFeedVideo,
} from '@/features/feed/feedUtils';
import { useAppMenu } from '@/contexts/AppMenuContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import NotificationService from '../components/notifications/NotificationService';
import { Sparkles, Users, WifiOff, Download, CloudOff } from 'lucide-react';
import { toast } from "sonner";
import { useNetworkStatus, getCacheStrategy } from '../components/common/PerformanceOptimizer';
import { AnimatePresence, motion } from 'framer-motion';
import { cn, isDeletedUser, isValidThumbnailUrl, VIDEO_PLACEHOLDER_IMG, getAbsoluteImageUrl, getVideoPlaybackUrl } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getJSON, setJSON } from '@/utils/safeStorage';
import { impactLight } from '@/lib/haptics';
import { useWakeLock } from '@/hooks/useWakeLock';

/** Initiales pour avatar sans photo (max 2 caractères). */
function getAvatarInitials(user) {
  const name = (user?.full_name || user?.username || '?').trim();
  if (!name || name === '?') return '?';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const FEED_FULLSCREEN_MAX_WIDTH_PX = 400;
const FEED_FULLSCREEN_WIDTH = `min(100vw, ${FEED_FULLSCREEN_MAX_WIDTH_PX}px)`;
const FEED_POSTER_PRELOAD_COUNT = 4;
const FEED_VIDEO_PRELOAD_COUNT = 3;
const FEED_VIDEO_STATE_RADIUS = 3;
const FEED_SW_PREFETCH_COUNT = 10;
const FEED_SW_PREFETCH_COUNT_CONSTRAINED = 4;
const SHOW_FEED_OFFLINE_BADGES = false;
const FEED_STARTUP_CURTAIN_SESSION_KEY = 'afw_feed_startup_curtain_seen';
const FEED_PREPARED_STORAGE_KEY = 'afw_feed_prepared_v1';
const FEED_VIEWED_STORAGE_KEY = 'afw_feed_viewed_catalog_v1';
const FEED_VIEWED_STORAGE_MAX = 80;
/** @type {any[]} */
const EMPTY_ITEMS = [];

function sameStringArray(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (String(a[i]) !== String(b[i])) return false;
  }
  return true;
}

const initialFeedState = { likedVideos: new Set(), savedVideos: new Set(), followingCount: 0 };
function feedReducer(state, action) {
  switch (action.type) {
    case 'RESET_INTERACTIONS':
      return { ...state, likedVideos: new Set(), savedVideos: new Set() };
    case 'SYNC_LIKES': {
      const next = new Set(state.likedVideos);
      action.visibleIds.forEach((id) => next.delete(id));
      action.likedIds.forEach((id) => next.add(id));
      return { ...state, likedVideos: next };
    }
    case 'SYNC_SAVES': {
      const next = new Set(state.savedVideos);
      action.visibleIds.forEach((id) => next.delete(id));
      action.savedIds.forEach((id) => next.add(id));
      return { ...state, savedVideos: next };
    }
    case 'TOGGLE_LIKE': {
      const next = new Set(state.likedVideos);
      if (action.liked) next.add(String(action.videoId));
      else next.delete(String(action.videoId));
      return { ...state, likedVideos: next };
    }
    case 'TOGGLE_SAVE': {
      const next = new Set(state.savedVideos);
      if (action.saved) next.add(String(action.videoId));
      else next.delete(String(action.videoId));
      return { ...state, savedVideos: next };
    }
    case 'SET_FOLLOWING_COUNT':
      return { ...state, followingCount: action.count };
    default:
      return state;
  }
}

export default function Home() {
  const _navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pourtoi');
  const [currentIndex, setCurrentIndex] = useState(0);
  // Un seul état pour tous les modals — évite N re-renders indépendants.
  const [activeModal, setActiveModal] = useState(/** @type {string | null} */ (null)); // null | 'comments' | 'tip' | 'share' | 'gift' | 'wonderers' | 'offline'
  const showComments = activeModal === 'comments';
  const showTip = activeModal === 'tip';
  const showShare = activeModal === 'share';
  const showGift = activeModal === 'gift';
  const { isOpen: isMenuOpen, openMenu } = useAppMenu();
  const { isMuted, setMuted } = usePreferences();
  
  useWakeLock(true);
  
  const [selectedVideo, setSelectedVideo] = useState(/** @type {any} */ (null));
  const [user, setUser] = useState(/** @type {any} */ (null));
  /** Évite 2× GET /feed : la clé ['feed', user?.id] passait de undefined → id au retour de /auth/me. */
  const [userHydrated, setUserHydrated] = useState(false);
  const [feedState, _dispatchRaw] = useReducer(feedReducer, initialFeedState);
  const dispatch = /** @type {(action: any) => void} */ (_dispatchRaw);
  const likedVideos = feedState.likedVideos;
  const savedVideos = feedState.savedVideos;
  const followingCount = feedState.followingCount;
  const [initialFeedVisualReady, setInitialFeedVisualReady] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.sessionStorage.getItem(FEED_STARTUP_CURTAIN_SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });

  const showWonderersPanel = activeModal === 'wonderers';
  const showOfflineReadyPanel = activeModal === 'offline';
  const [isBatteryConstrained, setIsBatteryConstrained] = useState(false);
  const [warmingFeedIds, setWarmingFeedIds] = useState(/** @type {any[]} */ ([]));
  const [preparedFeedVideos, setPreparedFeedVideos] = useState(/** @returns {any[]} */ () => {
    const cached = getJSON(FEED_PREPARED_STORAGE_KEY, []);
    return Array.isArray(cached) ? cached : [];
  });
  const [viewedFeedCatalog, setViewedFeedCatalog] = useState(/** @returns {any[]} */ () => {
    const cached = getJSON(FEED_VIEWED_STORAGE_KEY, []);
    return Array.isArray(cached) ? cached : [];
  });

  const containerRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const queryClient = useQueryClient();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartYRef = useRef(0);
  const pullDistanceRef = useRef(0);
  const currentIndexRef = useRef(0);
  const observerRef = useRef(/** @type {IntersectionObserver | null} */ (null));
  const scrollRafRef = useRef(0);
  /** Évite double GET /feed : l’effet d’invalidation ne doit pas refetch au 1er `user.id` (la query vient de partir). */
  const feedInvalidatePrevUserIdRef = useRef(undefined);

  useEffect(() => {
    let cancelled = false;
    api.auth
      .me()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setUserHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { isOnline, isSlowConnection } = useNetworkStatus();
  const isDataSaverEnabled = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const nav = /** @type {any} */ (navigator);
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    return !!connection?.saveData;
  }, []);
  const cacheStrategy = getCacheStrategy(isSlowConnection);
  const homeCacheStrategy = {
    ...cacheStrategy,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  };

  const {
    data: feedInfiniteData,
    isLoading: feedLoading,
    isError: feedError,
    refetch: refetchFeed,
    fetchNextPage: fetchFeedNextPage,
    hasNextPage: feedHasNextPage,
  } = useInfiniteQuery({
    queryKey: ['feed', user?.id ?? 'guest'],
    ...homeCacheStrategy,
    retry: 1,
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
      const result = await api.feed.list({ page: pageParam, limit: FEED_PAGE_SIZE });
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_FEED_QUERY === '1') {
        const items = result?.items;
        const ms = typeof performance !== 'undefined' ? Math.round(performance.now() - t0) : 0;
        console.log('[Feed query] réponse:', {
          ms, page: pageParam,
          type: typeof result,
          hasItems: !!items,
          count: items?.length,
          sample: items?.[0],
        });
      }
      return /** @type {any[]} */ (result?.items ?? []);
    },
    getNextPageParam: (lastPage, pages) => {
      const safeLastPage = Array.isArray(lastPage) ? lastPage : EMPTY_ITEMS;
      const safePages = Array.isArray(pages) ? pages : EMPTY_ITEMS;
      return safeLastPage.length === FEED_PAGE_SIZE ? safePages.length + 1 : undefined;
    },
    enabled: activeTab === 'pourtoi' && userHydrated,
  });

  const { data: userFollowsData } = useQuery({
    queryKey: ['user-follows', user?.id],
    ...homeCacheStrategy,
    queryFn: async () => {
      const result = await api.users.getFollowing(user.id);
      return result.following || [];
    },
    enabled: !!user?.id,
  });
  const userFollows = userFollowsData ?? EMPTY_ITEMS;
  const activeFollowingUsers = useMemo(
    () => userFollows.filter((followedUser) => !isDeletedUser(followedUser)),
    [userFollows]
  );
  const followingIdSet = useMemo(
    () => new Set(activeFollowingUsers.map((followedUser) => followedUser.id)),
    [activeFollowingUsers]
  );
  const hasActiveFollows = activeFollowingUsers.length > 0;

  const { data: videosData, isLoading: videosLoading, refetch: refetchVideos } = useQuery({
    queryKey: ['videos', user?.id ?? 'guest'],
    ...homeCacheStrategy,
    queryFn: async () => {
      const result = await api.videos.list({ page: 1, limit: FEED_PAGE_SIZE });
      return result.videos || [];
    },
    enabled: activeTab === 'abonnements' && userHydrated && !!user?.id && hasActiveFollows,
  });
  const videos = videosData ?? EMPTY_ITEMS;

  const [hiddenAdIds, setHiddenAdIds] = useState(/** @returns {any[]} */ () => {
    const cached = getJSON('afw_hidden_ads', []);
    return Array.isArray(cached) ? cached : [];
  });

  const handleHideAd = useCallback((campaignId) => {
    setHiddenAdIds((prev) => {
      if (prev.includes(campaignId)) return prev;
      const next = [...prev, campaignId];
      setJSON('afw_hidden_ads', next);
      return next;
    });
  }, []);

  const feedItemsRaw = useMemo(
    () => Array.isArray(feedInfiniteData?.pages)
      ? feedInfiniteData.pages.flat()
      : EMPTY_ITEMS,
    [feedInfiniteData]
  );
  const feedItems = useMemo(() => {
    if (hiddenAdIds.length === 0) return feedItemsRaw;
    return feedItemsRaw.filter(
      (item) =>
        (item.type !== 'ad' && item.type !== 'top_banner') ||
        !hiddenAdIds.includes(item.ad?.campaign_id)
    );
  }, [feedItemsRaw, hiddenAdIds]);

  const topBannerItems = useMemo(
    () => feedItems.filter((i) => i.type === 'top_banner'),
    [feedItems]
  );
  const mainFeedItems = useMemo(
    () =>
      extractMainFeedVideoItems(feedItems, {
        userHydrated,
        log: import.meta.env.DEV,
      }),
    [feedItems, userHydrated]
  );
  const isLoading =
    activeTab === 'pourtoi'
      ? feedLoading || !userHydrated
      : videosLoading || !userHydrated;

  const PULL_THRESHOLD = 55;
  const MAX_PULL = 80;
  const PULL_RESISTANCE = 0.5;

  const handlePullStart = useCallback((clientY) => {
    touchStartYRef.current = clientY;
  }, []);

  const handlePullMove = useCallback((clientY) => {
    const startY = touchStartYRef.current;
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop > 5) return;
    const delta = clientY - startY;
    if (delta <= 0) return;
    const resisted = Math.min(delta * PULL_RESISTANCE, MAX_PULL);
    pullDistanceRef.current = resisted;
    setPullDistance(resisted);
  }, []);

  const handlePullEnd = useCallback(() => {
    const currentPull = pullDistanceRef.current;
    if (currentPull >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(0);
      pullDistanceRef.current = 0;
      const refreshTasks =
        activeTab === 'pourtoi'
          ? [refetchFeed()]
          : !!user?.id && hasActiveFollows
            ? [refetchVideos()]
            : [];
      Promise.all(refreshTasks)
        .catch(() => {})
        .finally(() => setIsRefreshing(false));
    } else {
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }
    touchStartYRef.current = 0;
  }, [activeTab, hasActiveFollows, refetchFeed, refetchVideos, user?.id]);

  // Invalider feed/videos seulement si l’utilisateur **change** (A→B), pas au premier id après /me (sinon 2× fetch lourd).
  useEffect(() => {
    const id = user?.id ?? null;
    if (!id) {
      feedInvalidatePrevUserIdRef.current = undefined;
      return;
    }
    const prev = feedInvalidatePrevUserIdRef.current;
    feedInvalidatePrevUserIdRef.current = id;
    if (prev == null || prev === id) return;
    queryClient.invalidateQueries({ queryKey: ['videos'] });
    queryClient.invalidateQueries({ queryKey: ['feed'] });
  }, [queryClient, user?.id]);

  const { data: commentsData, isLoading: commentsLoading, isError: commentsError, refetch: refetchComments } = useQuery({
    queryKey: ['comments', selectedVideo?.id],
    ...homeCacheStrategy,
    queryFn: async () => {
      if (!selectedVideo?.id) return [];
      const result = await api.videos.getComments(
        selectedVideo.id,
        { page: 1, limit: 50 },
        { timeoutMs: 12000 }
      );
      return Array.isArray(result) ? result : (result?.comments || []);
    },
    enabled: !!selectedVideo?.id && showComments,
    // Evite les attentes de plusieurs minutes (axios retries + react-query retries cumulés).
    retry: 1,
  });
  const comments = commentsData ?? EMPTY_ITEMS;

  const { data: walletData } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: () => api.payments.getWallet(),
    enabled: !!user?.id && showTip,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const walletBalance = walletData?.available_balance ?? walletData?.balance ?? 0;

  const mainFeedLoading =
    activeTab === 'pourtoi' ? feedLoading : videosLoading;

  const { data: suggestedWonderersData } = useQuery({
    queryKey: ['wonder-suggestions', user?.id, userFollows.length],
    ...homeCacheStrategy,
    queryFn: () => api.me.getSuggestedFollows(18),
    // Après hydratation + feed : évite la course (query feed désactivée ⇒ feedLoading faux au tout début).
    enabled: !!user?.id && userHydrated && !mainFeedLoading,
  });
  const suggestedWonderers = suggestedWonderersData ?? EMPTY_ITEMS;

  const videoIdsString = useMemo(() => 
    videos.map(v => `${v.id}:${v.creator_id}`).sort().join(','), 
    [videos]
  );

  const followingCountMemo = activeFollowingUsers.length;

  const followingVideos = useMemo(
    () => videos.filter((v) => followingIdSet.has(v.creator_id)),
    [videos, followingIdSet, videoIdsString]
  );
  const offlinePreparedVideos = useMemo(
    () =>
      preparedFeedVideos
        .map((item) => item?.video)
        .filter((video) => video && (video.hls_playback_url || video.hls_url || video.playback_url || video.video_url)),
    [preparedFeedVideos]
  );
  const shouldUseOfflinePreparedFeed = activeTab === 'pourtoi' && !isOnline && offlinePreparedVideos.length > 0;
  const forYouFeedVideos = useMemo(
    () => (
      shouldUseOfflinePreparedFeed
        ? offlinePreparedVideos
        : mainFeedItems.map((item) => item?.video).filter(Boolean)
    ),
    [mainFeedItems, offlinePreparedVideos, shouldUseOfflinePreparedFeed]
  );
  const activeFeedVideos = useMemo(
    () => (activeTab === 'pourtoi' ? forYouFeedVideos : followingVideos),
    [activeTab, followingVideos, forYouFeedVideos]
  );
  const startupVideo = activeFeedVideos[0] ?? null;
  const startupVideoId = startupVideo?.id ?? null;
  const feedLength = activeFeedVideos.length;
  const safeCurrentIndex = feedLength > 0
    ? Math.max(0, Math.min(Number.isFinite(currentIndex) ? currentIndex : 0, feedLength - 1))
    : 0;

  // Charger la page suivante quand l'utilisateur est à 3 vidéos de la fin.
  useEffect(() => {
    if (activeTab !== 'pourtoi') return;
    if (!feedHasNextPage) return;
    if (feedLength > 0 && safeCurrentIndex >= feedLength - 3) {
      fetchFeedNextPage();
    }
  }, [safeCurrentIndex, feedLength, feedHasNextPage, fetchFeedNextPage, activeTab]);

  const visibleFeedVideoIds = useMemo(() => {
    const start = Math.max(0, safeCurrentIndex - FEED_VIDEO_STATE_RADIUS);
    const end = safeCurrentIndex + FEED_VIDEO_STATE_RADIUS + 1;
    return activeFeedVideos
      .slice(start, end)
      .map((video) => String(video?.id || ''))
      .filter(Boolean);
  }, [activeFeedVideos, safeCurrentIndex]);
  const feedSlides = useMemo(() => {
    return activeFeedVideos.map((video) => {
      const normalizedVideo = normalizeFeedVideo(video);
      return {
        id: normalizedVideo.id,
        video: normalizedVideo,
        posterUrl: getFeedPosterUrl(video),
        /* Pas de miniature en fond : uniquement la vraie frame décodée par le <video> (évite thumb « faux »). */
        slideBackgroundUrl: null,
      };
    });
  }, [activeFeedVideos]);

  useEffect(() => {
    if (activeTab !== 'pourtoi' || activeFeedVideos.length === 0) return;
    const video = activeFeedVideos[safeCurrentIndex];
    if (!video?.id) return;

    const posterCandidate = isValidThumbnailUrl(video?.thumbnail_url, video?.video_url)
      ? getAbsoluteImageUrl(video.thumbnail_url) || video.thumbnail_url
      : null;
    const manifestUrl = getVideoPlaybackUrl(video?.hls_playback_url || video?.hls_url);
    const preferredVideoUrl = getVideoPlaybackUrl(
      isSlowConnection
        ? video?.low_quality_playback_url ||
            video?.low_quality_url ||
            video?.playback_url ||
            video?.video_url
        : video?.playback_url ||
            video?.video_url ||
            video?.low_quality_playback_url ||
            video?.low_quality_url
    );

    const nextItem = {
      id: String(video.id),
      title: video?.title || '',
      creatorName: video?.creator_name || '',
      creatorAvatar: video?.creator_avatar || '',
      video,
      posterUrl: posterCandidate,
      manifestUrl,
      videoUrl: manifestUrl ? null : preferredVideoUrl,
      cachedAt: Date.now(),
      viewedAt: Date.now(),
    };

    setViewedFeedCatalog((prev) => {
      const map = new Map((Array.isArray(prev) ? prev : []).map((item) => [String(item?.id), item]));
      const previous = map.get(nextItem.id);
      map.set(nextItem.id, {
        ...(previous || {}),
        ...nextItem,
        viewedAt: Date.now(),
      });
      const next = Array.from(map.values())
        .sort((a, b) => Number(b?.viewedAt || 0) - Number(a?.viewedAt || 0))
        .slice(0, FEED_VIEWED_STORAGE_MAX);
      setJSON(FEED_VIEWED_STORAGE_KEY, next);
      return next;
    });
  }, [activeFeedVideos, activeTab, isSlowConnection, safeCurrentIndex]);
  const visibleSuggestedWonderers = useMemo(
    () => suggestedWonderers.filter((candidate) => !isDeletedUser(candidate)),
    [suggestedWonderers]
  );
  const shouldConserveOfflineData = isSlowConnection || isBatteryConstrained || isDataSaverEnabled;
  const feedWarmAssetCount = shouldConserveOfflineData ? FEED_SW_PREFETCH_COUNT_CONSTRAINED : FEED_SW_PREFETCH_COUNT;
  const feedWarmAssets = useMemo(() => {
    if (!isOnline) return [];
    const fromActiveFeed = activeFeedVideos
      .slice(safeCurrentIndex, safeCurrentIndex + feedWarmAssetCount)
      .map((video, index) => {
        const posterCandidate = isValidThumbnailUrl(video?.thumbnail_url, video?.video_url)
          ? getAbsoluteImageUrl(video.thumbnail_url) || video.thumbnail_url
          : null;
        const manifestUrl = getVideoPlaybackUrl(video?.hls_playback_url || video?.hls_url);
        const preferredVideoUrl = getVideoPlaybackUrl(
          isSlowConnection
            ? video?.low_quality_playback_url ||
                video?.low_quality_url ||
                video?.playback_url ||
                video?.video_url
            : video?.playback_url ||
                video?.video_url ||
                video?.low_quality_playback_url ||
                video?.low_quality_url
        );

        return {
          id: String(video?.id || ''),
          priority: index === 0 ? 'critical' : index === 1 ? 'high' : 'ahead',
          segmentPrefetchLimit: shouldConserveOfflineData ? 10 : 36,
          title: video?.title || '',
          creatorName: video?.creator_name || '',
          creatorAvatar: video?.creator_avatar || '',
          video,
          posterUrl: posterCandidate,
          manifestUrl,
          videoUrl: manifestUrl ? null : preferredVideoUrl,
        };
      })
      .filter((asset) => asset.id && (asset.posterUrl || asset.manifestUrl || asset.videoUrl));

    const viewedFallback = viewedFeedCatalog
      .slice(0, shouldConserveOfflineData ? 6 : 20)
      .map((item) => ({
        id: String(item?.id || ''),
        priority: 'history',
        segmentPrefetchLimit: shouldConserveOfflineData ? 10 : 36,
        title: item?.title || '',
        creatorName: item?.creatorName || '',
        creatorAvatar: item?.creatorAvatar || '',
        video: item?.video || null,
        posterUrl: item?.posterUrl || null,
        manifestUrl: item?.manifestUrl || null,
        videoUrl: item?.videoUrl || null,
      }))
      .filter((asset) => asset.id && (asset.posterUrl || asset.manifestUrl || asset.videoUrl));

    const merged = new Map();
    [...fromActiveFeed, ...viewedFallback].forEach((asset) => {
      if (!asset?.id || merged.has(asset.id)) return;
      merged.set(asset.id, asset);
    });
    return Array.from(merged.values());
  }, [activeFeedVideos, feedWarmAssetCount, isOnline, isSlowConnection, safeCurrentIndex, shouldConserveOfflineData, viewedFeedCatalog]);
  const preparedFeedVideoIds = useMemo(
    () => new Set(preparedFeedVideos.map((video) => String(video.id))),
    [preparedFeedVideos]
  );
  const feedWarmTargetIds = useMemo(
    () => feedWarmAssets.map((asset) => String(asset.id)).filter(Boolean),
    [feedWarmAssets]
  );
  const currentPreparedWarmCount = useMemo(
    () => feedWarmTargetIds.filter((id) => preparedFeedVideoIds.has(id)).length,
    [feedWarmTargetIds, preparedFeedVideoIds]
  );
  const { data: feedVideoStates } = useQuery({
    queryKey: ['feed-video-states', user?.id ?? 'guest', visibleFeedVideoIds.join(',')],
    ...homeCacheStrategy,
    queryFn: () => api.me.getFeedVideoStates(visibleFeedVideoIds),
    enabled: !!user?.id && visibleFeedVideoIds.length > 0,
  });

  useEffect(() => {
    const _nav = /** @type {any} */ (navigator);
    if (typeof navigator === 'undefined' || typeof _nav.getBattery !== 'function') return;

    let batteryManager;
    let disposed = false;
    const handleBatteryState = () => {
      if (!batteryManager || disposed) return;
      const batteryLow = batteryManager.level <= 0.2;
      setIsBatteryConstrained(Boolean(!batteryManager.charging && batteryLow));
    };

    _nav.getBattery()
      .then((battery) => {
        if (disposed) return;
        batteryManager = battery;
        handleBatteryState();
        battery.addEventListener('levelchange', handleBatteryState);
        battery.addEventListener('chargingchange', handleBatteryState);
      })
      .catch(() => {});

    return () => {
      disposed = true;
      if (batteryManager) {
        batteryManager.removeEventListener('levelchange', handleBatteryState);
        batteryManager.removeEventListener('chargingchange', handleBatteryState);
      }
    };
  }, []);

  useEffect(() => {
    if (!user?.id) dispatch({ type: 'RESET_INTERACTIONS' });
  }, [user?.id]);

  useEffect(() => {
    if (!feedVideoStates || visibleFeedVideoIds.length === 0) return;

    const visibleIdSet = new Set(visibleFeedVideoIds.map(String));
    const likedIdSet = new Set((feedVideoStates.likedIds || []).map(String));
    const savedIdSet = new Set((feedVideoStates.savedIds || []).map(String));

    dispatch({ type: 'SYNC_LIKES', visibleIds: visibleIdSet, likedIds: likedIdSet });
    dispatch({ type: 'SYNC_SAVES', visibleIds: visibleIdSet, savedIds: savedIdSet });
  }, [feedVideoStates, visibleFeedVideoIds]);

  useEffect(() => {
    if (feedWarmAssets.length === 0) {
      setWarmingFeedIds((prev) => (prev.length === 0 ? prev : EMPTY_ITEMS));
      return;
    }
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const nextWarmingIds = feedWarmTargetIds.filter((id) => !preparedFeedVideoIds.has(id));
    setWarmingFeedIds((prev) => (sameStringArray(prev, nextWarmingIds) ? prev : nextWarmingIds));

    const postPrefetchMessage = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const worker = navigator.serviceWorker.controller || registration?.active;
        if (!worker) return;
        worker.postMessage({
          type: 'PREFETCH_FEED_ASSETS',
          assets: feedWarmAssets,
        });
      } catch {
        // Best effort: l'app continue même sans préchauffage SW.
      }
    };

    postPrefetchMessage();
  }, [feedWarmAssets, feedWarmTargetIds, preparedFeedVideoIds]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleServiceWorkerMessage = (event) => {
      const payload = event?.data;
      if (payload?.type !== 'FEED_PREFETCH_DONE' || !Array.isArray(payload.assets)) return;

      setPreparedFeedVideos((prev) => {
        const nextMap = new Map(prev.map((item) => [String(item.id), item]));
        payload.assets.forEach((asset) => {
          if (!asset?.id) return;
          nextMap.set(String(asset.id), {
            ...nextMap.get(String(asset.id)),
            ...asset,
            cachedAt: asset.cachedAt || Date.now(),
          });
        });
        const next = Array.from(nextMap.values())
          .sort((a, b) => Number(b.cachedAt || 0) - Number(a.cachedAt || 0))
          .slice(0, FEED_VIEWED_STORAGE_MAX);
        setJSON(FEED_PREPARED_STORAGE_KEY, next);
        return next;
      });
      setWarmingFeedIds((prev) => {
        const doneIds = new Set(payload.assets.map((asset) => String(asset.id)));
        return prev.filter((id) => !doneIds.has(String(id)));
      });
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  const handleInitialFeedVisualReady = useCallback((videoId) => {
    if (startupVideoId == null) return;
    if (String(videoId) !== String(startupVideoId)) return;
    setInitialFeedVisualReady(true);
    try {
      window.sessionStorage.setItem(FEED_STARTUP_CURTAIN_SESSION_KEY, '1');
    } catch {}
  }, [startupVideoId]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  // IntersectionObserver s’attache après le 1er paint : éviter ref/index désynchronisés → aucune slide « active ».
  useEffect(() => {
    if (feedLength > 0 && currentIndexRef.current !== 0) {
      currentIndexRef.current = 0;
      setCurrentIndex(0);
    }
  }, [feedLength]);

  useEffect(() => {
    dispatch({ type: 'SET_FOLLOWING_COUNT', count: followingCountMemo });
  }, [followingCountMemo]);

  // Sécurité PWA/mobile : s'assurer qu'aucune vidéo du feed ne continue à jouer
  // quand on quitte la page Home (navigation vers une autre route/écran).
  useEffect(() => {
    return () => {
      if (typeof document === 'undefined') return;
      const players = /** @type {NodeListOf<HTMLVideoElement>} */ (document.querySelectorAll('video[data-afw-feed-video="1"]'));
      players.forEach((node) => {
        try {
          node.pause();
          node.muted = true;
          node.defaultMuted = true;
          // Volume en lecture seule dans certains navigateurs, d'où le try/catch
          node.volume = 0;
        } catch (_) {}
      });
    };
  }, []);

  const isCommentOverlayOpen = showComments && !!selectedVideo?.id;
  const isShareOverlayOpen = showShare && !!selectedVideo;
  const isTipOverlayOpen = showTip && !!selectedVideo;
  const isGiftOverlayOpen = showGift && !!selectedVideo?.creator_id;
  const hideVideoHud = isCommentOverlayOpen || isShareOverlayOpen || isTipOverlayOpen || isGiftOverlayOpen;

  // Si un overlay plein écran (commentaires, partage, tip, menu, etc.) est ouvert,
  // on force la pause de toutes les vidéos derrière pour éviter le son en arrière-plan.
  useEffect(() => {
    const anyOverlayOpen = hideVideoHud || isMenuOpen;
    if (!anyOverlayOpen || typeof document === 'undefined') return;

    const players = /** @type {NodeListOf<HTMLVideoElement>} */ (document.querySelectorAll('video[data-afw-feed-video="1"]'));
    players.forEach((node) => {
      try {
        node.pause();
      } catch (_) {}
    });
  }, [hideVideoHud, isMenuOpen]);

  // Précharger la slide active + les suivantes pour que le feed paraisse déjà prêt au swipe.
  useEffect(() => {
    const list = activeTab === 'pourtoi' ? mainFeedItems : followingVideos.map((v) => ({ type: 'video', video: v }));
    const start = Math.max(0, safeCurrentIndex);
    const slice = list.slice(start, start + FEED_POSTER_PRELOAD_COUNT);
    slice.forEach((item, offset) => {
      const video = item?.video;
      if (!video) return;
      const posterUrl = isValidThumbnailUrl(video.thumbnail_url, video.video_url) ? video.thumbnail_url : VIDEO_PLACEHOLDER_IMG;
      if (!posterUrl || posterUrl.startsWith('data:')) return;
      const url = getAbsoluteImageUrl(posterUrl);
      if (url) {
        const img = new Image();
        img.decoding = 'async';
        img.fetchPriority = offset === 0 ? 'high' : 'auto';
        img.src = url;
      }
    });
  }, [safeCurrentIndex, activeTab, mainFeedItems, followingVideos]);

  // Préparer les vidéos voisines sans vider le buffer à chaque micro-navigation.
  // Le voisin immédiat prend `auto`, les suivants restent en `metadata`.
  const nextVideoPreloadRefs = useRef([]);
  useEffect(() => {
    const list = activeTab === 'pourtoi'
      ? mainFeedItems
      : followingVideos.map((v) => ({ type: 'video', video: v }));
    const nextVideos = Array.from(
      { length: FEED_VIDEO_PRELOAD_COUNT },
      (_, offset) => list[safeCurrentIndex + offset + 1]
    );

    while (nextVideoPreloadRefs.current.length < FEED_VIDEO_PRELOAD_COUNT) {
      const el = document.createElement('video');
      el.preload = 'metadata';
      el.muted = true;
      el.defaultMuted = true;
      el.playsInline = true;
      el.setAttribute('playsinline', '');
      el.setAttribute('webkit-playsinline', 'true');
      nextVideoPreloadRefs.current.push(el);
    }

    nextVideos.forEach((item, i) => {
      const url = getVideoPlaybackUrl(
        item?.video?.playback_url ||
        item?.video?.video_url ||
        item?.video?.hls_playback_url ||
        item?.video?.hls_url
      );
      const el = nextVideoPreloadRefs.current[i];
      if (!el) return;
      el.preload = i === 0 ? 'auto' : 'metadata';
      if ((el.getAttribute('src') || '') !== (url || '')) {
        el.src = url || '';
      }
    });

    for (let i = nextVideos.length; i < nextVideoPreloadRefs.current.length; i += 1) {
      const el = nextVideoPreloadRefs.current[i];
      if (el && el.getAttribute('src')) {
        el.removeAttribute('src');
      }
    }
  }, [safeCurrentIndex, activeTab, mainFeedItems, followingVideos]);

  useEffect(() => {
    return () => {
      nextVideoPreloadRefs.current.forEach((el) => {
        if (!el) return;
        try { el.pause(); } catch (_) {}
        el.removeAttribute('src');
      });
    };
  }, []);

  const likeMutation = useMutation({
    mutationFn: async (/** @type {{video: any, type?: string | null}} */ { video, type = 'like' }) => {
      if (!user) {
        return { isLiked: false, reaction: null, video: null };
      }
      const isLiked = likedVideos.has(video.id);
      try {
        if (type === null) {
          await api.videos.deleteReaction(video.id);
          return { isLiked: false, reaction: null, video };
        }
        const result = await api.videos.like(video.id, type);
        const reaction = result?.reaction ?? result?.data?.reaction ?? type;
        const newLiked = result?.liked ?? result?.data?.liked ?? true;
        return { isLiked: newLiked, reaction, video };
      } catch (/** @type {any} */ error) {
        const status = error.response?.status;
        const body = error.response?.data;
        const likedFromError = body?.data?.liked ?? body?.liked;
        if (typeof likedFromError === 'boolean') {
          return { isLiked: likedFromError, reaction: body?.data?.reaction ?? body?.reaction ?? null, video };
        }
        if (status === 401) toast.error('Connectez-vous pour aimer');
        else toast.error('Erreur lors du like');
        return { isLiked, reaction: null, video };
      }
    },
    onSuccess: (data) => {
      if (data?.video) {
        dispatch({ type: 'TOGGLE_LIKE', videoId: data.video.id, liked: data.isLiked });
        if (data.isLiked && user?.id && data.video?.creator_id) {
          try {
            NotificationService.notifyVideoLike(user.id, data.video.id, data.video.creator_id);
          } catch (_) {}
        }
      }
    }
  });

  // Empêche un changement d'index immédiat juste après un like (scroll snap parasite)
  const likeScrollLockUntilRef = useRef(0);

  const handleLike = useCallback(
    (video) => {
      if (!video) return;
      likeScrollLockUntilRef.current = Date.now() + 400;
      if (!likeMutation.isPending) {
        likeMutation.mutate({ video, type: 'like' });
      }
      impactLight().catch(() => {});
    },
    [likeMutation]
  );

  const saveMutation = useMutation({
    mutationFn: async (/** @type {any} */ video) => {
      if (!user) {
        toast.error('Connectez-vous pour sauvegarder');
        return false;
      }
      const isSaved = savedVideos.has(video.id);
      await api.saves.toggle(video.id);
      if (!isSaved) {
        toast.success('Video sauvegardee');
      }
      return !isSaved;
    },
    onSuccess: (/** @type {any} */ isNowSaved, /** @type {any} */ video) => {
      if (typeof isNowSaved === 'boolean' && video) {
        dispatch({ type: 'TOGGLE_SAVE', videoId: video.id, saved: isNowSaved });
      }
    }
  });

  // Posters courant + suivant dans `head` : le navigateur a souvent la miniature avant le 1er paint (style grandes apps).
  useEffect(() => {
    const items = activeTab === 'pourtoi' ? mainFeedItems : followingVideos;
    if (!items || items.length === 0) return;
    const links = [];
    const indices = [
      safeCurrentIndex,
      Math.min(safeCurrentIndex + 1, items.length - 1),
    ].filter((idx, i, arr) => idx >= 0 && arr.indexOf(idx) === i);

    indices.forEach((idx) => {
      const row = items[idx];
      const v = row?.video || row;
      const rawThumb = v?.thumbnail_url || v?.video_url;
      if (!rawThumb) return;
      const href = isValidThumbnailUrl(v.thumbnail_url, v.video_url)
        ? getAbsoluteImageUrl(v.thumbnail_url) || v.thumbnail_url
        : getAbsoluteImageUrl(rawThumb) || rawThumb;
      if (!href || href.startsWith('data:')) return;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = href;
      if (idx === safeCurrentIndex) link.setAttribute('fetchpriority', 'high');
      document.head.appendChild(link);
      links.push(link);
    });

    return () => {
      links.forEach((link) => {
        if (link && document.head.contains(link)) {
          document.head.removeChild(link);
        }
      });
    };
  }, [activeTab, safeCurrentIndex, mainFeedItems, followingVideos]);

  const handleToggleWonder = useCallback(async (creatorId, creatorName = '') => {
    if (!user) {
      _navigate('/');
      return;
    }
    const wasInWonder = userFollows.some((f) => f.id === creatorId);
    const result = await api.users.toggleWonder(creatorId);
    const inWonder = result?.data?.inWonder ?? result?.inWonder ?? !wasInWonder;
    queryClient.invalidateQueries({ queryKey: ['user-follows', user.id] });
    queryClient.invalidateQueries({ queryKey: ['follow-stats', creatorId] });
    if (inWonder) {
      NotificationService.notifyNewFollower(user.id, creatorId);
      toast.success('Vous etes maintenant dans son Wonder');
    } else {
      toast.success(`Vous avez quitte le Wonder de ${creatorName || 'ce createur'}`);
    }
  }, [_navigate, queryClient, user, userFollows]);

  const handleTip = async (amount, method, extra = {}) => {
    if (!user || !selectedVideo) {
      toast.error('Connectez-vous pour envoyer un tip');
      return;
    }
    try {
      if (method === 'wallet') {
        await api.videos.tipWithWallet(selectedVideo.id, { amount, message: extra.message });
        toast.success(`Tip de ${amount} FCFA envoye !`);
      } else if (method === 'orange_money' && extra.phone) {
        const result = await api.videos.tip(selectedVideo.id, {
          amount,
          phone: extra.phone,
          message: extra.message,
        });
        if (result?.paymentUrl) {
          window.location.href = result.paymentUrl;
        } else {
          toast.success('Tip initie. Validez sur Orange Money.');
        }
      } else if (['wave', 'mtn_money'].includes(method)) {
        toast.info('Cette methode de paiement sera disponible prochainement.');
      } else {
        toast.error('Selectionnez Mon Wallet ou Orange Money avec un numero.');
      }
    } catch (/** @type {any} */ err) {
      toast.error(err?.apiMessage || 'Erreur lors de l\'envoi du tip');
      throw err;
    }
  };

  const incrementVideoShares = useCallback((video) => {
    if (!video || String(video.id) !== String(selectedVideo?.id)) return video;
    return {
      ...video,
      shares: (video.shares || 0) + 1,
    };
  }, [selectedVideo?.id]);

  const incrementFeedItemShares = useCallback((item) => {
    if (!item?.video) return item;
    const nextVideo = incrementVideoShares(item.video);
    return nextVideo === item.video ? item : { ...item, video: nextVideo };
  }, [incrementVideoShares]);

  const showHomeLoading = isLoading && feedLength === 0;
  const showInitialFeedCurtain = showHomeLoading || (feedLength > 0 && !initialFeedVisualReady);

  useEffect(() => {
    if (!startupVideoId) {
      setInitialFeedVisualReady(false);
      return;
    }
    if (typeof window !== 'undefined') {
      try {
        if (window.sessionStorage.getItem(FEED_STARTUP_CURTAIN_SESSION_KEY) === '1') {
          setInitialFeedVisualReady(true);
          return;
        }
      } catch {}
    }
    setInitialFeedVisualReady(false);
  }, [activeTab, startupVideoId]);

  useEffect(() => {
    if (!startupVideoId || showHomeLoading || initialFeedVisualReady) return;
    const timeoutMs = isSlowConnection ? 4500 : 2800;
    const timerId = window.setTimeout(() => {
      setInitialFeedVisualReady(true);
      try {
        window.sessionStorage.setItem(FEED_STARTUP_CURTAIN_SESSION_KEY, '1');
      } catch {}
    }, timeoutMs);
    return () => window.clearTimeout(timerId);
  }, [startupVideoId, activeTab, initialFeedVisualReady, isSlowConnection, showHomeLoading]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || feedLength === 0) return;
    if (container.scrollTop > 1) return;
    container.scrollTop = 0;
    if (currentIndexRef.current !== 0 || currentIndex !== 0) {
      currentIndexRef.current = 0;
      setCurrentIndex(0);
    }
  }, [feedLength, currentIndex, activeTab]);

  useEffect(() => {
    if (selectedVideo?.id) return;
    setActiveModal(null);
  }, [selectedVideo?.id]);

  // Mise à jour de l'index actif en fonction du scroll (style TikTok)
  // Hauteur = vraie hauteur des slides (100dvh) + offset du bandeau pull, pas clientHeight seul (Firefox).
  const updateIndexFromScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || feedLength === 0) return;
    const firstSlide = /** @type {HTMLElement | null} */ (container.querySelector('[data-index="0"]'));
    if (!firstSlide) return;
    const h = firstSlide.offsetHeight;
    if (h <= 0) return;
    const start = firstSlide.offsetTop;
    const scrollTop = container.scrollTop;
    const rawIndex = Math.round((scrollTop - start) / h);
    const index = Math.max(0, Math.min(rawIndex, feedLength - 1));

    // Verrou après un like (temps + requête en cours) pour éviter un saut de carte parasite
    if (likeMutation.isPending || Date.now() < likeScrollLockUntilRef.current) return;

    if (index !== currentIndexRef.current) {
      currentIndexRef.current = index;
      setCurrentIndex(index);
    }
  }, [feedLength, likeMutation.isPending]);

  const scheduleIndexSyncFromScroll = useCallback(() => {
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = 0;
      updateIndexFromScroll();
    });
  }, [updateIndexFromScroll]);

  const handleScroll = useCallback(() => {
    scheduleIndexSyncFromScroll();
  }, [scheduleIndexSyncFromScroll]);
  const hideVideoActions = hideVideoHud || shouldUseOfflinePreparedFeed;

  // IntersectionObserver type TikTok : index actif quand une slide est visible à 60%
  useEffect(() => {
    const container = containerRef.current;
    if (!container || feedLength === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (likeMutation.isPending || Date.now() < likeScrollLockUntilRef.current) return;
        let best = null;
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.6) return;
          const index = Number(/** @type {HTMLElement} */ (entry.target).dataset.index);
          if (!Number.isFinite(index)) return;
          if (best === null || entry.intersectionRatio > best.ratio) {
            best = { index, ratio: entry.intersectionRatio };
          }
        });
        if (best != null) {
          const safeBest = /** @type {{ index: number, ratio: number }} */ (best);
          if (safeBest.index !== currentIndexRef.current) {
            currentIndexRef.current = safeBest.index;
            setCurrentIndex(safeBest.index);
          }
        }
      },
      { threshold: 0.6, root: container, rootMargin: '0px' }
    );
    observerRef.current = observer;
    const slides = container.querySelectorAll('[data-index]');
    slides.forEach((el) => observer.observe(el));
    // Après observe(), Firefox peut ne pas émettre tout de suite : aligner l’index sur scrollTop (slide 0).
    const rafId = requestAnimationFrame(() => {
      scheduleIndexSyncFromScroll();
    });
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      observerRef.current = null;
    };
  }, [feedLength, activeTab, likeMutation.isPending, scheduleIndexSyncFromScroll]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  return (
    <div
      className="w-full min-h-0 overflow-hidden bg-[#050816]"
      style={{
        height: '100dvh',
        minHeight: 'calc(var(--app-vh, 1vh) * 100)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Garde-fou fullscreen : largeur pilotée par le viewport + colonne centrée.
          Ne pas revenir à une largeur dépendante d'un parent flex ambigu, sinon Firefox/WebView
          peut réduire la slide et donner l'impression d'un player "noir". */}
      <div
        className="relative mx-auto flex h-full min-h-0 flex-col bg-[#050816]"
        style={{
          width: FEED_FULLSCREEN_WIDTH,
          minWidth: FEED_FULLSCREEN_WIDTH,
          maxWidth: `${FEED_FULLSCREEN_MAX_WIDTH_PX}px`,
        }}
      >
        <button
          type="button"
          onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className={cn(
            // Logo seul, sans cadre type « pilule » (premium / type TikTok)
            'absolute left-3 top-3 z-50 flex h-11 w-11 items-center justify-center rounded-full border-0 bg-transparent p-0 shadow-none backdrop-blur-none pointer-events-auto transition-all duration-300 active:scale-[0.96]',
            hideVideoHud ? 'opacity-0 pointer-events-none' : 'opacity-100'
          )}
          aria-label="Revenir en haut du fil"
        >
          <AfriWonderLogo size="xs" className="drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]" />
        </button>

        {SHOW_FEED_OFFLINE_BADGES && preparedFeedVideos.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveModal('offline')}
            className={cn(
              'absolute right-3 top-3 z-50 inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/35 px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-300 active:scale-[0.98]',
              hideVideoHud ? 'pointer-events-none opacity-0' : 'opacity-100'
            )}
            aria-label="Voir les videos preparees hors connexion"
          >
            {isOnline ? <Download className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
            <span>
              {currentPreparedWarmCount > 0
                ? `${currentPreparedWarmCount}/${Math.max(feedWarmTargetIds.length, currentPreparedWarmCount)} prêtes`
                : `${preparedFeedVideos.length} prêtes`}
            </span>
          </button>
        )}

        <div
          className={cn(
            'absolute inset-x-0 top-0 z-40 pointer-events-none transition-opacity duration-200 [&>*]:pointer-events-auto',
            hideVideoHud ? 'opacity-0' : 'opacity-100'
          )}
        >
          <TopHeader 
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showTabs={true}
            showMenuButton={true}
            onMenuOpen={openMenu}
            followingCount={followingCount}
            fixed={false}
            feedMode={true}
            title={undefined}
            onToggleDarkMode={undefined}
          />
        </div>

        {activeTab === 'abonnements' && followingCount > 0 && !hideVideoHud && (
          <FeedFollowingStrip
            creators={activeFollowingUsers.slice(0, 12)}
            countLabel={`${followingCountMemo} createurs suivis`}
            getAvatarInitials={getAvatarInitials}
            onCreatorClick={(creatorId) => _navigate(`/Profile?_userId=${creatorId}`)}
            onSeeAll={() => setActiveModal('wonderers')}
          />
        )}

        {!shouldUseOfflinePreparedFeed && activeTab === 'pourtoi' && topBannerItems.length > 0 && safeCurrentIndex === 0 && !hideVideoHud && (
          <FeedTopBannerRail
            items={topBannerItems}
            hideActions={hideVideoHud}
            onHide={handleHideAd}
          />
        )}

        <AnimatePresence>
          {showInitialFeedCurtain && (
            <motion.div
              key="afw-feed-launch-curtain"
              className="absolute inset-0 z-[120]"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <FeedStartupCurtain />
            </motion.div>
          )}
        </AnimatePresence>


        <div
          ref={containerRef}
          onScroll={handleScroll}
          onTouchStart={(e) => {
            if (e.touches.length > 0) handlePullStart(e.touches[0].clientY);
          }}
          onTouchMove={(e) => {
            if (e.touches.length > 0) {
              handlePullMove(e.touches[0].clientY);
              if ((containerRef.current?.scrollTop ?? 0) <= 5 && pullDistanceRef.current > 0) {
                e.preventDefault();
              }
            }
          }}
          onTouchEnd={() => handlePullEnd()}
          onTouchCancel={() => handlePullEnd()}
          className="afw-home-feed-scroll relative min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden snap-y snap-mandatory"
          style={{
            // Garde-fou Firefox/WebView : conserver le feed en flux normal avec une hauteur explicite.
            // Ne pas remettre `absolute inset-0` ici, sinon la géométrie de la slide peut se casser.
            // Pas de minHeight 100dvh : sur iOS ça dépasse la zone utile (safe areas) et masque la BottomNav.
            scrollSnapType: 'y mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'auto',
            touchAction: 'pan-y',
            backgroundColor: 'rgb(3 7 18)',
            zIndex: 1,
            // isolate + <video> en calque GPU peut donner son OK / image noire (Firefox, Chrome Android, WebView).
            isolation: 'auto',
          }}
        >
        <FeedPullToRefresh
          isRefreshing={isRefreshing}
          pullDistance={pullDistance}
          threshold={PULL_THRESHOLD}
        />
        {shouldUseOfflinePreparedFeed && (
          <div className="sticky top-0 z-20 flex justify-center px-3 pt-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-500/12 px-3 py-2 text-xs font-semibold text-emerald-50 shadow-[0_10px_30px_rgba(16,185,129,0.12)] backdrop-blur-md">
              <CloudOff className="h-4 w-4" />
              <span>Mode hors connexion: lecture des vidéos déjà préparées</span>
            </div>
          </div>
        )}
        {activeTab === 'abonnements' && followingVideos.length === 0 && isLoading ? (
          <FeedVideoSkeleton count={3} />
        ) : activeTab === 'abonnements' && followingVideos.length === 0 ? (
          <FeedEmptyState
            icon={Users}
            title="Aucune video de vos abonnements"
            description="Suivez des createurs pour construire un feed plus pertinent et retrouver leurs nouvelles videos ici."
            actionLabel={!user ? "S'inscrire pour commencer" : undefined}
            onAction={!user ? () => _navigate('/Landing') : undefined}
          />
        ) : activeTab === 'pourtoi' && !shouldUseOfflinePreparedFeed && mainFeedItems.length === 0 && isLoading ? (
          <FeedVideoSkeleton count={3} />
        ) : activeTab === 'pourtoi' && !shouldUseOfflinePreparedFeed && mainFeedItems.length === 0 ? (
          <FeedEmptyState
            icon={feedError ? WifiOff : Sparkles}
            title={feedError ? 'Connexion au serveur impossible' : "Aucune video pour l'instant"}
            description={
              feedError
                ? 'Verifie ta connexion puis reessaie. Le feed restera en attente tant que le serveur ne repond pas.'
                : 'Le feed est pret pour du nouveau contenu. Publie une premiere video pour lancer la dynamique.'
            }
            actionLabel={
              feedError
                ? 'Reessayer'
                : !user
                ? "S'inscrire pour commencer"
                : 'Creer votre premiere video'
            }
            onAction={
              feedError
                ? () => refetchFeed()
                : !user
                ? () => _navigate('/Landing')
                : () => _navigate('/Create')
            }
          />
        ) : (
          <>
            {feedSlides.map((slide, index) => (
              <FeedVideoSlide
                key={slide.id}
                index={index}
                safeCurrentIndex={safeCurrentIndex}
                hideVideoHud={hideVideoHud}
                hideVideoActions={hideVideoActions}
                slide={slide}
                offlineReady={preparedFeedVideoIds.has(String(slide.id))}
                showOfflineBadge={SHOW_FEED_OFFLINE_BADGES}
                isMuted={isMuted}
                isLiked={likedVideos.has(slide.video.id)}
                isSaved={savedVideos.has(slide.video.id)}
                currentUser={user}
                isFollowing={userFollows.some((followedUser) => followedUser.id === slide.video.creator_id)}
                setMuted={setMuted}
                onLike={handleLike}
                onComment={() => {
                  setSelectedVideo(slide.video);
                  setActiveModal('comments');
                }}
                onShare={() => {
                  setSelectedVideo(slide.video);
                  setActiveModal('share');
                }}
                onSave={() => saveMutation.mutate(slide.video)}
                onTip={() => {
                  setSelectedVideo(slide.video);
                  setActiveModal('tip');
                }}
                onSubscribe={() => handleToggleWonder(slide.video.creator_id, slide.video.creator_name)}
                onProfileClick={(creatorId) => {
                  _navigate(`/Profile?_userId=${creatorId}`);
                }}
                onRequireAuth={() => toast.error('Connectez-vous pour aimer')}
                onInitialVisualReady={handleInitialFeedVisualReady}
              />
            ))}
          </>
        )}
        </div>

        {showOfflineReadyPanel && (
          <div className="fixed inset-0 z-[112] bg-black/92 backdrop-blur-md p-4 pt-20 overflow-y-auto pointer-events-auto isolate">
            <div className="relative z-10 bg-[#0f172a] border border-white/10 rounded-2xl p-4 shadow-2xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-white font-bold text-base">Préparé pour toi</h3>
                  <p className="text-white/60 text-sm">
                    {isOnline
                      ? 'Ces vidéos sont déjà prêtes pour une lecture plus rapide.'
                      : 'Tu peux relire ces vidéos même sans réseau si leur média a été préparé.'}
                  </p>
                  <p className="mt-1 text-[11px] text-white/45">
                    {warmingFeedIds.length > 0
                      ? `Préparation en cours: ${currentPreparedWarmCount}/${Math.max(feedWarmTargetIds.length, currentPreparedWarmCount + warmingFeedIds.length)}`
                      : shouldConserveOfflineData
                        ? 'Mode économie: préparation limitée pour préserver la batterie et la data.'
                        : 'Préparation active des vidéos les plus probables à regarder ensuite.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="text-white/70 hover:text-white text-sm"
                  aria-label="Fermer les videos preparees hors connexion"
                >
                  Fermer
                </button>
              </div>

              <div className="space-y-3">
                {preparedFeedVideos.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const targetIndex = feedSlides.findIndex((slide) => String(slide.id) === String(item.id));
                      if (targetIndex >= 0) {
                        const container = containerRef.current;
                        const firstSlide = /** @type {HTMLElement | null | undefined} */ (container?.querySelector('[data-index="0"]'));
                        const slideHeight = firstSlide?.offsetHeight || window.innerHeight;
                        container?.scrollTo({ top: slideHeight * targetIndex, behavior: 'smooth' });
                        setActiveModal(null);
                      }
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-left transition-colors hover:bg-white/[0.07]"
                  >
                    <div className="h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-white/10">
                      {item.posterUrl ? (
                        <img src={item.posterUrl} alt={item.title || 'Video preparee'} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/50">
                          <Download className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {item.title || 'Vidéo prête hors connexion'}
                      </p>
                      <p className="truncate text-xs text-white/60">
                        {item.creatorName || 'AfriWonder'}
                      </p>
                    </div>
                    <div className="rounded-full border border-emerald-300/20 bg-emerald-500/12 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                      Hors connexion
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showWonderersPanel && (
          <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-md p-4 pt-20 overflow-y-auto pointer-events-auto isolate">
            <div className="relative z-10 bg-[#111827] border border-white/10 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-base">Tout ton Wonder</h3>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="text-white/70 hover:text-white text-sm"
                  aria-label="Fermer la liste de ton Wonder"
                >
                  Fermer
                </button>
              </div>

              <div className="space-y-2 mb-5">
                {activeFollowingUsers.map((creator) => (
                  <div key={creator.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
                    <Avatar className="w-11 h-11">
                      <AvatarImage src={creator.profile_image} alt={creator.full_name || creator.username || 'creator'} />
                      <AvatarFallback className="bg-white/20 text-white text-sm font-semibold">
                        {getAvatarInitials(creator)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{creator.full_name || creator.username || 'Utilisateur'}</p>
                      <p className="text-white/60 text-xs truncate">@{creator.username || 'afriwonder'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleWonder(creator.id, creator.full_name || creator.username)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-full bg-white/15 text-white hover:bg-white/25"
                    >
                      Suivi
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-white/80 text-sm font-semibold mb-2">Comptes suggeres</p>
                <div className="space-y-2">
                  {visibleSuggestedWonderers.map((candidate) => (
                    <div key={candidate.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
                      <Avatar className="w-11 h-11">
                        <AvatarImage src={candidate.profile_image} alt={candidate.full_name || candidate.username || 'candidate'} />
                        <AvatarFallback className="bg-white/20 text-white text-sm font-semibold">
                          {getAvatarInitials(candidate)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold truncate">{candidate.full_name || candidate.username || 'Utilisateur'}</p>
                        <p className="text-white/60 text-xs truncate">@{candidate.username || candidate.email?.split('@')[0] || 'afriwonder'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleWonder(candidate.id, candidate.full_name || candidate.username)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                      >
                        Wonder
                      </button>
                    </div>
                  ))}
                  {visibleSuggestedWonderers.length === 0 && (
                    <p className="text-white/50 text-sm">Pas de suggestion pour le moment.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <BottomNav fixed={false} feedMode />
      </div>

      <CommentSheet
        isOpen={isCommentOverlayOpen}
        onClose={() => setActiveModal(null)}
        videoId={selectedVideo?.id}
        comments={comments}
        isLoading={commentsLoading}
        isError={commentsError}
        onRetry={() => refetchComments()}
        onTip={() => {
          setActiveModal(null);
          setActiveModal('tip');
        }}
        user={user}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['comments', selectedVideo?.id] })}
      />

      <TipModal
        isOpen={isTipOverlayOpen}
        onClose={() => setActiveModal(null)}
        creator={{
          name: selectedVideo?.creator_name,
          avatar: selectedVideo?.creator_avatar
        }}
        onSendTip={handleTip}
        walletBalance={walletBalance}
      />

      <ShareSheet
        isOpen={isShareOverlayOpen}
        onClose={() => setActiveModal(null)}
        video={selectedVideo}
        onShareSuccess={async () => {
          if (selectedVideo) {
            try {
              await api.videos.share(selectedVideo.id);
              queryClient.setQueryData(['videos', user?.id ?? 'guest'], (oldData) => {
                if (!Array.isArray(oldData)) return oldData;
                return oldData.map(incrementVideoShares);
              });
              queryClient.setQueryData(['feed', user?.id ?? 'guest'], (oldData) => {
                if (!Array.isArray(oldData)) return oldData;
                return oldData.map(incrementFeedItemShares);
              });
            } catch (_err) {}
          }
        }}
      />

      <GiftPurchaseModal
        isOpen={isGiftOverlayOpen}
        onClose={() => setActiveModal(null)}
        receiverId={selectedVideo?.creator_id}
        liveId={null}
      />

      <style>{`
        /* Ne pas toucher overflow sur html/body ici : sous Firefox ça peut masquer tout le contenu du #root. */
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .afw-home-feed-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .afw-home-feed-scroll::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }
      `}</style>
    </div>
  );
}
