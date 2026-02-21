import React from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, Calendar, DollarSign, Star, Clock, 
  CheckCircle, AlertCircle, Plus, Settings 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';
import BottomNav from '../components/navigation/BottomNav';

export default function ProviderDashboard() {
  const navigate = useNavigate();

  // Récupérer le provider de l'utilisateur connecté
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => api.auth.me(),
  });

  const { data: provider } = useQuery({
    queryKey: ['provider-by-user', user?.id],
    queryFn: () => api.providers.getByUserId(user?.id),
    enabled: !!user?.id,
  });

  const { data: bookings } = useQuery({
    queryKey: ['bookings', 'provider'],
    queryFn: () => api.bookings.list({ as: 'provider' }),
    enabled: !!provider,
  });

  const { data: payouts } = useQuery({
    queryKey: ['payouts', provider?.id],
    queryFn: () => api.providers.getPayouts(provider?.id),
    enabled: !!provider?.id,
  });

  const { data: availablePayout } = useQuery({
    queryKey: ['available-payout', provider?.id],
    queryFn: () => api.providers.getAvailablePayout(provider?.id),
    enabled: !!provider?.id,
  });

  if (!provider) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Vous n'êtes pas encore prestataire</h2>
            <p className="text-gray-600 mb-4">
              Créez votre compte prestataire pour commencer à proposer vos services
            </p>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => navigate(createPageUrl('BecomeProvider'))}
            >
              Devenir prestataire
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingBookings = bookings?.bookings?.filter(b => b.status === 'pending') || [];
  const confirmedBookings = bookings?.bookings?.filter(b => b.status === 'confirmed') || [];
  const inProgressBookings = bookings?.bookings?.filter(b => b.status === 'in_progress') || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(createPageUrl('AddService'))}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau service
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(createPageUrl('Settings'))}
            >
              <Settings className="w-4 h-4 mr-2" />
              Paramètres
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Revenus totaux</p>
                  <p className="text-2xl font-bold text-green-600">
                    {provider.total_earnings || 0} FCFA
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Réservations</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {provider.total_bookings || 0}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Note moyenne</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {(provider.average_rating || 0).toFixed(1)}
                  </p>
                </div>
                <Star className="w-8 h-8 text-yellow-600 fill-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Disponible</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {availablePayout?.available_for_payout || 0} FCFA
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Réservations</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="w-full">
              <TabsList>
                <TabsTrigger value="pending">
                  En attente ({pendingBookings.length})
                </TabsTrigger>
                <TabsTrigger value="confirmed">
                  Confirmées ({confirmedBookings.length})
                </TabsTrigger>
                <TabsTrigger value="in_progress">
                  En cours ({inProgressBookings.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-4">
                {pendingBookings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucune réservation en attente
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingBookings.slice(0, 5).map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(createPageUrl('BookingDetails') + `?id=${booking.id}`)}
                      >
                        <div>
                          <p className="font-semibold">{booking.service?.title}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(booking.booking_date).toLocaleDateString()} à {booking.booking_time}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{booking.total_price} FCFA</p>
                          <Button
                            size="sm"
                            className="mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(createPageUrl('BookingDetails') + `?id=${booking.id}`);
                            }}
                          >
                            Voir
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="confirmed" className="mt-4">
                {confirmedBookings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucune réservation confirmée
                  </div>
                ) : (
                  <div className="space-y-3">
                    {confirmedBookings.slice(0, 5).map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(createPageUrl('BookingDetails') + `?id=${booking.id}`)}
                      >
                        <div>
                          <p className="font-semibold">{booking.service?.title}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(booking.booking_date).toLocaleDateString()} à {booking.booking_time}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{booking.total_price} FCFA</p>
                          <Badge className="bg-blue-100 text-blue-800 mt-2">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Confirmée
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="in_progress" className="mt-4">
                {inProgressBookings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucune réservation en cours
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inProgressBookings.slice(0, 5).map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(createPageUrl('BookingDetails') + `?id=${booking.id}`)}
                      >
                        <div>
                          <p className="font-semibold">{booking.service?.title}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(booking.booking_date).toLocaleDateString()} à {booking.booking_time}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{booking.total_price} FCFA</p>
                          <Badge className="bg-purple-100 text-purple-800 mt-2">
                            <Clock className="w-3 h-3 mr-1" />
                            En cours
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(createPageUrl('Bookings') + '?as=provider')}
              >
                Voir toutes les réservations
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payouts */}
        {availablePayout && availablePayout.available_for_payout > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Paiements disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">Montant disponible</p>
                  <p className="text-2xl font-bold text-green-600">
                    {availablePayout.available_for_payout} FCFA
                  </p>
                </div>
                <Button
                  className="bg-green-500 hover:bg-green-600"
                  onClick={() => {
                    // TODO: Ouvrir modal de demande de payout
                    toast.success('Demande de paiement envoyée');
                  }}
                >
                  Demander le paiement
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
