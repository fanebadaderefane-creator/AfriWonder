// AfriWonder full review PR - CodeRabbit
import React, { useState, useEffect } from 'react';

import { api } from '@/api/expressClient';

import { useQuery, useInfiniteQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Grid3X3, Bookmark, Heart, ShoppingBag, Play, ArrowLeft, Pencil, Trash2, FileText, Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { motion } from 'framer-motion';

import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { createPageUrl } from "@/utils";
import { cn, isValidThumbnailUrl, VIDEO_PLACEHOLDER_IMG, getAbsoluteImageUrl, getVideoPrimarySourceUrl, getVideoPrimarySourceUrlForFrameGrab, MARKETPLACE_PLACEHOLDER_IMG } from "@/lib/utils";
import VideoFrameThumbnail from '../components/video/VideoFrameThumbnail';
import OptimizedImage from '@/components/common/ImageOptimizer';

import { toast } from "sonner";

import ProfileHeader from '../components/profile/ProfileHeader';

import BottomNav from '../components/navigation/BottomNav';

import StatsModal from '../components/profile/StatsModal';

import FollowersModal from '../components/profile/FollowersModal';

import FeaturedVideoSelector from '../components/video/FeaturedVideoSelector';

import SubscriptionTiers from '../components/creator/SubscriptionTiers';

import { useAppMenu } from '@/contexts/AppMenuContext';
import { useAuth } from '@/lib/AuthContext';
import { readGuestExplore } from '@/lib/guestExplore';
import { getCachedProfile, cacheProfile } from '@/services/offlineProfilesMessages.service';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


const PROFILE_PAGE_BG = 'bg-[#060913]';
const PROFILE_SURFACE = 'rounded-[28px] border border-white/8 bg-[#0b111d]/92 shadow-[0_24px_80px_rgba(2,6,23,0.34)] backdrop-blur-2xl';
const PROFILE_ICON_BUTTON = 'flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#0b111d]/82 text-white/86 shadow-[0_14px_30px_rgba(2,6,23,0.22)] backdrop-blur-xl transition-all hover:bg-white/[0.08] active:scale-95';

function ProfileSectionCard({ className, children }) {
  return <div className={cn(PROFILE_SURFACE, className)}>{children}</div>;
}

function ProfileEmptyState({ icon: Icon, title, description, action }) {
  return (
    <ProfileSectionCard className="p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
        <Icon className="h-7 w-7 text-white/72" />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-[320px] text-sm leading-6 text-white/56">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </ProfileSectionCard>
  );
}

function ProfileGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: 9 }).map((_, index) => (
        <div key={index} className="aspect-[9/16] rounded-[18px] bg-white/[0.06] animate-pulse" />
      ))}
    </div>
  );
}


