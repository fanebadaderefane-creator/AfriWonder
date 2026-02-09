import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Star, User, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import BottomNav from '../components/navigation/BottomNav';

export default function ProviderProfile() {
  const navigate = useNavigate();
  const [providerId, setProviderId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setProviderId(params.get('id'));
  }, []);

  const { data: provider, isLoading } = useQuery({
    queryKey: ['provider', providerId],
    queryFn: () => api.providers.getById(providerId),
    enabled: !!providerId,
  });

  const { data: services } = useQuery({
    queryKey: ['provider-services', providerId],
    queryFn: () => api.providers.getServices(providerId),
    enabled: !!providerId,
  });

  const { data: reviews } = useQuery({
    queryKey: ['provider-reviews', providerId],
    queryFn: () => api.serviceReviews.getProviderReviews(providerId, { limit: 20 }),
    enabled: !!providerId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-bold mb-2">Prestataire non trouvé</h2>
            <Button onClick={() => navigate(createPageUrl('Providers'))}>
              Retour aux prestataires
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            ←
          </Button>
          <h1 className="text-xl font-bold flex-1">Profil prestataire</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              {provider.user?.profile_image ? (
                <img
                  src={provider.user.profile_image}
                  alt={provider.user.full_name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-10 h-10 text-gray-600" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-2xl font-bold">
                    {provider.user?.full_name || provider.user?.username}
                  </h2>
                  {provider.is_verified && (
                    <Badge className="bg-blue-100 text-blue-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Vérifié
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {provider.average_rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold">{provider.average_rating.toFixed(1)}</span>
                      <span>({provider.total_bookings || 0} réservations)</span>
                    </div>
                  )}
                  {provider.service_radius_km && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>Rayon: {provider.service_radius_km} km</span>
                    </div>
                  )}
                </div>
                {provider.service_categories && provider.service_categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {provider.service_categories.map((cat, idx) => (
                      <Badge key={idx} variant="outline">{cat}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="services" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="reviews">Avis ({reviews?.pagination?.total || reviews?.reviews?.length || 0})</TabsTrigger>
            <TabsTrigger value="info">Informations</TabsTrigger>
          </TabsList>

          {/* Services Tab */}
          <TabsContent value="services" className="mt-6">
            {services && services.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {services.map((service) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(createPageUrl('ServiceDetails') + `?id=${service.id}`)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{service.title}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-orange-600">{service.price} FCFA</p>
                            {service.duration && (
                              <p className="text-sm text-gray-600">{service.duration} min</p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {service.rating > 0 && (
                              <>
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                <span className="text-sm font-semibold">{service.rating.toFixed(1)}</span>
                              </>
                            )}
                            {service.total_bookings > 0 && (
                              <span className="text-sm text-gray-600">
                                ({service.total_bookings} réservations)
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(createPageUrl('ServiceDetails') + `?id=${service.id}`);
                            }}
                          >
                            Réserver
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-500">Aucun service disponible</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="mt-6">
            {reviews && reviews.reviews && reviews.reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        {review.customer?.profile_image ? (
                          <img
                            src={review.customer.profile_image}
                            alt={review.customer.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-600" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">
                              {review.customer?.full_name || review.customer?.username}
                            </p>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {review.title && (
                            <p className="font-semibold text-sm mb-1">{review.title}</p>
                          )}
                          <p className="text-sm text-gray-700">{review.content}</p>
                          {review.photos && review.photos.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {review.photos.map((photo, idx) => (
                                <img
                                  key={idx}
                                  src={photo}
                                  alt={`Photo ${idx + 1}`}
                                  className="w-16 h-16 rounded object-cover"
                                />
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(review.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-500">Aucun avis pour le moment</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Info Tab */}
          <TabsContent value="info" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {provider.location_type && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Type de service</p>
                    <p className="font-semibold capitalize">
                      {provider.location_type === 'both'
                        ? 'Sur place / À domicile'
                        : provider.location_type === 'on_site'
                        ? 'Sur place'
                        : 'À domicile'}
                    </p>
                  </div>
                )}
                {provider.payout_method && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Méthode de paiement</p>
                    <p className="font-semibold capitalize">{provider.payout_method}</p>
                  </div>
                )}
                {provider.status && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Statut</p>
                    <Badge
                      variant={
                        provider.status === 'active'
                          ? 'default'
                          : provider.status === 'pending'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {provider.status === 'active'
                        ? 'Actif'
                        : provider.status === 'pending'
                        ? 'En attente'
                        : 'Suspendu'}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}
