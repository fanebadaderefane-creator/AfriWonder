import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Clock, Star, User, DollarSign, Shield, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';
import BottomNav from '../components/navigation/BottomNav';

export default function ServiceDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serviceId, setServiceId] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingData, setBookingData] = useState({
    booking_date: '',
    booking_time: '',
    location_type: 'customer_address',
    customer_address_id: '',
    notes: '',
    payment_method: 'wallet',
    deposit_only: false,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    setServiceId(id);
  }, []);

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => api.services.getById(serviceId),
    enabled: !!serviceId,
  });

  const { data: provider } = useQuery({
    queryKey: ['provider', service?.provider_id],
    queryFn: () => api.providers.getById(service?.provider_id),
    enabled: !!service?.provider_id,
  });

  const { data: reviews } = useQuery({
    queryKey: ['service-reviews', serviceId],
    queryFn: () => api.serviceReviews.getServiceReviews(serviceId, { limit: 10 }),
    enabled: !!serviceId,
  });

  const { data: availableSlots } = useQuery({
    queryKey: ['available-slots', service?.provider_id, bookingData.booking_date],
    queryFn: () => {
      if (!service?.provider_id || !bookingData.booking_date) return { slots: [] };
      return api.providers.getAvailableSlots(service.provider_id, {
        date: bookingData.booking_date,
        duration: service.duration || 60,
      });
    },
    enabled: !!service?.provider_id && !!bookingData.booking_date,
  });

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.addresses.list(),
  });

  const createBookingMutation = useMutation({
    mutationFn: (data) => api.bookings.create(data),
    onSuccess: (data) => {
      toast.success('Réservation créée avec succès!');
      queryClient.invalidateQueries(['bookings']);
      navigate(createPageUrl('BookingDetails') + `?id=${data.booking.id}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création de la réservation');
    },
  });

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!serviceId) return;

    if (!bookingData.booking_date || !bookingData.booking_time) {
      toast.error('Veuillez sélectionner une date et une heure');
      return;
    }

    if (bookingData.location_type === 'customer_address' && !bookingData.customer_address_id) {
      toast.error('Veuillez sélectionner une adresse');
      return;
    }

    createBookingMutation.mutate({
      service_id: serviceId,
      booking_date: bookingData.booking_date,
      booking_time: bookingData.booking_time,
      location_type: bookingData.location_type,
      customer_address_id: bookingData.customer_address_id || undefined,
      notes: bookingData.notes,
      payment_method: bookingData.payment_method,
      deposit_only: bookingData.deposit_only,
    });
  };

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

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Service non trouvé</h2>
            <p className="text-gray-600 mb-4">Le service demandé n'existe pas ou a été supprimé.</p>
            <Button onClick={() => navigate(createPageUrl('Marketplace'))}>
              Retour aux services
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
          <h1 className="text-xl font-bold flex-1">{service.title}</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Service Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{service.title}</CardTitle>
                {provider && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="w-4 h-4" />
                    <span>{provider.user?.full_name || provider.user?.username}</span>
                    {provider.is_verified && (
                      <Badge className="bg-blue-100 text-blue-800">✓ Vérifié</Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <span className="text-xl font-bold">{(service.rating || 0).toFixed(1)}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">{service.description}</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Prix</p>
                  <p className="font-bold text-lg">{service.price} FCFA</p>
                </div>
              </div>
              {service.duration && (
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Durée</p>
                    <p className="font-bold">{service.duration} min</p>
                  </div>
                </div>
              )}
              {service.travel_fee > 0 && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Frais de déplacement</p>
                    <p className="font-bold">{service.travel_fee} FCFA</p>
                  </div>
                </div>
              )}
              {service.location_type && (
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Type</p>
                    <p className="font-bold capitalize">
                      {service.location_type === 'both' ? 'Sur place / À domicile' : 
                       service.location_type === 'on_site' ? 'Sur place' : 'À domicile'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {service.location && (
              <div className="flex items-start gap-2 pt-2 border-t">
                <MapPin className="w-5 h-5 text-orange-600 mt-0.5" />
                <p className="text-gray-700">{service.location}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Provider Info */}
        {provider && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Prestataire</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                {provider.user?.profile_image ? (
                  <img
                    src={provider.user.profile_image}
                    alt={provider.user.full_name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                    <User className="w-8 h-8 text-orange-600" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold">{provider.user?.full_name || provider.user?.username}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm">{(provider.average_rating || 0).toFixed(1)}</span>
                    <span className="text-sm text-gray-600">
                      ({provider.total_bookings || 0} réservations)
                    </span>
                  </div>
                </div>
              </div>
              {provider.service_categories && provider.service_categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {provider.service_categories.map((cat, idx) => (
                    <Badge key={idx} variant="outline">{cat}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reviews */}
        {reviews && reviews.reviews && reviews.reviews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Avis ({reviews.pagination?.total || reviews.reviews.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.reviews.map((review) => (
                <div key={review.id} className="border-b pb-4 last:border-0">
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
                        <p className="font-semibold">{review.customer?.full_name || review.customer?.username}</p>
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
                      {review.title && <p className="font-semibold text-sm mb-1">{review.title}</p>}
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
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Booking Form */}
        {showBookingForm ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Réserver ce service</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold block mb-2">Date</label>
                  <Input
                    type="date"
                    value={bookingData.booking_date}
                    onChange={(e) => setBookingData({ ...bookingData, booking_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                {bookingData.booking_date && (
                  <div>
                    <label className="text-sm font-semibold block mb-2">Heure</label>
                    <Select
                      value={bookingData.booking_time}
                      onValueChange={(value) => setBookingData({ ...bookingData, booking_time: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une heure" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSlots?.slots?.map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {slot}
                          </SelectItem>
                        ))}
                        {(!availableSlots?.slots || availableSlots.slots.length === 0) && (
                          <SelectItem value="" disabled>Aucun créneau disponible</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="text-sm font-semibold block mb-2">Type de location</label>
                  <Select
                    value={bookingData.location_type}
                    onValueChange={(value) => setBookingData({ ...bookingData, location_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer_address">À mon adresse</SelectItem>
                      <SelectItem value="provider_location">Chez le prestataire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {bookingData.location_type === 'customer_address' && addresses && (
                  <div>
                    <label className="text-sm font-semibold block mb-2">Adresse</label>
                    <Select
                      value={bookingData.customer_address_id}
                      onValueChange={(value) => setBookingData({ ...bookingData, customer_address_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une adresse" />
                      </SelectTrigger>
                      <SelectContent>
                        {addresses.map((addr) => (
                          <SelectItem key={addr.id} value={addr.id}>
                            {addr.address_line1}, {addr.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="text-sm font-semibold block mb-2">Méthode de paiement</label>
                  <Select
                    value={bookingData.payment_method}
                    onValueChange={(value) => setBookingData({ ...bookingData, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wallet">Portefeuille interne</SelectItem>
                      <SelectItem value="orange_money">Orange Money</SelectItem>
                      <SelectItem value="mtn_money">MTN Money</SelectItem>
                      <SelectItem value="wave">Wave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-2">Notes (optionnel)</label>
                  <Textarea
                    value={bookingData.notes}
                    onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                    placeholder="Informations supplémentaires..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="deposit_only"
                    checked={bookingData.deposit_only}
                    onChange={(e) => setBookingData({ ...bookingData, deposit_only: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="deposit_only" className="text-sm">
                    Payer uniquement l'acompte (30%)
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowBookingForm(false)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={createBookingMutation.isPending}
                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                  >
                    {createBookingMutation.isPending ? 'Réservation...' : 'Réserver'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="sticky bottom-4">
            <Button
              onClick={() => setShowBookingForm(true)}
              className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-lg"
              size="lg"
            >
              Réserver maintenant
            </Button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
