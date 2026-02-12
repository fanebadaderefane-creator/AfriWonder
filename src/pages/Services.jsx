import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Clock, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import BottomNav from '../components/navigation/BottomNav';

export default function ServicesPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [mapCenter, _setMapCenter] = useState([14.6928, -17.0467]); // Dakar

  const { data: services, isLoading } = useQuery({
    queryKey: ['services', selectedCategory],
    queryFn: async () => {
      if (selectedCategory === 'all') {
        return api.entities.Service.filter({ is_active: true });
      }
      return api.entities.Service.filter({
        category: selectedCategory,
        is_active: true
      });
    }
  });

  // Les services sont déjà filtrés par l'API, mais on peut faire un filtre local supplémentaire si nécessaire
  const filteredServices = services.filter(s => {
    if (!s) return false;
    const searchLower = searchTerm.toLowerCase();
    return (
      s.title?.toLowerCase().includes(searchLower) ||
      s.name?.toLowerCase().includes(searchLower) ||
      s.description?.toLowerCase().includes(searchLower)
    );
  });

  const categories = [
    { value: 'all', label: 'Tous' },
    { value: 'restaurant', label: '🍽️ Restaurant' },
    { value: 'reparation', label: '🔧 Réparation' },
    { value: 'immobilier', label: '🏠 Immobilier' },
    { value: 'transport', label: '🚗 Transport' },
    { value: 'beaute', label: '💄 Beauté' },
    { value: 'sante', label: '⚕️ Santé' },
    { value: 'education', label: '📚 Éducation' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto p-4 safe-area-pb"
    >
      <h1 className="text-3xl font-bold mb-8">Services locaux</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold block mb-2">Rechercher</label>
            <Input
              placeholder="Restaurant, plombier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm font-semibold block mb-2">Catégorie</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Services List */}
          <div className="space-y-3">
            <h3 className="font-semibold">Services trouvés ({filteredServices.length})</h3>
            {isLoading ? (
              <div className="text-center py-4 text-gray-500">Chargement...</div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-4 text-gray-500">Aucun service trouvé</div>
            ) : (
              filteredServices.map(service => (
                <motion.div
                  key={service.id}
                  whileHover={{ x: 5 }}
                  className="p-3 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                >
                  <p className="font-semibold text-sm">{service.title || service.name}</p>
                  <p className="text-xs text-gray-600 line-clamp-1">
                    {service.description}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs font-semibold">{(service.rating || 0).toFixed(1)}</span>
                    {service.price && (
                      <span className="text-xs text-gray-500 ml-auto">{service.price} FCFA</span>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Map & Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Map */}
          <Card className="h-64">
            <CardContent className="p-0 h-full">
              <MapContainer
                center={mapCenter}
                zoom={12}
                className="h-full w-full rounded-lg"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                {filteredServices.map(service => (
                  service.location && (
                    <Marker
                      key={service.id}
                      position={[service.location.lat, service.location.lng]}
                    >
                      <Popup>{service.name}</Popup>
                    </Marker>
                  )
                ))}
              </MapContainer>
            </CardContent>
          </Card>

          {/* Services Grid */}
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Chargement des services...</div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Aucun service trouvé</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredServices.map(service => (
                <motion.div
                  key={service.id}
                  whileHover={{ y: -2 }}
                  className="cursor-pointer"
                  onClick={() => {
                    navigate(createPageUrl('ServiceDetails') + `?id=${service.id}`);
                  }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{service.title || service.name}</CardTitle>
                          {service.provider?.user && (
                            <p className="text-sm text-gray-600 mt-1">
                              {service.provider.user.full_name || service.provider.user.username}
                            </p>
                          )}
                        </div>
                        {service.provider?.is_verified && (
                          <Badge className="bg-blue-100 text-blue-800">✓</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-700">{service.description}</p>

                      <div className="space-y-2">
                        {service.location && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-orange-600" />
                            <span>{service.location}</span>
                          </div>
                        )}
                        {service.duration && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-orange-600" />
                            <span>{service.duration} min</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="font-bold">{(service.rating || 0).toFixed(1)}</span>
                          {service.total_bookings > 0 && (
                            <span className="text-xs text-gray-600">
                              ({service.total_bookings} réservations)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {service.price && (
                            <span className="font-bold text-orange-600">{service.price} FCFA</span>
                          )}
                          <Button
                            className="bg-orange-500 hover:bg-orange-600"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(createPageUrl('ServiceBooking') + `?serviceId=${service.id}`);
                            }}
                          >
                            Réserver
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </motion.div>
  );
}