export default function Profile() {

  const navigate = useNavigate();

  const { openMenu } = useAppMenu();

  const { user, isLoadingAuth } = useAuth();
  const [isOwnProfile, setIsOwnProfile] = useState(true);

  const [profileUserId, setProfileUserId] = useState(null);

  const [activeTab, setActiveTab] = useState('videos');

  const [isFollowing, setIsFollowing] = useState(false);

  const [showStatsModal, setShowStatsModal] = useState(false);

  const [showFollowersModal, setShowFollowersModal] = useState(false);

  const [followersModalTab, setFollowersModalTab] = useState('followers');

  const [showFeaturedSelector, setShowFeaturedSelector] = useState(false);

  const [showSubscriptionTiers, setShowSubscriptionTiers] = useState(false);
  const [pendingDeleteVideo, setPendingDeleteVideo] = useState(null);
  const [searchParams] = useSearchParams();

  // Determiner profileUserId depuis l'URL (userId ou _userId) + utilisateur courant du contexte
  useEffect(() => {
    const urlUserId = searchParams.get('userId') || searchParams.get('_userId');

    if (urlUserId) {
      setProfileUserId(urlUserId);
      setIsOwnProfile(!user || urlUserId === user.id);
      return;
    }

    if (user?.id) {
      setProfileUserId(user.id);
      setIsOwnProfile(true);
    } else {
      setProfileUserId(null);
      setIsOwnProfile(true);
    }
  }, [searchParams, user?.id]);



  // Fetch profile user if viewing someone else's profile

  const { data: profileUser } = useQuery({
    queryKey: ['user', profileUserId],
    queryFn: async () => {
      if (isOwnProfile) return user;
      const cached = await getCachedProfile(profileUserId);
      let profile = cached?.profile || null;
      try {
        const fresh = await api.users.getById(profileUserId);
        profile = fresh;
        cacheProfile(profileUserId, fresh).catch(() => {});
      } catch {
        // hors-ligne : on reste sur le cache
      }
      return profile;
    },
    enabled: !!profileUserId,
    initialData: undefined,
  });



  const queryClient = useQueryClient();

  // Fetch videos avec pagination "Voir plus"
  const PROFILE_VIDEOS_LIMIT = 30;
  const {
    data: videosData,
    isLoading: videosLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch: refetchVideos,
  } = useInfiniteQuery({
    queryKey: ['profile-videos', profileUserId, user?.id],
    queryFn: async ({ pageParam = 1 }) => {
      if (!profileUserId) return { videos: [], pagination: { page: 1, totalPages: 1 } };
      const ownProfile = user?.id === profileUserId;
      const params = ownProfile
        ? { creator_id: profileUserId, visibility: 'creator', page: pageParam, limit: PROFILE_VIDEOS_LIMIT }
        : { creator_id: profileUserId, page: pageParam, limit: PROFILE_VIDEOS_LIMIT };
      const result = await api.videos.list(params);
      const list = result?.videos || (Array.isArray(result) ? result : []);
      const filtered = list.filter((v) => (v.creator_id || v.creator?.id) === profileUserId);
      return { videos: filtered, pagination: result?.pagination || { page: pageParam, totalPages: 1 } };
    },
    getNextPageParam: (last) => {
      const p = last?.pagination;
      if (!p || p.page >= (p.totalPages || 1)) return undefined;
      return (p.page || 1) + 1;
    },
    initialPageParam: 1,
    enabled: !!profileUserId,
    staleTime: 0,
  });

  const videos = videosData?.pages?.flatMap((p) => p.videos ?? []) ?? [];

  const handleDeleteVideo = async (video) => {
    setPendingDeleteVideo(video);
  };

  const confirmDeleteVideo = async () => {
    if (!pendingDeleteVideo) return;
    try {
      await api.videos.delete(pendingDeleteVideo.id);
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['profile-videos', profileUserId] });
      await refetchVideos();
      toast.success('Video supprimee');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la suppression');
    } finally {
      setPendingDeleteVideo(null);
    }
  };



  // Fetch saved videos (only for own profile)

  const { data: savedVideos = [] } = useQuery({

    queryKey: ['saved-videos', profileUserId],

    queryFn: async () => {

      if (!profileUserId) return [];

      // Recuperer toutes les videos sauvegardees sans limite

      const result = await api.saves.list({ user_id: profileUserId, page: 1, limit: 30 });

      return result?.videos || [];

    },

    enabled: !!profileUserId && isOwnProfile

  });



  // Fetch liked videos

  const { data: likedVideos = [] } = useQuery({

    queryKey: ['liked-videos', profileUserId],

    queryFn: async () => {

      if (!profileUserId) return [];

      try {

        // Utiliser la methode dediee pour les videos likees (sans limite)

        const videos = await api.users.getLikedVideos(profileUserId, { limit: 30 });

        if (videos && Array.isArray(videos) && videos.length > 0) {

          return videos;

        }

        // Fallback: utiliser l'entite Like si necessaire

        const likes = await api.entities.Like.filter({ user_id: profileUserId }, '', 0);

        if (!likes || likes.length === 0) return [];

        // Extraire les IDs des videos likees

        const videoIds = likes.map(l => l.video_id || l.id).filter(Boolean);

        if (videoIds.length === 0) return [];

        // Recuperer chaque video (sans limite)

        const fallbackVideos = await Promise.all(

          videoIds.map(id => 

            api.videos.getById(id).catch(() => null)

          )

        );

        return fallbackVideos.filter(Boolean);

      } catch (error) {

        console.error('Error fetching liked videos:', error);

        return [];

      }

    },

    enabled: !!profileUserId

  });

  // Vidéos likées par l'utilisateur connecté (pour afficher le cœur rouge sur les cartes)
  const { data: currentUserLikedVideos = [] } = useQuery({
    queryKey: ['liked-videos', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const list = await api.users.getLikedVideos(user.id, { limit: 0 });
      return Array.isArray(list) ? list : (list?.videos || []);
    },
    enabled: !!user?.id,
  });
  const likedByMeIds = React.useMemo(
    () => new Set((currentUserLikedVideos || []).map((v) => v.id).filter(Boolean)),
    [currentUserLikedVideos]
  );

  // Fetch products (for sellers)

  const { data: products = [] } = useQuery({

    queryKey: ['profile-products', profileUserId],

    queryFn: async () => {

      if (!profileUserId) return [];

      // Recuperer tous les produits sans limite

      const result = await api.products.list({ seller_id: profileUserId, page: 1, limit: 50 });

      return result?.products || (Array.isArray(result) ? result : []);

    },

    enabled: !!profileUserId

  });



  // Fetch order stats (analytics acheteur) - propre profil uniquement
  const { data: orderStats } = useQuery({
    queryKey: ['order-stats', profileUserId],
    queryFn: () => api.orders.getStats(),
    enabled: !!profileUserId && isOwnProfile,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch follow stats

  const { data: followStats = { followers: 0, following: 0 } } = useQuery({

    queryKey: ['follow-stats', profileUserId],

    queryFn: async () => {

      if (!profileUserId) return { followers: 0, following: 0 };

      try {

        const stats = await api.users.getStats(profileUserId);

        return { 

          followers: stats?.stats?.followers || stats?.followers_count || stats?.followers || 0, 

          following: stats?.stats?.following || stats?.following_count || stats?.following || 0,
          wonderers: stats?.stats?.wonderers ?? stats?.stats?.followers ?? 0

        };

      } catch (error) {

        // Fallback: utiliser les endpoints de followers/following

        try {

          const [followersRes, followingRes] = await Promise.all([

            api.users.getFollowers(profileUserId).catch(() => ({ followers: [] })),

            api.users.getFollowing(profileUserId).catch(() => ({ following: [] }))

          ]);

          return {

            followers: Array.isArray(followersRes?.followers) ? followersRes.followers.length : 

                      Array.isArray(followersRes) ? followersRes.length : 0,

            following: Array.isArray(followingRes?.following) ? followingRes.following.length : 

                      Array.isArray(followingRes) ? followingRes.length : 0

          };

        } catch {

          return { followers: 0, following: 0 };

        }

      }

    },

    enabled: !!profileUserId

  });

  const { data: closeFriendsList = [] } = useQuery({
    queryKey: ['close-friends', user?.id],
    queryFn: () => api.me.getCloseFriends(),
    enabled: !!user?.id && !!profileUserId && !isOwnProfile,
  });
  const isCloseFriend = Array.isArray(closeFriendsList) && !!profileUserId && closeFriendsList.some(
    (f) => (typeof f === 'string' ? f === profileUserId : (f?.id ?? f?.friend_id) === profileUserId)
  );
  const addCloseFriendMutation = useMutation({
    mutationFn: (friendId) => api.me.addCloseFriend(friendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['close-friends', user?.id] });
      toast.success('Ajouté aux proches');
    },
    onError: () => toast.error('Impossible d\'ajouter aux proches'),
  });
  const removeCloseFriendMutation = useMutation({
    mutationFn: (friendId) => api.me.removeCloseFriend(friendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['close-friends', user?.id] });
      toast.success('Retiré des proches');
    },
    onError: () => toast.error('Impossible de retirer des proches'),
  });

  // Sync isFollowing depuis profileUser ou getFollowing (Wonder = Follow synchronise)
  useEffect(() => {
    if (isOwnProfile || !profileUserId) return;
    if (profileUser?.isFollowing !== undefined) {
      setIsFollowing(!!profileUser.isFollowing);
      return;
    }
    if (user) {
      api.users.getFollowing(user.id)
        .then(result => {
          const following = result?.following || (Array.isArray(result) ? result : []);
          setIsFollowing(following.some(f =>
            (typeof f === 'string' ? f === profileUserId : f.following_id === profileUserId || f.id === profileUserId)
          ));
        })
        .catch(() => setIsFollowing(false));
    }
  }, [user, profileUserId, isOwnProfile, profileUser?.isFollowing]);






  // Calculate total likes and stats

  const totalLikes = videos.reduce((acc, v) => acc + (v.likes || 0), 0);

  const stats = {

    total_views: videos.reduce((sum, v) => sum + (v.views || 0), 0),

    total_likes: videos.reduce((sum, v) => sum + (v.likes || 0), 0),

    total_comments: videos.reduce((sum, v) => sum + (v.comments_count || 0), 0),

    total_shares: videos.reduce((sum, v) => sum + (v.shares || 0), 0),

    engagement_rate: videos.length > 0 

      ? (((videos.reduce((sum, v) => sum + (v.likes || 0) + (v.comments_count || 0), 0)) / 

          (videos.reduce((sum, v) => sum + (v.views || 0), 0) || 1)) * 100).toFixed(1)

      : 0

  };

  

  const featuredVideo = videos.find(v => v.is_featured);



  const displayUser = isOwnProfile ? user : profileUser;

  

  // Publier = visibles (public + abonnes), Brouillons = prive
  const publishedVideos = videos.filter((v) => v.visibility !== 'prive');
  const draftVideos = videos.filter((v) => v.visibility === 'prive');
  const totalVideosCount = publishedVideos.length;



  const handleWonder = async () => {

    if (!user) {

      navigate('/');

      return;

    }



    try {

      const result = await api.users.toggleWonder(profileUserId);

      const inWonder = result?.data?.inWonder ?? result?.inWonder ?? !isFollowing;

      setIsFollowing(inWonder);

      if (inWonder) {

        toast.success('Vous etes maintenant dans son Wonder');

      }

      if (typeof queryClient?.invalidateQueries === 'function') {

        queryClient.invalidateQueries({ queryKey: ['follow-stats', profileUserId] });

        queryClient.invalidateQueries({ queryKey: ['user-follows', user?.id] });

      }

    } catch (error) {

      console.error('Error toggling wonder:', error);

      toast.error('Une erreur est survenue');

    }

  };



  const VideoGrid = ({ videos, isOwnProfile, onDeleteVideo = (_video) => {}, likedByMeIds = new Set() }) => (

    <div className="grid grid-cols-3 gap-1">

      {videos.map((video, index) => (

        <div

          key={video.id}

          className="group relative aspect-[9/16] overflow-hidden rounded-[18px] border border-white/8 bg-white/[0.04] cursor-pointer"

        >

          <Link to={`${createPageUrl('VideoView')}?id=${video.id}`} className="block w-full h-full">

            <motion.div

              initial={{ opacity: 0 }}

              animate={{ opacity: 1 }}

              transition={{ delay: index * 0.03 }}

              className="relative h-full w-full overflow-hidden bg-[#111827]"

            >
              {video.media_type === 'image' ? (
                <OptimizedImage
                  src={getAbsoluteImageUrl(video.thumbnail_url || video.video_url)}
                  alt={video.title}
                  className="w-full h-full object-cover absolute inset-0"
                  priority={false}
                />
              ) : getVideoPrimarySourceUrlForFrameGrab(video) ? (
                <div className="absolute inset-0 w-full h-full">
                  <VideoFrameThumbnail
                    videoUrl={getVideoPrimarySourceUrlForFrameGrab(video)}
                    thumbnailUrl={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full"
                    skipThumbnailOnly
                  />
                </div>
              ) : isValidThumbnailUrl(video.thumbnail_url, getVideoPrimarySourceUrl(video)) ? (
                <OptimizedImage
                  src={getAbsoluteImageUrl(video.thumbnail_url)}
                  alt={video.title}
                  className="w-full h-full object-cover absolute inset-0"
                  priority={false}
                />
              ) : (
                <OptimizedImage
                  src={VIDEO_PLACEHOLDER_IMG}
                  alt={video.title}
                  className="w-full h-full object-cover absolute inset-0"
                  priority={false}
                />
              )}

              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-colors group-hover:bg-black/28 group-hover:opacity-100">

                <Play className="w-8 h-8 text-white fill-white" />

              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/10 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-2 text-xs text-white drop-shadow">

                <div className="flex items-center gap-1" title="Vues">

                  <Play className="w-3 h-3 fill-white shrink-0" />

                  <span>{((video.views || 0) >= 1000) ? `${((video.views || 0)/1000).toFixed(0)}K` : (video.views || 0)}</span>

                </div>

                <div className="flex items-center gap-1" title="Likes">

                  <Heart className={cn('w-3 h-3 shrink-0', likedByMeIds.has(video.id) ? 'fill-red-500 text-red-500' : 'fill-white text-white')} />

                  <span>{(video.likes ?? 0) >= 1000 ? `${((video.likes ?? 0)/1000).toFixed(0)}K` : (video.likes ?? 0)}</span>

                </div>

              </div>

            </motion.div>

          </Link>

          {isOwnProfile && (

            <div className="pointer-events-none absolute left-1 right-1 top-1 z-10 flex justify-between">
              <div className="pointer-events-auto flex gap-1">
                <Link to={`${createPageUrl('Create')}?edit=${video.id}`} onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="rounded-xl border border-white/12 bg-black/32 p-1.5 text-white transition-all hover:bg-black/56" aria-label="Modifier la vidéo">
                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </Link>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteVideo?.(video); }}
                  className="rounded-xl border border-white/12 bg-black/32 p-1.5 text-white transition-all hover:bg-red-600/90"
                  aria-label="Supprimer la vidéo"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

          )}

        </div>

      ))}

    </div>

  );



  if (!displayUser && !profileUserId) {
    if (isLoadingAuth) {
      return (
        <div className={`w-full min-h-screen flex flex-col items-center justify-center ${PROFILE_PAGE_BG}`}>
          <div className="text-center px-6">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full border-4 border-white/18 border-t-white/80 animate-spin" />
            <p className="text-white/56">Chargement...</p>
          </div>
          <div className="mt-8 w-full">
            <BottomNav />
          </div>
        </div>
      );
    }
    if (readGuestExplore() && !user?.id) {
      return (
        <div className={`w-full min-h-screen flex flex-col items-center justify-center px-6 pb-28 ${PROFILE_PAGE_BG}`}>
          <ProfileEmptyState
            icon={User}
            title="Votre profil"
            description="Créez un compte ou connectez-vous pour publier, suivre des créateurs et utiliser le wallet."
            action={
              <Button
                type="button"
                className="rounded-2xl bg-blue-600 px-6 text-white hover:bg-blue-500"
                onClick={() => navigate(createPageUrl('Landing'))}
              >
                Se connecter ou s&apos;inscrire
              </Button>
            }
          />
          <div className="fixed bottom-0 left-0 right-0 w-full">
            <BottomNav />
          </div>
        </div>
      );
    }
    return (
      <div className={`w-full min-h-screen flex flex-col items-center justify-center ${PROFILE_PAGE_BG}`}>
        <div className="text-center px-6">
          <p className="text-white/56">Profil indisponible.</p>
        </div>
        <div className="mt-8 w-full">
          <BottomNav />
        </div>
      </div>
    );
  }



  return (

    <div className={`w-full min-h-screen pb-32 ${PROFILE_PAGE_BG}`}>

      <div className="fixed top-4 left-4 z-50" aria-hidden={false}>

        <button

          onClick={() => {

            if (window.history.length > 1) {

              navigate(-1);

            } else {

              navigate('/Home');

            }

          }}

          className={PROFILE_ICON_BUTTON}

          aria-label="Retour"

        >

          <ArrowLeft className="w-5 h-5" />

        </button>

      </div>

      <div className="fixed top-4 right-4 z-50">

        <button

          onClick={openMenu}

          className={PROFILE_ICON_BUTTON}

          aria-label="Ouvrir le menu"

        >

          <Menu className="w-5 h-5" />

        </button>

      </div>



      <ProfileHeader

        user={displayUser}

        isOwnProfile={isOwnProfile}

        isFollowing={isFollowing}

        stats={{

          followers: followStats.followers,

          following: followStats.following,

          wonderers: followStats.wonderers ?? followStats.followers,

          likes: totalLikes,

          videos: totalVideosCount

        }}

        onFollow={handleWonder}

        onMessage={() => navigate(`${createPageUrl('Chat')}?userId=${profileUserId}`)}

        onEdit={() => navigate(createPageUrl('Settings'))}

        onSettings={() => navigate(createPageUrl('Settings'))}

        onWallet={() => navigate(createPageUrl('Wallet'))}

        _onShare={() => {

          navigator.clipboard.writeText(window.location.href);

        }}

        onStatsClick={() => setShowStatsModal(true)}

        onFollowersClick={() => {

          setFollowersModalTab('followers');

          setShowFollowersModal(true);

        }}

        onFollowingClick={() => {

          setFollowersModalTab('following');

          setShowFollowersModal(true);

        }}

        onSubscriptionTiers={() => setShowSubscriptionTiers(true)}

        isCloseFriend={isCloseFriend}

        onAddCloseFriend={!isOwnProfile && profileUserId ? () => addCloseFriendMutation.mutate(profileUserId) : undefined}

        onRemoveCloseFriend={!isOwnProfile && profileUserId ? () => removeCloseFriendMutation.mutate(profileUserId) : undefined}

      />

      <div className="mx-auto max-w-5xl px-4">
      {isOwnProfile && orderStats && (orderStats.order_count > 0 || orderStats.total_spent > 0) && (
        <ProfileSectionCard className="mt-4 p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium text-white/84">Mes achats</span>
            {orderStats.is_loyal_client && (
              <span className="rounded-full border border-white/12 bg-white/[0.05] px-2 py-0.5 text-xs font-medium text-white/72">Client fidèle</span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/62">
            <span>{orderStats.order_count} commande{orderStats.order_count !== 1 ? 's' : ''}</span>
            <span>{Number(orderStats.total_spent || 0).toLocaleString('fr-FR')} {orderStats.currency || 'FCFA'} dépensés</span>
            {orderStats.favorite_category && <span>Catégorie préférée : {orderStats.favorite_category}</span>}
          </div>
          {orderStats.yearly_history && Object.keys(orderStats.yearly_history).length > 0 && (
            <p className="mt-2 text-xs text-white/42">Historique : {Object.entries(orderStats.yearly_history).map(([y, total]) => `${y}: ${Number(total).toLocaleString('fr-FR')} FCFA`).join(' - ')}</p>
          )}
        </ProfileSectionCard>
      )}

      <div className="sticky top-0 z-30 mt-4">
        <ProfileSectionCard className="rounded-[24px] px-2 py-2">

        <Tabs value={activeTab} onValueChange={setActiveTab}>

          <TabsList className="h-auto w-full justify-around bg-transparent p-0">

            <TabsTrigger 

              value="videos"

              className="flex-1 rounded-2xl border border-transparent py-3 text-white/50 data-[state=active]:border-white/12 data-[state=active]:bg-white/[0.06] data-[state=active]:text-white data-[state=active]:shadow-none"

            >

              <Grid3X3 className="w-5 h-5" />

            </TabsTrigger>

            {isOwnProfile && (
              <>
                <TabsTrigger 

                  value="brouillons"

                  className="flex-1 rounded-2xl border border-transparent py-3 text-white/50 data-[state=active]:border-white/12 data-[state=active]:bg-white/[0.06] data-[state=active]:text-white data-[state=active]:shadow-none"

                >

                  <FileText className="w-5 h-5" />

                </TabsTrigger>
                <TabsTrigger 

                  value="saved"

                  className="flex-1 rounded-2xl border border-transparent py-3 text-white/50 data-[state=active]:border-white/12 data-[state=active]:bg-white/[0.06] data-[state=active]:text-white data-[state=active]:shadow-none"

                >

                  <Bookmark className="w-5 h-5" />

                </TabsTrigger>
              </>

            )}

            <TabsTrigger 

              value="liked"

              className="flex-1 rounded-2xl border border-transparent py-3 text-white/50 data-[state=active]:border-white/12 data-[state=active]:bg-white/[0.06] data-[state=active]:text-white data-[state=active]:shadow-none"

            >

              <Heart className="w-5 h-5" />

            </TabsTrigger>

            {products.length > 0 && (
              <>
                <TabsTrigger 

                  value="shop"

                  className="flex-1 rounded-2xl border border-transparent py-3 text-white/50 data-[state=active]:border-white/12 data-[state=active]:bg-white/[0.06] data-[state=active]:text-white data-[state=active]:shadow-none"

                >

                  <ShoppingBag className="w-5 h-5" />

                </TabsTrigger>
              </>

            )}

          </TabsList>

        </Tabs>

        </ProfileSectionCard>
      </div>



      {/* Call to Action - When no videos */}

      {activeTab === 'videos' && publishedVideos.length === 0 && !videosLoading && isOwnProfile && (

        <div className="py-4">

          <ProfileSectionCard className="p-6 text-center">

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]">

              <Play className="w-8 h-8" />

            </div>

            <h3 className="text-xl font-bold mb-2">Publiez votre premiere video !</h3>

            <p className="mb-6 text-sm text-white/68">

              Partagez vos talents et connectez-vous avec la communaute AfriWonder

            </p>

            <Link to={createPageUrl('Create')}>

              <button className="rounded-full bg-white px-8 py-3.5 font-bold text-slate-950 transition-all hover:bg-white/92">

                Commencer maintenant

              </button>

            </Link>

          </ProfileSectionCard>

        </div>

      )}



      {/* Featured Video */}

      {activeTab === 'videos' && videos.length > 0 && (

        <div className="py-4">

          <div className="mb-3 flex items-center justify-between">

            <h3 className="text-sm font-semibold text-white/72">Video mise en avant</h3>

            {isOwnProfile && (

              <button

                onClick={() => setShowFeaturedSelector(true)}

                className="text-xs font-medium text-white/72 hover:text-white"

              >

                {featuredVideo ? 'Modifier' : 'Choisir'}

              </button>

            )}

          </div>

          

          {featuredVideo ? (

            <Link to={`${createPageUrl('VideoView')}?id=${featuredVideo.id}`}>

              <ProfileSectionCard className="relative aspect-video overflow-hidden rounded-[28px]">
              
                {featuredVideo.media_type === 'image' ? (
                  <OptimizedImage
                    src={getAbsoluteImageUrl(featuredVideo.thumbnail_url || featuredVideo.video_url)}
                    alt={featuredVideo.title}
                    className="w-full h-full object-cover"
                    priority={false}
                  />
                ) : getVideoPrimarySourceUrlForFrameGrab(featuredVideo) ? (
                  <VideoFrameThumbnail
                    videoUrl={getVideoPrimarySourceUrlForFrameGrab(featuredVideo)}
                    thumbnailUrl={featuredVideo.thumbnail_url}
                    alt={featuredVideo.title}
                    className="w-full h-full"
                    skipThumbnailOnly
                  />
                ) : isValidThumbnailUrl(featuredVideo.thumbnail_url, getVideoPrimarySourceUrl(featuredVideo)) ? (
                  <OptimizedImage
                    src={getAbsoluteImageUrl(featuredVideo.thumbnail_url)}
                    alt={featuredVideo.title}
                    className="w-full h-full object-cover"
                    priority={false}
                  />
                ) : (
                  <OptimizedImage
                    src={VIDEO_PLACEHOLDER_IMG}
                    alt={featuredVideo.title}
                    className="w-full h-full object-cover"
                    priority={false}
                  />
                )}

                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/72 to-transparent p-4">

                  <div>

                    <p className="text-white font-semibold mb-1">{featuredVideo.title}</p>

                    <p className="text-sm text-white/72">{(featuredVideo.views || 0)} vues - {featuredVideo.likes || 0} likes</p>

                  </div>

                </div>

              </ProfileSectionCard>

            </Link>

          ) : isOwnProfile ? (

            <ProfileSectionCard className="p-6 text-center">

              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]">

                <Play className="w-8 h-8" />

              </div>

              <h3 className="text-xl font-bold mb-2">Choisir une Video mise en avant</h3>

              <p className="mb-6 text-sm text-white/68">

                Elle sera affichee en grand sur votre profil

              </p>

              <button

                onClick={() => setShowFeaturedSelector(true)}

                className="rounded-full bg-white px-8 py-3.5 font-bold text-slate-950 transition-all hover:bg-white/92"

              >

                Choisir

              </button>

            </ProfileSectionCard>

          ) : null}

        </div>

      )}



      {/* Content */}

      <div className="space-y-4 pb-4">

        {activeTab === 'videos' && (

          videosLoading ? (

            <ProfileGridSkeleton />

          ) : publishedVideos.length > 0 ? (

            <>

              <VideoGrid videos={publishedVideos} isOwnProfile={isOwnProfile} onDeleteVideo={handleDeleteVideo} likedByMeIds={likedByMeIds} />

              {hasNextPage && (
                <div className="flex justify-center pt-4">
                  <button
                    type="button"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="rounded-full bg-white px-6 py-2.5 font-medium text-slate-950 transition-colors hover:bg-white/92 disabled:opacity-60"
                  >
                    {isFetchingNextPage ? 'Chargement...' : 'Voir plus'}
                  </button>
                </div>
              )}
            </>

          ) : null

        )}



        {activeTab === 'brouillons' && isOwnProfile && (

          draftVideos.length > 0 ? (

            <VideoGrid videos={draftVideos} isOwnProfile={true} onDeleteVideo={handleDeleteVideo} likedByMeIds={likedByMeIds} />

          ) : (
            <ProfileEmptyState
              icon={FileText}
              title="Aucun brouillon"
              description="Les videos en prive apparaissent ici jusqu'a leur publication."
            />

          )

        )}



        {activeTab === 'saved' && isOwnProfile && (

          savedVideos.length > 0 ? (

            <VideoGrid videos={savedVideos} isOwnProfile={false} likedByMeIds={likedByMeIds} />

          ) : (
            <ProfileEmptyState
              icon={Bookmark}
              title="Aucune video sauvegardee"
              description="Enregistrez du contenu pour le retrouver rapidement ici."
            />

          )

        )}



        {activeTab === 'liked' && (

          likedVideos.length > 0 ? (

            <VideoGrid videos={likedVideos} isOwnProfile={false} likedByMeIds={likedByMeIds} />

          ) : (
            <ProfileEmptyState
              icon={Heart}
              title="Aucun j'aime"
              description="Les videos appreciees apparaitront ici pour etre retrouvees plus vite."
            />

          )

        )}



        {activeTab === 'shop' && (

          <div className="grid grid-cols-2 gap-3">

            {products.map((product) => (

              <Link

                key={product.id}

                to={`${createPageUrl('Product')}?id=${product.id}`}

                className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0b111d]/92 shadow-[0_18px_54px_rgba(2,6,23,0.22)]"

              >

                <div className="aspect-square min-h-[140px] bg-white/[0.04]">
                  <OptimizedImage
                    src={getAbsoluteImageUrl(product.images?.[0]) || MARKETPLACE_PLACEHOLDER_IMG}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    priority={false}
                  />
                </div>

                <div className="p-3">

                  <p className="truncate text-sm font-medium text-white">{product.name}</p>

                  <p className="font-bold text-white/74">{product.price?.toLocaleString()} FCFA</p>

                </div>

              </Link>

            ))}

          </div>

        )}

      </div>
      </div>



      <BottomNav />



      <StatsModal 

        isOpen={showStatsModal}

        onClose={() => setShowStatsModal(false)}

        stats={stats}

      />



      <FollowersModal

        isOpen={showFollowersModal}

        onClose={() => setShowFollowersModal(false)}

        userId={profileUserId}

        initialTab={followersModalTab}

      />



      <FeaturedVideoSelector

        isOpen={showFeaturedSelector}

        onClose={() => setShowFeaturedSelector(false)}

        videos={videos}

        currentFeaturedId={featuredVideo?.id}

        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['profile-videos', profileUserId] });
          refetchVideos();
        }}

        _userId={profileUserId}

      />

      <AlertDialog open={!!pendingDeleteVideo} onOpenChange={(open) => !open && setPendingDeleteVideo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette video ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible. La video sera retiree definitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDeleteVideo}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>



      <SubscriptionTiers

        isOpen={showSubscriptionTiers}

        onClose={() => setShowSubscriptionTiers(false)}

        creatorId={profileUserId}

      />

    </div>

  );

}
