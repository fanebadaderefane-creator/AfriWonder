import React, { useState, useEffect } from 'react';

import { api } from '@/api/expressClient';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Grid3X3, Bookmark, Heart, ShoppingBag, Play, ArrowLeft, Pencil, Trash2 } from 'lucide-react';

import { motion } from 'framer-motion';

import { Link, useNavigate } from 'react-router-dom';

import { createPageUrl } from "@/utils";
import { getVideoPlaybackUrl } from "@/lib/utils";

import { toast } from "sonner";

import ProfileHeader from '../components/profile/ProfileHeader';

import BottomNav from '../components/navigation/BottomNav';

import StatsModal from '../components/profile/StatsModal';

import FollowersModal from '../components/profile/FollowersModal';

import FeaturedVideoSelector from '../components/video/FeaturedVideoSelector';

import SubscriptionTiers from '../components/creator/SubscriptionTiers';



export default function Profile() {

  const navigate = useNavigate();

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



  // Get URL params

  useEffect(() => {

    const params = new URLSearchParams(window.location.search);

    const userId = params.get('userId');

    setProfileUserId(userId);

  }, []);



  // Get current user

  useEffect(() => {

    const getUser = async () => {

      try {

        const u = await api.auth.me();

        setUser(u);

        if (!profileUserId || profileUserId === u.id) {

          setIsOwnProfile(true);

          setProfileUserId(u.id);

        } else {

          setIsOwnProfile(false);

        }

      } catch (e) {

        // Not logged in

        if (!profileUserId) {

          navigate('/');

        }

      }

    };

    getUser();

  }, [profileUserId, navigate]);



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

  // Fetch videos

  const { data: videos = [], isLoading: videosLoading, refetch: refetchVideos } = useQuery({

    queryKey: ['profile-videos', profileUserId],

    queryFn: async () => {

      if (!profileUserId) return [];

      // Récupérer toutes les vidéos sans limite

      const result = await api.entities.Video.filter({ creator_id: profileUserId }, '-created_date', 0);

      return Array.isArray(result) ? result : [];

    },

    enabled: !!profileUserId,

    staleTime: 0

  });

  const handleDeleteVideo = async (video) => {

    if (!window.confirm('Supprimer cette vidéo ? Cette action est irréversible.')) return;

    try {

      await api.videos.delete(video.id);

      queryClient.invalidateQueries({ queryKey: ['videos'] });

      queryClient.invalidateQueries({ queryKey: ['profile-videos', profileUserId] });

      await refetchVideos();

      toast.success('Vidéo supprimée');

    } catch (err) {

      console.error(err);

      toast.error('Erreur lors de la suppression');

    }

  };



  // Fetch saved videos (only for own profile)

  const { data: savedVideos = [] } = useQuery({

    queryKey: ['saved-videos', profileUserId],

    queryFn: async () => {

      if (!profileUserId) return [];

      // Récupérer toutes les vidéos sauvegardées sans limite

      const result = await api.saves.list({ user_id: profileUserId, page: 1, limit: 0 });

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

        // Utiliser la méthode dédiée pour les vidéos likées (sans limite)

        const videos = await api.users.getLikedVideos(profileUserId, { limit: 0 });

        if (videos && Array.isArray(videos) && videos.length > 0) {

          return videos;

        }

        // Fallback: utiliser l'entité Like si nécessaire

        const likes = await api.entities.Like.filter({ user_id: profileUserId }, '', 0);

        if (!likes || likes.length === 0) return [];

        // Extraire les IDs des vidéos likées

        const videoIds = likes.map(l => l.video_id || l.id).filter(Boolean);

        if (videoIds.length === 0) return [];

        // Récupérer chaque vidéo (sans limite)

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



  // Fetch products (for sellers)

  const { data: products = [] } = useQuery({

    queryKey: ['profile-products', profileUserId],

    queryFn: async () => {

      if (!profileUserId) return [];

      // Récupérer tous les produits sans limite

      const result = await api.products.list({ seller_id: profileUserId, page: 1, limit: 0 });

      return result?.products || (Array.isArray(result) ? result : []);

    },

    enabled: !!profileUserId

  });



  // Fetch order stats (analytics acheteur) — propre profil uniquement
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



  // Sync isFollowing depuis profileUser ou getFollowing (Wonder = Follow synchronisé)
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



  // Hide scrollbar on mount

  useEffect(() => {

    // Add class to body to hide scrollbar

    document.body.classList.add('hide-scrollbar-profile');

    

    // Add CSS to hide scrollbar

    const style = document.createElement('style');

    style.id = 'profile-scrollbar-hide';

    style.textContent = `

      body.hide-scrollbar-profile::-webkit-scrollbar,

      html.hide-scrollbar-profile::-webkit-scrollbar {

        display: none !important;

        width: 0 !important;

        height: 0 !important;

      }

      body.hide-scrollbar-profile {

        -ms-overflow-style: none !important;

        scrollbar-width: none !important;

      }

      html.hide-scrollbar-profile {

        -ms-overflow-style: none !important;

        scrollbar-width: none !important;

      }

    `;

    document.head.appendChild(style);

    document.documentElement.classList.add('hide-scrollbar-profile');

    

    return () => {

      // Cleanup

      document.body.classList.remove('hide-scrollbar-profile');

      document.documentElement.classList.remove('hide-scrollbar-profile');

      const existingStyle = document.getElementById('profile-scrollbar-hide');

      if (existingStyle) {

        document.head.removeChild(existingStyle);

      }

    };

  }, []);



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

  

  // Count total videos published

  const totalVideosCount = videos.length;



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

        toast.success('Vous êtes maintenant dans son Wonder ✨');

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



  const VideoGrid = ({ videos, isOwnProfile, onDeleteVideo = (_video) => {} }) => (

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

              className="relative w-full h-full"

            >

              {video.video_url ? (

                <video

                  src={getVideoPlaybackUrl(video.video_url)}

                  poster={video.thumbnail_url || undefined}

                  className="w-full h-full object-cover"

                  preload={video.thumbnail_url ? 'metadata' : 'auto'}

                  muted

                  playsInline

                  onLoadedMetadata={(e) => {

                    const videoEl = e.currentTarget;

                    if (!video.thumbnail_url && videoEl?.duration) {

                      videoEl.currentTime = Math.min(1, videoEl.duration / 10);

                    }

                  }}

                  onError={(e) => {

                    const videoEl = e.currentTarget;

                    if (videoEl?.style) {

                      videoEl.style.display = 'none';

                      const fallbackImg = videoEl.parentElement?.querySelector('.video-fallback-img');

                      if (fallbackImg instanceof HTMLElement) fallbackImg.style.display = 'block';

                    }

                  }}

                />

              ) : null}

              {!video.video_url && video.thumbnail_url && (

                <img

                  src={video.thumbnail_url}

                  alt={video.title}

                  className="w-full h-full object-cover"

                />

              )}

              {(!video.video_url && !video.thumbnail_url) && (

                <img

                  src="https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=300"

                  alt={video.title}

                  className="w-full h-full object-cover video-fallback-img"

                />

              )}

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">

                <Play className="w-8 h-8 text-white fill-white" />

              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

              <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between text-white text-xs drop-shadow">

                <div className="flex items-center gap-1">

                  <Play className="w-3 h-3 fill-white" />

                  <span>{((video.views || 0) >= 1000) ? `${((video.views || 0)/1000).toFixed(0)}K` : (video.views || 0)}</span>

                </div>

                <div className="flex items-center gap-1">

                  <span>❤️</span>

                  <span>{video.likes >= 1000 ? `${(video.likes/1000).toFixed(0)}K` : video.likes || 0}</span>

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

          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />

          <p className="text-gray-500">Chargement...</p>

        </div>

        <BottomNav />

      </div>

    );

  }



  return (

    <div className="min-h-screen bg-gray-50 pb-32 no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <style>{`
        .no-scrollbar {
          -ms-overflow-style: none; /* IE / Edge */
          scrollbar-width: none; /* Firefox */
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome / Safari / Opera */
        }
      `}</style>

      {/* Back Button */}

      <div className="fixed top-4 left-4 z-50">

        <button

          onClick={() => {

            if (window.history.length > 1) {

              navigate(-1);

            } else {

              navigate('/Home');

            }

          }}

          className="w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-gray-800 hover:bg-white transition-all shadow-lg active:scale-95"

        >

          <ArrowLeft className="w-5 h-5" />

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

        onMessage={() => window.location.href = `${createPageUrl('Chat')}?userId=${profileUserId}`}

        onEdit={() => window.location.href = createPageUrl('Settings')}

        onSettings={() => window.location.href = createPageUrl('Settings')}

        onWallet={() => window.location.href = createPageUrl('Wallet')}

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

      {/* Analytics achats (propre profil) */}
      {isOwnProfile && orderStats && (orderStats.order_count > 0 || orderStats.total_spent > 0) && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700">Mes achats</span>
            {orderStats.is_loyal_client && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">Client fidèle</span>
            )}
          </div>
          <div className="flex gap-4 mt-2 text-sm text-gray-600">
            <span>{orderStats.order_count} commande{orderStats.order_count !== 1 ? 's' : ''}</span>
            <span>{Number(orderStats.total_spent || 0).toLocaleString('fr-FR')} {orderStats.currency || 'FCFA'} dépensés</span>
            {orderStats.favorite_category && <span>Catégorie préférée : {orderStats.favorite_category}</span>}
          </div>
          {orderStats.yearly_history && Object.keys(orderStats.yearly_history).length > 0 && (
            <p className="text-xs text-gray-500 mt-1">Historique : {Object.entries(orderStats.yearly_history).map(([y, total]) => `${y}: ${Number(total).toLocaleString('fr-FR')} FCFA`).join(' • ')}</p>
          )}
        </div>
      )}

      {/* Tabs */}

      <div className="sticky top-0 bg-white border-b border-gray-100 z-30">

        <Tabs value={activeTab} onValueChange={setActiveTab}>

          {/* @ts-expect-error - TabsList accepts children via forwardRef */}
          <TabsList className="w-full bg-transparent h-12 p-0 justify-around">

            {/* @ts-expect-error - TabsTrigger accepts children via forwardRef */}
            <TabsTrigger 

              value="videos"

              className="flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500"

            >

              <Grid3X3 className="w-5 h-5" />

            </TabsTrigger>

            {isOwnProfile && (
              <>
                {/* @ts-expect-error - TabsTrigger accepts children via forwardRef */}
                <TabsTrigger 

                  value="saved"

                  className="flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500"

                >

                  <Bookmark className="w-5 h-5" />

                </TabsTrigger>
              </>

            )}

            {/* @ts-expect-error - TabsTrigger accepts children via forwardRef */}
            <TabsTrigger 

              value="liked"

              className="flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500"

            >

              <Heart className="w-5 h-5" />

            </TabsTrigger>

            {products.length > 0 && (
              <>
                {/* @ts-expect-error - TabsTrigger accepts children via forwardRef */}
                <TabsTrigger 

                  value="shop"

                  className="flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500"

                >

                  <ShoppingBag className="w-5 h-5" />

                </TabsTrigger>
              </>

            )}

          </TabsList>

        </Tabs>

      </div>



      {/* Call to Action - When no videos */}

      {activeTab === 'videos' && videos.length === 0 && isOwnProfile && (

        <div className="p-4 pb-8">

          <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-2xl p-6 text-center text-white shadow-lg">

            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">

              <Play className="w-8 h-8" />

            </div>

            <h3 className="text-xl font-bold mb-2">Publiez votre première vidéo !</h3>

            <p className="text-white/90 text-sm mb-6">

              Partagez vos talents et connectez-vous avec la communauté AfriVibe

            </p>

            <Link to={createPageUrl('Create')}>

              <button className="bg-white text-orange-500 px-8 py-3.5 rounded-full font-bold hover:bg-gray-50 transition-all transform hover:scale-105 shadow-md">

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

            <h3 className="text-sm font-semibold text-gray-600">Vidéo mise en avant</h3>

            {isOwnProfile && (

              <button

                onClick={() => setShowFeaturedSelector(true)}

                className="text-orange-500 text-xs font-medium"

              >

                {featuredVideo ? 'Modifier' : 'Choisir'}

              </button>

            )}

          </div>

          

          {featuredVideo ? (

            <Link to={`${createPageUrl('VideoView')}?id=${featuredVideo.id}`}>

              <div className="relative aspect-video bg-gray-200 rounded-2xl overflow-hidden">

                {featuredVideo.video_url ? (

                  <video

                    src={getVideoPlaybackUrl(featuredVideo.video_url)}

                    poster={featuredVideo.thumbnail_url || undefined}

                    className="w-full h-full object-cover"

                    preload={featuredVideo.thumbnail_url ? 'metadata' : 'auto'}

                    muted

                    playsInline

                    onLoadedMetadata={(e) => {

                      const videoEl = e.currentTarget;

                      if (!featuredVideo.thumbnail_url && videoEl && videoEl.duration) {

                        videoEl.currentTime = Math.min(1, videoEl.duration / 10);

                      }

                    }}

                    onError={(e) => {

                      const videoEl = e.currentTarget;

                      if (videoEl?.style) {

                        videoEl.style.display = 'none';

                        const fallbackImg = videoEl.parentElement?.querySelector('.featured-fallback-img');

                        if (fallbackImg instanceof HTMLElement) fallbackImg.style.display = 'block';

                      }

                    }}

                  />

                ) : null}

                {!featuredVideo.video_url && featuredVideo.thumbnail_url && (

                  <img src={featuredVideo.thumbnail_url} alt={featuredVideo.title} className="w-full h-full object-cover" />

                )}

                {(!featuredVideo.video_url && !featuredVideo.thumbnail_url) && (

                  <img

                    src="https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=600"

                    alt={featuredVideo.title}

                    className="w-full h-full object-cover featured-fallback-img"

                  />

                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">

                  <div>

                    <p className="text-white font-semibold mb-1">{featuredVideo.title}</p>

                    <p className="text-white/80 text-sm">{(featuredVideo.views || 0)} vues • {featuredVideo.likes || 0} likes</p>

                  </div>

                </div>

              </div>

            </Link>

          ) : isOwnProfile ? (

            <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-2xl p-6 text-center text-white shadow-lg">

              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">

                <Play className="w-8 h-8" />

              </div>

              <h3 className="text-xl font-bold mb-2">Choisir une vidéo mise en avant</h3>

              <p className="text-white/90 text-sm mb-6">

                Elle sera affichée en grand sur votre profil

              </p>

              <button

                onClick={() => setShowFeaturedSelector(true)}

                className="bg-white text-orange-500 px-8 py-3.5 rounded-full font-bold hover:bg-gray-50 transition-all transform hover:scale-105 shadow-md"

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

              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />

              <p className="text-gray-500">Chargement des vidéos...</p>

            </div>

          ) : videos.length > 0 ? (

            <VideoGrid videos={videos} isOwnProfile={isOwnProfile} onDeleteVideo={handleDeleteVideo} />

          ) : null

        )}



        {activeTab === 'saved' && isOwnProfile && (

          savedVideos.length > 0 ? (

            <VideoGrid videos={savedVideos} isOwnProfile={false} />

          ) : (

            <div className="text-center py-16">

              <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />

              <p className="text-gray-500">Aucune vidéo sauvegardée</p>

            </div>

          )

        )}



        {activeTab === 'liked' && (

          likedVideos.length > 0 ? (

            <VideoGrid videos={likedVideos} isOwnProfile={false} />

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

                <div className="aspect-square">

                  <img

                    src={product.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300'}

                    alt={product.name}

                    className="w-full h-full object-cover"

                  />

                </div>

                <div className="p-3">

                  <p className="font-medium text-sm truncate">{product.name}</p>

                  <p className="text-orange-500 font-bold">{product.price?.toLocaleString()} FCFA</p>

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



      <SubscriptionTiers

        isOpen={showSubscriptionTiers}

        onClose={() => setShowSubscriptionTiers(false)}

        creatorId={profileUserId}

      />

    </div>

  );

}
