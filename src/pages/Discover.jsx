import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, TrendingUp, Hash, Flame, Music2, Utensils, Shirt, Briefcase, Dumbbell, GraduationCap, Laugh, Sparkles, Book, Calendar, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { isValidThumbnailUrl, VIDEO_PLACEHOLDER_IMG, getAbsoluteImageUrl } from "@/lib/utils";
import { isDeletedUser } from "@/lib/utils";
import VideoFrameThumbnail from '../components/video/VideoFrameThumbnail';
import BottomNav from '../components/navigation/BottomNav';
import ProductCard from '../components/marketplace/ProductCard';
import RecommendationEngine from '../components/common/RecommendationEngine';
import { toast } from 'sonner';

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

const trendingHashtags = [
  { tag: 'AfricanVibes', count: '2.5M', trending: true },
  { tag: 'DakarLife', count: '1.2M' },
  { tag: 'AfroBeats', count: '980K', trending: true },
  { tag: 'MadeInAfrica', count: '750K' },
  { tag: 'AfricanFood', count: '620K' },
  { tag: 'Entrepreneurship', count: '450K' },
];

export default function Discover() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('explore');
  const [selectedCategory, setSelectedCategory] = useState(null);

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

  const { data: recommendedVideos = [], isLoading: loadingRecommended } = useQuery({
    queryKey: ['recommendedVideos', user?.id],
    queryFn: () => RecommendationEngine.getPersonalizedFeed(user.id, 20),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000
  });

  const { data: creatorRecommendations = [], isLoading: _loadingCreators } = useQuery({
    queryKey: ['creatorRecommendations', user?.id],
    queryFn: () => RecommendationEngine.getCreatorRecommendations(user.id, 10),
    enabled: !!user?.id
  });

  const { data: courseRecommendations = [], isLoading: _loadingCourses } = useQuery({
    queryKey: ['courseRecommendations', user?.id],
    queryFn: () => RecommendationEngine.getCourseRecommendations(user.id, 10),
    enabled: !!user?.id
  });

  const { data: eventRecommendations = [], isLoading: _loadingEvents } = useQuery({
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Rechercher vidéos, créateurs, produits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-6 rounded-2xl border-gray-200 bg-gray-50 focus:bg-white text-base"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
          <TabsList className="w-full bg-transparent h-12 p-0 gap-4 justify-start">
            <TabsTrigger 
              value="explore" 
              className="px-0 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none font-semibold"
            >
              Explorer
            </TabsTrigger>
            {user && (
              <TabsTrigger 
                value="recommended" 
                className="px-0 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none font-semibold"
              >
                Pour vous
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="shop" 
              className="px-0 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none font-semibold"
            >
              Boutique
            </TabsTrigger>
            <TabsTrigger 
              value="creators" 
              className="px-0 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none font-semibold"
            >
              Créateurs
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="p-4">
        {activeTab === 'explore' && (
          <div className="space-y-6">
            <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
              <div className="flex gap-3">
                {categories.map((cat, index) => {
                  const Icon = cat.icon;
                  return (
                    <motion.button
                      key={cat.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex flex-col items-center gap-2 min-w-[72px] ${
                        selectedCategory === cat.id ? 'opacity-100' : 'opacity-80'
                      }`}
                    >
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                        {cat.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Flame className="w-5 h-5 text-blue-600" />
                Vidéos virales
              </h2>
              <div className="grid grid-cols-3 gap-1">
                {viralVideos.slice(0, 6).map((video, index) => (
                  <Link
                    key={video.id}
                    to={`${createPageUrl('VideoView')}?id=${video.id}`}
                  >
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="relative aspect-[9/16] bg-gray-200 rounded-lg overflow-hidden"
                    >
                      {video.media_type === 'image' ? (
                        <img src={getAbsoluteImageUrl(video.thumbnail_url || video.video_url)} alt={video.title} className="w-full h-full object-cover" />
                      ) : video.video_url ? (
                        <VideoFrameThumbnail videoUrl={video.video_url} thumbnailUrl={video.thumbnail_url} alt={video.title} />
                      ) : isValidThumbnailUrl(video.thumbnail_url, video.video_url) ? (
                        <img src={getAbsoluteImageUrl(video.thumbnail_url)} alt={video.title} className="w-full h-full object-cover" />
                      ) : (
                        <img src={VIDEO_PLACEHOLDER_IMG} alt={video.title} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute top-1 right-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
                        VIRAL
                      </div>
                      <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white font-medium">
                        {video.views >= 1000 ? `${(video.views/1000).toFixed(0)}K` : video.views} vues
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>

            {challenges.length > 0 && (
              <div>
                <h2 className="font-bold text-gray-800 mb-3">Défis tendances</h2>
                <div className="space-y-2">
                  {challenges.map((challenge, index) => (
                    <motion.div
                      key={challenge.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white"
                    >
                      <h3 className="font-bold text-lg mb-1">{challenge.title}</h3>
                      <p className="text-white/90 text-sm mb-2">{challenge._description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span>#{challenge.hashtag}</span>
                        <span>• {challenge.participants_count} participants</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-gray-800">Tendances</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingHashtags.map((hashtag, index) => (
                  <motion.button
                    key={hashtag.tag}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all"
                  >
                    <Hash className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-gray-700">{hashtag.tag}</span>
                    <span className="text-xs text-gray-400">{hashtag.count}</span>
                    {hashtag.trending && (
                      <Flame className="w-3 h-3 text-blue-600" />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800">
                  {selectedCategory && selectedCategory !== 'trending' 
                    ? categories.find(c => c.id === selectedCategory)?.label 
                    : 'Vidéos populaires'}
                </h2>
                {selectedCategory && (
                  <button 
                    onClick={() => setSelectedCategory(null)}
                    className="text-blue-600 text-sm font-medium"
                  >
                    Tout voir
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1">
                {categoryOrTrendingVideos.map((video, index) => (
                  <Link
                    key={video.id}
                    to={`${createPageUrl('VideoView')}?id=${video.id}`}
                  >
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="relative aspect-[9/16] bg-gray-200 rounded-lg overflow-hidden"
                    >
                      {video.media_type === 'image' ? (
                        <img src={getAbsoluteImageUrl(video.thumbnail_url || video.video_url)} alt={video.title} className="w-full h-full object-cover" />
                      ) : video.video_url ? (
                        <VideoFrameThumbnail videoUrl={video.video_url} thumbnailUrl={video.thumbnail_url} alt={video.title} />
                      ) : isValidThumbnailUrl(video.thumbnail_url, video.video_url) ? (
                        <img src={getAbsoluteImageUrl(video.thumbnail_url)} alt={video.title} className="w-full h-full object-cover" />
                      ) : (
                        <img src={VIDEO_PLACEHOLDER_IMG} alt={video.title} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white font-medium">
                        {video.views >= 1000 ? `${(video.views/1000).toFixed(0)}K` : video.views} vues
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-bold text-gray-800 mb-3">Créateurs tendances</h2>
              <div className="space-y-2">
                {trendingCreators.slice(0, 5).map((creator, index) => {
                  const isInWonder = followingIds.has(creator.id);
                  return (
                  <motion.div
                    key={creator.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      to={`${createPageUrl('Profile')}?userId=${creator.id}`}
                      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-blue-200 transition-colors"
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
                          {creator.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="absolute -top-1 -right-1 bg-blue-600 rounded-full px-1.5 py-0.5 text-[10px] text-white font-bold">
                          #{index + 1}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{creator.name}</p>
                        <p className="text-xs text-gray-400">
                          {creator.totalViews >= 1000000 ? `${(creator.totalViews/1000000).toFixed(1)}M` : 
                           creator.totalViews >= 1000 ? `${(creator.totalViews/1000).toFixed(0)}K` : creator.totalViews} vues • {creator.videoCount} vidéos
                        </p>
                      </div>
                      {user && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleWonderMutation.mutate(creator.id);
                          }}
                          disabled={toggleWonderMutation.isPending}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-full shrink-0 ${
                            isInWonder
                              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90'
                          }`}
                        >
                          {isInWonder ? 'Dans son Wonder' : 'Wonder'}
                        </button>
                      )}
                    </Link>
                  </motion.div>
                );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'recommended' && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Recommandations personnalisées
            </h2>
            
            {loadingRecommended ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : recommendedVideos.length > 0 ? (
              <div className="grid grid-cols-3 gap-1">
                {recommendedVideos.map((video, idx) => (
                  <Link
                    key={video.id}
                    to={`${createPageUrl('VideoView')}?id=${video.id}`}
                  >
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="relative aspect-[9/16] bg-gray-200 rounded-lg overflow-hidden"
                    >
                      {video.media_type === 'image' ? (
                        <img src={getAbsoluteImageUrl(video.thumbnail_url || video.video_url)} alt={video.title} className="w-full h-full object-cover" />
                      ) : video.video_url ? (
                        <VideoFrameThumbnail videoUrl={video.video_url} thumbnailUrl={video.thumbnail_url} alt={video.title} />
                      ) : isValidThumbnailUrl(video.thumbnail_url, video.video_url) ? (
                        <img src={getAbsoluteImageUrl(video.thumbnail_url)} alt={video.title} className="w-full h-full object-cover" />
                      ) : (
                        <img src={VIDEO_PLACEHOLDER_IMG} alt={video.title} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white font-medium">
                        {video.views >= 1000 ? `${(video.views/1000).toFixed(0)}K` : video.views} vues
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-500">
                <p>Regardez plus de vidéos pour avoir des recommandations personnalisées</p>
              </div>
            )}

            {creatorRecommendations.length > 0 && (
              <div className="mt-8">
                <h3 className="font-bold text-gray-800 mb-3">Créateurs à découvrir</h3>
                <div className="grid grid-cols-2 gap-3">
                  {creatorRecommendations.map((creator, idx) => (
                    <motion.div
                      key={creator.creator_id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-2xl p-4 text-center"
                    >
                      <img
                        src={creator.avatar}
                        alt={creator.name}
                        className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
                      />
                      <p className="font-semibold text-gray-800 truncate text-sm">{creator.name}</p>
                      <p className="text-xs text-gray-500">{creator.videoCount} vidéos</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {courseRecommendations.length > 0 && (
              <div className="mt-8">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Book className="w-4 h-4 text-blue-600" />
                  Cours recommandés
                </h3>
                <div className="space-y-2">
                  {courseRecommendations.slice(0, 5).map((course, idx) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-xl p-3"
                    >
                      <h4 className="font-semibold text-gray-800 text-sm">{course.title}</h4>
                      <p className="text-xs text-gray-500">{course.instructor_name}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {eventRecommendations.length > 0 && (
              <div className="mt-8">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Événements intéressants
                </h3>
                <div className="space-y-2">
                  {eventRecommendations.slice(0, 5).map((event, idx) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-xl p-3"
                    >
                      <h4 className="font-semibold text-gray-800 text-sm">{event.title}</h4>
                      <p className="text-xs text-gray-500">{event.location}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Marketplace</h2>
              <Link to={createPageUrl('Marketplace')} className="text-blue-600 text-sm font-medium">
                Voir tout
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`${createPageUrl('Product')}?id=${product.id}`}>
                    <ProductCard product={product} />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'creators' && (
          <div className="space-y-3">
            {creators.map((creator, index) => {
              const isInWonder = followingIds.has(creator.id);
              return (
              <motion.div
                key={creator.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={`${createPageUrl('Profile')}?userId=${creator.id}`}
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                    {creator.full_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{creator.full_name || 'Utilisateur'}</p>
                    <p className="text-sm text-gray-400">@{creator.email?.split('@')[0]}</p>
                  </div>
                  {user && user.id !== creator.id && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleWonderMutation.mutate(creator.id);
                      }}
                      disabled={toggleWonderMutation.isPending}
                      className={`px-4 py-2 text-sm font-semibold rounded-full shrink-0 ${
                        isInWonder
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90'
                      }`}
                    >
                      {isInWonder ? 'Dans son Wonder' : 'Wonder'}
                    </button>
                  )}
                </Link>
              </motion.div>
            );
            })}
          </div>
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

