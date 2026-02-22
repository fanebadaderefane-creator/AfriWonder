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
import { Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { useNetworkStatus, getCacheStrategy, scheduleTask } from '../components/common/PerformanceOptimizer';
import { cn } from "@/lib/utils";
import { getVideoPlaybackUrl } from '@/lib/utils';
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
  
  // Empecher l'ecran de s'eteindre automatiquement (style TikTok)
  useWakeLock(true);
  
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [user, setUser] = useState(null);
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [savedVideos, setSavedVideos] = useState(new Set());
  const [followingCount, setFollowingCount] = useState(0);
  const [followingVideos, setFollowingVideos] = useState([]);
  const [firstVideoPreloaded, setFirstVideoPreloaded] = useState(false);

  const containerRef = useRef(null);
  const queryClient = useQueryClient();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartYRef = useRef(0);
  const pullDistanceRef = useRef(0);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        // User not logged in
      }
    };
    getUser();
  }, []);

  const { isSlowConnection } = useNetworkStatus();
  const cacheStrategy = getCacheStrategy(isSlowConnection);

  // Config Early Access pour afficher un message discret
  const { data: earlyAccessConfig } = useQuery({
    queryKey: ['early-access-config'],
    queryFn: () => api.earlyAccess.getConfig(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Feed combine (videos + pubs) pour l'onglet Pour toi
  const { data: feedData, isLoading: feedLoading, refetch: refetchFeed } = useQuery({
    queryKey: ['feed', user?.id],
    ...cacheStrategy,
    queryFn: async () => {
      const result = await api.feed.list({ page: 1, limit: 25 });
      return result?.items ?? [];
    },
    enabled: activeTab === 'pourtoi',
  });

  // Videos brutes pour l'onglet Abonnements (filtrees par following)
  const { data: videos = [], isLoading: videosLoading, refetch: refetchVideos } = useQuery({
    queryKey: ['videos', user?.id],
    ...cacheStrategy,
    queryFn: async () => {
      const result = await api.videos.list({ page: 1, limit: 25 });
      return result.videos || [];
    },
    enabled: activeTab === 'abonnements',
  });

  // Masquer pubs (CDC section 4) - stockage securise
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

  // Precharger la premiere video AVANT d'afficher le feed (first impression = niveau TikTok)
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

  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  // Refetch on mount and when tab or user changes
  useEffect(() => {
    refetchRef.current?.();
  }, [activeTab, user?.id]);

  const handleRefreshHome = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['feed'] });
    queryClient.invalidateQueries({ queryKey: ['videos'] });
    refetchFeed().catch(() => {});
    refetchVideos().catch(() => {});
    refetchRef.current?.().catch(() => {});
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

  // Invalider le cache quand l'utilisateur change (apres mise a jour du profil)
  useEffect(() => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    }
  }, [user?.profile_image, queryClient, user?.id]);

  // Fetch comments for current video
  const { data: comments = [] } = useQuery({
    queryKey: ['comments', selectedVideo?.id],
    ...cacheStrategy,
    queryFn: async () => {
      if (!selectedVideo?.id) return [];
      const result = await api.videos.getComments(selectedVideo.id, { page: 1, limit: 50 });
      return result.comments || [];
    },
    enabled: !!selectedVideo?.id && showComments,
  });

  // Fetch wallet balance for tip modal
  const { data: walletData } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: () => api.payments.getWallet(),
    enabled: !!user?.id && showTip,
  });
  const walletBalance = walletData?.available_balance ?? walletData?.balance ?? 0;

  // Fetch user follows
   const { data: userFollows = [] } = useQuery({
     queryKey: ['user-follows', user?.id],
     ...cacheStrategy,
     queryFn: async () => {
       const result = await api.users.getFollowing(user.id);
       return result.following || [];
     },
     enabled: !!user?.id
   });

   useEffect(() => {
     if (user?.id) {
       scheduleTask(async () => {
         try {
           const savesResult = await api.saves.list();
           setSavedVideos(new Set((savesResult.videos || []).map(v => v.id)));
         } catch (_e) {}
       });
       
       // Charger les likes existants
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

  // Memoize following creator IDs (backend retourne directement les utilisateurs suivis)
  const followingIds = useMemo(
    () => userFollows.map((f) => f.id),
    [userFollows]
  );

  // Create stable string from video IDs to detect actual changes (abonnements)
  const videoIdsString = useMemo(() => 
    videos.map(v => `${v.id}:${v.creator_id}`).sort().join(','), 
    [videos]
  );

  useEffect(() => {
    setFollowingCount(userFollows.length);
    // Ne garder que les videos dont le createur est dans la liste des suivis
    const filtered = videos.filter((v) => followingIds.includes(v.creator_id));
    setFollowingVideos(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userFollows.length, followingIds.length, videoIdsString]);

  // Like mutation with notification
  const likeMutation = useMutation({
    mutationFn: async (video) => {
      if (!user) {
        toast.error('Connectez-vous pour aimer');
        return { isLiked: false, video: null };
      }
      
      const isLiked = likedVideos.has(video.id);
      
      try {
        // Utiliser l'API des likes directement (l'API gere l'utilisateur via l'auth)
        const result = await api.videos.like(video.id);
        
        // Le backend retourne { liked: true/false }
        const newLikedState = result?.liked ?? !isLiked;
        
        // Si le like a ete ajoute, envoyer une notification
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
      // data est le retour de mutationFn: { isLiked, video }
      if (data && data.video) {
        setLikedVideos(prev => {
          const next = new Set(prev);
          if (data.isLiked) {
            next.add(data.video.id);
          } else {
            next.delete(data.video.id);
          }
          return next;
        });
        
        // Mettre a jour le compteur de likes (feed ou videos selon l'onglet)
        if (activeTab === 'pourtoi') {
          queryClient.setQueryData(['feed', user?.id], (oldItems) => {
            if (!Array.isArray(oldItems)) return oldItems;
            return oldItems.map(it => {
              if (it.type === 'video' && it.video?.id === data.video.id) {
                return { ...it, video: { ...it.video, likes: data.isLiked ? (it.video.likes || 0) + 1 : Math.max(0, (it.video.likes || 0) - 1) } };
              }
              return it;
            });
          });
        } else {
          queryClient.setQueryData(['videos', user?.id], (oldData) => {
            if (!oldData) return oldData;
            return oldData.map(v => {
              if (v.id === data.video.id) {
                return { ...v, likes: data.isLiked ? (v.likes || 0) + 1 : Math.max(0, (v.likes || 0) - 1) };
              }
              return v;
            });
          });
        }
        
        // Mettre a jour aussi followingVideos si necessaire
        setFollowingVideos(prev => prev.map(v => {
          if (v.id === data.video.id) {
            return {
              ...v,
              likes: data.isLiked ? (v.likes || 0) + 1 : Math.max(0, (v.likes || 0) - 1)
            };
          }
          return v;
        }));
        
        queryClient.invalidateQueries({ queryKey: ['videos'] });
        queryClient.invalidateQueries({ queryKey: ['feed'] });
      }
    }
  });

  // Save mutation
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

  // Comment mutation with notifications
  const commentMutation = useMutation({
    mutationFn: async ({ content, parentId }) => {
      if (!user || !selectedVideo) {
        toast.error('Connectez-vous pour commenter');
        return;
      }
      await api.videos.comment(selectedVideo.id, content, parentId);
      
      // Send notification to video creator
      NotificationService.notifyVideoComment(user.id, selectedVideo.id, selectedVideo.creator_id, content);
      
      // Check for mentions and notify mentioned users
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
        // Mettre a jour le compteur de commentaires de maniere optimiste
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
        
        // Mettre a jour aussi followingVideos si necessaire
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
      
      // Invalider les queries pour recharger depuis le backend et persister les donnees
      queryClient.invalidateQueries({ queryKey: ['comments', selectedVideo?.id] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success('Commentaire ajoute');
    }
  });






  // Prechargement des +1 et +2 (niveau TikTok) - scroll = lecture instantanee
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

  useEffect(() => {
    const items = activeTab === 'pourtoi' ? mainFeedItems : followingVideos.map((v) => ({ type: 'video', video: v }));
    preloadVideos(items, currentIndex);
  }, [currentIndex, activeTab, mainFeedItems, followingVideos, preloadVideos]);

  // Handle scroll - Calcul simple de l'index actif + precharge les 2 suivantes
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const index = Math.round(container.scrollTop / container.clientHeight);

    if (index !== currentIndex) {
      setCurrentIndex(index);
      const items = activeTab === 'pourtoi' ? mainFeedItems : followingVideos.map((v) => ({ type: 'video', video: v }));
      preloadVideos(items, index);
    }
  }, [currentIndex, activeTab, mainFeedItems, followingVideos, preloadVideos]);

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

  // Premiere video en prechargement (first impression = lecture instantanee)
  const waitingFirstVideo =
    activeTab === 'pourtoi' &&
    mainFeedItems.length > 0 &&
    mainFeedItems.some((i) => i.type === 'video') &&
    !firstVideoPreloaded;
  const showHomeLoading = isLoading || waitingFirstVideo;
  if (showHomeLoading) {
    return (
      <div className="w-full bg-black flex justify-center text-white" style={{ height: 'calc(var(--app-vh, 1vh) * 100)' }}>
        <div className="w-full sm:max-w-[400px] h-full relative flex flex-col">
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
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" aria-hidden />
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
        height: 'calc(var(--app-vh, 1vh) * 100)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      {/* Container vertical fixe - style TikTok desktop (400px max sur desktop, full width sur mobile) */}
      <div className="w-full sm:max-w-[400px] h-full relative flex flex-col bg-black">
        {/* AfriWonder Logo - positionne relativement au container */}
        <button
          onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className={cn(
            "absolute top-4 left-4 z-50 pointer-events-auto group transition-opacity duration-300",
            (showComments || showShare || showTip || showGift || isMenuOpen) ? "opacity-0 pointer-events-none" : "opacity-100"
          )}
        >
          <AfriWonderLogo size="sm" className="shadow-lg group-hover:shadow-xl transition-shadow" />
        </button>

        {/* TopHeader - limite au container vertical avec padding pour eviter chevauchement logo */}
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

        {/* Bannieres en position fixe - limitees au container vertical */}
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


        {/* FEED - Video Feed avec pull-to-refresh (Android, iOS, iPad) */}
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
          }}
          onTouchCancel={() => handlePullEnd()}
          className="snap-y snap-mandatory flex-1 w-full"
          style={{ 
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            scrollSnapType: 'y mandatory',
            WebkitScrollSnapType: 'y mandatory',
          }}
        >
        {/* Zone pull-to-refresh : hauteur variable + indicateur (ne participe pas au snap) */}
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
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg font-bold hover:shadow-lg transition-all"
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
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg font-bold hover:shadow-lg transition-all"
              >
                S'inscrire pour commencer
              </button>
            ) : (
              <button
                onClick={() => _navigate('/Create')}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg font-bold hover:shadow-lg transition-all"
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
                    className="relative w-full snap-start overflow-hidden"
                    style={{ height: 'calc(var(--app-vh, 1vh) * 100)', touchAction: 'pan-y' }}
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
                  className="relative w-full snap-start overflow-hidden"
                  style={{ height: 'calc(var(--app-vh, 1vh) * 100)', touchAction: 'pan-y' }}
                >
                  <VideoCard
                    video={video}
                    isActive={index === currentIndex}
                    isLiked={likedVideos.has(video.id)}
                    isSaved={savedVideos.has(video.id)}
                    isMuted={isMuted}
                    onMuteToggle={() => setMuted(!isMuted)}
                    onLike={() => likeMutation.mutate(video)}
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
                    onSubscribe={async () => {
                      if (!user) {
                        _navigate('/');
                        return;
                      }
                      const wasInWonder = userFollows.some((f) => f.id === video.creator_id);
                      const result = await api.users.toggleWonder(video.creator_id);
                      const inWonder = result?.data?.inWonder ?? result?.inWonder ?? !wasInWonder;

                      // Invalider les queries pour mettre a jour l'etat
                      queryClient.invalidateQueries({ queryKey: ['user-follows', user.id] });
                      queryClient.invalidateQueries({ queryKey: ['follow-stats', video.creator_id] });
                      
                      if (inWonder) {
                        NotificationService.notifyNewFollower(user.id, video.creator_id);
                        toast.success('Vous etes maintenant dans son Wonder');
                      } else {
                        toast.success(`Vous avez quitte le Wonder de ${video.creator_name}`);
                      }
                    }}
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

        <BottomNav />
      </div>

      {/* Comments Sheet */}
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

      {/* Tip Modal */}
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

      {/* Share Sheet */}
      <ShareSheet
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        video={selectedVideo}
        onShareSuccess={async () => {
          if (selectedVideo) {
            try {
              // Appeler l'API backend pour incrementer le compteur en base de donnees
              await api.videos.share(selectedVideo.id);
              
              // Mettre a jour le cache local de maniere optimiste
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
              
              // Mettre a jour aussi followingVideos si necessaire
              setFollowingVideos(prev => prev.map(v => {
                if (v.id === selectedVideo.id) {
                  return {
                    ...v,
                    shares: (v.shares || 0) + 1
                  };
                }
                return v;
              }));
              
              // Invalider les queries pour recharger depuis le backend
              queryClient.invalidateQueries({ queryKey: ['videos'] });
              queryClient.invalidateQueries({ queryKey: ['feed'] });
            } catch (error) {
              console.error('Error tracking share:', error);
              // Ne pas bloquer l'utilisateur si l'API echoue
            }
          }
        }}
      />

      {/* Gift Purchase Modal */}
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
