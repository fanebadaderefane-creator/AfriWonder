import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, Search, MapPin, 
  Target, Plus, Award
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import BottomNav from '../components/navigation/BottomNav';

const categories = [
  { id: 'all', label: 'Tous', icon: '🏛️' },
  { id: 'infrastructure', label: 'Infrastructure', icon: '🏗️' },
  { id: 'education', label: 'Éducation', icon: '📚' },
  { id: 'sante', label: 'Santé', icon: '🏥' },
  { id: 'securite', label: 'Sécurité', icon: '🚨' },
  { id: 'environnement', label: 'Environnement', icon: '🌱' },
  { id: 'corruption', label: 'Corruption', icon: '⚖️' },
  { id: 'droits_humains', label: 'Droits', icon: '✊' },
  { id: 'economie', label: 'Économie', icon: '💰' }
];

export default function Civic() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {}
    };
    getUser();
  }, []);

  const limit = 20;
  const {
    data: listData,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['civic-list', selectedCategory, searchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.civic.list({
        page: pageParam,
        limit,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        search: searchQuery || undefined,
      });
      return res;
    },
    getNextPageParam: (last) => {
      const p = last?.pagination;
      if (!p || p.page >= (p.totalPages || 1)) return undefined;
      return (p.page || 1) + 1;
    },
    initialPageParam: 1,
  });

  const petitions = listData?.pages?.flatMap((p) => p.petitions ?? []) ?? [];
  const total = listData?.pages?.[0]?.pagination?.total ?? 0;

  const { data: recommended = [] } = useQuery({
    queryKey: ['civic-recommended'],
    queryFn: () => api.civic.getRecommended(8),
    enabled: !!user
  });

  const filteredPetitions = petitions.filter(p => 
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProgressPercentage = (current, goal) => {
    return Math.min((current / goal) * 100, 100);
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-blue-100 text-blue-700',
      under_review: 'bg-yellow-100 text-yellow-700',
      accepted: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      implemented: 'bg-purple-100 text-purple-700'
    };
    return colors[status] || colors.active;
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: '📝 Active',
      under_review: '👀 En révision',
      accepted: '✅ Acceptée',
      rejected: '❌ Rejetée',
      implemented: '🎉 Mise en œuvre'
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Engagement citoyen</h1>
          {user && (
            <div className="ml-auto flex gap-2">
              <Link to={createPageUrl('CivicCreatorDashboard')}>
                <Button size="sm" variant="outline">Dashboard</Button>
              </Link>
              <Link to={createPageUrl('CreatePetition')}>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="w-4 h-4 mr-1" />
                  Créer
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher une pétition..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                selectedCategory === cat.id
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
        <div className="flex items-start gap-3">
          <Award className="w-8 h-8 flex-shrink-0" />
          <div>
            <h3 className="font-bold mb-1">Votre voix compte</h3>
            <p className="text-sm text-white/90">
              Changez votre communauté en signant et créant des pétitions
            </p>
          </div>
        </div>
      </div>

      {/* Recommandées pour vous (si connecté) */}
      {user && recommended?.length > 0 && (
        <div className="px-4 py-3">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">Recommandées pour vous</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {recommended.slice(0, 5).map((p) => {
              const prog = Math.min(((p.current_signatures ?? 0) / (p.goal_signatures || 1)) * 100, 100);
              return (
                <Link
                  key={p.id}
                  to={`${createPageUrl('PetitionDetails')}?id=${p.id}`}
                  className="flex-shrink-0 w-48 bg-white rounded-xl p-3 shadow-sm"
                >
                  <p className="font-medium text-sm line-clamp-2 mb-2">{p.title}</p>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${prog}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{p.current_signatures ?? 0} / {p.goal_signatures} signatures</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-3 grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-blue-500">{total || petitions.length}</div>
          <div className="text-xs text-gray-600">Pétitions</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-green-500">
            {petitions.reduce((acc, p) => acc + p.current_signatures, 0)}
          </div>
          <div className="text-xs text-gray-600">Signatures</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-purple-500">
            {petitions.filter(p => p.status === 'implemented').length}
          </div>
          <div className="text-xs text-gray-600">Réalisées</div>
        </div>
      </div>

      {/* Petitions List */}
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="flex gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-full mb-2" />
                <div className="h-4 bg-gray-100 rounded w-full mb-3" />
                <div className="h-2 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : filteredPetitions.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune pétition trouvée</p>
          </div>
        ) : (
          filteredPetitions.map((petition) => {
            const progress = getProgressPercentage(petition.current_signatures, petition.goal_signatures);
            
            return (
              <Link
                key={petition.id}
                to={`${createPageUrl('PetitionDetails')}?id=${petition.id}`}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <img
                      src={petition.creator?.profile_image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
                      alt={petition.creator?.full_name || 'Créateur'}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{petition.creator?.full_name || 'Créateur'}</div>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {categories.find(c => c.id === petition.category)?.icon} {categories.find(c => c.id === petition.category)?.label}
                        </Badge>
                        <Badge className={cn("text-xs", getStatusColor(petition.status))}>
                          {getStatusLabel(petition.status)}
                        </Badge>
                        {petition.is_featured && (
                          <Badge className="text-xs bg-yellow-500 text-white">
                            ⭐ Vedette
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-lg mb-2">{petition.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{petition.description}</p>

                  {/* Location */}
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                    <MapPin className="w-3 h-3" />
                    <span>{[petition.city, petition.region, petition.country].filter(Boolean).join(', ') || 'National'}</span>
                  </div>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-bold text-blue-600">
                        {(petition.current_signatures ?? 0).toLocaleString()} signatures
                      </span>
                      <span className="text-gray-500">
                        Objectif: {(petition.goal_signatures ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              </Link>
            );
          })
        )}
        {hasNextPage && (
          <div className="flex justify-center py-4">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="min-w-[140px]"
            >
              {isFetchingNextPage ? 'Chargement...' : 'Charger plus'}
            </Button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

