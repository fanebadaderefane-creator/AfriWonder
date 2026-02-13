// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import VideoCard from '../components/video/VideoCard';
import AdCard from '../components/video/AdCard';
import CommentSheet from '../components/video/CommentSheet';
import TipModal from '../components/video/TipModal';
import ShareSheet from '../components/video/ShareSheet';
import GiftPurchaseModal from '../components/live/GiftPurchaseModal';
import TopHeader from '../components/navigation/TopHeader';
import BottomNav from '../components/navigation/BottomNav';
import AfriWonderLogo from '../components/common/AfriWonderLogo';
import { useAppMenu } from '@/contexts/AppMenuContext';
import NotificationService from '../components/notifications/NotificationService';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from "sonner";
import { useNetworkStatus, getCacheStrategy, scheduleTask } from '../components/common/PerformanceOptimizer';
import { cn } from "@/lib/utils";

const PULL_THRESHOLD = 80; // Distance en pixels pour déclencher le refresh

export default function Home() {
  const _navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pourtoi');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const { isOpen: isMenuOpen, openMenu } = useAppMenu();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [user, setUser] = useState(null);
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [savedVideos, setSavedVideos] = useState(new Set());
  const [followingCount, setFollowingCount] = useState(0);
  const [followingVideos, setFollowingVideos] = useState([]);
  
  // Pull-to-refresh states
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);
  const touchStartScrollTop = useRef(0);
  
  const containerRef = useRef(null);
  const queryClient = useQueryClient();

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

  // Feed combiné (vidéos + pubs) pour l'onglet Pour toi
  const { data: feedData, isLoading: feedLoading, refetch: refetchFeed } = useQuery({
    queryKey: ['feed', user?.id],
    ...cacheStrategy,
    queryFn: async () => {
      const result = await api.feed.list({ page: 1, limit: 50 });
      return result?.items || [];
    },
    enabled: activeTab === 'pourtoi',
  });

  // Vidéos brutes pour l'onglet Abonnements (filtrées par following)
  const { data: videos = [], isLoading: videosLoading, refetch: refetchVideos } = useQuery({
    queryKey: ['videos', user?.id],
    ...cacheStrategy,
    queryFn: async () => {
      const result = await api.videos.list({ page: 1, limit: 50 });
      return result.videos || [];
    },
    enabled: activeTab === 'abonnements',
  });

  const feedItems = feedData || [];
  const isLoading = activeTab === 'pourtoi' ? feedLoading : videosLoading;
  const refetch = activeTab === 'pourtoi' ? refetchFeed : refetchVideos;

  // Refetch on mount and when user data changes (e.g., after profile update)
  useEffect(() => {
    refetch();
  }, [activeTab, user?.id, refetch]);
  
  // Invalider le cache quand l'utilisateur change (après mise à jour du profil)
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

  // Memoize following IDs to prevent infinite loops
  const followingIds = useMemo(() => 
    userFollows.map(f => f.following_id), 
    [userFollows]
  );

  // Create stable string from video IDs to detect actual changes (abonnements)
  const videoIdsString = useMemo(() => 
    videos.map(v => `${v.id}:${v.creator_id}`).sort().join(','), 
    [videos]
  );

  useEffect(() => {
    setFollowingCount(userFollows.length);
    const filtered = videos.filter(v => followingIds.includes(v.creator_id));
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
        // Utiliser l'API des likes directement (l'API gère l'utilisateur via l'auth)
        const result = await api.videos.like(video.id);
        
        // Le backend retourne { liked: true/false }
        const newLikedState = result?.liked ?? !isLiked;
        
        // Si le like a été ajouté, envoyer une notification
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
        
        // Mettre à jour le compteur de likes (feed ou videos selon l'onglet)
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
        
        // Mettre à jour aussi followingVideos si nécessaire
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
        toast.success('Vidéo sauvegardée');
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
        // Mettre à jour le compteur de commentaires de manière optimiste
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
        
        // Mettre à jour aussi followingVideos si nécessaire
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
      
      // Invalider les queries pour recharger depuis le backend et persister les données
      queryClient.invalidateQueries({ queryKey: ['comments', selectedVideo?.id] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success('Commentaire ajouté');
    }
  });

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e) => {
    const container = containerRef.current;
    if (!container) return;
    
    // Seulement si on est en haut du scroll
    if (container.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
      touchStartScrollTop.current = container.scrollTop;
      setIsPulling(true);
    }
  }, []);
  
  const handleTouchMove = useCallback((e) => {
    if (!isPulling) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    
    // Seulement si on tire vers le bas
    if (deltaY > 0 && container.scrollTop <= 0) {
      const distance = Math.min(deltaY * 0.5, PULL_THRESHOLD * 1.5); // Réduction pour un effet plus doux
      setPullDistance(distance);
      
      // Empêcher le scroll par défaut si on tire assez
      if (distance > 10) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
  }, [isPulling]);
  
  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    // Si on a tiré assez loin, déclencher le refresh
    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      
      try {
        // Rafraîchir les vidéos
        await refetch();
        
        // Rafraîchir aussi les abonnements si nécessaire
        if (activeTab === 'abonnements') {
          queryClient.invalidateQueries({ queryKey: ['user-follows', user?.id] });
        }
        
        // Rafraîchir les sauvegardes
        if (user?.id) {
          try {
            const savesResult = await api.saves.list();
            setSavedVideos(new Set((savesResult.videos || []).map(v => v.id)));
          } catch (_e) {}
        }
        
        toast.success('Actualisé avec succès');
      } catch (error) {
        toast.error('Erreur lors de l\'actualisation');
      } finally {
        // Animation de retour
        setTimeout(() => {
          setPullDistance(0);
          setIsRefreshing(false);
        }, 500);
      }
    } else {
      // Retour animé si pas assez tiré
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, refetch, activeTab, queryClient, user?.id]);
  
  // Handlers pour souris (desktop)
  const handleMouseDown = useCallback((e) => {
    const container = containerRef.current;
    if (!container) return;
    
    if (container.scrollTop <= 0) {
      touchStartY.current = e.clientY;
      touchStartScrollTop.current = container.scrollTop;
      setIsPulling(true);
    }
  }, []);
  
  const handleMouseMove = useCallback((e) => {
    if (!isPulling) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const currentY = e.clientY;
    const deltaY = currentY - touchStartY.current;
    
    if (deltaY > 0 && container.scrollTop <= 0) {
      const distance = Math.min(deltaY * 0.5, PULL_THRESHOLD * 1.5);
      setPullDistance(distance);
      
      if (distance > 10) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
  }, [isPulling]);
  
  const handleMouseUp = useCallback(() => {
    handleTouchEnd();
  }, [handleTouchEnd]);
  
  // Handle scroll and track view history
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Réinitialiser le pull si on scroll
    if (container.scrollTop > 0 && isPulling) {
      setIsPulling(false);
      setPullDistance(0);
    }
    
    const scrollTop = container.scrollTop;
    const screenHeight = window.innerHeight;
    const newIndex = Math.round(scrollTop / screenHeight);
    
    const currentItems = activeTab === 'pourtoi' ? feedItems : followingVideos.map(v => ({ type: 'video', video: v }));
    
    if (
      newIndex !== currentIndex &&
      newIndex >= 0 &&
      newIndex < currentItems.length
    ) {
      // Save view history for previous video
      const prevItem = currentItems[currentIndex];
      const prevVideo = prevItem?.type === 'video' ? prevItem.video : prevItem;
      if (user?.id && currentIndex >= 0 && prevVideo?.id) {
        const video = prevVideo;
        // TODO: Track view history
        // api.videos.trackView(video.id, {
        //   category: video.category,
        //   watch_duration: 0,
        //   completed: false
        // }).catch(() => {});
      }
      
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, activeTab, feedItems, followingVideos, user?.id, isPulling]);

  const handleTip = async (amount, method, extra = {}) => {
    if (!user || !selectedVideo) {
      toast.error('Connectez-vous pour envoyer un tip');
      return;
    }
    try {
      if (method === 'wallet') {
        await api.videos.tipWithWallet(selectedVideo.id, { amount, message: extra.message });
        toast.success(`Tip de ${amount} FCFA envoyé !`);
      } else if (method === 'orange_money' && extra.phone) {
        const result = await api.videos.tip(selectedVideo.id, {
          amount,
          phone: extra.phone,
          message: extra.message,
        });
        if (result?.paymentUrl) {
          window.location.href = result.paymentUrl;
        } else {
          toast.success('Tip initié. Validez sur Orange Money.');
        }
      } else if (['wave', 'mtn_money'].includes(method)) {
        toast.info('Cette méthode de paiement sera disponible prochainement.');
      } else {
        toast.error('Sélectionnez Mon Wallet ou Orange Money avec un numéro.');
      }
    } catch (err) {
      toast.error(err?.apiMessage || 'Erreur lors de l\'envoi du tip');
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-[100dvh] bg-black relative overflow-hidden">
      {/* AfriWonder Logo */}
      <button
        onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
        className={cn(
          "absolute top-4 left-4 z-50 pointer-events-auto group transition-opacity duration-300",
          (showComments || showShare || showTip || showGift || isMenuOpen) ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <AfriWonderLogo size="sm" className="shadow-lg group-hover:shadow-xl transition-shadow" />
      </button>

      <TopHeader 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showTabs={true}
        onMenuOpen={openMenu}
        followingCount={followingCount}
        title={undefined}
        onToggleDarkMode={undefined}
      />

      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none"
          style={{
            transform: `translateY(${pullDistance}px)`,
            transition: isRefreshing ? 'transform 0.3s ease' : 'none'
          }}
        >
          <div className="flex flex-col items-center gap-2 pt-4">
            {isRefreshing ? (
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            ) : (
              <RefreshCw 
                className="w-6 h-6 text-white transition-transform"
                style={{
                  transform: `rotate(${pullDistance >= PULL_THRESHOLD ? 180 : pullDistance * 2.25}deg)`
                }}
              />
            )}
            {pullDistance >= PULL_THRESHOLD && !isRefreshing && (
              <p className="text-white text-xs font-medium">Relâchez pour actualiser</p>
            )}
          </div>
        </div>
      )}

      {/* Video Feed - Vertical Scroll */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (isPulling) {
            setIsPulling(false);
            setPullDistance(0);
          }
        }}
        data-scroll-container="true"
        className="absolute top-0 left-0 right-0 bottom-0 overflow-y-scroll overflow-x-hidden snap-y snap-mandatory no-scrollbar"
        style={{ 
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          height: '100vh',
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'none',
          transition: isRefreshing ? 'transform 0.3s ease' : 'none'
        }}
      >
        {activeTab === 'abonnements' && followingVideos.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-white px-8 text-center">
            <p className="text-xl font-semibold mb-2">Aucune vidéo de vos abonnements</p>
            <p className="text-gray-400 mb-4">Suivez des créateurs pour voir leurs vidéos ici</p>
            {!user && (
              <button
                onClick={() => window.location.href = '/Landing'}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg font-bold hover:shadow-lg transition-all"
              >
                S'inscrire pour commencer
              </button>
            )}
          </div>
        ) : activeTab === 'pourtoi' && feedItems.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-white px-8 text-center">
            <p className="text-xl font-semibold mb-2">Aucune vidéo pour l'instant</p>
            <p className="text-gray-400 mb-4">Soyez le premier à partager !</p>
            {!user ? (
              <button
                onClick={() => window.location.href = '/Landing'}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg font-bold hover:shadow-lg transition-all"
              >
                S'inscrire pour commencer
              </button>
            ) : (
              <button
                onClick={() => window.location.href = '/Create'}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg font-bold hover:shadow-lg transition-all"
              >
                Créer votre première vidéo
              </button>
            )}
          </div>
        ) : (
           (activeTab === 'pourtoi' ? feedItems : followingVideos.map(v => ({ type: 'video', video: v }))).map((item, index) => {
             if (item.type === 'ad') {
               return (
                 <div
                   key={`ad-${item.ad?.id || index}`}
                   className="relative w-full h-screen snap-start snap-always flex items-center justify-center overflow-hidden"
                 >
                   <AdCard
                     ad={item.ad}
                     isActive={index === currentIndex}
                     isMuted={isMuted}
                     onMuteToggle={() => setIsMuted(!isMuted)}
                     hideActions={showComments || showShare || showTip || showGift || showMenu}
                   />
                 </div>
               );
             }
             const video = item.video;
             return (
             <div 
               key={video.id} 
               className="relative w-full h-screen snap-start snap-always flex items-center justify-center overflow-hidden"
             >
               <VideoCard
                video={video}
                isActive={index === currentIndex}
                isLiked={likedVideos.has(video.id)}
                isSaved={savedVideos.has(video.id)}
                isMuted={isMuted}
                onMuteToggle={() => setIsMuted(!isMuted)}
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
                   const wasInWonder = userFollows.some(f => f.following_id === video.creator_id);
                   const result = await api.users.toggleWonder(video.creator_id);
                   const inWonder = result?.data?.inWonder ?? result?.inWonder ?? !wasInWonder;

                   // Invalider les queries pour mettre à jour l'état
                   queryClient.invalidateQueries({ queryKey: ['user-follows', user.id] });
                   queryClient.invalidateQueries({ queryKey: ['follow-stats', video.creator_id] });
                   
                   if (inWonder) {
                     NotificationService.notifyNewFollower(user.id, video.creator_id);
                     toast.success('Vous êtes maintenant dans son Wonder ✨');
                   } else {
                     toast.success(`Vous avez quitté le Wonder de ${video.creator_name}`);
                   }
                 }}
                 isFollowing={userFollows.some(f => f.following_id === video.creator_id)}
                 onProfileClick={(creatorId) => {
                   window.location.href = `/Profile?_userId=${creatorId}`;
                 }}
                 hideActions={showComments || showShare || showTip || showGift || showMenu}
              />
            </div>
          );
          })
        )}
      </div>

      <BottomNav />

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
              // Appeler l'API backend pour incrémenter le compteur en base de données
              await api.videos.share(selectedVideo.id);
              
              // Mettre à jour le cache local de manière optimiste
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
              
              // Mettre à jour aussi followingVideos si nécessaire
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
              // Ne pas bloquer l'utilisateur si l'API échoue
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
        .no-scrollbar {
          -ms-overflow-style: none; /* IE / Edge */
          scrollbar-width: none; /* Firefox */
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome / Safari */
        }
      `}</style>
    </div>
  );
}
