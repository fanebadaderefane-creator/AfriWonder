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
import NotificationService from '../components/notifications/NotificationService';
import { Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { useNetworkStatus, getCacheStrategy, scheduleTask } from '../components/common/PerformanceOptimizer';
import { cn } from "@/lib/utils";
import { getJSON, setJSON } from '@/utils/safeStorage';

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
      const result = await api.feed.list({ page: 1, limit: 25 });
      return result?.items ?? [];
    },
    enabled: activeTab === 'pourtoi',
  });

  // Vidéos brutes pour l'onglet Abonnements (filtrées par following)
  const { data: videos = [], isLoading: videosLoading, refetch: refetchVideos } = useQuery({
    queryKey: ['videos', user?.id],
    ...cacheStrategy,
    queryFn: async () => {
      const result = await api.videos.list({ page: 1, limit: 25 });
      return result.videos || [];
    },
    enabled: activeTab === 'abonnements',
  });

  // Masquer pubs (CDC §4) - stockage sécurisé
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






  // Handle scroll - Calcul simple de l'index actif
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Calculer l'index de la vidéo visible basé sur la hauteur réelle du container
    const index = Math.round(container.scrollTop / container.clientHeight);

    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  }, [currentIndex]);

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
      <div className="h-[100dvh] w-full flex items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div 
      className="h-[100dvh] w-full bg-black overflow-hidden"
      style={{
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <div className="relative w-full h-full flex flex-col bg-black">
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


        {/* Bannières en position fixe */}
        {activeTab === 'pourtoi' && topBannerItems.length > 0 && currentIndex === 0 && (
          <div className="fixed top-16 left-0 right-0 z-40 px-3 pt-2 pb-1 gap-2 flex overflow-x-auto overflow-y-hidden no-scrollbar snap-x snap-mandatory pointer-events-auto">
            {topBannerItems.map((item, i) => (
              <div key={`top-${item.ad?.campaign_id || i}`} className="flex-shrink-0 w-[85vw] max-w-[320px]">
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


        {/* FEED - Video Feed avec CSS Snap natif */}
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          className="snap-y snap-mandatory"
          style={{ 
            flex: 1,
            width: '100%',
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
          <>
            {(activeTab === 'pourtoi' ? mainFeedItems : followingVideos.map(v => ({ type: 'video', video: v }))).map((item, index) => {
             if (item.type === 'ad') {
               return (
                <div
                  key={`ad-${item.ad?.id || index}`}
                  className="relative w-full snap-start overflow-hidden"
                  style={{ height: '100dvh', touchAction: 'pan-y' }}
                >
                   <AdCard
                     ad={item.ad}
                     isActive={index === currentIndex}
                     isMuted={isMuted}
                     onMuteToggle={() => setIsMuted(!isMuted)}
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
              style={{ height: '100dvh', touchAction: 'pan-y' }}
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
                 hideActions={showComments || showShare || showTip || showGift || isMenuOpen}
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
