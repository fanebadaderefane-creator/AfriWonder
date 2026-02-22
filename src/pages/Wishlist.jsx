import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft, Heart, Share2, Trash2, ShoppingCart, Bell, Lock, Globe, Edit2, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import BottomNav from '../components/navigation/BottomNav';

export default function Wishlist() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');

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

  const { data: wishlist } = useQuery({
    queryKey: ['wishlist', user?.id],
    queryFn: async () => {
      const wishlists = await api.entities.Wishlist.filter({ user_id: user.id });
      if (wishlists.length > 0) return wishlists[0];
      
      return api.entities.Wishlist.create({
        user_id: user.id,
        name: 'Ma liste d\'envies',
        products: []
      });
    },
    enabled: !!user?.id
  });

  const updateWishlistMutation = useMutation({
    mutationFn: async (updates) => {
      await api.entities.Wishlist.update(wishlist.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wishlist']);
    }
  });

  const removeProductMutation = useMutation({
    mutationFn: async (productId) => {
      const updated = (wishlist?.products ?? []).filter(p => p.product_id !== productId);
      await api.entities.Wishlist.update(wishlist.id, { products: updated });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wishlist']);
      toast.success('Produit retiré de la liste');
    }
  });

  const addToCartMutation = useMutation({
    mutationFn: async (product) => {
      const productId = product.id || product.product_id;
      await api.cart.add(productId, 1);
    },
    onSuccess: () => {
      toast.success('Ajouté au panier');
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'Erreur');
    }
  });

  const shareWishlist = () => {
    const url = `${window.location.origin}${createPageUrl('Wishlist')}?shared=${wishlist.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Lien copié dans le presse-papiers');
  };

  const handleUpdateName = () => {
    if (newName.trim()) {
      updateWishlistMutation.mutate({ name: newName });
      setEditingName(false);
    }
  };

  if (!wishlist) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-_t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nom de la liste"
                  className="text-lg"
                  autoFocus
                />
                <Button size="icon" onClick={handleUpdateName}>
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{wishlist.name}</h1>
                <button onClick={() => { setNewName(wishlist.name); setEditingName(true); }}>
                  <Edit2 className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            )}
            <p className="text-sm text-gray-500">{wishlist.products?.length || 0} produits</p>
          </div>
          <Button variant="outline" size="icon" onClick={shareWishlist}>
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Settings */}
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {wishlist.is_public ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                <div>
                  <p className="font-medium">Liste publique</p>
                  <p className="text-sm text-gray-500">Visible par les autres</p>
                </div>
              </div>
              <Switch
                checked={wishlist.is_public}
                onCheckedChange={(checked) => updateWishlistMutation.mutate({ is_public: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <div>
                  <p className="font-medium">Notifications promo</p>
                  <p className="text-sm text-gray-500">Alertes quand un produit est en promo</p>
                </div>
              </div>
              <Switch
                checked={wishlist.notify_on_promo}
                onCheckedChange={(checked) => updateWishlistMutation.mutate({ notify_on_promo: checked })}
              />
            </div>
          </div>
        </Card>

        {/* Products */}
        {(wishlist?.products?.length ?? 0) === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Votre liste d'envies est vide</p>
            <Button onClick={() => navigate(createPageUrl('Marketplace'))}>
              Découvrir des produits
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {(wishlist?.products ?? []).map((product) => (
              <Card key={product.product_id} className="p-4">
                <div className="flex gap-3">
                  <img
                    src={product.product_image}
                    alt={product.product_name}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium line-clamp-2">{product.product_name}</h3>
                    <p className="text-lg font-bold text-orange-500 mt-1">
                      {product.product_price?.toLocaleString()} FCFA
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Ajouté le {new Date(product.added_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() => addToCartMutation.mutate(product)}
                    disabled={addToCartMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Ajouter au panier
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeProductMutation.mutate(product.product_id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

