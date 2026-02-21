import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, Search, Users, 
  Clock, Target, Plus, MapPin
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { MOCK_CAMPAIGNS } from '@/data/crowdfundingMock';

const categories = [
  { id: 'all', label: 'Tous', icon: '🌍' },
  { id: 'education', label: 'Éducation', icon: '📚' },
  { id: 'sante', label: 'Santé', icon: '🏥' },
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'urgence', label: 'Urgence', icon: '🚨' },
  { id: 'communaute', label: 'Communauté', icon: '🤝' },
  { id: 'environnement', label: 'Environnement', icon: '🌱' },
  { id: 'technologie', label: 'Technologie', icon: '💻' },
  { id: 'art', label: 'Art & Culture', icon: '🎨' }
];

export default function Crowdfunding() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('trending');

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {}
    };
    getUser();
  }, []);

  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ['campaigns', selectedCategory, sortBy],
    queryFn: async () => {
      try {
        const res = await api.crowdfunding.list({ status: 'active', limit: 100 });
        let allCampaigns = res?.campaigns ?? res?.data?.campaigns ?? (Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []);
        if (!Array.isArray(allCampaigns)) allCampaigns = [];
        if (allCampaigns.length === 0) allCampaigns = [...MOCK_CAMPAIGNS];
        if (selectedCategory !== 'all') {
          allCampaigns = allCampaigns.filter(c => c.category === selectedCategory);
        }
        if (sortBy === 'trending') {
          allCampaigns = [...allCampaigns].sort((a, b) => ((b.current_amount ?? 0) / (b.goal_amount || 1)) - ((a.current_amount ?? 0) / (a.goal_amount || 1)));
        } else if (sortBy === 'ending_soon') {
          allCampaigns = [...allCampaigns].sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
        } else if (sortBy === 'newest') {
          allCampaigns = [...allCampaigns].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        }
        return allCampaigns;
      } catch (_e) {
        let fallback = [...MOCK_CAMPAIGNS];
        if (selectedCategory !== 'all') fallback = fallback.filter(c => c.category === selectedCategory);
        if (sortBy === 'trending') fallback.sort((a, b) => ((b.current_amount ?? 0) / (b.goal_amount || 1)) - ((a.current_amount ?? 0) / (a.goal_amount || 1)));
        else if (sortBy === 'ending_soon') fallback.sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
        else if (sortBy === 'newest') fallback.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        return fallback;
      }
    }
  });

  const campaigns = Array.isArray(campaignsData) ? campaignsData : (campaignsData?.campaigns ?? []);

  const filteredCampaigns = campaigns.filter(c => 
    c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDaysRemaining = (endDate) => {
    const days = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const getProgressPercentage = (current, goal) => {
    return Math.min((current / goal) * 100, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => window.history.back()}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Crowdfunding</h1>
          {user && (
            <Link to={createPageUrl('CreateCampaign')} className="ml-auto">
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-1" />
                Créer
              </Button>
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher une campagne..."
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

      {/* Sort */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="trending">🔥 Tendances</SelectItem>
            <SelectItem value="ending_soon">⏰ Bientôt terminées</SelectItem>
            <SelectItem value="newest">✨ Nouveautés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="p-4 bg-gradient-to-br from-orange-500 to-red-500 text-white">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <div className="text-xs text-white/80">Campagnes actives</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {campaigns.reduce((acc, c) => acc + (c.backers_count ?? 0), 0)}
            </div>
            <div className="text-xs text-white/80">Contributeurs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {(campaigns.reduce((acc, c) => acc + (c.current_amount ?? 0), 0) / 1000000).toFixed(1)}M
            </div>
            <div className="text-xs text-white/80">FCFA collectés</div>
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune campagne trouvée</p>
          </div>
        ) : (
          filteredCampaigns.map((campaign) => {
            const progress = getProgressPercentage(campaign.current_amount, campaign.goal_amount);
            const daysLeft = getDaysRemaining(campaign.end_date);
            
            return (
              <Link
                key={campaign.id}
                to={`${createPageUrl('CampaignDetails')}?id=${campaign.id}`}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Image */}
                  <div className="relative aspect-video">
                    <img
                      src={campaign.images?.[0] || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600'}
                      alt={campaign.title}
                      className="w-full h-full object-cover"
                    />
                    {campaign.is_featured && (
                      <Badge className="absolute top-3 left-3 bg-yellow-500 text-white border-0">
                        ⭐ En vedette
                      </Badge>
                    )}
                    <Badge className="absolute top-3 right-3 bg-black/60 text-white border-0">
                      {categories.find(c => c.id === campaign.category)?.icon} {categories.find(c => c.id === campaign.category)?.label}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2 line-clamp-2">{campaign.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{campaign.description}</p>

                    {/* Location */}
                    {campaign.location && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                        <MapPin className="w-3 h-3" />
                        <span>{campaign.location}</span>
                      </div>
                    )}

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-bold text-orange-500">
                          {(campaign.current_amount ?? 0).toLocaleString()} FCFA
                        </span>
                        <span className="text-gray-500">
                          sur {(campaign.goal_amount ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{campaign.backers_count ?? 0} contributeurs</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span className={cn(
                          "font-medium",
                          daysLeft <= 3 && "text-red-500"
                        )}>
                          {daysLeft} jours restants
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

