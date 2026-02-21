import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Zap, Star, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAbsoluteImageUrl, MARKETPLACE_PLACEHOLDER_IMG } from '@/lib/utils';
import { toast } from "sonner";
import BottomNav from '../components/navigation/BottomNav';

export default function SellerPromotions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [promoData, setPromoData] = useState({
    product_id: '',
    type: 'discount',
    discount_percentage: 10,
    budget: 5000,
    duration: 7
  });

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
  }, []);

  const { data: products = [] } = useQuery({
    queryKey: ['seller-products', user?.id],
    queryFn: () => api.products.list({ seller_id: user.id }),
    enabled: !!user?.id
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['seller-promotions', user?.id],
    queryFn: () => api.entities.ProductPromotion.filter({ seller_id: user.id }, '-created_date', 50),
    enabled: !!user?.id
  });

  const createPromoMutation = useMutation({
    mutationFn: async () => {
      const product = products.find(p => p.id === promoData.product_id);
      if (!product) throw new Error('Produit non trouvé');

      const starts_at = new Date();
      const ends_at = new Date();
      ends_at.setDate(ends_at.getDate() + parseInt(promoData.duration));

      const data = {
        product_id: promoData.product_id,
        seller_id: user.id,
        type: promoData.type,
        starts_at: starts_at.toISOString(),
        ends_at: ends_at.toISOString(),
        is_active: true
      };

      if (promoData.type === 'discount') {
        data.discount_percentage = promoData.discount_percentage;
        data.original_price = product.price;
        data.promo_price = product.price * (1 - promoData.discount_percentage / 100);
      } else if (promoData.type === 'sponsored') {
        data.budget = promoData.budget;
      }

      await api.entities.ProductPromotion.create(data);

      // Update product
      const updates = {};
      if (promoData.type === 'featured') updates.is_featured = true;
      if (promoData.type === 'sponsored') updates.is_sponsored = true;
      if (Object.keys(updates).length > 0) {
        await api.products.update(product.id, updates);
      }
    },
    onSuccess: () => {
      toast.success('Promotion créée !');
      setShowCreate(false);
      queryClient.invalidateQueries(['seller-promotions']);
      queryClient.invalidateQueries(['seller-products']);
    },
    onError: (error) => {
      toast.error(error._message);
    }
  });

  const stats = {
    active: promotions.filter(p => p.is_active).length,
    totalSpent: promotions.reduce((sum, p) => sum + (p.spent || 0), 0),
    totalClicks: promotions.reduce((sum, p) => sum + (p.clicks || 0), 0),
    totalImpressions: promotions.reduce((sum, p) => sum + (p.impressions || 0), 0)
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">Promotions</h1>
          </div>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Créer
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Zap className="w-4 h-4" />
              <span className="text-xs">Actives</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{stats.active}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Eye className="w-4 h-4" />
              <span className="text-xs">Vues</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalImpressions}</p>
          </Card>
        </div>

        {/* Promotions List */}
        <div className="space-y-3">
          {promotions.length === 0 ? (
            <Card className="p-8 text-center">
              <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">Aucune promotion</p>
              <Button onClick={() => setShowCreate(true)}>
                Créer ma première promotion
              </Button>
            </Card>
          ) : (
            promotions.map(promo => {
              const product = products.find(p => p.id === promo.product_id);
              return (
                <Card key={promo.id} className="p-4">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 min-h-[64px] rounded bg-gray-100 flex-shrink-0 overflow-hidden">
                      <img
                        src={getAbsoluteImageUrl(product?.images?.[0]) || MARKETPLACE_PLACEHOLDER_IMG}
                        alt={product?.name || 'Produit'}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.onerror = null; e.target.src = MARKETPLACE_PLACEHOLDER_IMG; }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm">{product?.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {promo.type === 'discount' && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                -{promo.discount_percentage}%
                              </span>
                            )}
                            {promo.type === 'featured' && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded flex items-center gap-1">
                                <Star className="w-3 h-3" /> Featured
                              </span>
                            )}
                            {promo.type === 'sponsored' && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                Sponsorisé
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs ${promo.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {promo.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                        <div>
                          <p className="text-gray-400">Clics</p>
                          <p className="font-semibold">{promo.clicks || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Vues</p>
                          <p className="font-semibold">{promo.impressions || 0}</p>
                        </div>
                        {promo.type === 'sponsored' && (
                          <div>
                            <p className="text-gray-400">Budget</p>
                            <p className="font-semibold">{promo.budget - (promo.spent || 0)} F</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Create Promotion Sheet */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader className="mb-4">
            <SheetTitle>Nouvelle promotion</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Produit</label>
              <Select
                value={promoData.product_id}
                onValueChange={(value) => setPromoData(prev => ({ ...prev, product_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un produit" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Type de promotion</label>
              <Select
                value={promoData.type}
                onValueChange={(value) => setPromoData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">💰 Réduction</SelectItem>
                  <SelectItem value="featured">⭐ Mise en avant</SelectItem>
                  <SelectItem value="sponsored">📢 Sponsorisé (CPC)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {promoData.type === 'discount' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Pourcentage de réduction</label>
                <Input
                  type="number"
                  min="5"
                  max="90"
                  value={promoData.discount_percentage}
                  onChange={(e) => setPromoData(prev => ({ ...prev, discount_percentage: e.target.value }))}
                />
              </div>
            )}

            {promoData.type === 'sponsored' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Budget (FCFA)</label>
                <Input
                  type="number"
                  min="1000"
                  value={promoData.budget}
                  onChange={(e) => setPromoData(prev => ({ ...prev, budget: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">Coû_t par clic: ~50 FCFA</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Durée (jours)</label>
              <Select
                value={promoData.duration.toString()}
                onValueChange={(value) => setPromoData(prev => ({ ...prev, duration: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 jours</SelectItem>
                  <SelectItem value="7">7 jours</SelectItem>
                  <SelectItem value="14">14 jours</SelectItem>
                  <SelectItem value="30">30 jours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => createPromoMutation.mutate()}
              disabled={!promoData.product_id || createPromoMutation.isPending}
              className="w-full py-6 bg-gradient-to-r from-orange-500 to-red-500"
            >
              Lancer la promotion
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
}

