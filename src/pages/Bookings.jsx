import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, User, CheckCircle, XCircle, AlertCircle, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';
import BottomNav from '../components/navigation/BottomNav';

const statusConfig = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  in_progress: { label: 'En cours', color: 'bg-purple-100 text-purple-800', icon: Clock },
  completed: { label: 'Terminée', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800', icon: XCircle },
  no_show: { label: 'Absence', color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
};

export default function Bookings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [viewAs, setViewAs] = useState('customer'); // 'customer' or 'provider'

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => api.auth.me(),
  });

  const { data: provider } = useQuery({
    queryKey: ['provider-by-user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        // Essayer de récupérer le provider par user_id
        const providers = await api.providers.list({});
        return providers.providers?.find(p => p.user_id === user.id) || null;
      } catch {
        return null;
      }
    },
    enabled: !!user?.id,
  });

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['bookings', activeTab, viewAs],
    queryFn: async () => {
      const params = {
        as: viewAs,
        ...(activeTab !== 'all' && { status: activeTab }),
      };
      return api.bookings.list(params);
    },
  });

  const bookings = bookingsData?.bookings || [];

  const cancelBookingMutation = useMutation({
    mutationFn: ({ id, reason }) => api.bookings.cancel(id, reason),
    onSuccess: () => {
      toast.success('Réservation annulée');
      queryClient.invalidateQueries(['bookings']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'annulation');
    },
  });

  const confirmBookingMutation = useMutation({
    mutationFn: (id) => api.bookings.confirm(id),
    onSuccess: () => {
      toast.success('Réservation confirmée');
      queryClient.invalidateQueries(['bookings']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la confirmation');
    },
  });

  const completeBookingMutation = useMutation({
    mutationFn: (id) => api.bookings.complete(id),
    onSuccess: () => {
      toast.success('Réservation marquée comme terminée');
      queryClient.invalidateQueries(['bookings']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur');
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Mes réservations</h1>
            {provider && (
              <div className="flex gap-2">
                <Button
                  variant={viewAs === 'customer' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewAs('customer')}
                >
                  Client
                </Button>
                <Button
                  variant={viewAs === 'provider' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewAs('provider')}
                >
                  Prestataire
                </Button>
              </div>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">Toutes</TabsTrigger>
              <TabsTrigger value="pending">En attente</TabsTrigger>
              <TabsTrigger value="confirmed">Confirmées</TabsTrigger>
              <TabsTrigger value="completed">Terminées</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune réservation</h3>
              <p className="text-gray-600 mb-4">
                {viewAs === 'customer'
                  ? 'Vous n\'avez pas encore de réservations'
                  : 'Vous n\'avez pas encore de réservations de clients'}
              </p>
              {viewAs === 'customer' && (
                <Button onClick={() => navigate(createPageUrl('Services'))}>
                  Explorer les services
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          bookings.map((booking) => {
            const statusInfo = statusConfig[booking.status] || statusConfig.pending;
            const StatusIcon = statusInfo.icon;

            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(createPageUrl('BookingDetails') + `?id=${booking.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">
                          {booking.service?.title || 'Service'}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          {viewAs === 'customer' ? (
                            <>
                              <User className="w-4 h-4" />
                              <span>
                                {booking.provider?.user?.full_name || booking.provider?.user?.username}
                              </span>
                            </>
                          ) : (
                            <>
                              <User className="w-4 h-4" />
                              <span>
                                {booking.customer?.full_name || booking.customer?.username}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge className={statusInfo.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-orange-600" />
                        <span>
                          {new Date(booking.booking_date).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span>{booking.booking_time}</span>
                      </div>
                      {booking.customer_address && (
                        <div className="flex items-center gap-2 text-sm col-span-2">
                          <MapPin className="w-4 h-4 text-orange-600" />
                          <span className="truncate">
                            {booking.customer_address.address_line1}, {booking.customer_address.city}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm col-span-2">
                        <DollarSign className="w-4 h-4 text-orange-600" />
                        <span className="font-semibold">{booking.total_price} FCFA</span>
                        {booking.payment_status === 'partial' && (
                          <Badge variant="outline" className="text-xs">
                            Acompte payé
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {viewAs === 'provider' && (
                      <div className="flex gap-2 pt-3 border-t">
                        {booking.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmBookingMutation.mutate(booking.id);
                              }}
                              disabled={confirmBookingMutation.isPending}
                              className="flex-1 bg-green-500 hover:bg-green-600"
                            >
                              Confirmer
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelBookingMutation.mutate({
                                  id: booking.id,
                                  reason: 'Annulé par le prestataire',
                                });
                              }}
                              disabled={cancelBookingMutation.isPending}
                              className="flex-1"
                            >
                              Refuser
                            </Button>
                          </>
                        )}
                        {(booking.status === 'confirmed' || booking.status === 'in_progress') && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              completeBookingMutation.mutate(booking.id);
                            }}
                            disabled={completeBookingMutation.isPending}
                            className="flex-1 bg-orange-500 hover:bg-orange-600"
                          >
                            Marquer terminée
                          </Button>
                        )}
                      </div>
                    )}

                    {viewAs === 'customer' && booking.status === 'pending' && (
                      <div className="pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelBookingMutation.mutate({
                              id: booking.id,
                              reason: 'Annulé par le client',
                            });
                          }}
                          disabled={cancelBookingMutation.isPending}
                          className="w-full"
                        >
                          Annuler la réservation
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}
