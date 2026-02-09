import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, Calendar, Clock, MapPin, User, Star, DollarSign, 
  CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
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

export default function BookingDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [bookingId, setBookingId] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    title: '',
    content: '',
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setBookingId(params.get('id'));
  }, []);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => api.bookings.getById(bookingId),
    enabled: !!bookingId,
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => api.auth.me(),
  });

  const isProvider = booking?.provider_id && user?.id && booking.provider.user_id === user.id;
  const isCustomer = booking?.customer_id === user?.id;

  const cancelBookingMutation = useMutation({
    mutationFn: ({ id, reason }) => api.bookings.cancel(id, reason),
    onSuccess: () => {
      toast.success('Réservation annulée');
      queryClient.invalidateQueries(['booking', bookingId]);
      setShowCancelModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'annulation');
    },
  });

  const confirmBookingMutation = useMutation({
    mutationFn: (id) => api.bookings.confirm(id),
    onSuccess: () => {
      toast.success('Réservation confirmée');
      queryClient.invalidateQueries(['booking', bookingId]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la confirmation');
    },
  });

  const completeBookingMutation = useMutation({
    mutationFn: (id) => api.bookings.complete(id),
    onSuccess: () => {
      toast.success('Réservation marquée comme terminée');
      queryClient.invalidateQueries(['booking', bookingId]);
      setShowReviewModal(true);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur');
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: (data) => api.serviceReviews.create({
      booking_id: bookingId,
      ...data,
    }),
    onSuccess: () => {
      toast.success('Avis publié avec succès');
      queryClient.invalidateQueries(['booking', bookingId]);
      queryClient.invalidateQueries(['service-reviews']);
      setShowReviewModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la publication de l\'avis');
    },
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

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Réservation non trouvée</h2>
            <Button onClick={() => navigate(createPageUrl('Bookings'))}>
              Retour aux réservations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = statusConfig[booking.status] || statusConfig.pending;
  const StatusIcon = statusInfo.icon;

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
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold flex-1">Détails de la réservation</h1>
          <Badge className={statusInfo.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Service Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{booking.service?.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">{booking.service?.description}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-semibold">
                    {new Date(booking.booking_date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Heure</p>
                  <p className="font-semibold">{booking.booking_time}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Durée</p>
                  <p className="font-semibold">{booking.duration} min</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Prix</p>
                  <p className="font-semibold">{booking.total_price} FCFA</p>
                </div>
              </div>
            </div>
            {booking.notes && (
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-1">Notes</p>
                <p className="text-gray-700">{booking.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isProvider ? 'Informations client' : 'Informations prestataire'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isProvider ? (
              <>
                <div className="flex items-center gap-3">
                  {booking.customer?.profile_image ? (
                    <img
                      src={booking.customer.profile_image}
                      alt={booking.customer.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{booking.customer?.full_name || booking.customer?.username}</p>
                    <p className="text-sm text-gray-600">{booking.customer?.email}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  {booking.provider?.user?.profile_image ? (
                    <img
                      src={booking.provider.user.profile_image}
                      alt={booking.provider.user.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">
                      {booking.provider?.user?.full_name || booking.provider?.user?.username}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm">
                        {(booking.provider?.average_rating || 0).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
            {booking.customer_address && (
              <div className="flex items-start gap-2 pt-3 border-t">
                <MapPin className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Adresse</p>
                  <p className="text-gray-700">
                    {booking.customer_address.address_line1}
                    {booking.customer_address.address_line2 && `, ${booking.customer_address.address_line2}`}
                    <br />
                    {booking.customer_address.city}
                    {booking.customer_address.postal_code && ` ${booking.customer_address.postal_code}`}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Paiement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Statut</span>
              <Badge
                variant={
                  booking.payment_status === 'paid'
                    ? 'default'
                    : booking.payment_status === 'partial'
                    ? 'secondary'
                    : 'outline'
                }
              >
                {booking.payment_status === 'paid'
                  ? 'Payé'
                  : booking.payment_status === 'partial'
                  ? 'Acompte payé'
                  : 'En attente'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Méthode</span>
              <span className="font-semibold capitalize">{booking.payment_method}</span>
            </div>
            {booking.deposit_amount && (
              <div className="flex justify-between">
                <span className="text-gray-600">Acompte</span>
                <span className="font-semibold">{booking.deposit_amount} FCFA</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t">
              <span className="text-lg font-bold">Total</span>
              <span className="text-lg font-bold text-orange-600">{booking.total_price} FCFA</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {isProvider && booking.status === 'pending' && (
          <div className="flex gap-3">
            <Button
              onClick={() => confirmBookingMutation.mutate(booking.id)}
              disabled={confirmBookingMutation.isPending}
              className="flex-1 bg-green-500 hover:bg-green-600"
            >
              Confirmer la réservation
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(true)}
              className="flex-1"
            >
              Refuser
            </Button>
          </div>
        )}

        {isProvider && (booking.status === 'confirmed' || booking.status === 'in_progress') && (
          <Button
            onClick={() => completeBookingMutation.mutate(booking.id)}
            disabled={completeBookingMutation.isPending}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            Marquer comme terminée
          </Button>
        )}

        {isCustomer && booking.status === 'pending' && (
          <Button
            variant="outline"
            onClick={() => setShowCancelModal(true)}
            className="w-full"
          >
            Annuler la réservation
          </Button>
        )}

        {isCustomer && booking.status === 'completed' && !booking.review && (
          <Button
            onClick={() => setShowReviewModal(true)}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            Laisser un avis
          </Button>
        )}

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle>Annuler la réservation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Raison de l'annulation..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancelReason('');
                    }}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={() =>
                      cancelBookingMutation.mutate({
                        id: booking.id,
                        reason: cancelReason || 'Annulé par l\'utilisateur',
                      })
                    }
                    disabled={cancelBookingMutation.isPending}
                    className="flex-1 bg-red-500 hover:bg-red-600"
                  >
                    Confirmer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Review Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle>Laisser un avis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-semibold block mb-2">Note</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setReviewData({ ...reviewData, rating })}
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          reviewData.rating >= rating
                            ? 'bg-yellow-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        <Star className="w-5 h-5" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-2">Titre (optionnel)</label>
                  <input
                    type="text"
                    value={reviewData.title}
                    onChange={(e) => setReviewData({ ...reviewData, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Titre de votre avis"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-2">Commentaire</label>
                  <Textarea
                    value={reviewData.content}
                    onChange={(e) => setReviewData({ ...reviewData, content: e.target.value })}
                    rows={4}
                    placeholder="Partagez votre expérience..."
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowReviewModal(false);
                      setReviewData({ rating: 5, title: '', content: '' });
                    }}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={() => createReviewMutation.mutate(reviewData)}
                    disabled={createReviewMutation.isPending || !reviewData.content}
                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                  >
                    Publier
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
