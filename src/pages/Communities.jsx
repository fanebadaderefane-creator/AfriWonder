import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Users, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import BottomNav from '../components/navigation/BottomNav';

export default function Communities() {
  const navigate = useNavigate();
  const _queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch {}
    };
    getUser();
  }, []);

  const { data: communities = [] } = useQuery({
    queryKey: ['communities'],
    queryFn: () => api.entities.Community.list('-created_date', 100)
  });

  const { data: _userCommunities = [] } = useQuery({
    queryKey: ['user-communities', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const members = await api.entities.CommunityMember.filter({ user_id: user.id });
      return members.map(m => m.community_id);
    },
    enabled: !!user?.id
  });

  const filteredCommunities = communities
    .filter(c => filterCategory === 'all' || c.category === filterCategory)
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.description?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b z-40 p-4">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Communautés</h1>
          {user && (
            <Button
              onClick={() => navigate(createPageUrl('CreateCommunity'))}
              size="sm"
              className="ml-auto bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="w-4 h-4 mr-1" />
              Créer
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher une communauté..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['all', 'technology', 'business', 'education', 'entertainment', 'sports', 'lifestyle'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filterCategory === cat
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {cat === 'all' ? 'Tous' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Communities Grid */}
        {filteredCommunities.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucune communauté trouvée
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCommunities.map((community, idx) => (
              <motion.div
                key={community.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link to={`${createPageUrl('CommunityDetails')}?id=${community.id}`}>
                  <Card className="h-full hover:shadow-md transition-shadow overflow-hidden">
                    {community.banner_image && (
                      <img
                        src={community.banner_image}
                        alt={community.name}
                        className="w-full h-32 object-cover"
                      />
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-gray-900 flex-1">{community.name}</h3>
                        {community.privacy_type === 'private' && (
                          <Badge variant="outline" className="ml-2">Privée</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{community.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {community.members_count}
                        </span>
                        <Badge variant="secondary">{community.category}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

