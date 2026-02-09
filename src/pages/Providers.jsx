import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Star, User, CheckCircle, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import BottomNav from '../components/navigation/BottomNav';

export default function Providers() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [minRating, setMinRating] = useState('');
  const [locationType, setLocationType] = useState('all');

  const { data: providersData, isLoading } = useQuery({
    queryKey: ['providers', selectedCategory, searchTerm, minRating, locationType],
    queryFn: async () => {
      const params = {
        page: 1,
        limit: 50,
        ...(selectedCategory !== 'all' && { category: selectedCategory }),
        ...(searchTerm && { search: searchTerm }),
        ...(minRating && { min_rating: parseFloat(minRating) }),
        ...(locationType !== 'all' && { location_type: locationType }),
      };
      return api.providers.list(params);
    },
  });

  const providers = providersData?.providers || [];

  const categories = [
    { value: 'all', label: 'Toutes les catégories' },
    { value: 'plomberie', label: '🔧 Plomberie' },
    { value: 'electricite', label: '⚡ Électricité' },
    { value: 'menage', label: '🧹 Ménage' },
    { value: 'jardinage', label: '🌳 Jardinage' },
    { value: 'reparation', label: '🔨 Réparation' },
    { value: 'beaute', label: '💄 Beauté' },
    { value: 'sante', label: '⚕️ Santé' },
    { value: 'education', label: '📚 Éducation' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold mb-4">Prestataires de services</h1>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Rechercher un prestataire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={minRating} onValueChange={setMinRating}>
                <SelectTrigger>
                  <SelectValue placeholder="Note minimum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Toutes les notes</SelectItem>
                  <SelectItem value="4">4 étoiles et plus</SelectItem>
                  <SelectItem value="3">3 étoiles et plus</SelectItem>
                </SelectContent>
              </Select>

              <Select value={locationType} onValueChange={setLocationType}>
                <SelectTrigger>
                  <SelectValue placeholder="Type de lieu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="customer_address">Chez vous</SelectItem>
                  <SelectItem value="provider_location">Sur place</SelectItem>
                  <SelectItem value="both">Les deux</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Providers List */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Chargement...</div>
        ) : providers.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Aucun prestataire trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map((provider) => (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(createPageUrl('ProviderProfile') + `?id=${provider.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {provider.user?.full_name || provider.user?.username}
                          </CardTitle>
                          {provider.is_verified && (
                            <Badge className="bg-blue-100 text-blue-800 mt-1">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Vérifié
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {provider.average_rating > 0 && (
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        <span className="font-semibold">{provider.average_rating.toFixed(1)}</span>
                        <span className="text-sm text-gray-600">
                          ({provider.total_bookings || 0} réservations)
                        </span>
                      </div>
                    )}

                    {provider.service_categories && provider.service_categories.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {provider.service_categories.slice(0, 3).map((cat, idx) => (
                          <Badge key={idx} variant="outline">{cat}</Badge>
                        ))}
                        {provider.service_categories.length > 3 && (
                          <Badge variant="outline">+{provider.service_categories.length - 3}</Badge>
                        )}
                      </div>
                    )}

                    {provider.service_radius_km && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>Rayon: {provider.service_radius_km} km</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="text-sm text-gray-600">
                        {provider._count?.services || 0} service{provider._count?.services !== 1 ? 's' : ''}
                      </div>
                      <Button
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(createPageUrl('ProviderProfile') + `?id=${provider.id}`);
                        }}
                      >
                        Voir profil
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {providersData?.pagination && providersData.pagination.totalPages > 1 && (
          <div className="text-center mt-6 text-gray-600">
            Page {providersData.pagination.page} sur {providersData.pagination.totalPages}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
