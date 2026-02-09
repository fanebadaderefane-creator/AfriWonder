import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, Truck, CheckCircle, Clock, Eye, MessageCircle, Star, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { getCachedOrders, setCachedOrders, isOnline } from '@/utils/ordersOfflineCache';
import BottomNav from '../components/navigation/BottomNav';

const statusConfig = {
  pending: { label: 'En attente', color: 'bg-gray-100 text-gray-600', icon: Clock },
  pending_payment: { label: 'Paiement en attente', color: 'bg-gray-100 text-gray-600', icon: Clock },
  paid: { label: 'Payé', color: 'bg-blue-100 text-blue-600', icon: CheckCircle },
  processing: { label: 'En cours', color: 'bg-blue-100 text-blue-600', icon: Package },
  preparing: { label: 'En préparation', color: 'bg-amber-100 text-amber-600', icon: Package },
  completed: { label: 'Terminé', color: 'bg-green-100 text-green-600', icon: CheckCircle },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-600', icon: Clock },
  in_transit: { label: 'Expédié', color: 'bg-orange-100 text-orange-600', icon: Truck },
  delivered: { label: 'Livré', color: 'bg-green-100 text-green-600', icon: CheckCircle },
  refunded: { label: 'Remboursé', color: 'bg-purple-100 text-purple-600', icon: Clock },
};

export default function Orders() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        navigate('/');
      }
    };
    getUser();
  }, [navigate]);

  const [isOffline, setIsOffline] = useState(!isOnline());

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const { data: ordersData, isLoading, isError, refetch } = useQuery({
    queryKey: ['buyer-orders', user?.id],
    queryFn: async () => {
      const result = await api.orders.list({ page: 1, limit: 100 });
      setCachedOrders(result);
      return result;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => failureCount < 4 && (!isOffline || failureCount < 2),
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
    placeholderData: () => (!!user?.id ? getCachedOrders() : undefined),
  });

  const cachedFallback = isError || isOffline ? getCachedOrders() : null;
  const orders = ordersData?.orders ?? cachedFallback?.orders ?? [];
  const fromCache = ordersData?.fromCache === true || (!!cachedFallback?.orders?.length && !ordersData?.orders);
  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    if (activeTab === 'in_progress') return ['pending', 'pending_payment', 'paid', 'processing', 'preparing'].includes(order.status);
    if (activeTab === 'shipped') return ['in_transit'].includes(order.status);
    if (activeTab === 'delivered') return ['delivered', 'completed', 'refunded'].includes(order.status);
    return false;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {(isOffline || fromCache) && (
        <div className="sticky top-0 z-50 flex items-center justify-between gap-2 px-4 py-2 bg-amber-100 text-amber-900 text-sm border-b border-amber-200">
          <span className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            {isOffline ? 'Hors ligne — données en cache' : 'Données en cache (connexion lente)'}
          </span>
          {isOffline && <Button size="sm" variant="outline" className="border-amber-600 text-amber-800" onClick={() => refetch()}>Réessayer</Button>}
        </div>
      )}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6" /></Button>
          <h1 className="text-lg font-bold">Mes commandes</h1>
        </div>
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {[['all', 'Toutes'], ['in_progress', 'En cours'], ['shipped', 'Expédiées'], ['delivered', 'Livrées']].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${activeTab === key ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Aucune commande</h3>
            <p className="text-gray-500 mb-6">Vous n'avez pas encore passé de commande</p>
            <Button onClick={() => navigate('/Marketplace')} className="bg-gradient-to-r from-orange-500 to-red-500">
              Découvrir les produits
            </Button>
          </div>
        ) : (
          filteredOrders.map((order, index) => {
            const firstItem = order.items?.[0];
            const product = firstItem?.product;
            const productImage = product?.images?.[0];
            const productName = product?.name || 'Commande';
            const totalQty = order.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;
            const sellerId = product?.seller_id || product?.seller?.id;
            const status = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = status?.icon || Clock;
            return (
              <motion.div key={order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <Card className="p-4">
                  <div className="flex gap-3 mb-3">
                    <img 
                      src={productImage || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'} 
                      alt={productName} 
                      className="w-20 h-20 rounded-xl object-cover flex-shrink-0" 
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 line-clamp-2">{productName}{order.items?.length > 1 ? ` +${order.items.length - 1}` : ''}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">Quantité: {totalQty}</p>
                      <p className="text-orange-500 font-bold mt-1">{order.total_amount?.toLocaleString()} FCFA</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {order.source === 'live' && (
                          <Badge className="bg-purple-100 text-purple-700 text-xs">Acheté pendant live</Badge>
                        )}
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {order.shipping?.tracking_code && (
                    <div className="text-xs text-gray-500 mb-3 pb-3 border-b">
                      Suivi: {order.shipping.tracking_code}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => navigate(`${createPageUrl('OrderTracking')}?id=${order.id}`)}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Détails
                    </Button>
                    {sellerId && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`${createPageUrl('Chat')}?_userId=${sellerId}&orderId=${order.id}`)}
                        className="flex-1"
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Contacter
                      </Button>
                    )}
                    {order.status === 'completed' && (
                      <Button 
                        size="sm"
                        onClick={() => navigate(`${createPageUrl('OrderTracking')}?id=${order.id}`)}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
                      >
                        <Star className="w-4 h-4 mr-1" />
                        Noter
                      </Button>
                    )}
                  </div>
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