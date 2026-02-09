import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, ShoppingCart, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import CommissionNotice from '@/components/CommissionNotice';

export default function CartPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  const { data: cart } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => api.cart.get(),
    enabled: !!user?.id
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ productId, quantity }) => api.cart.update(productId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'Erreur mise à jour panier');
    }
  });

  const removeMutation = useMutation({
    mutationFn: (productId) => api.cart.remove(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
      toast.success('Produit supprimé du panier');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'Erreur');
    }
  });

  const updateQuantity = (productId, newQuantity) => {
    if (!cart) return;
    if (newQuantity <= 0) {
      removeMutation.mutate(productId);
      return;
    }
    updateQuantityMutation.mutate({ productId, quantity: newQuantity });
  };

  const removeFromCart = (productId) => {
    removeMutation.mutate(productId);
  };

  if (!user || !cart) {
    return <div className="h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const items = cart.items || [];
  const subtotal = cart.subtotal || 0;
  const discount = cart.coupon_discount || 0;
  const shippingFee = items.length > 0 ? 2500 : 0;
  const totalAmount = Math.max(0, subtotal + shippingFee - discount);

  if (items.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto p-4 text-center py-12">
        <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Votre panier est vide</h1>
        <p className="text-gray-600 mb-6">Commencez à acheter pour remplir votre panier</p>
        <Button onClick={() => navigate(createPageUrl('Marketplace'))} className="bg-orange-500 hover:bg-orange-600">
          Retour au marketplace
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto p-4 safe-area-pb pb-32">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-3xl font-bold">Mon panier ({items.length})</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          <AnimatePresence>
            {items.map((item) => {
              const productId = item.productId || item.product_id;
              const name = item.name || item.product_name;
              const image = item.image || item.product_image;
              return (
                <motion.div key={productId} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {image && (
                          <img src={image} alt={name} className="w-24 h-24 object-cover rounded-lg" />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold">{name}</h3>
                          <p className="text-lg font-bold text-orange-600 mt-2">
                            {(item.price * item.quantity).toLocaleString()} XOF
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2 border rounded-lg px-2 py-1">
                            <button onClick={() => updateQuantity(productId, item.quantity - 1)} className="p-1" disabled={updateQuantityMutation.isPending}>
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-semibold">{item.quantity}</span>
                            <button onClick={() => updateQuantity(productId, item.quantity + 1)} className="p-1" disabled={updateQuantityMutation.isPending}>
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <Button onClick={() => removeFromCart(productId)} size="sm" variant="destructive" disabled={removeMutation.isPending}>
                            <Trash2 className="w-3 h-3 mr-1" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Summary */}
        <div className="space-y-4 h-fit sticky top-4">
          <Card>
            <CardHeader>
              <CardTitle>Résumé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Sous-total</span>
                <span className="font-semibold">{subtotal.toLocaleString()} XOF</span>
              </div>
              <div className="flex justify-between">
                <span>Livraison</span>
                <span className="font-semibold">{shippingFee.toLocaleString()} XOF</span>
              </div>
              {discount > 0 && discount !== undefined && (
                <div className="flex justify-between text-green-600">
                  <span>Réduction</span>
                  <span className="font-semibold">-{discount.toLocaleString()} XOF</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <span className="font-bold">Total</span>
                <span className="font-bold text-lg text-orange-600">
                  {totalAmount.toLocaleString()} XOF
                </span>
              </div>
              <CommissionNotice vertical="marketplace" amountFcfa={subtotal} rule="seller" compact className="mt-2" />
            </CardContent>
          </Card>

          <Button
            onClick={() => navigate(createPageUrl('Checkout'))}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg"
          >
            Passer la commande →
          </Button>
          <Button
            onClick={() => navigate(createPageUrl('Marketplace'))}
            variant="outline"
            className="w-full"
          >
            Continuer les achats
          </Button>
        </div>
      </div>
    </motion.div>
  );
}