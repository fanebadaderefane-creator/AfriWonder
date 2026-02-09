import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Package, Truck, CheckCircle, Clock, Star, MessageCircle, MapPin, Phone, RotateCcw, AlertTriangle, FileDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';

const statusSteps = [
  { status: 'pending_payment', label: 'Paiement en attente', icon: Clock },
  { status: 'paid', label: 'Paiement confirmé', icon: CheckCircle },
  { status: 'preparing', label: 'En préparation', icon: Package },
  { status: 'in_transit', label: 'Expédié', icon: Truck },
  { status: 'delivered', label: 'Livré', icon: CheckCircle },
  { status: 'completed', label: 'Terminé', icon: CheckCircle },
  { status: 'refunded', label: 'Remboursé', icon: RotateCcw }
];

export default function OrderTracking() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [orderId, setOrderId] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOrderId(params.get('id'));
  }, []);

  useEffect(() => {
    if (order?.total_amount && !refundAmount) setRefundAmount(String(order.total_amount));
  }, [order?.total_amount]);

  const { data: orderRaw, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.orders.getById(orderId),
    enabled: !!orderId,
    refetchInterval: 5000
  });

  const order = React.useMemo(() => {
    if (!orderRaw) return null;
    const first = orderRaw.items?.[0];
    const product = first?.product;
    const shipping = orderRaw.shipping;
    const events = shipping?.tracking_events ?? [];
    return {
      ...orderRaw,
      product_name: product?.name ?? orderRaw.product_name,
      product_image: product?.images?.[0] ?? orderRaw.product_image,
      quantity: first?.quantity ?? orderRaw.quantity ?? 0,
      delivery_address: orderRaw.shipping_address ?? shipping?.shipping_address ?? orderRaw.delivery_address,
      delivery_phone: orderRaw.delivery_phone ?? '',
      tracking_code: shipping?.tracking_number ?? orderRaw.tracking_code,
      tracking_updates: events.length ? events.map((e) => ({ status: e.event_type || e.status, message: e.description || e.event_type || '', location: e.location, timestamp: e.timestamp })) : (orderRaw.tracking_updates ?? []),
      seller_id: product?.seller?.id ?? orderRaw.seller_id,
      created_date: orderRaw.created_at ?? orderRaw.created_date,
      payment_status: orderRaw.payment_status ?? 'pending',
    };
  }, [orderRaw]);

  const { data: myRefunds } = useQuery({
    queryKey: ['refunds-my'],
    queryFn: () => api.refunds.listMy(),
    enabled: !!orderId
  });
  const refundsList = Array.isArray(myRefunds) ? myRefunds : (myRefunds?.refunds ?? myRefunds?.data ?? []);
  const orderRefund = refundsList.find((r) => r.order_id === orderId || r.order?.id === orderId);

  const requestRefundMutation = useMutation({
    mutationFn: () => api.refunds.request(orderId, {
      amount: parseFloat(refundAmount) || order?.total_amount || 0,
      reason: refundReason || undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refunds-my'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      setShowRefundModal(false);
      setRefundAmount('');
      setRefundReason('');
      toast.success('Demande de remboursement envoyée');
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur')
  });

  const submitRatingMutation = useMutation({
    mutationFn: async () => {
      return api.orders.updateStatus(orderId, {
        seller_rating: rating,
        seller_review: review,
        status: 'completed'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success('Avis enregistré');
      setShowRating(false);
    }
  });

  const confirmDeliveryMutation = useMutation({
    mutationFn: async () => {
      const trackingUpdates = [
        ...(order.tracking_updates || []),
        {
          status: 'delivered',
          message: 'Livraison confirmée par l\'acheteur',
          timestamp: new Date().toISOString(),
          location: order.delivery_address
        }
      ];

      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() + 7); // 7 jours pour escrow

      return api.orders.updateStatus(orderId, {
        status: 'delivered',
        confirmed_by_buyer: true,
        buyer_confirmation_date: new Date().toISOString(),
        tracking_updates: trackingUpdates,
        payment_status: 'released_to_seller',
        escrow_release_date: releaseDate.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success('Livraison confirmée!');
      setShowRating(true);
    }
  });

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Commande non trouvée</p>
        <Button onClick={() => navigate(createPageUrl('Orders'))} className="mt-4">Retour aux commandes</Button>
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex(step => step.status === order.status);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto p-4 safe-area-pb pb-20">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="w-5 h-5" />
      </Button>

      {/* Status Timeline */}
      <Card className="mb-6 p-6">
        <h3 className="font-bold mb-6">Statut de la commande</h3>
        <div className="space-y-4">
          {statusSteps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === currentStepIndex;
            const isDone = idx < currentStepIndex;
            return (
              <div key={step.status} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${isActive ? 'text-orange-600' : isDone ? 'text-green-600' : 'text-gray-500'}`}>
                    {step.label}
                  </p>
                  {isActive && <p className="text-sm text-gray-500">Étape actuelle</p>}
                </div>
                {isDone && <CheckCircle className="w-5 h-5 text-green-600" />}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Order Details */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Détails de la commande</CardTitle>
            {order.source === 'live' && (
              <Badge className="bg-purple-100 text-purple-700">Acheté pendant live</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <img src={order.product_image} alt={order.product_name} className="w-20 h-20 rounded-lg object-cover" />
            <div className="flex-1">
              <h3 className="font-semibold">{order.product_name}</h3>
              <p className="text-sm text-gray-600">Quantité: {order.quantity}</p>
              <p className="text-orange-600 font-bold mt-2">{order.total_amount?.toLocaleString()} FCFA</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t">
            <div>
              <p className="text-gray-500">Numéro de commande</p>
              <p className="font-mono text-xs">{order.id}</p>
            </div>
            <div>
              <p className="text-gray-500">Date</p>
              <p className="font-semibold">{new Date(order.created_date).toLocaleDateString('fr-FR')}</p>
            </div>
            <div>
              <p className="text-gray-500">Statut paiement</p>
              <Badge className={order.payment_status === 'released_to_seller' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                {order.payment_status === 'pending' ? 'En attente' : order.payment_status === 'escrow' ? 'En sécurité' : 'Libéré'}
              </Badge>
            </div>
            <div>
              <p className="text-gray-500">Mode de paiement</p>
              <p className="font-semibold capitalize">{order.payment_method}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Info */}
      {order.delivery_address && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Adresse de livraison
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{order.delivery_address}</p>
                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                  <Phone className="w-4 h-4" />
                  {order.delivery_phone}
                </p>
              </div>
            </div>
            
            {order.tracking_code && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Numéro de suivi</p>
                <p className="font-mono font-bold">{order.tracking_code}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tracking Updates */}
      {order.tracking_updates?.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Historique du suivi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.tracking_updates.map((update, idx) => (
                <div key={idx} className="flex gap-3 pb-3 border-b last:border-0">
                  <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 mt-1.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{update.status}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{update.message}</p>
                    {update.location && <p className="text-xs text-gray-400 mt-1">{update.location}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(update.timestamp).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remboursement */}
      {orderRefund && (
        <Card className="mb-6 p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-2">
            <RotateCcw className="w-5 h-5" />
            Demande de remboursement
          </h3>
          <p className="text-sm text-gray-600">
            Montant: {orderRefund.amount?.toLocaleString()} FCFA — Statut:{' '}
            <Badge className={
              orderRefund.status === 'approved' ? 'bg-green-100 text-green-800' :
              orderRefund.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
            }>
              {orderRefund.status === 'pending' ? 'En attente' : orderRefund.status === 'approved' ? 'Approuvé' : 'Refusé'}
            </Badge>
          </p>
          {orderRefund.reason && <p className="text-xs text-gray-500 mt-1">{orderRefund.reason}</p>}
        </Card>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {order.status === 'in_transit' && !order.confirmed_by_buyer && (
          <Button
            onClick={() => confirmDeliveryMutation.mutate()}
            disabled={confirmDeliveryMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            ✓ Confirmer la réception
          </Button>
        )}

        {order.status === 'delivered' && !order.seller_rating && (
          <Button
            onClick={() => setShowRating(true)}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            <Star className="w-4 h-4 mr-2" />
            Laisser un avis
          </Button>
        )}

        {!orderRefund && ['paid', 'preparing', 'in_transit', 'delivered', 'completed'].includes(order.status) && (
          <Button
            variant="outline"
            className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
            onClick={() => setShowRefundModal(true)}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Demander un remboursement
          </Button>
        )}

        {['paid', 'preparing', 'in_transit', 'delivered', 'completed'].includes(order.status) && (
          <Button
            variant="outline"
            className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
            onClick={() => navigate(`${createPageUrl('OrderDispute')}?orderId=${order.id}`)}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Signaler un problème
          </Button>
        )}

        {['paid', 'preparing', 'in_transit', 'delivered', 'completed'].includes(order.status) && (
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              try {
                const blob = await api.orders.downloadInvoice(order.id);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `facture-${order.id.slice(0, 8)}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Facture téléchargée');
              } catch (e) {
                toast.error(e.response?.data?.error || e.message || 'Erreur téléchargement');
              }
            }}
          >
            <FileDown className="w-4 h-4 mr-2" />
            Télécharger la facture
          </Button>
        )}

        <Button
          onClick={() => navigate(`${createPageUrl('Chat')}?_userId=${order.seller_id}&orderId=${order.id}`)}
          variant="outline"
          className="w-full"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Contacter le vendeur
        </Button>
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-end z-50">
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="w-full bg-white rounded-t-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold">Demander un remboursement</h3>
            <div>
              <p className="text-sm font-semibold mb-2">Montant (FCFA)</p>
              <Input
                type="number"
                min="1"
                max={order?.total_amount}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder={String(order?.total_amount ?? '')}
              />
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Motif (optionnel)</p>
              <Textarea
                placeholder="Raison du remboursement..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowRefundModal(false)}>
                Annuler
              </Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                disabled={requestRefundMutation.isPending || !refundAmount}
                onClick={() => requestRefundMutation.mutate()}
              >
                {requestRefundMutation.isPending ? 'Envoi...' : 'Envoyer la demande'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Rating Modal */}
      {showRating && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-end z-50">
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="w-full bg-white rounded-t-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold">Évaluer votre achat</h3>
            
            <div>
              <p className="text-sm font-semibold mb-2">Note</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="text-3xl"
                  >
                    {star <= rating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Votre avis</p>
              <Textarea
                placeholder="Parlez de votre expérience..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                className="h-24"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setShowRating(false)} variant="outline" className="flex-1">
                Annuler
              </Button>
              <Button
                onClick={() => submitRatingMutation.mutate()}
                disabled={submitRatingMutation.isPending}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                Envoyer l'avis
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
