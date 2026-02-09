import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, X, Loader2, Video, User } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from 'framer-motion';

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const [localQuery, setLocalQuery] = useState(query);
  const [filters, setFilters] = useState({
    type: 'all', // videos, users, products
    sort: 'recent',
    category: category,
    duration: 'all' // all, short (< 1 min), medium (1-10 min), long (> 10 min)
  });

  const handleSearch = (q) => {
    setSearchParams({ q, category: filters.category });
  };

  // Fetch videos
  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ['searchVideos', query, filters],
    queryFn: async () => {
      if (!query.trim()) return [];
      
      const videoResult = await api.videos.list({ page: 1, limit: 50 });
      let results = videoResult.videos || [];
      
      results = results.filter(v => 
        v.title?.toLowerCase().includes(query.toLowerCase()) ||
        v.description?.toLowerCase().includes(query.toLowerCase()) ||
        v.hashtags?.some(h => h.toLowerCase().includes(query.toLowerCase())) ||
        v.music_title?.toLowerCase().includes(query.toLowerCase())
      );

      if (filters.category && filters.category !== 'all') {
        results = results.filter(v => v.category === filters.category);
      }

      if (filters.duration !== 'all') {
        results = results.filter(v => {
          const dur = v.duration || 0;
          if (filters.duration === 'short') return dur < 60;
          if (filters.duration === 'medium') return dur >= 60 && dur <= 600;
          if (filters.duration === 'long') return dur > 600;
          return true;
        });
      }

      return results.slice(0, 20);
    },
    enabled: !!(query && (filters.type === 'all' || filters.type === 'videos'))
  });

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['searchUsers', query],
    queryFn: async () => {
      if (!query.trim()) return [];
      // TODO: Implement user search endpoint
      return [];
    },
    enabled: !!(query && (filters.type === 'all' || filters.type === 'users'))
  });

  // Fetch products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['searchProducts', query, filters],
    queryFn: async () => {
      if (!query.trim()) return [];
      
      const result = await api.products.list({ 
        search: query, 
        category: filters.category !== 'all' ? filters.category : undefined,
        page: 1, 
        limit: 50 
      });
      return result.products || [];
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
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Vidéos, utilisateurs, produits..."
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch(localQuery)}
              className="flex-1 bg-transparent outline-none text-gray-900"
              autoFocus
            />
            {localQuery && (
              <button onClick={() => setLocalQuery('')}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <Tabs value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
            <TabsList className="grid w-full grid-cols-3 bg-gray-100">
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="videos" className="flex gap-1">
                <Video className="w-4 h-4" /> Vidéos
              </TabsTrigger>
              <TabsTrigger value="users" className="flex gap-1">
                <User className="w-4 h-4" /> Users
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
            {/* Videos */}
            {videos && videos.length > 0 && (
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
                        <div className="w-24 h-16 rounded-lg bg-gray-300 flex-shrink-0 overflow-hidden">
                          {video.thumbnail_url && (
                            <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{video.title}</h3>
                          <p className="text-xs text-gray-500">{video.creator_name}</p>
                          <p className="text-xs text-gray-400 mt-1">{video.views_count || 0} vues</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Users */}
            {users && users.length > 0 && (
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

            {/* Products */}
            {products && products.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold">Produits</h2>
                <div className="space-y-2">
                  <AnimatePresence>
                    {products.map((product) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => navigate(createPageUrl('Product') + `?productId=${product.id}`)}
                        className="bg-white rounded-lg p-3 flex gap-3 cursor-pointer hover:bg-gray-50"
                      >
                        <div className="w-16 h-16 rounded-lg bg-gray-300 flex-shrink-0">
                          {product.images?.[0] && (
                            <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover rounded-lg" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 truncate">{product.title}</h3>
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