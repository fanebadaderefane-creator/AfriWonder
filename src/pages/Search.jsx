import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, X, Loader2, Video, User, Package } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { isValidThumbnailUrl, VIDEO_PLACEHOLDER_IMG } from "@/lib/utils";
import VideoFrameThumbnail from '../components/video/VideoFrameThumbnail';
import { motion, AnimatePresence } from 'framer-motion';

/** Affiche la miniature (image valide), sinon image de secours — évite cadre noir sur Chrome/mobile */
function VideoThumbnail({ video }) {
  const hasValidThumb = isValidThumbnailUrl(video.thumbnail_url, video.video_url);
  const [showThumb, setShowThumb] = useState(hasValidThumb);
  const [thumbError, setThumbError] = useState(false);

  const onThumbError = () => setThumbError(true);

  if (!hasValidThumb && !video.video_url) {
    return (
      <div className="w-24 h-16 rounded-lg bg-gray-900 flex-shrink-0 overflow-hidden relative flex items-center justify-center">
        <Video className="w-8 h-8 text-gray-500" />
      </div>
    );
  }
  if (!hasValidThumb && video.video_url) {
    return (
      <div className="w-24 h-16 rounded-lg overflow-hidden flex-shrink-0">
        <VideoFrameThumbnail videoUrl={video.video_url} alt={video.title} />
      </div>
    );
  }
  return (
    <div className="w-24 h-16 rounded-lg bg-gray-900 flex-shrink-0 overflow-hidden relative">
      {showThumb && !thumbError ? (
        <img
          src={video.thumbnail_url}
          alt={video.title}
          className="w-full h-full object-cover absolute inset-0"
          onError={onThumbError}
        />
      ) : (
        <img src={VIDEO_PLACEHOLDER_IMG} alt={video.title} className="w-full h-full object-cover absolute inset-0" />
      )}
    </div>
  );
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const [localQuery, setLocalQuery] = useState(query);
  const [filters, setFilters] = useState({
    type: 'all', // all, videos, users, products
    sort: 'recent',
    category: category,
    duration: 'all' // all, short (< 1 min), medium (1-10 min), long (> 10 min)
  });

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  const handleSearch = (q) => {
    const term = (typeof q === 'string' ? q : localQuery)?.trim() || '';
    setSearchParams(term ? { q: term, category: filters.category } : {});
  };

  const isHashtagSearch = query.trim().startsWith('#') || /^#?\w+$/.test(query.trim());
  const hashtagForApi = isHashtagSearch ? query.trim().replace(/^#/, '') : '';

  // Fetch videos (utilise l'API hashtag si recherche par hashtag)
  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ['searchVideos', query, filters, hashtagForApi],
    queryFn: async () => {
      if (!query.trim()) return [];

      if (hashtagForApi && filters.type !== 'users' && filters.type !== 'products') {
        const res = await api.videos.list({ page: 1, limit: 50, hashtag: hashtagForApi });
        let results = Array.isArray(res) ? res : (res?.videos || []);
        if (filters.category && filters.category !== 'all') {
          results = results.filter((v) => v.category === filters.category);
        }
        if (filters.duration !== 'all') {
          results = results.filter((v) => {
            const dur = v.duration || 0;
            if (filters.duration === 'short') return dur < 60;
            if (filters.duration === 'medium') return dur >= 60 && dur <= 600;
            if (filters.duration === 'long') return dur > 600;
            return true;
          });
        }
        return results.slice(0, 20);
      }

      const videoResult = await api.videos.list({ 
        page: 1, 
        limit: 50, 
        hashtag: hashtagForApi || undefined,
        search: !hashtagForApi ? query.trim() : undefined
      });
      let results = Array.isArray(videoResult) ? videoResult : (videoResult?.videos || []);

      if (filters.category && filters.category !== 'all') {
        results = results.filter((v) => v.category === filters.category);
      }
      if (filters.duration !== 'all') {
        results = results.filter((v) => {
          const dur = v.duration || 0;
          if (filters.duration === 'short') return dur < 60;
          if (filters.duration === 'medium') return dur >= 60 && dur <= 600;
          if (filters.duration === 'long') return dur > 600;
          return true;
        });
      }
      return results.slice(0, 20);
    },
    enabled: !!(query && (filters.type === 'all' || filters.type === 'videos')),
  });

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['searchUsers', query, filters.type],
    queryFn: async () => {
      if (!query.trim()) return [];
      const result = await api.users.list({ page: 1, limit: 20, search: query.trim() });
      return Array.isArray(result) ? result : (result?.users || []);
    },
    enabled: !!(query && (filters.type === 'all' || filters.type === 'users'))
  });

  // Fetch products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['searchProducts', query, filters],
    queryFn: async () => {
      if (!query.trim()) return [];
      
      const result = await api.products.list({ 
        search: query.trim(), 
        category: filters.category !== 'all' ? filters.category : undefined,
        page: 1, 
        limit: 50 
      });
      return Array.isArray(result) ? result : (result?.products || []);
    },
    enabled: !!(query && (filters.type === 'all' || filters.type === 'products'))
  });

  const isLoading = videosLoading || usersLoading || productsLoading;
  const totalResults = (videos?.length || 0) + (users?.length || 0) + (products?.length || 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Search Header */}
      <div className="sticky top-0 bg-white border-b z-10">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
            <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Vidéos, utilisateurs, produits..."
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(localQuery)}
              className="flex-1 bg-transparent outline-none text-gray-900 min-w-0"
              autoFocus
            />
            {localQuery ? (
              <button type="button" onClick={() => { setLocalQuery(''); setSearchParams({}); }} className="p-1 hover:bg-gray-200 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => handleSearch(localQuery)}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-medium text-sm flex-shrink-0"
            >
              Rechercher
            </button>
          </div>

          {/* Filter tabs — déclenchent le rafraîchissement des résultats */}
          <Tabs value={filters.type} onValueChange={(v) => setFilters((prev) => ({ ...prev, type: v }))}>
            <TabsList className="grid w-full grid-cols-4 bg-gray-100">
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="videos" className="flex gap-1">
                <Video className="w-4 h-4" /> Vidéos
              </TabsTrigger>
              <TabsTrigger value="users" className="flex gap-1">
                <User className="w-4 h-4" /> Users
              </TabsTrigger>
              <TabsTrigger value="products" className="flex gap-1">
                <Package className="w-4 h-4" /> Produits
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {!query ? (
          <div className="text-center py-12 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Cherchez vidéos, utilisateurs ou produits</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : totalResults === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>Aucun résultat pour "{query}"</p>
          </div>
        ) : (
          <>
            {/* Videos — affiché pour Tous ou Vidéos */}
            {(filters.type === 'all' || filters.type === 'videos') && videos && videos.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold">Vidéos</h2>
                <div className="space-y-2">
                  <AnimatePresence>
                    {videos.map((video) => (
                      <motion.div
                        key={video.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => navigate(createPageUrl('VideoView') + `?_videoId=${video.id}`)}
                        className="bg-white rounded-lg p-3 flex gap-3 cursor-pointer hover:bg-gray-50"
                      >
                        <VideoThumbnail video={video} />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{video.title}</h3>
                          <p className="text-xs text-gray-500">{video.creator_name}</p>
                          <p className="text-xs text-gray-400 mt-1">{video.views ?? video.views_count ?? 0} vues</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Users — affiché pour Tous ou Users */}
            {(filters.type === 'all' || filters.type === 'users') && users && users.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold">Utilisateurs</h2>
                <div className="grid grid-cols-2 gap-3">
                  <AnimatePresence>
                    {users.map((u) => (
                      <motion.div
                        key={u.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => navigate(createPageUrl('Profile') + `?_userId=${u.id}`)}
                        className="bg-white rounded-lg p-3 text-center cursor-pointer hover:bg-gray-50"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 mx-auto mb-2" />
                        <p className="font-semibold text-sm text-gray-900 truncate">{u.full_name || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Products — affiché pour Tous ou Produits */}
            {(filters.type === 'all' || filters.type === 'products') && products && products.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold">Produits</h2>
                <div className="space-y-2">
                  <AnimatePresence>
                    {products.map((product) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => navigate(createPageUrl('Product') + `?id=${product.id}`)}
                        className="bg-white rounded-lg p-3 flex gap-3 cursor-pointer hover:bg-gray-50"
                      >
                        <div className="w-16 h-16 rounded-lg bg-gray-300 flex-shrink-0">
                          {product.images?.[0] && (
                            <img src={product.images[0]} alt={product.name || product.title} className="w-full h-full object-cover rounded-lg" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 truncate">{product.name || product.title}</h3>
                          <p className="text-sm font-bold text-orange-600">{product.price?.toLocaleString()} FCFA</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
