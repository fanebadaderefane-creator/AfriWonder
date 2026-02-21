import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Package, Truck, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getAbsoluteImageUrl, MARKETPLACE_PLACEHOLDER_IMG } from '@/lib/utils';
import { toast } from 'sonner';

const statusConfig = {
  pending: { label: 'Paiement en attente', color: 'bg-gray-100 text-gray-600' },
  pending_payment: { label: 'Paiement en attente', color: 'bg-gray-100 text-gray-600' },
  paid: { label: 'Payé', color: 'bg-green-100 text-green-700' },
  processing: { label: 'En préparation', color: 'bg-blue-100 text-blue-600' },
  preparing: { label: 'En préparation', color: 'bg-blue-100 text-blue-600' },
  in_transit: { label: 'Expédié', color: 'bg-amber-100 text-amber-700' },
  delivered: { label: 'Livré', color: 'bg-green-100 text-green-600' },
  completed: { label: 'Terminé', color: 'bg-green-100 text-green-600' },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-600' },
};

// CDC 2.2.4 - Transporteurs Mali : DHL Mali, sociétés locales
const CARRIERS = [
  { value: 'dhl_mali', label: 'DHL Mali' },
  { value: 'moto', label: 'Livraison moto (local)' },
  { value: 'chronopost', label: 'Chronopost' },
  { value: 'societe_transport_mali', label: 'Société transport Mali' },
  { value: 'tcr_mali', label: 'TCR Mali' },
  { value: 'laposte', label: 'La Poste / Colissimo' },
  { value: 'autre', label: 'Autre transporteur' },
];

