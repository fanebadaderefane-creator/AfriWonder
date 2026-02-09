import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  ArrowLeft, Star, MapPin, Truck, ShoppingCart,
  Heart, Share2, BadgeCheck, ChevronLeft, ChevronRight, Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import BottomNav from '../components/navigation/BottomNav';
import { useMarketplaceCurrency } from '@/contexts/MarketplaceCurrencyContext';
import CurrencySelector from '../components/marketplace/CurrencySelector';

const paymentMethods = {
  orange_money: '🟠',
  wave: '💙',
  mtn_money: '🟡',
  moov_money: '🔵',
  cash: '💵',
  wallet: '👛'
};

export default function Product() {
  const navigate = useNavigate();
  const _queryClient = useQueryClient();
  const [productId, setProductId] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showCheckout, setShowCheckout] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState({
    address: '',
    phone: '',
    method: 'livraison_moto'
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setProductId(params.get('id'));
  }, []);

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
        setDeliveryInfo(prev => ({
          ...prev,
          phone: u.phone || '',
          address: u.location || ''
        }));
      } catch (_e) {}
    };
    getUser();
  }, []);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      return await api.products.getById(productId);
    },
    enabled: !!productId
  });

  const sellerId = product?.seller?.id || product?.seller_id;
  const { data: seller } = useQuery({
    queryKey: ['seller', sellerId],
    queryFn: async () => {
      return await api.users.getById(sellerId);
    },
    enabled: !!sellerId
  });

  const { data: relatedProducts = [] } = useQuery({
    queryKey: ['related-products', product?.category],
    queryFn: async () => {
      const result = await api.products.list({ category: product.category, page: 1, limit: 10 });
      return result.products || [];
    },
    enabled: !!product?.category
  });

  const { formatPrice } = useMarketplaceCurrency();

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Vous devez être connecté');
      const result = await api.orders.create({
        shipping_address: deliveryInfo.address,
        payment_method: 'orange_money',
        items: [{ product_id: product.id, quantity }],
      });
      const order = result.orders ? result.orders[0] : result;
      const orderId = order?.id;
      if (orderId && product.seller?.id) {
        try {
          const { default: NotificationService } = await import('../components/notifications/NotificationService');
          await NotificationService.notifyNewOrder(
            product.seller.id,
            orderId,
            product.name,
            user.full_name || user.email
          );
        } catch (_) {}
      }
      return order;
    },
    onSuccess: (order) => {
      if (!order?.id) return;
      toast.success('Commande créée ! Procédez au paiement.');
      navigate(`${createPageUrl('OrderTracking')}?id=${order.id}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Erreur lors de la commande');
    }
  });

  const handleBuyNow = () => {
    if (!user) {
      navigate('/');
      return;
    }
    setShowCheckout(true);
  };

  const handleConfirmOrder = () => {
    if (!deliveryInfo.address || !deliveryInfo.phone) {
      toast.error('Veuillez remplir toutes les informations de livraison');
      return;
    }
    createOrderMutation.mutate();
  };

  if (isLoading || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const images = product.images || [product.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600'];
  const totalPrice = product.price * quantity;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <CurrencySelector />
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="relative bg-white">
        <div className="relative aspect-square">
          <img
            src={images[selectedImage]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {images.length > 1 && (
            <>
              <button
                onClick={() => setSelectedImage(prev => prev > 0 ? prev - 1 : images.length - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setSelectedImage(prev => prev < images.length - 1 ? prev + 1 : 0)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  index === selectedImage ? 'bg-white w-4' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto">
            {images.map((img, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 ${
                  index === selectedImage ? 'border-orange-500' : 'border-gray-200'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Price & Title */}
        <div>
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">{product.name}</h1>
              <div className="flex items-center gap-2">
                <Badge className={(product.stock ?? 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                  {(product.stock ?? 0) > 0 ? `${product.stock} en stock` : 'Rupture de stock'}
                </Badge>
                {(product.seller?.seller_profile?.is_verified || product.is_verified) && (
                  <Badge className="bg-blue-100 text-blue-700">
                    <BadgeCheck className="w-3 h-3 mr-1" />
                    Vérifié
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <p className="text-3xl font-bold text-orange-500">
            {formatPrice(product.price)}
          </p>
          {product.sold_count > 0 && (
            <p className="text-sm text-gray-500 mt-1">{product.sold_count} vendus</p>
          )}
        </div>

        {/* Seller Info */}
        {seller && (
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                className="w-12 h-12 cursor-pointer"
                onClick={() => navigate(`/SellerProfile?id=${seller.id}`)}
              >
                <AvatarImage src={seller.profile_image} />
                <AvatarFallback className="bg-orange-100 text-orange-600">
                  {seller.full_name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <button
                  onClick={() => navigate(`/SellerProfile?id=${seller.id}`)}
                  className="font-semibold hover:text-orange-500"
                >
                  {seller.full_name || seller.email?.split('@')[0]}
                </button>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span>{product.seller?.seller_profile?.rating ?? product.seller_rating ?? 0}</span>
                </div>
              </div>
              {user?.id === sellerId ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`${createPageUrl('EditProduct')}?id=${product.id}`)}
                >
                  Modifier
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/Chat?_userId=${seller.id}`)}
                >
                  Contacter
                </Button>
              )}
            </div>
            {(product.seller?.seller_profile?.city || product.seller?.seller_profile?.country || product.location) && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{[product.seller?.seller_profile?.city, product.seller?.seller_profile?.country].filter(Boolean).join(', ') || product.location}</span>
              </div>
            )}
          </Card>
        )}

        {/* Video produit */}
        {product.video_url && (
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Vidéo du produit</h3>
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <video
                src={product.video_url}
                controls
                className="w-full h-full object-contain"
                playsInline
              >
                Votre navigateur ne prend pas en charge la lecture vidéo.
              </video>
            </div>
          </Card>
        )}

        {/* Description */}
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Description</h3>
          <p className="text-gray-600 text-sm whitespace-pre-line">
            {product.description || 'Aucune description disponible'}
          </p>
        </Card>

        {/* Delivery & Payment */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Livraison & Paiement</h3>
          <div className="space-y-3">
            {product.delivery_options && Array.isArray(product.delivery_options) && product.delivery_options.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">Options de livraison</span>
                </div>
                <div className="flex flex-wrap gap-2 ml-6">
                  {product.delivery_options.map((option) => (
                    <Badge key={option} variant="outline" className="text-xs">
                      {option === 'livraison_moto' && '🏍️ Moto'}
                      {option === 'point_relais' && '📍 Point relais'}
                      {option === 'retrait_boutique' && '🏪 Retrait'}
                      {option === 'envoi_national' && '📦 National'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {product.payment_methods?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">Moyens de paiement</span>
                </div>
                <div className="flex flex-wrap gap-2 ml-6">
                  {product.payment_methods.map(method => (
                    <span key={method} className="text-xl">
                      {paymentMethods[method]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Related Products */}
        {relatedProducts.length > 1 && (
          <div>
            <h3 className="font-semibold mb-3">Produits similaires</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {relatedProducts.filter(p => p.id !== product.id).slice(0, 5).map((relatedProduct) => (
                <button
                  key={relatedProduct.id}
                  onClick={() => {
                    setProductId(relatedProduct.id);
                    window.history.pushState({}, '', `${createPageUrl('Product')}?id=${relatedProduct.id}`);
                    window.scrollTo(0, 0);
                  }}
                  className="flex-shrink-0 w-32"
                >
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                    <img
                      src={relatedProduct.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'}
                      alt={relatedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-xs font-medium text-left truncate">{relatedProduct.name}</p>
                    <p className="text-sm font-bold text-orange-500 text-left">
                    {formatPrice(relatedProduct.price)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-40 safe-area-pb">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
            <button
              onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
              className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"
            >
              -
            </button>
            <span className="font-semibold min-w-[24px] text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(prev => Math.min(product.stock ?? 999, prev + 1))}
              className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"
            >
              +
            </button>
          </div>
          <Button
            onClick={handleBuyNow}
            disabled={(product.stock ?? 0) === 0 || createOrderMutation.isPending}
            className="flex-1 py-6 bg-gradient-to-r from-orange-500 to-red-500 text-white text-lg"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Acheter maintenant
          </Button>
        </div>
      </div>

      {/* Checkout Sheet */}
      <Sheet open={showCheckout} onOpenChange={setShowCheckout}>
        <SheetContent side="bottom" className="h-[90vh]">
          <SheetHeader className="mb-4">
            <SheetTitle>Finaliser la commande</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            {/* Order Summary */}
            <Card className="p-4">
              <div className="flex gap-3 mb-3">
                <img
                  src={images[0]}
                  alt={product.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{product.name}</p>
                  <p className="text-sm text-gray-500">Quantité: {quantity}</p>
                </div>
              </div>
              <div className="space-y-1 text-sm pt-3 border-t">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sous-total</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Frais plateforme (10%)</span>
                  <span className="text-orange-600">
                    {formatPrice(Math.max(totalPrice * 0.1, 100))}
                  </span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-orange-500">{formatPrice(totalPrice)}</span>
                </div>
              </div>
            </Card>

            {/* Delivery Info */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Informations de livraison</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Adresse</label>
                  <Input
                    placeholder="Entrez votre adresse"
                    value={deliveryInfo.address}
                    onChange={(e) => setDeliveryInfo(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Téléphone</label>
                  <Input
                    placeholder="Votre numéro de téléphone"
                    value={deliveryInfo.phone}
                    onChange={(e) => setDeliveryInfo(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
            </Card>

            <Button
              onClick={handleConfirmOrder}
              disabled={createOrderMutation.isPending}
              className="w-full py-6 bg-gradient-to-r from-orange-500 to-red-500 text-white"
            >
              {createOrderMutation.isPending ? 'Création...' : 'Confirmer la commande'}
            </Button>

            <p className="text-xs text-center text-gray-500">
              🔒 Paiement sécurisé en escrow. Vos fonds sont protégés jusqu'à la livraison.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
}