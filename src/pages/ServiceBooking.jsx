import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';
import BottomNav from '../components/navigation/BottomNav';

export default function ServiceBooking() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serviceId, setServiceId] = useState(null);
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    booking_date: '',
    booking_time: '',
    location_type: 'customer_address',
    customer_address_id: '',
    notes: '',
    payment_method: 'wallet',
    deposit_only: false,
    customer_name: '',
    customer_phone: '',
    customer_email: '',
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('serviceId') || params.get('id');
    setServiceId(id);
  }, []);

  const { data: service, isLoading: serviceLoading } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => api.services.getById(serviceId),
    enabled: !!serviceId,
  });

  const { data: provider } = useQuery({
    queryKey: ['provider', service?.provider_id],
    queryFn: () => api.providers.getById(service?.provider_id),
    enabled: !!service?.provider_id,
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
      queryClient.invalidateQueries(['bookings']);
      setStep(3); // Confirmation step
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création de la réservation');
    },
  });

  const totalPrice = service ? (service.price + (service.travel_fee || 0)) : 0;
  const depositAmount = bookingData.deposit_only ? totalPrice * 0.3 : totalPrice;

  const handleNext = () => {
    if (step === 1) {
      if (!bookingData.booking_date || !bookingData.booking_time) {
        toast.error('Veuillez sélectionner une date et une heure');
        return;
      }
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!serviceId) return;

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
      customer_name: bookingData.customer_name?.trim() || undefined,
      customer_phone: bookingData.customer_phone?.trim() || undefined,
      customer_email: bookingData.customer_email?.trim() || undefined,
    });
  };

  if (serviceLoading) {
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
            <Button onClick={() => navigate(createPageUrl('Services'))}>
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
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            ←
          </Button>
          <h1 className="text-xl font-bold flex-1">Réservation</h1>
          <div className="text-sm text-gray-600">Étape {step}/3</div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= s ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step > s ? 'bg-orange-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-6 space-y-6">
        {/* Step 1: Date & Time */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Date et heure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <div className="pt-4">
                  <Button
                    onClick={handleNext}
                    disabled={!bookingData.booking_date || !bookingData.booking_time}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    Suivant
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Details & Payment */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Détails de la réservation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="pb-3 border-b">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Vos coordonnées (pour que le prestataire puisse vous recontacter)</p>
                  <div className="space-y-3">
                    <Input
                      placeholder="Nom complet"
                      value={bookingData.customer_name}
                      onChange={(e) => setBookingData({ ...bookingData, customer_name: e.target.value })}
                    />
                    <Input
                      type="tel"
                      placeholder="+223 XX XX XX XX"
                      value={bookingData.customer_phone}
                      onChange={(e) => setBookingData({ ...bookingData, customer_phone: e.target.value })}
                    />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={bookingData.customer_email}
                      onChange={(e) => setBookingData({ ...bookingData, customer_email: e.target.value })}
                    />
                  </div>
                </div>
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
                  <label className="text-sm font-semibold block mb-2">Notes (optionnel)</label>
                  <Textarea
                    value={bookingData.notes}
                    onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                    placeholder="Informations supplémentaires..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Paiement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="deposit_only"
                    checked={bookingData.deposit_only}
                    onChange={(e) => setBookingData({ ...bookingData, deposit_only: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="deposit_only" className="text-sm flex-1">
                    Payer uniquement l'acompte (30%)
                  </label>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Prix du service</span>
                    <span className="font-semibold">{service.price} FCFA</span>
                  </div>
                  {service.travel_fee > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Frais de déplacement</span>
                      <span className="font-semibold">{service.travel_fee} FCFA</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-lg font-bold text-orange-600">
                      {depositAmount.toFixed(0)} FCFA
                      {bookingData.deposit_only && (
                        <span className="text-sm text-gray-600 ml-2">
                          (acompte sur {totalPrice} FCFA)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Retour
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createBookingMutation.isPending || (bookingData.location_type === 'customer_address' && !bookingData.customer_address_id)}
                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                  >
                    {createBookingMutation.isPending ? 'Réservation...' : 'Confirmer'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && createBookingMutation.data && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Réservation confirmée!</h2>
                <p className="text-gray-600 mb-6">
                  {createBookingMutation.data?.provider?.user?.full_name || provider?.user?.full_name || 'Le prestataire'} vous contactera pour confirmer.
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => navigate(createPageUrl('Services'))}
                    className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white"
                  >
                    Fermer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(createPageUrl('BookingDetails') + `?id=${createBookingMutation.data?.id}`)}
                    className="w-full"
                  >
                    Voir les détails
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
