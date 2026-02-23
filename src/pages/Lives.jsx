import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Radio, Plus, Calendar, Eye, ArrowLeft, Play, Sparkles, Search, Wallet, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import BottomNav from '../components/navigation/BottomNav';
import { toast } from "sonner";

export default function Lives() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sortBy, setSortBy] = useState('viewers');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [liveForm, setLiveForm] = useState({
    title: '',
    description: '',
    scheduled_time: ''
  });

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {}
    };
    getUser();
  }, []);

  const { data: listResult } = useQuery({
    queryKey: ['live-streams', sortBy, categoryFilter, regionFilter],
    queryFn: async () => {
      const params = { page: 1, limit: 50, sortBy };
      if (categoryFilter) params.category = categoryFilter;
      if (regionFilter) params.region = regionFilter;
      const res = await api.live.list(params);
      return res?.streams ?? res?.data?.streams ?? [];
    },
    refetchInterval: 10000
  });

  // Récupérer les recommandations
  const { data: recommendations = [] } = useQuery({
    queryKey: ['live-recommendations', user?.id],
    queryFn: () => api.live.getRecommendations({ limit: 5 }),
    enabled: !!user,
    refetchInterval: 30000
  });

  const { data: discoveryData } = useQuery({
    queryKey: ['live-discovery', user?.id],
    queryFn: async () => {
      const [popular, trending, followed, categories] = await Promise.all([
        api.live.getDiscovery({ type: 'popular', limit: 10 }),
        api.live.getDiscovery({ type: 'trending', limit: 10 }),
        user?.id ? api.live.getDiscovery({ type: 'followed', limit: 10 }) : Promise.resolve({ streams: [] }),
        api.live.getCategories().catch(() => ({ categories: [] })),
      ]);
      return {
        popular: popular?.streams ?? popular?.data?.streams ?? [],
        trending: trending?.streams ?? trending?.data?.streams ?? [],
        followed: followed?.streams ?? followed?.data?.streams ?? [],
        categories: categories?.categories ?? categories ?? [],
      };
    },
    enabled: true,
    refetchInterval: 15000
  });

  const liveStreams = listResult ?? [];
  const popularStreams = discoveryData?.popular ?? [];
  const trendingStreams = discoveryData?.trending ?? [];
  const followedStreams = discoveryData?.followed ?? [];
  const categories = discoveryData?.categories ?? [];

  const createLiveMutation = useMutation({
    mutationFn: async (data) => {
      const stream = await api.live.start({
        title: data.title,
        description: data.description || '',
        category: data.category || 'general',
        status: 'scheduled',
        scheduled_at: data.scheduled_time ? new Date(data.scheduled_time).toISOString() : undefined
      });
      return stream;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
      toast.success('Live programmé avec succès');
      setShowCreateForm(false);
      setLiveForm({ title: '', description: '', scheduled_time: '' });
    },
    onError: (err) => {
      toast.error(err?.apiMessage || err?.message || 'Erreur');
    }
  });

  const activeLives = liveStreams.filter(l => l.status === 'live');
  const scheduledLives = liveStreams.filter(l => l.status === 'scheduled');
  const endedLivesWithReplay = liveStreams.filter(l => l.status === 'ended' && l.replay_url);

  const featuredStream = (popularStreams.length > 0 ? popularStreams[0] : activeLives[0]);

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      {/* Header: logo / back, search, GO LIVE, Portefeuille */}
      <div className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-white/10 z-40">
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(createPageUrl('Home')))}
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un live..."
              className="w-full pl-9 pr-4 py-2.5 rounded-full bg-gray-800 border border-gray-700 text-white placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {user && (
            <>
              <Button
                onClick={() => navigate(createPageUrl('StartLive'))}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-full text-white font-semibold shrink-0"
                size="sm"
              >
                <Radio className="w-4 h-4 mr-1" />
                GO LIVE
              </Button>
              <Button
                onClick={() => navigate(createPageUrl('Wallet'))}
                variant="outline"
                className="rounded-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10 shrink-0"
                size="sm"
              >
                <Wallet className="w-4 h-4 mr-1" />
                Portefeuille
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Hero: live à la une */}
        {featuredStream && (
          <Link to={`${createPageUrl('LiveView')}?id=${featuredStream.id}`}>
            <motion.div className="relative rounded-2xl overflow-hidden bg-gray-800 aspect-video mb-4">
              <img src={featuredStream.thumbnail_url || 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600'} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                </span>
                <span className="bg-black/60 text-white px-2 py-1 rounded text-xs">{featuredStream.viewers_count ?? 0} spectateurs</span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold">
                    {(featuredStream.creator_name || featuredStream.creator?.username || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{featuredStream.creator_name || featuredStream.creator?.username || 'Créateur'}</p>
                    <p className="text-xs text-blue-200">{featuredStream.title}</p>
                  </div>
                </div>
                <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shrink-0">
                  <Play className="w-4 h-4 mr-1" />
                  Regarder
                </Button>
              </div>
            </motion.div>
          </Link>
        )}

        {/* Classement Top Créateurs */}
        {popularStreams.length > 0 && (
          <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <div>
                <p className="font-semibold text-white">Classement Top Créateurs</p>
                <p className="text-xs text-gray-400">Découvrez les meilleurs de la semaine</p>
              </div>
            </div>
            <div className="flex -space-x-2">
              {popularStreams.slice(0, 3).map((s, i) => (
                <div key={s.id} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-gray-900 flex items-center justify-center text-xs font-bold text-white">
                  {(s.creator_name || s.creator?.username || '?')[0].toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Catégories */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setCategoryFilter('')}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium ${!categoryFilter ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
            >
              Tout
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(categoryFilter === c.id ? '' : c.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${categoryFilter === c.id ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
              >
                <span>{c.icon}</span>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Tri */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-400">Trier:</span>
          {['viewers', 'recent', 'popularity', 'duration'].map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1 rounded-full text-sm ${sortBy === s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
            >
              {s === 'viewers' ? 'Spectateurs' : s === 'recent' ? 'Récent' : s === 'popularity' ? 'Populaire' : 'Durée'}
            </button>
          ))}
        </div>

        {/* Recommandations personnalisées */}
        {recommendations.length > 0 && (
          <div>
            <h2 className="font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              Recommandé pour vous
            </h2>
            <div className="space-y-3">
              {recommendations.map((live) => (
                <Link key={live.id} to={`${createPageUrl('LiveView')}?id=${live.id}`}>
                  <motion.div whileHover={{ scale: 1.02 }} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                    <div className="relative aspect-video bg-gradient-to-br from-blue-600/30 to-indigo-600/30">
                      <img src={live.thumbnail_url || 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600'} className="w-full h-full object-cover" alt="" />
                      <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 animate-pulse">
                        <Radio className="w-3 h-3" /> LIVE
                      </div>
                      <div className="absolute bottom-3 left-3 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {live.viewers_count || 0}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-white mb-1">{live.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>{live.creator?.username || live.creator_name || 'Créateur'}</span>
                        {live.category && (
                          <Badge className="text-xs bg-blue-500/20 text-blue-300 border-0">
                            {live.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CDC: Créateurs suivis en live */}
        {followedStreams.length > 0 && (
          <div>
            <h2 className="font-bold text-white mb-3 flex items-center gap-2">Suivis en direct</h2>
            <div className="space-y-3">
              {followedStreams.map((live) => (
                <Link key={live.id} to={`${createPageUrl('LiveView')}?id=${live.id}`}>
                  <motion.div whileHover={{ scale: 1.02 }} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                    <div className="relative aspect-video bg-gradient-to-br from-blue-600/30 to-indigo-600/30">
                      <img src={live.thumbnail_url || 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600'} className="w-full h-full object-cover" alt="" />
                      <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 animate-pulse">
                        <Radio className="w-3 h-3" /> LIVE
                      </div>
                      <div className="absolute bottom-3 left-3 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {live.viewers_count}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-white mb-1">{live.title}</h3>
                      <p className="text-sm text-gray-400">{live.creator_name}</p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-2xl p-4 border border-gray-700"
          >
            <h3 className="font-semibold mb-3 text-white">Programmer un live</h3>
            <div className="space-y-3">
              <Input
                placeholder="Titre du live"
                value={liveForm.title}
                onChange={(e) => setLiveForm({ ...liveForm, title: e.target.value })}
              />
              <Textarea
                placeholder="Description"
                value={liveForm.description}
                onChange={(e) => setLiveForm({ ...liveForm, description: e.target.value })}
              />
              <Input
                type="datetime-local"
                value={liveForm.scheduled_time}
                onChange={(e) => setLiveForm({ ...liveForm, scheduled_time: e.target.value })}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => createLiveMutation.mutate(liveForm)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                >
                  Programmer
                </Button>
                <Button
                  onClick={() => setShowCreateForm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* CDC: Trending / Popular - ordonné par spectateurs */}
        {(popularStreams.length > 0 || activeLives.length > 0) && (
          <div>
            <h2 className="font-bold text-white mb-3 flex items-center gap-2">
              <Radio className="w-5 h-5 text-blue-400 animate-pulse" />
              En direct
            </h2>
            <div className="space-y-3">
              {(popularStreams.length > 0 ? popularStreams : activeLives).map((live) => (
                <Link
                  key={live.id}
                  to={`${createPageUrl('LiveView')}?id=${live.id}`}
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700"
                  >
                    <div className="relative aspect-video bg-gradient-to-br from-blue-600/30 to-indigo-600/30">
                      <img
                        src={live.thumbnail_url || 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 animate-pulse">
                        <Radio className="w-3 h-3" />
                        LIVE
                      </div>
                      <div className="absolute bottom-3 left-3 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {live.viewers_count}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-white mb-1">{live.title}</h3>
                      <p className="text-sm text-gray-400">{live.creator_name}</p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Scheduled Lives */}
        {scheduledLives.length > 0 && (
          <div>
            <h2 className="font-bold text-white mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              Lives programmés
            </h2>
            <div className="space-y-3">
              {scheduledLives.map((live) => (
                <div
                  key={live.id}
                  className="bg-gray-800 rounded-xl p-4 border border-gray-700"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0">
                      {live.creator_name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white">{live.title}</h3>
                      <p className="text-sm text-gray-400">{live.creator_name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(live.scheduled_at || live.started_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge className="bg-blue-500/20 text-blue-300 border-0">
                        Programmé
                      </Badge>
                      {user?.id === live.creator_id && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              await api.live.startScheduled(live.id);
                              toast.success('Live démarré ! Redirection...');
                              navigate(`${createPageUrl('LiveStream')}?id=${live.id}`);
                            } catch (err) {
                              toast.error(err?.apiMessage || err?.message || 'Erreur');
                            }
                          }}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-xs"
                        >
                          <Radio className="w-3 h-3 mr-1" />
                          Démarrer
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Replays (lives terminés avec replay) */}
        {endedLivesWithReplay.length > 0 && (
          <div>
            <h2 className="font-bold text-white mb-3 flex items-center gap-2">
              <Play className="w-5 h-5 text-gray-400" />
              Replays
            </h2>
            <div className="space-y-3">
              {endedLivesWithReplay.map((live) => (
                <Link
                  key={live.id}
                  to={`${createPageUrl('LiveView')}?id=${live.id}`}
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700"
                  >
                    <div className="relative aspect-video bg-gradient-to-br from-gray-600 to-gray-800">
                      <img
                        src={live.thumbnail_url || 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600'}
                        className="w-full h-full object-cover opacity-80"
                        alt=""
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                          <Play className="w-7 h-7 text-gray-800 ml-1" />
                        </div>
                      </div>
                      <div className="absolute top-3 left-3 bg-gray-700/90 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Replay
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-white mb-1">{live.title}</h3>
                      <p className="text-sm text-gray-400">{live.creator_name}</p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {activeLives.length === 0 && scheduledLives.length === 0 && endedLivesWithReplay.length === 0 && popularStreams.length === 0 && (
          <div className="text-center py-16">
            <Radio className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Aucun live pour le moment
            </h3>
            <p className="text-gray-400">
              Soyez le premier à lancer un live !
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

