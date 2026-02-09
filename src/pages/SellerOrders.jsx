import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const statusConfig = {
  pending: { label: 'Paiement en attente', color: 'bg-gray-100 text-gray-600' },
  processing: { label: 'En cours', color: 'bg-blue-100 text-blue-600' },
  completed: { label: 'Terminé', color: 'bg-green-100 text-green-600' },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-600' },
};

export default function SellerOrders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

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

  const filteredOrders = sellerOrders.filter(order => {
    if (activeTab === 'pending') return order.status === 'pending';
    if (activeTab === 'preparing') return order.status === 'processing';
    if (activeTab === 'shipped') return false;
    if (activeTab === 'delivered') return order.status === 'completed';
    return true;
  });

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
              {label} ({key === 'pending' ? sellerOrders.filter(o => o.status === 'pending').length : key === 'preparing' ? sellerOrders.filter(o => o.status === 'processing').length : key === 'delivered' ? sellerOrders.filter(o => o.status === 'completed').length : sellerOrders.length})
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
                      <img src={productImage || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'} alt={productName} className="w-20 h-20 rounded-lg object-cover" />
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
                      {order.status === 'processing' && (
                        <Button
                          onClick={() => updateOrderMutation.mutate({ orderId: order.id, newStatus: 'completed' })}
                          disabled={updateOrderMutation.isPending}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Marquer comme terminé
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
