// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import VideoCard from '../components/video/VideoCard';
import AdCard from '../components/video/AdCard';
import AdBannerCard from '../components/video/AdBannerCard';
import CommentSheet from '../components/video/CommentSheet';
import TipModal from '../components/video/TipModal';
import ShareSheet from '../components/video/ShareSheet';
import GiftPurchaseModal from '../components/live/GiftPurchaseModal';
import TopHeader from '../components/navigation/TopHeader';
import BottomNav from '../components/navigation/BottomNav';
import AfriWonderLogo from '../components/common/AfriWonderLogo';
import { useAppMenu } from '@/contexts/AppMenuContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import NotificationService from '../components/notifications/NotificationService';
import { Loader2, ChevronRight } from 'lucide-react';
import { toast } from "sonner";
import { useNetworkStatus, getCacheStrategy, scheduleTask } from '../components/common/PerformanceOptimizer';
import { cn } from "@/lib/utils";
import { getVideoPlaybackUrl, isDeletedUser } from '@/lib/utils';
import { getJSON, setJSON } from '@/utils/safeStorage';
import { useWakeLock } from '@/hooks/useWakeLock';

export default function Home() {
  const _navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pourtoi');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const { isOpen: isMenuOpen, openMenu } = useAppMenu();
  const { isMuted, setMuted } = usePreferences();
  
  useWakeLock(true);
  
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [user, setUser] = useState(null);
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [savedVideos, setSavedVideos] = useState(new Set());
  const [followingCount, setFollowingCount] = useState(0);

  const [followingVideos, setFollowingVideos] = useState([]);
  const [showWonderersPanel, setShowWonderersPanel] = useState(false);
  const [firstVideoPreloaded, setFirstVideoPreloaded] = useState(false);

  const containerRef = useRef(null);
  const queryClient = useQueryClient();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartYRef = useRef(0);
  const pullDistanceRef = useRef(0);
  const scrollEndTimeoutRef = useRef(null);
  const feedLengthRef = useRef(0);
  const isSnappingRef = useRef(false);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    api.auth.me().then((u) => { if (!cancelled) setUser(u); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const { isSlowConnection } = useNetworkStatus();
  const cacheStrategy = getCacheStrategy(isSlowConnection);
  const homeCacheStrategy = {
    ...cacheStrategy,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  };

  const { data: earlyAccessConfig } = useQuery({
    queryKey: ['early-access-config'],
    queryFn: () => api.earlyAccess.getConfig(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: feedData, isLoading: feedLoading, refetch: refetchFeed } = useQuery({
    queryKey: ['feed', user?.id],
    ...homeCacheStrategy,
    queryFn: async () => {
      const result = await api.feed.list({ page: 1, limit: 25 });
      return result?.items ?? [];
    },
    enabled: activeTab === 'pourtoi',
  });

  const { data: videos = [], isLoading: videosLoading, refetch: refetchVideos } = useQuery({
    queryKey: ['videos', user?.id],
    ...homeCacheStrategy,
    queryFn: async () => {
      const result = await api.videos.list({ page: 1, limit: 25 });
      return result.videos || [];
    },
    enabled: activeTab === 'abonnements',
  });

  const [hiddenAdIds, setHiddenAdIds] = useState(() => {
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

  const feedItemsRaw = feedData || [];
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
    () => feedItems.filter((i) => i.type !== 'top_banner'),
    [feedItems]
  );
  const isLoading = activeTab === 'pourtoi' ? feedLoading : videosLoading;
  const refetch = activeTab === 'pourtoi' ? refetchFeed : refetchVideos;

  useEffect(() => {
    if (activeTab !== 'pourtoi') {
      setFirstVideoPreloaded(true);
      return;
    }
    const firstVideoItem = mainFeedItems.find((i) => i.type === 'video');
    const firstVideo = firstVideoItem?.video;
    if (!firstVideo?.video_url) {
      setFirstVideoPreloaded(true);
      return;
    }
    const url = getVideoPlaybackUrl(firstVideo.video_url);
    if (!url) {
      setFirstVideoPreloaded(true);
      return;
    }
    setFirstVideoPreloaded(false);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.removeAttribute('src');
      video.load();
      setFirstVideoPreloaded(true);
    };
    const PRELOAD_TIMEOUT_MS = 10000;
    const t = setTimeout(finish, PRELOAD_TIMEOUT_MS);
    video.addEventListener('loadeddata', finish, { once: true });
    video.addEventListener('error', finish, { once: true });
    video.src = url;
    video.load();
    return () => {
      clearTimeout(t);
      video.removeEventListener('loadeddata', finish);
      video.removeEventListener('error', finish);
      video.removeAttribute('src');
      video.load();
    };
  }, [activeTab, mainFeedItems]);

  // Plus de refetch automatique ici : on se repose sur la stratégie de cache React Query

  const handleRefreshHome = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['feed'] });
    queryClient.invalidateQueries({ queryKey: ['videos'] });
    refetchFeed().catch(() => {});
    refetchVideos().catch(() => {});
  }, [queryClient, refetchFeed, refetchVideos]);

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
      Promise.all([refetchFeed(), refetchVideos()])
        .catch(() => {})
        .finally(() => setIsRefreshing(false));
    } else {
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }
    touchStartYRef.current = 0;
  }, [refetchFeed, refetchVideos]);

  useEffect(() => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    }
  }, [user?.profile_image, queryClient, user?.id]);

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', selectedVideo?.id],
    ...homeCacheStrategy,
    queryFn: async () => {
      if (!selectedVideo?.id) return [];
      const result = await api.videos.getComments(selectedVideo.id, { page: 1, limit: 50 });
      return result.comments || [];
    },
    enabled: !!selectedVideo?.id && showComments,
  });

  const { data: walletData } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: () => api.payments.getWallet(),
    enabled: !!user?.id && showTip,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const walletBalance = walletData?.available_balance ?? walletData?.balance ?? 0;

   const { data: userFollows = [] } = useQuery({
     queryKey: ['user-follows', user?.id],
     ...cacheStrategy,
     queryFn: async () => {
       const result = await api.users.getFollowing(user.id);
       return result.following || [];
     },
     enabled: !!user?.id
   });

   const { data: suggestedWonderers = [] } = useQuery({
     queryKey: ['wonder-suggestions', user?.id, userFollows.length],
     queryFn: async () => {
       const result = await api.users.list({ page: 1, limit: 40 });
       const followedSet = new Set(userFollows.map((f) => f.id));
       return result
         .filter((u) => u.id !== user?.id && !followedSet.has(u.id) && !isDeletedUser(u))
         .slice(0, 18);
     },
     enabled: !!user?.id,
   });

   useEffect(() => {
     if (user?.id) {
       scheduleTask(async () => {
         try {
           const savesResult = await api.saves.list();
           setSavedVideos(new Set((savesResult.videos || []).map(v => v.id)));
         } catch (_e) {}
       });
       
       scheduleTask(async () => {
         try {
           const likedVideosResult = await api.users.getLikedVideos(user.id, { limit: 0 });
           const likedVideoIds = Array.isArray(likedVideosResult) 
             ? likedVideosResult.map(v => v.id)
             : (likedVideosResult?.videos || []).map(v => v.id);
           setLikedVideos(new Set(likedVideoIds));
         } catch (_e) {
           console.error('Error loading liked videos:', _e);
         }
       });
     }
   }, [user?.id]);

  const followingIds = useMemo(
    () => userFollows.filter((f) => !isDeletedUser(f)).map((f) => f.id),
    [userFollows]
  );

  const videoIdsString = useMemo(() => 
    videos.map(v => `${v.id}:${v.creator_id}`).sort().join(','), 
    [videos]
  );

  useEffect(() => {
    setFollowingCount(userFollows.filter((f) => !isDeletedUser(f)).length);
    const filtered = videos.filter((v) => followingIds.includes(v.creator_id));
    setFollowingVideos(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userFollows.length, followingIds.length, videoIdsString]);

  const likeMutation = useMutation({
    mutationFn: async (video) => {
      if (!user) {
        toast.error('Connectez-vous pour aimer');
        return { isLiked: false, video: null };
      }
      
      const isLiked = likedVideos.has(video.id);
      
      try {
        const result = await api.videos.like(video.id);
        const newLikedState = result?.liked ?? !isLiked;
        if (!isLiked && newLikedState) {
          NotificationService.notifyVideoLike(user.id, video.id, video.creator_id);
        }
        
        return { 
          isLiked: newLikedState, 
          video 
        };
      } catch (error) {
        console.error('Error toggling like:', error);
        toast.error('Erreur lors du like');
        return { isLiked, video };
      }
    },
    onSuccess: (data) => {
      if (data?.video) {
        setLikedVideos(prev => {
          const next = new Set(prev);
          if (data.isLiked) {
            next.add(data.video.id);
          } else {
            next.delete(data.video.id);
          }
          return next;
        });
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
        likeMutation.mutate(video);
      }
    },
    [likeMutation]
  );

  const saveMutation = useMutation({
    mutationFn: async (video) => {
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
    onSuccess: (isNowSaved, video) => {
      if (typeof isNowSaved === 'boolean' && video) {
        setSavedVideos(prev => {
          const next = new Set(prev);
          if (isNowSaved) next.add(video.id);
          else next.delete(video.id);
          return next;
        });
      }
    }
  });

  const commentMutation = useMutation({
    mutationFn: async ({ content, parentId }) => {
      if (!user || !selectedVideo) {
        toast.error('Connectez-vous pour commenter');
        return;
      }
      await api.videos.comment(selectedVideo.id, content, parentId);
      
      NotificationService.notifyVideoComment(user.id, selectedVideo.id, selectedVideo.creator_id, content);
      
      const mentions = NotificationService.extractMentions(content);
      if (mentions.length > 0) {
        const mentionedUserIds = await NotificationService.getUserIdsFromMentions(mentions);
        mentionedUserIds.forEach(mentionedId => {
          NotificationService.notifyMention(user.id, mentionedId, content, 'comment', selectedVideo.id);
        });
      }
    },
    onSuccess: () => {
      if (selectedVideo) {
        queryClient.setQueryData(['videos', activeTab, user?.id], (oldData) => {
          if (!oldData) return oldData;
          return oldData.map(v => {
            if (v.id === selectedVideo.id) {
              return {
                ...v,
                comments_count: (v.comments_count || 0) + 1
              };
            }
            return v;
          });
        });
        
        setFollowingVideos(prev => prev.map(v => {
          if (v.id === selectedVideo.id) {
            return {
              ...v,
              comments_count: (v.comments_count || 0) + 1
            };
          }
          return v;
        }));
      }
      
      queryClient.invalidateQueries({ queryKey: ['comments', selectedVideo?.id] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success('Commentaire ajoute');
    }
  });






  const preloadLinksRef = useRef([]);
  const preloadVideos = useCallback((items, index) => {
    if (!items || !Array.isArray(items)) return;
    const toPreload = [items[index + 1], items[index + 2]].filter(Boolean);
    toPreload.forEach((item) => {
      if (item?.type !== 'video' || !item?.video?.video_url) return;
      const url = getVideoPlaybackUrl(item.video.video_url);
      if (!url) return;
      if (preloadLinksRef.current.some((l) => l.href === url)) return;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'video';
      link.href = url;
      document.head.appendChild(link);
      preloadLinksRef.current.push(link);
    });
    while (preloadLinksRef.current.length > 6) {
      const old = preloadLinksRef.current.shift();
      if (old?.parentNode) old.parentNode.removeChild(old);
    }
  }, []);

  const feedLength = activeTab === 'pourtoi' ? mainFeedItems.length : followingVideos.length;
  useEffect(() => {
    feedLengthRef.current = feedLength;
  }, [feedLength]);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    const items = activeTab === 'pourtoi' ? mainFeedItems : followingVideos.map((v) => ({ type: 'video', video: v }));
    preloadVideos(items, currentIndex);
  }, [currentIndex, activeTab, mainFeedItems, followingVideos, preloadVideos]);

  // Snap une seule vidéo à la fois : au plus une vidéo en avant ou en arrière (évite le retour à la précédente sur mobile)
  const snapToNearestSlide = useCallback(() => {
    if (isSnappingRef.current) return;
    const container = containerRef.current;
    if (!container || feedLengthRef.current <= 0) return;
    if (Date.now() < likeScrollLockUntilRef.current) return;
    const pullEl = container.firstElementChild;
    const pullHeight = pullEl ? pullEl.offsetHeight : 0;
    const slideHeight = container.clientHeight;
    if (slideHeight <= 0) return;
    const scrollTop = container.scrollTop;
    const current = currentIndexRef.current;
    const currentTop = pullHeight + current * slideHeight;
    const threshold = slideHeight * 0.25;
    // Ne jamais sauter plus d'une vidéo : soit rester, soit +1, soit -1 selon la position
    let targetIndex = current;
    if (scrollTop >= currentTop + slideHeight - threshold) targetIndex = Math.min(current + 1, feedLengthRef.current - 1);
    else if (scrollTop <= currentTop - threshold) targetIndex = Math.max(current - 1, 0);
    const targetTop = pullHeight + targetIndex * slideHeight;
    if (Math.abs(container.scrollTop - targetTop) > 2) {
      isSnappingRef.current = true;
      container.scrollTo({ top: targetTop, behavior: 'smooth' });
      setTimeout(() => { isSnappingRef.current = false; }, 400);
    }
  }, []);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (Date.now() < likeScrollLockUntilRef.current) return;

    const pullEl = container.firstElementChild;
    const pullHeight = pullEl ? pullEl.offsetHeight : 0;
    const slideHeight = container.clientHeight;
    const index = slideHeight > 0 ? Math.round((container.scrollTop - pullHeight) / slideHeight) : 0;

    if (index !== currentIndex) {
      setCurrentIndex(index);
      const items = activeTab === 'pourtoi' ? mainFeedItems : followingVideos.map((v) => ({ type: 'video', video: v }));
      preloadVideos(items, index);
    }

    if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current);
    // Mobile: délai plus long pour laisser le momentum finir avant de snap (évite double mouvement)
    const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || 'ontouchstart' in window);
    scrollEndTimeoutRef.current = setTimeout(snapToNearestSlide, isMobile ? 200 : 120);
  }, [currentIndex, activeTab, mainFeedItems, followingVideos, preloadVideos, snapToNearestSlide]);

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
    } catch (err) {
      toast.error(err?.apiMessage || 'Erreur lors de l\'envoi du tip');
      throw err;
    }
  };

  const waitingFirstVideo =
    activeTab === 'pourtoi' &&
    mainFeedItems.length > 0 &&
    mainFeedItems.some((i) => i.type === 'video') &&
    !firstVideoPreloaded;
  const showHomeLoading = isLoading || waitingFirstVideo;
  if (showHomeLoading) {
    return (
      <div
        className="w-full bg-black flex justify-center text-white"
        style={{
          height: '100dvh',
          minHeight: 'calc(var(--app-vh, 1vh) * 100)',
        }}
        aria-busy="true"
        aria-label="Chargement du fil"
      >
        <div className="w-full sm:max-w-[400px] h-full relative flex flex-col" role="status">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="h-6 w-24 rounded-full bg-white/10 animate-pulse" />
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-white/10 animate-pulse" />
              <div className="h-9 w-9 rounded-full bg-white/10 animate-pulse" />
              <div className="h-9 w-9 rounded-full bg-white/10 animate-pulse" />
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
            <div className="w-full max-w-xs aspect-[9/16] rounded-3xl bg-white/5 overflow-hidden animate-pulse" />
            <div className="space-y-3 w-full max-w-xs">
              <div className="h-4 w-32 rounded-full bg-white/10 animate-pulse" />
              <div className="h-3 w-full rounded-full bg-white/10 animate-pulse" />
              <div className="h-3 w-4/5 rounded-full bg-white/10 animate-pulse" />
            </div>
            <Loader2 className="w-8 h-8 text-primary animate-spin" aria-hidden />
          </div>
          <div className="h-[80px] border-t border-white/10 bg-black/80" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full bg-black overflow-hidden flex justify-center"
      style={{
        height: '100dvh',
        minHeight: 'calc(var(--app-vh, 1vh) * 100)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="w-full sm:max-w-[400px] h-full relative flex flex-col bg-black">
        <button
          onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className={cn(
            "absolute top-4 left-4 z-50 pointer-events-auto group transition-opacity duration-300",
            (showComments || showShare || showTip || showGift || isMenuOpen) ? "opacity-0 pointer-events-none" : "opacity-100"
          )}
        >
          <AfriWonderLogo size="sm" className="shadow-lg group-hover:shadow-xl transition-shadow" />
        </button>

        <div className="relative z-40 pl-28 sm:pl-32">
          <TopHeader 
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showTabs={true}
            showMenuButton={true}
            onMenuOpen={openMenu}
            followingCount={followingCount}
            title={undefined}
            onToggleDarkMode={undefined}
          />
        </div>

        {activeTab === 'abonnements' && followingCount > 0 && (
          <div className="absolute top-16 left-0 right-0 z-40 px-3 pt-2 pointer-events-auto">
            <div className="rounded-2xl border border-white/15 bg-black/35 backdrop-blur-md px-3 py-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-white/90">Ton Wonder ({followingCount})</p>
                <button
                  type="button"
                  onClick={() => setShowWonderersPanel(true)}
                  className="text-xs text-white/80 hover:text-white flex items-center gap-1"
                >
                  Tout voir
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {userFollows.filter((u) => !isDeletedUser(u)).slice(0, 12).map((creator) => (
                  <button
                    key={creator.id}
                    type="button"
                    onClick={() => _navigate(`/Profile?_userId=${creator.id}`)}
                    className="shrink-0"
                    title={creator.full_name || creator.username}
                  >
                    <img
                      src={creator.profile_image || '/icon-192.png'}
                      alt={creator.full_name || creator.username || 'wonderer'}
                      className="w-10 h-10 rounded-full object-cover border border-white/30"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pourtoi' && topBannerItems.length > 0 && currentIndex === 0 && (
          <div className="absolute top-16 left-0 right-0 z-40 px-3 pt-2 pb-1 gap-2 flex overflow-x-auto overflow-y-hidden no-scrollbar snap-x snap-mandatory pointer-events-auto">
            {topBannerItems.map((item, i) => (
              <div key={`top-${item.ad?.campaign_id || i}`} className="flex-shrink-0 w-[85%] max-w-[320px]">
                <AdBannerCard
                  ad={item.ad}
                  isActive={true}
                  onHide={handleHideAd}
                  hideActions={showComments || showShare || showTip || showGift || isMenuOpen}
                />
              </div>
            ))}
          </div>
        )}


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
          onTouchEnd={(e) => {
            if (e.changedTouches.length > 0) handlePullEnd();
            // Mobile: snap après la fin du momentum (évite de snap trop tôt puis re-scroll)
            const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || 'ontouchstart' in window);
            setTimeout(snapToNearestSlide, isMobile ? 220 : 100);
          }}
          onTouchCancel={() => handlePullEnd()}
          className="snap-y snap-mandatory flex-1 w-full flex flex-col"
          style={{ 
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            scrollSnapType: 'y mandatory',
            WebkitScrollSnapType: 'y mandatory',
            gap: 0,
          }}
        >
        <div
          className="flex items-center justify-center shrink-0 overflow-hidden transition-[height] duration-150 ease-out bg-black"
          style={{
            height: isRefreshing ? 56 : pullDistance,
            minHeight: isRefreshing ? 56 : 0,
            scrollSnapAlign: 'none',
          }}
          aria-hidden
        >
          {(pullDistance > 0 || isRefreshing) && (
            <div className="flex flex-col items-center gap-1">
              {isRefreshing ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" aria-label="Chargement" />
              ) : (
                <Loader2
                  className="w-6 h-6 text-white/80 transition-transform duration-150"
                  style={{ transform: `rotate(${Math.min(pullDistance * 4, 360)}deg)` }}
                  aria-hidden
                />
              )}
              <span className="text-white/80 text-xs">
                {isRefreshing ? 'Actualisation...' : pullDistance >= PULL_THRESHOLD ? 'Relachez' : 'Tirez pour actualiser'}
              </span>
            </div>
          )}
        </div>
        {activeTab === 'abonnements' && followingVideos.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-white px-8 text-center">
            <p className="text-xl font-semibold mb-2">Aucune video de vos abonnements</p>
            <p className="text-gray-400 mb-4">Suivez des createurs pour voir leurs videos ici</p>
            {!user && (
              <button
                onClick={() => _navigate('/Landing')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg font-bold hover:shadow-lg transition-all"
              >
                S'inscrire pour commencer
              </button>
            )}
          </div>
        ) : activeTab === 'pourtoi' && feedItems.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-white px-8 text-center">
            <p className="text-xl font-semibold mb-2">Aucune video pour l'instant</p>
            <p className="text-gray-400 mb-4">Soyez le premier a partager !</p>
            {!user ? (
              <button
                onClick={() => _navigate('/Landing')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg font-bold hover:shadow-lg transition-all"
              >
                S'inscrire pour commencer
              </button>
            ) : (
              <button
                onClick={() => _navigate('/Create')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg font-bold hover:shadow-lg transition-all"
              >
                Creer votre premiere video
              </button>
            )}
          </div>
        ) : (
          <>
            {(activeTab === 'pourtoi' ? mainFeedItems : followingVideos.map(v => ({ type: 'video', video: v }))).map((item, index) => {
              const isNeighbor = Math.abs(index - currentIndex) <= 1;

              if (item.type === 'ad') {
                return (
                  <div
                    key={`ad-${item.ad?.id || index}`}
                    className="relative w-full snap-start snap-always overflow-hidden bg-black flex-shrink-0"
                    style={{ flex: '0 0 100%', minHeight: '100%', height: '100%', touchAction: 'pan-y' }}
                  >
                    <AdCard
                      ad={item.ad}
                      isActive={index === currentIndex}
                      isMuted={isMuted}
                      onMuteToggle={() => setMuted(!isMuted)}
                      onHide={handleHideAd}
                      hideActions={showComments || showShare || showTip || showGift || isMenuOpen}
                    />
                  </div>
                );
              }

              const video = item.video;
              return (
                <div
                  key={video.id}
                  className="relative w-full snap-start snap-always overflow-hidden bg-black flex-shrink-0"
                  style={{ flex: '0 0 100%', minHeight: '100%', height: '100%', touchAction: 'pan-y' }}
                >
                  <VideoCard
                    video={video}
                    isActive={index === currentIndex}
                    isLiked={likedVideos.has(video.id)}
                    isSaved={savedVideos.has(video.id)}
                    isMuted={isMuted}
                    onMuteToggle={() => setMuted(!isMuted)}
                    onLike={handleLike}
                    onComment={() => {
                      setSelectedVideo(video);
                      setShowComments(true);
                    }}
                    onShare={() => {
                      setSelectedVideo(video);
                      setShowShare(true);
                    }}
                    onSave={() => saveMutation.mutate(video)}
                    onTip={() => {
                      setSelectedVideo(video);
                      setShowTip(true);
                    }}
                    onSubscribe={() => handleToggleWonder(video.creator_id, video.creator_name)}
                    isFollowing={userFollows.some((f) => f.id === video.creator_id)}
                    onProfileClick={(creatorId) => {
                      _navigate(`/Profile?_userId=${creatorId}`);
                    }}
                    hideActions={showComments || showShare || showTip || showGift || isMenuOpen}
                    preload={isNeighbor ? 'auto' : 'metadata'}
                  />
                </div>
              );
            })}
          </>
        )}
        </div>

        {showWonderersPanel && (
          <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-md p-4 pt-20 overflow-y-auto pointer-events-auto isolate">
            <div className="relative z-10 bg-[#111827] border border-white/10 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-base">Tout ton Wonder</h3>
                <button
                  type="button"
                  onClick={() => setShowWonderersPanel(false)}
                  className="text-white/70 hover:text-white text-sm"
                >
                  Fermer
                </button>
              </div>

              <div className="space-y-2 mb-5">
                {userFollows.filter((u) => !isDeletedUser(u)).map((creator) => (
                  <div key={creator.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
                    <img
                      src={creator.profile_image || '/icon-192.png'}
                      alt={creator.full_name || creator.username || 'creator'}
                      className="w-11 h-11 rounded-full object-cover"
                    />
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
                  {suggestedWonderers.filter((u) => !isDeletedUser(u)).map((candidate) => (
                    <div key={candidate.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
                      <img
                        src={candidate.profile_image || '/icon-192.png'}
                        alt={candidate.full_name || candidate.username || 'candidate'}
                        className="w-11 h-11 rounded-full object-cover"
                      />
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
                  {suggestedWonderers.filter((u) => !isDeletedUser(u)).length === 0 && (
                    <p className="text-white/50 text-sm">Pas de suggestion pour le moment.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <BottomNav />
      </div>

      <CommentSheet
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        videoId={selectedVideo?.id}
        comments={comments}
        onTip={() => {
          setShowComments(false);
          setShowTip(true);
        }}
        user={user}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['comments', selectedVideo?.id] })}
      />

      <TipModal
        isOpen={showTip}
        onClose={() => setShowTip(false)}
        creator={{
          name: selectedVideo?.creator_name,
          avatar: selectedVideo?.creator_avatar
        }}
        onSendTip={handleTip}
        walletBalance={walletBalance}
      />

      <ShareSheet
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        video={selectedVideo}
        onShareSuccess={async () => {
          if (selectedVideo) {
            try {
              await api.videos.share(selectedVideo.id);
              queryClient.setQueryData(['videos', activeTab, user?.id], (oldData) => {
                if (!oldData) return oldData;
                return oldData.map(v => {
                  if (v.id === selectedVideo.id) {
                    return {
                      ...v,
                      shares: (v.shares || 0) + 1
                    };
                  }
                  return v;
                });
              });
              setFollowingVideos(prev => prev.map(v => {
                if (v.id === selectedVideo.id) {
                  return {
                    ...v,
                    shares: (v.shares || 0) + 1
                  };
                }
                return v;
              }));
              queryClient.invalidateQueries({ queryKey: ['videos'] });
              queryClient.invalidateQueries({ queryKey: ['feed'] });
            } catch (_err) {}
          }
        }}
      />

      <GiftPurchaseModal
        isOpen={showGift}
        onClose={() => setShowGift(false)}
        receiverId={selectedVideo?.creator_id}
        liveId={null}
      />

      <style>{`
        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }

        * {
          box-sizing: border-box;
        }

        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        ::-webkit-scrollbar {
          width: 0px;
          height: 0px;
          display: none;
        }
      `}</style>
    </div>
  );
}
