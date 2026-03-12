// AfriWonder full review PR - CodeRabbit
import React, { useState, useEffect } from 'react';

import { api } from '@/api/expressClient';

import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Grid3X3, Bookmark, Heart, ShoppingBag, Play, ArrowLeft, Pencil, Trash2, FileText, Menu } from 'lucide-react';

import { motion } from 'framer-motion';

import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { createPageUrl } from "@/utils";
import { cn, isValidThumbnailUrl, VIDEO_PLACEHOLDER_IMG, getAbsoluteImageUrl, MARKETPLACE_PLACEHOLDER_IMG } from "@/lib/utils";
import VideoFrameThumbnail from '../components/video/VideoFrameThumbnail';

import { toast } from "sonner";

import ProfileHeader from '../components/profile/ProfileHeader';

import BottomNav from '../components/navigation/BottomNav';

import StatsModal from '../components/profile/StatsModal';

import FollowersModal from '../components/profile/FollowersModal';

import FeaturedVideoSelector from '../components/video/FeaturedVideoSelector';

import SubscriptionTiers from '../components/creator/SubscriptionTiers';

import { useAppMenu } from '@/contexts/AppMenuContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';



export default function Profile() {

  const navigate = useNavigate();

  const { openMenu } = useAppMenu();

  const [user, setUser] = useState(null);

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

  // Determiner profileUserId depuis l'URL (userId ou _userId) puis charger l'utilisateur courant
  useEffect(() => {
    const urlUserId = searchParams.get('userId') || searchParams.get('_userId');

    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
        // Ne jamais ecraser : si l'URL a un userId, c'est le profil a afficher
        if (!urlUserId || urlUserId === u.id) {
          setIsOwnProfile(true);
          setProfileUserId(u.id);
        } else {
          setIsOwnProfile(false);
          setProfileUserId(urlUserId);
        }
      } catch (e) {
        if (!urlUserId) {
          navigate('/');
        } else {
          setProfileUserId(urlUserId);
          setIsOwnProfile(false);
        }
      }
    };

    getUser();
  }, [searchParams, navigate]);



  // Fetch profile user if viewing someone else's profile

  const { data: profileUser } = useQuery({

    queryKey: ['user', profileUserId],

    queryFn: async () => {

      if (isOwnProfile) return user;

      return await api.users.getById(profileUserId);

    },

    enabled: !!profileUserId

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

    <div className="grid grid-cols-3 gap-0.5">

      {videos.map((video, index) => (

        <div

          key={video.id}

          className="relative aspect-[9/16] bg-gray-100 cursor-pointer group"

        >

          <Link to={`${createPageUrl('VideoView')}?id=${video.id}`} className="block w-full h-full">

            <motion.div

              initial={{ opacity: 0 }}

              animate={{ opacity: 1 }}

              transition={{ delay: index * 0.03 }}

              className="relative w-full h-full overflow-hidden bg-gray-200"

            >
              {video.media_type === 'image' ? (
                <img
                  src={getAbsoluteImageUrl(video.thumbnail_url || video.video_url)}
                  alt={video.title}
                  className="w-full h-full object-cover absolute inset-0"
                />
              ) : video.video_url ? (
                <div className="absolute inset-0 w-full h-full">
                  <VideoFrameThumbnail
                    videoUrl={video.video_url}
                    thumbnailUrl={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full"
                    frameTime={2}
                  />
                </div>
              ) : isValidThumbnailUrl(video.thumbnail_url, video.video_url) ? (
                <img
                  src={getAbsoluteImageUrl(video.thumbnail_url)}
                  alt={video.title}
                  className="w-full h-full object-cover absolute inset-0"
                />
              ) : (
                <img
                  src={VIDEO_PLACEHOLDER_IMG}
                  alt={video.title}
                  className="w-full h-full object-cover absolute inset-0"
                />
              )}

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">

                <Play className="w-8 h-8 text-white fill-white" />

              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

              <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between text-white text-xs drop-shadow">

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

            <div className="absolute top-1 right-1 left-1 z-10 flex justify-between pointer-events-none">
              <div className="pointer-events-auto flex gap-1">
                <Link to={`${createPageUrl('Create')}?edit=${video.id}`} onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-lg transition-all" title="Modifier">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </Link>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteVideo?.(video); }}
                  className="bg-black/60 hover:bg-red-600/90 text-white p-1.5 rounded-lg transition-all"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          )}

        </div>

      ))}

    </div>

  );



  if (!displayUser && !profileUserId) {

    return (

      <div className="min-h-screen bg-gray-50 flex items-center justify-center">

        <div className="text-center">

          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />

          <p className="text-gray-500">Chargement...</p>

        </div>

        <BottomNav />

      </div>

    );

  }



  return (

    <div className="min-h-screen bg-gray-50 pb-32">

      {/* Back Button + Menu (Profil) */}

      <div className="fixed top-4 left-4 z-50">

        <button

          onClick={() => {

            if (window.history.length > 1) {

              navigate(-1);

            } else {

              navigate('/Home');

            }

          }}

          className="w-10 h-10 bg-blue-600/90 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-all shadow-lg active:scale-95"

        >

          <ArrowLeft className="w-5 h-5" />

        </button>

      </div>

      <div className="fixed top-4 right-4 z-50">

        <button

          onClick={openMenu}

          className="w-10 h-10 bg-blue-600/90 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-all shadow-lg active:scale-95"

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

      />

      {isOwnProfile && orderStats && (orderStats.order_count > 0 || orderStats.total_spent > 0) && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700">Mes achats</span>
            {orderStats.is_loyal_client && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">Client fidèle</span>
            )}
          </div>
          <div className="flex gap-4 mt-2 text-sm text-gray-600">
            <span>{orderStats.order_count} commande{orderStats.order_count !== 1 ? 's' : ''}</span>
            <span>{Number(orderStats.total_spent || 0).toLocaleString('fr-FR')} {orderStats.currency || 'FCFA'} dépensés</span>
            {orderStats.favorite_category && <span>Catégorie préférée : {orderStats.favorite_category}</span>}
          </div>
          {orderStats.yearly_history && Object.keys(orderStats.yearly_history).length > 0 && (
            <p className="text-xs text-gray-500 mt-1">Historique : {Object.entries(orderStats.yearly_history).map(([y, total]) => `${y}: ${Number(total).toLocaleString('fr-FR')} FCFA`).join(' - ')}</p>
          )}
        </div>
      )}

      <div className="sticky top-0 bg-white border-b border-gray-100 z-30">

        <Tabs value={activeTab} onValueChange={setActiveTab}>

          {/* @ts-expect-error - TabsList accepts children via forwardRef */}
          <TabsList className="w-full bg-transparent h-12 p-0 justify-around">

            {/* @ts-expect-error - TabsTrigger accepts children via forwardRef */}
            <TabsTrigger 

              value="videos"

              className="flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary"

            >

              <Grid3X3 className="w-5 h-5" />

            </TabsTrigger>

            {isOwnProfile && (
              <>
                {/* @ts-expect-error - TabsTrigger accepts children via forwardRef */}
                <TabsTrigger 

                  value="brouillons"

                  className="flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary"

                >

                  <FileText className="w-5 h-5" />

                </TabsTrigger>
                {/* @ts-expect-error - TabsTrigger accepts children via forwardRef */}
                <TabsTrigger 

                  value="saved"

                  className="flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary"

                >

                  <Bookmark className="w-5 h-5" />

                </TabsTrigger>
              </>

            )}

            {/* @ts-expect-error - TabsTrigger accepts children via forwardRef */}
            <TabsTrigger 

              value="liked"

              className="flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary"

            >

              <Heart className="w-5 h-5" />

            </TabsTrigger>

            {products.length > 0 && (
              <>
                {/* @ts-expect-error - TabsTrigger accepts children via forwardRef */}
                <TabsTrigger 

                  value="shop"

                  className="flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary"

                >

                  <ShoppingBag className="w-5 h-5" />

                </TabsTrigger>
              </>

            )}

          </TabsList>

        </Tabs>

      </div>



      {/* Call to Action - When no videos */}

      {activeTab === 'videos' && publishedVideos.length === 0 && !videosLoading && isOwnProfile && (

        <div className="p-4 pb-8">

          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-center text-white shadow-lg">

            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">

              <Play className="w-8 h-8" />

            </div>

            <h3 className="text-xl font-bold mb-2">Publiez votre premiere video !</h3>

            <p className="text-white/90 text-sm mb-6">

              Partagez vos talents et connectez-vous avec la communaute AfriWonder

            </p>

            <Link to={createPageUrl('Create')}>

              <button className="bg-white text-primary px-8 py-3.5 rounded-full font-bold hover:bg-gray-50 transition-all transform hover:scale-105 shadow-md">

                Commencer maintenant

              </button>

            </Link>

          </div>

        </div>

      )}



      {/* Featured Video */}

      {activeTab === 'videos' && videos.length > 0 && (

        <div className="p-4">

          <div className="flex items-center justify-between mb-2">

            <h3 className="text-sm font-semibold text-gray-600">Video mise en avant</h3>

            {isOwnProfile && (

              <button

                onClick={() => setShowFeaturedSelector(true)}

                className="text-primary text-xs font-medium"

              >

                {featuredVideo ? 'Modifier' : 'Choisir'}

              </button>

            )}

          </div>

          

          {featuredVideo ? (

            <Link to={`${createPageUrl('VideoView')}?id=${featuredVideo.id}`}>

              <div className="relative aspect-video bg-gray-200 rounded-2xl overflow-hidden">

                {featuredVideo.media_type === 'image' ? (
                  <img
                    src={getAbsoluteImageUrl(featuredVideo.thumbnail_url || featuredVideo.video_url)}
                    alt={featuredVideo.title}
                    className="w-full h-full object-cover"
                  />
                ) : featuredVideo.video_url ? (
                  <VideoFrameThumbnail
                    videoUrl={featuredVideo.video_url}
                    thumbnailUrl={featuredVideo.thumbnail_url}
                    alt={featuredVideo.title}
                    className="w-full h-full"
                    frameTime={2}
                  />
                ) : isValidThumbnailUrl(featuredVideo.thumbnail_url, featuredVideo.video_url) ? (
                  <img src={getAbsoluteImageUrl(featuredVideo.thumbnail_url)} alt={featuredVideo.title} className="w-full h-full object-cover" />
                ) : (
                  <img
                    src={VIDEO_PLACEHOLDER_IMG}
                    alt={featuredVideo.title}
                    className="w-full h-full object-cover"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">

                  <div>

                    <p className="text-white font-semibold mb-1">{featuredVideo.title}</p>

                    <p className="text-white/80 text-sm">{(featuredVideo.views || 0)} vues - {featuredVideo.likes || 0} likes</p>

                  </div>

                </div>

              </div>

            </Link>

          ) : isOwnProfile ? (

            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-center text-white shadow-lg">

              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">

                <Play className="w-8 h-8" />

              </div>

              <h3 className="text-xl font-bold mb-2">Choisir une Video mise en avant</h3>

              <p className="text-white/90 text-sm mb-6">

                Elle sera affichee en grand sur votre profil

              </p>

              <button

                onClick={() => setShowFeaturedSelector(true)}

                className="bg-white text-primary px-8 py-3.5 rounded-full font-bold hover:bg-gray-50 transition-all transform hover:scale-105 shadow-md"

              >

                Choisir

              </button>

            </div>

          ) : null}

        </div>

      )}



      {/* Content */}

      <div>

        {activeTab === 'videos' && (

          videosLoading ? (

            <div className="text-center py-16">

              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />

              <p className="text-gray-500">Chargement des videos...</p>

            </div>

          ) : publishedVideos.length > 0 ? (

            <>

              <VideoGrid videos={publishedVideos} isOwnProfile={isOwnProfile} onDeleteVideo={handleDeleteVideo} likedByMeIds={likedByMeIds} />

              {hasNextPage && (
                <div className="p-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="px-6 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-medium rounded-full transition-colors"
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

            <div className="text-center py-16">

              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />

              <p className="text-gray-500">Aucun brouillon</p>

              <p className="text-gray-400 text-sm mt-1">Les videos en prive apparaissent ici</p>

            </div>

          )

        )}



        {activeTab === 'saved' && isOwnProfile && (

          savedVideos.length > 0 ? (

            <VideoGrid videos={savedVideos} isOwnProfile={false} likedByMeIds={likedByMeIds} />

          ) : (

            <div className="text-center py-16">

              <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />

              <p className="text-gray-500">Aucune video sauvegardee</p>

            </div>

          )

        )}



        {activeTab === 'liked' && (

          likedVideos.length > 0 ? (

            <VideoGrid videos={likedVideos} isOwnProfile={false} likedByMeIds={likedByMeIds} />

          ) : (

            <div className="text-center py-16">

              <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />

              <p className="text-gray-500">Aucun j'aime</p>

            </div>

          )

        )}



        {activeTab === 'shop' && (

          <div className="p-4 grid grid-cols-2 gap-3">

            {products.map((product) => (

              <Link

                key={product.id}

                to={`${createPageUrl('Product')}?id=${product.id}`}

                className="bg-white rounded-xl overflow-hidden shadow-sm"

              >

                <div className="aspect-square min-h-[140px] bg-gray-100">
                  <img
                    src={getAbsoluteImageUrl(product.images?.[0]) || MARKETPLACE_PLACEHOLDER_IMG}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.onerror = null; e.target.src = MARKETPLACE_PLACEHOLDER_IMG; }}
                  />
                </div>

                <div className="p-3">

                  <p className="font-medium text-sm truncate">{product.name}</p>

                  <p className="text-primary font-bold">{product.price?.toLocaleString()} FCFA</p>

                </div>

              </Link>

            ))}

          </div>

        )}

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