export default function SellerOrders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [shipmentModal, setShipmentModal] = useState(null); // { orderId }
  const [shipmentForm, setShipmentForm] = useState({ carrier: 'dhl_mali', tracking_number: '' });
  const [rateBuyerModal, setRateBuyerModal] = useState(null); // { orderId, buyerName }
  const [rateBuyerForm, setRateBuyerForm] = useState({ rating: 5, content: '' });

  React.useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        navigate('/');
      }
    };
    getUser();
  }, []);

  const { data: sellerOrdersData } = useQuery({
    queryKey: ['seller-orders', user?.id],
    queryFn: async () => {
      const result = await api.orders.list({ as: 'seller', page: 1, limit: 100 });
      return result;
    },
    enabled: !!user?.id,
    refetchInterval: 10000
  });

  const sellerOrders = sellerOrdersData?.orders || [];

  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, newStatus }) => api.orders.updateStatus(orderId, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-orders', user?.id] });
      toast.success('Statut mis à jour');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'Erreur');
    }
  });

  const createShipmentMutation = useMutation({
    mutationFn: ({ orderId, carrier, tracking_number }) =>
      api.shipments.create({ order_id: orderId, carrier, tracking_number: tracking_number || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-orders', user?.id] });
      setShipmentModal(null);
      setShipmentForm({ carrier: 'dhl_mali', tracking_number: '' });
      toast.success('Expédition créée. L\'acheteur peut suivre sa commande.');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.apiMessage || err?.message || 'Erreur');
    },
  });

  const rateBuyerMutation = useMutation({
    mutationFn: ({ orderId, rating, content }) =>
      api.orderReviews.rateBuyer(orderId, { rating, content: content || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-orders', user?.id] });
      setRateBuyerModal(null);
      setRateBuyerForm({ rating: 5, content: '' });
      toast.success('Acheteur noté.');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.apiMessage || err?.message || 'Erreur');
    },
  });

  const filteredOrders = sellerOrders.filter(order => {
    if (activeTab === 'pending') return order.status === 'pending' || order.status === 'pending_payment';
    if (activeTab === 'preparing') return ['paid', 'processing', 'preparing'].includes(order.status);
    if (activeTab === 'shipped') return order.status === 'in_transit' || !!order.shipping;
    if (activeTab === 'delivered') return ['delivered', 'completed'].includes(order.status);
    return true;
  });

  const tabCounts = {
    pending: sellerOrders.filter(o => o.status === 'pending' || o.status === 'pending_payment').length,
    preparing: sellerOrders.filter(o => ['paid', 'processing', 'preparing'].includes(o.status)).length,
    shipped: sellerOrders.filter(o => o.status === 'in_transit' || !!o.shipping).length,
    delivered: sellerOrders.filter(o => ['delivered', 'completed'].includes(o.status)).length,
  };

  const canShip = (order) => {
    if (order.shipping) return false;
    const paid = ['escrow', 'paid'].includes(order.payment_status);
    const ready = ['paid', 'processing', 'preparing'].includes(order.status);
    return paid && ready;
  };

  const canRateBuyer = (order) => {
    const delivered = ['delivered', 'completed'].includes(order.status);
    const notYetRated = !order.buyer_reviews?.length;
    return delivered && notYetRated;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b z-40 p-4">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Mes ventes</h1>
        </div>
        
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {[['pending', 'À traiter'], ['preparing', 'En cours'], ['shipped', 'Expédiées'], ['delivered', 'Livrées']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                activeTab === key ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {label} ({tabCounts[key] ?? 0})
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune commande</p>
          </div>
        ) : (
          filteredOrders.map((order, idx) => {
            const firstItem = order.items?.[0];
            const product = firstItem?.product;
            const buyer = order.user;
            const productName = product?.name || 'Commande';
            const productImage = product?.images?.[0];
            return (
              <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-3 mb-3">
                      <img
                        src={getAbsoluteImageUrl(productImage) || MARKETPLACE_PLACEHOLDER_IMG}
                        alt={productName}
                        className="w-20 h-20 rounded-lg object-cover bg-gray-100"
                        onError={(e) => { e.target.onerror = null; e.target.src = MARKETPLACE_PLACEHOLDER_IMG; }}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{productName}</h3>
                        <p className="text-sm text-gray-600">Acheteur: {buyer?.full_name || buyer?.username || order.user_id?.slice(0, 8) || '—'}</p>
                        <p className="text-orange-600 font-bold mt-1">{order.total_amount?.toLocaleString()} FCFA</p>
                        <div className="flex gap-2 mt-2">
                          <Badge className={statusConfig[order.status]?.color || 'bg-gray-100 text-gray-600'}>
                            {statusConfig[order.status]?.label || order.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {order.shipping?.tracking_number && (
                      <p className="text-xs text-gray-600 mt-1">
                        Suivi: <span className="font-mono font-semibold">{order.shipping.tracking_number}</span>
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                      {order.status === 'pending' && (
                        <Button
                          onClick={() => updateOrderMutation.mutate({ orderId: order.id, newStatus: 'processing' })}
                          disabled={updateOrderMutation.isPending}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Accepter / En préparation
                        </Button>
                      )}
                      {canShip(order) && (
                        <Button
                          onClick={() => setShipmentModal({ orderId: order.id })}
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <Truck className="w-4 h-4 mr-1" />
                          Expédier
                        </Button>
                      )}
                      {order.status === 'processing' && !canShip(order) && (
                        <Button
                          onClick={() => updateOrderMutation.mutate({ orderId: order.id, newStatus: 'completed' })}
                          disabled={updateOrderMutation.isPending}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Marquer comme terminé
                        </Button>
                      )}
                      {canRateBuyer(order) && (
                        <Button
                          onClick={() => setRateBuyerModal({
                            orderId: order.id,
                            buyerName: buyer?.full_name || buyer?.username || 'Acheteur'
                          })}
                          size="sm"
                          variant="outline"
                          className="col-span-2"
                        >
                          <Star className="w-4 h-4 mr-1" />
                          Noter l&apos;acheteur
                        </Button>
                      )}
                      {order.buyer_reviews?.length > 0 && (
                        <span className="col-span-2 text-xs text-green-600 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400" />
                          Acheteur noté ({order.buyer_reviews[0]?.rating}/5)
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Modal Expédition */}
      {shipmentModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => !createShipmentMutation.isPending && setShipmentModal(null)}
        >
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">Créer une expédition</h3>
            <p className="text-sm text-gray-600 mb-4">
              Indiquez le transporteur et le numéro de suivi. L&apos;acheteur pourra suivre sa commande.
            </p>
            <div className="space-y-4">
              <div>
                <Label>Transporteur</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-1"
                  value={shipmentForm.carrier}
                  onChange={(e) => setShipmentForm((f) => ({ ...f, carrier: e.target.value }))}
                >
                  {CARRIERS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Numéro de suivi (optionnel)</Label>
                <Input
                  placeholder="Ex: ABC123456789"
                  value={shipmentForm.tracking_number}
                  onChange={(e) => setShipmentForm((f) => ({ ...f, tracking_number: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShipmentModal(null)} disabled={createShipmentMutation.isPending}>
                Annuler
              </Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700"
                disabled={createShipmentMutation.isPending}
                onClick={() =>
                  createShipmentMutation.mutate({
                    orderId: shipmentModal.orderId,
                    carrier: shipmentForm.carrier,
                    tracking_number: shipmentForm.tracking_number.trim() || undefined,
                  })
                }
              >
                {createShipmentMutation.isPending ? 'Création...' : 'Créer l\'expédition'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal CDC 2.2.6 : Notation mutuelle vendeur→acheteur */}
      {rateBuyerModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => !rateBuyerMutation.isPending && setRateBuyerModal(null)}
        >
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2">Noter l&apos;acheteur</h3>
            <p className="text-sm text-gray-600 mb-4">
              Évaluez {rateBuyerModal.buyerName} pour cette transaction (1 à 5 étoiles).
            </p>
            <div className="space-y-4">
              <div>
                <Label>Note</Label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRateBuyerForm((f) => ({ ...f, rating: n }))}
                      className={`p-2 rounded-lg transition-colors ${
                        rateBuyerForm.rating >= n
                          ? 'bg-yellow-400 text-yellow-900'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      <Star className={`w-6 h-6 ${rateBuyerForm.rating >= n ? 'fill-current' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Commentaire (optionnel)</Label>
                <Input
                  placeholder="Ex: Excellent acheteur, paiement rapide"
                  value={rateBuyerForm.content}
                  onChange={(e) => setRateBuyerForm((f) => ({ ...f, content: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setRateBuyerModal(null)} disabled={rateBuyerMutation.isPending}>
                Annuler
              </Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                disabled={rateBuyerMutation.isPending}
                onClick={() =>
                  rateBuyerMutation.mutate({
                    orderId: rateBuyerModal.orderId,
                    rating: rateBuyerForm.rating,
                    content: rateBuyerForm.content.trim() || undefined,
                  })
                }
              >
                {rateBuyerMutation.isPending ? 'Envoi...' : 'Envoyer'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
