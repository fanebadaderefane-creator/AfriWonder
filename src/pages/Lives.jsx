import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Radio, Plus, Calendar, Eye, ArrowLeft, Play } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
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

      <div className="sticky top-0 bg-white border-b border-gray-100 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold">Lives</h1>
          {user && (
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-gradient-to-r from-pink-500 to-red-500 rounded-full"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Programmer
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* CDC: Tri + Filtres */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-500">Trier:</span>
          {['viewers', 'recent', 'popularity', 'duration'].map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1 rounded-full text-sm ${sortBy === s ? 'bg-red-500 text-white' : 'bg-white shadow-sm border border-gray-100 text-gray-700'}`}
            >
              {s === 'viewers' ? 'Spectateurs' : s === 'recent' ? 'Récent' : s === 'popularity' ? 'Populaire' : 'Durée'}
            </button>
          ))}
        </div>

        {/* CDC: Catégories cliquables */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            <button
              onClick={() => setCategoryFilter('')}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${!categoryFilter ? 'bg-red-500 text-white' : 'bg-white shadow-sm border border-gray-100 text-gray-700'}`}
            >
              Tout
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(categoryFilter === c.id ? '' : c.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${categoryFilter === c.id ? 'bg-red-500 text-white' : 'bg-white shadow-sm border border-gray-100 text-gray-700'}`}
              >
                <span>{c.icon}</span>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* CDC: Créateurs suivis en live */}
        {followedStreams.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">Suivis en direct</h2>
            <div className="space-y-3">
              {followedStreams.map((live) => (
                <Link key={live.id} to={`${createPageUrl('LiveView')}?id=${live.id}`}>
                  <motion.div whileHover={{ scale: 1.02 }} className="bg-white rounded-xl overflow-hidden shadow-sm">
                    <div className="relative aspect-video bg-gradient-to-br from-pink-500 to-red-500">
                      <img src={live.thumbnail_url || 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600'} className="w-full h-full object-cover" alt="" />
                      <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 animate-pulse">
                        <Radio className="w-3 h-3" /> LIVE
                      </div>
                      <div className="absolute bottom-3 left-3 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {live.viewers_count}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-800 mb-1">{live.title}</h3>
                      <p className="text-sm text-gray-500">{live.creator_name}</p>
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
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <h3 className="font-semibold mb-3">Programmer un live</h3>
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
                  className="flex-1 bg-gradient-to-r from-pink-500 to-red-500"
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
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-500 animate-pulse" />
              Trending / En direct
            </h2>
            <div className="space-y-3">
              {(popularStreams.length > 0 ? popularStreams : activeLives).map((live) => (
                <Link
                  key={live.id}
                  to={`${createPageUrl('LiveView')}?id=${live.id}`}
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-white rounded-xl overflow-hidden shadow-sm"
                  >
                    <div className="relative aspect-video bg-gradient-to-br from-pink-500 to-red-500">
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
                      <h3 className="font-semibold text-gray-800 mb-1">{live.title}</h3>
                      <p className="text-sm text-gray-500">{live.creator_name}</p>
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
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              Lives programmés
            </h2>
            <div className="space-y-3">
              {scheduledLives.map((live) => (
                <div
                  key={live.id}
                  className="bg-white rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white">
                      {live.creator_name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{live.title}</h3>
                      <p className="text-sm text-gray-500">{live.creator_name}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(live.started_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-orange-500 border-orange-200">
                      Programmé
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Replays (lives terminés avec replay) */}
        {endedLivesWithReplay.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Play className="w-5 h-5 text-gray-500" />
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
                    className="bg-white rounded-xl overflow-hidden shadow-sm"
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
                      <h3 className="font-semibold text-gray-800 mb-1">{live.title}</h3>
                      <p className="text-sm text-gray-500">{live.creator_name}</p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {activeLives.length === 0 && scheduledLives.length === 0 && endedLivesWithReplay.length === 0 && (
          <div className="text-center py-16">
            <Radio className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Aucun live pour le moment
            </h3>
            <p className="text-gray-500">
              Soyez le premier à lancer un live !
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

