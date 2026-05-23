import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Package, Truck, CheckCircle, Clock, Star, MessageCircle, MapPin, Phone, RotateCcw, AlertTriangle, FileDown, CreditCard } from 'lucide-react';
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
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('not_as_described');
  const [returnDescription, setReturnDescription] = useState('');
  const [returnAmount, setReturnAmount] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [payPhone, setPayPhone] = useState('');
  const [payPin, setPayPin] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOrderId(params.get('id'));
  }, []);

  const { data: orderRaw, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.orders.getById(orderId),
    enabled: !!orderId,
    refetchInterval: 5000
  });

  const { data: shipmentTimeline } = useQuery({
    queryKey: ['shipment-timeline', orderId],
    queryFn: () => api.shipments.getTimeline(orderId),
    enabled: !!orderId,
    refetchInterval: 7000,
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
  const shipping = shipmentTimeline?.shipping;

  useEffect(() => {
    if (order?.total_amount && !refundAmount) setRefundAmount(String(order.total_amount));
  }, [order?.total_amount, refundAmount]);
  useEffect(() => {
    if (order?.total_amount && !returnAmount) setReturnAmount(String(order.total_amount));
  }, [order?.total_amount, returnAmount]);

  const { data: myRefunds } = useQuery({
    queryKey: ['refunds-my'],
    queryFn: () => api.refunds.listMy(),
    enabled: !!orderId
  });
  const refundsList = Array.isArray(myRefunds) ? myRefunds : (myRefunds?.refunds ?? myRefunds?.data ?? []);
  const orderRefund = refundsList.find((r) => r.order_id === orderId || r.order?.id === orderId);

  const { data: myReturns } = useQuery({
    queryKey: ['returns-my'],
    queryFn: () => api.returns.list('buyer'),
    enabled: !!orderId
  });
  const returnsList = Array.isArray(myReturns) ? myReturns : (myReturns?.returns ?? myReturns?.data ?? []);
  const orderReturn = returnsList.find((r) => r.order_id === orderId || r.order?.id === orderId);

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

  const requestReturnMutation = useMutation({
    mutationFn: () => api.returns.request(orderId, {
      reason: returnReason,
      description: returnDescription || undefined,
      refund_amount: parseFloat(returnAmount) || order?.total_amount || 0
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns-my'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      setShowReturnModal(false);
      setReturnDescription('');
      setReturnReason('not_as_described');
      setReturnAmount('');
      toast.success('Demande de retour/echange envoyee');
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
    return <div className="h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
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
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${isActive ? 'text-blue-600' : isDone ? 'text-green-600' : 'text-gray-500'}`}>
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
              <p className="text-blue-600 font-bold mt-2">{order.total_amount?.toLocaleString()} FCFA</p>
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
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
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

      {/* Preuve de livraison */}
      {(shipping?.proof_of_delivery_photo || shipping?.signature || shipping?.actual_delivery || shipping?.current_location) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Preuve de livraison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {shipping?.proof_of_delivery_photo && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Photo de livraison</p>
                <a href={shipping.proof_of_delivery_photo} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={shipping.proof_of_delivery_photo}
                    alt="Preuve de livraison"
                    className="w-full max-h-72 object-cover rounded-lg border"
                  />
                </a>
              </div>
            )}
            {shipping?.signature && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Signature</p>
                <p className="font-mono text-sm break-all">{shipping.signature}</p>
              </div>
            )}
            {shipping?.current_location && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Derniere localisation</p>
                <p className="text-sm">{shipping.current_location}</p>
              </div>
            )}
            {shipping?.actual_delivery && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Date de livraison effective</p>
                <p className="text-sm">{new Date(shipping.actual_delivery).toLocaleString('fr-FR')}</p>
              </div>
            )}
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
              orderRefund.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
            }>
              {orderRefund.status === 'pending' ? 'En attente' : orderRefund.status === 'approved' ? 'Approuvé' : 'Refusé'}
            </Badge>
          </p>
          {orderRefund.reason && <p className="text-xs text-gray-500 mt-1">{orderRefund.reason}</p>}
        </Card>
      )}

      {/* Retour / echange */}
      {orderReturn && (
        <Card className="mb-6 p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-2">
            <RotateCcw className="w-5 h-5" />
            Demande de retour/echange
          </h3>
          <p className="text-sm text-gray-600">
            Montant: {orderReturn.refund_amount?.toLocaleString()} FCFA - Statut:{' '}
            <Badge className={
              ['approved', 'exchange_approved'].includes(orderReturn.status) ? 'bg-green-100 text-green-800' :
              ['rejected'].includes(orderReturn.status) ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
            }>
              {orderReturn.status}
            </Badge>
          </p>
          {orderReturn.reason && <p className="text-xs text-gray-500 mt-1">Motif: {orderReturn.reason}</p>}
          {orderReturn.description && <p className="text-xs text-gray-500 mt-1">{orderReturn.description}</p>}
        </Card>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {order.payment_status === 'pending' && order.payment_method === 'cod' && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <p className="font-medium text-blue-800">💵 Paiement à la livraison</p>
            <p className="text-sm text-blue-700 mt-1">
              Vous réglerez {order.total_amount?.toLocaleString()} FCFA auprès du livreur à la réception du colis.
            </p>
          </Card>
        )}
        {order.payment_status === 'pending' && order.payment_method !== 'cod' && (
          <Button
            onClick={() => setShowPayModal(true)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Payer avec {
              order.payment_method === 'moov_money' ? 'Moov Money'
                : order.payment_method === 'card' ? 'Carte bancaire'
                : order.payment_method === 'wallet' ? 'Portefeuille'
                : 'Orange Money'
            } ({order.total_amount?.toLocaleString()} FCFA)
          </Button>
        )}

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
            className="w-full bg-blue-500 hover:bg-blue-600"
          >
            <Star className="w-4 h-4 mr-2" />
            Laisser un avis
          </Button>
        )}

        {!orderRefund && ['paid', 'preparing', 'in_transit', 'delivered', 'completed'].includes(order.status) && (
          <Button
            variant="outline"
            className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={() => setShowRefundModal(true)}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Demander un remboursement
          </Button>
        )}

        {!orderReturn && ['delivered', 'completed'].includes(order.status) && (
          <Button
            variant="outline"
            className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={() => setShowReturnModal(true)}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Demander un retour/echange
          </Button>
        )}

        {['paid', 'preparing', 'in_transit', 'delivered', 'completed'].includes(order.status) && (
          <Button
            variant="outline"
            className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
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

      {/* Pay Modal */}
      {showPayModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-end z-50">
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="w-full bg-white rounded-t-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold">
              Payer avec {
                order?.payment_method === 'moov_money' ? 'Moov Money'
                  : order?.payment_method === 'card' ? 'Carte bancaire'
                  : order?.payment_method === 'wallet' ? 'Portefeuille'
                  : 'Orange Money'
              }
            </h3>
            <p className="text-sm text-gray-600">
              {order?.payment_method === 'moov_money'
                ? 'Entrez votre numero Moov Money (ex: 76 XX XX XX XX). Vous serez redirige pour valider le paiement.'
                : order?.payment_method === 'card'
                  ? 'Vous serez redirige vers la page de paiement securisee Stripe.'
                  : order?.payment_method === 'wallet'
                    ? 'Entrez votre code PIN wallet pour debiter votre solde.'
                    : 'Entrez votre numero Orange Money (ex: 77 XX XX XX XX). Vous serez redirige pour valider le paiement.'}
            </p>
            {(order?.payment_method === 'orange_money' || order?.payment_method === 'moov_money') && (
              <div>
                <p className="text-sm font-semibold mb-2">
                  Numero {order?.payment_method === 'moov_money' ? 'Moov Money' : 'Orange Money'}
                </p>
                <Input
                  type="tel"
                  placeholder={order?.payment_method === 'moov_money' ? '76 XX XX XX XX' : '77 XX XX XX XX'}
                  value={payPhone}
                  onChange={(e) => setPayPhone(e.target.value.replace(/\D/g, ''))}
                  disabled={payLoading}
                />
              </div>
            )}
            {order?.payment_method === 'wallet' && (
              <div>
                <p className="text-sm font-semibold mb-2">Code PIN portefeuille</p>
                <Input
                  type="password"
                  placeholder="****"
                  value={payPin}
                  onChange={(e) => setPayPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={payLoading}
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowPayModal(false)} disabled={payLoading}>
                Annuler
              </Button>
              <Button
                className={`flex-1 ${
                  order?.payment_method === 'moov_money'
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : order?.payment_method === 'wallet'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-blue-500 hover:bg-blue-600'
                }`}
                disabled={
                  payLoading
                  || ((order?.payment_method === 'orange_money' || order?.payment_method === 'moov_money') && (!payPhone || payPhone.length < 8))
                  || (order?.payment_method === 'wallet' && (!payPin || payPin.length < 4))
                }
                onClick={async () => {
                  const amount = order?.total_amount ?? 0;
                  const returnUrl = `${window.location.origin}${createPageUrl('OrderTracking')}?id=${orderId}`;
                  setPayLoading(true);
                  try {
                    if (order?.payment_method === 'wallet') {
                      await api.payments.payOrderWithWallet(orderId, payPin);
                      toast.success('Paiement wallet confirme');
                      setShowPayModal(false);
                      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
                      return;
                    }

                    if (order?.payment_method === 'card') {
                      const items = (order?.items || []).map((i) => ({
                        product_id: i.product_id || i.product?.id,
                        quantity: i.quantity,
                        price: i.unit_price || i.product?.price || 0,
                        name: i.product?.name || 'Produit',
                      }));
                      const result = await api.payments.createStripeCheckout(orderId, items, returnUrl, returnUrl);
                      if (result?.url) {
                        window.location.href = result.url;
                        return;
                      }
                      toast.error('Pas de lien Stripe recu');
                      return;
                    }

                    const result = order?.payment_method === 'moov_money'
                      ? await api.payments.initiateMoovMoney(orderId, amount, payPhone, returnUrl)
                      : await api.payments.initiateOrangeMoney(orderId, amount, payPhone, returnUrl);
                    if (result?.paymentUrl) {
                      window.location.href = result.paymentUrl;
                      return;
                    }
                    toast.error('Pas d URL de paiement recue');
                  } catch (e) {
                    toast.error(e?.response?.data?.message || e?.apiMessage || e?.message || 'Erreur lors de l initialisation du paiement');
                  } finally {
                    setPayLoading(false);
                  }
                }}
              >
                {payLoading ? 'Traitement...' : `Payer ${(order?.total_amount ?? 0).toLocaleString()} FCFA`}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Return / Exchange Modal */}
      {showReturnModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-end z-50">
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="w-full bg-white rounded-t-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold">Demander un retour/echange</h3>
            <div>
              <p className="text-sm font-semibold mb-2">Motif</p>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              >
                <option value="not_as_described">Pas conforme a la description</option>
                <option value="defective">Produit defectueux</option>
                <option value="damaged_shipping">Endommage a la livraison</option>
                <option value="wrong_item">Mauvais article recu</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Montant (FCFA)</p>
              <Input
                type="number"
                min="1"
                max={order?.total_amount}
                value={returnAmount}
                onChange={(e) => setReturnAmount(e.target.value)}
                placeholder={String(order?.total_amount ?? '')}
              />
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Description</p>
              <Textarea
                placeholder="Expliquez le probleme..."
                value={returnDescription}
                onChange={(e) => setReturnDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowReturnModal(false)}>
                Annuler
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={requestReturnMutation.isPending || !returnAmount || !returnReason}
                onClick={() => requestReturnMutation.mutate()}
              >
                {requestReturnMutation.isPending ? 'Envoi...' : 'Envoyer la demande'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
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
                className="flex-1 bg-blue-500 hover:bg-blue-600"
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
                className="flex-1 bg-blue-500 hover:bg-blue-600"
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
