import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  ArrowLeft, Star, MapPin, Package, ShoppingBag, MessageSquare, BadgeCheck, Shield 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import ProductCard from '../components/marketplace/ProductCard';
import BottomNav from '../components/navigation/BottomNav';

export default function SellerProfile() {
  const navigate = useNavigate();
  const _queryClient = useQueryClient();
  const [sellerId, setSellerId] = useState(null);
  const [user, setUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSellerId(params.get('id'));
  }, []);

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {}
    };
    getUser();
  }, []);

  // Fetch seller info (inclut seller_profile : store_name, description, country, city, rating, total_sales)
  const { data: seller } = useQuery({
    queryKey: ['seller', sellerId],
    queryFn: () => api.users.getById(sellerId),
    enabled: !!sellerId
  });

  // Fetch seller products
  const { data: products = [] } = useQuery({
    queryKey: ['seller-products', sellerId],
    queryFn: () => api.products.list({ seller_id: sellerId }, '-created_date', 50),
    enabled: !!sellerId
  });

  // Avis vendeur (API seller-reviews)
  const { data: sellerReviewsData } = useQuery({
    queryKey: ['seller-reviews', sellerId],
    queryFn: () => api.sellerReviews.listBySeller(sellerId, 1, 50),
    enabled: !!sellerId
  });
  const reviewsList = sellerReviewsData?.reviews ?? [];
  const averageRatingFromApi = sellerReviewsData?.averageRating ?? 0;
  const totalReviewsCount = sellerReviewsData?.totalCount ?? 0;

  // Check if following
  useEffect(() => {
    if (user && sellerId) {
      api.users.getFollowing({ 
        follower_id: user.id, 
        following_id: sellerId 
      }).then(follows => setIsFollowing(follows.length > 0));
    }
  }, [user, sellerId]);

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        const follows = await api.users.getFollowing({ 
          follower_id: user.id, 
          following_id: sellerId 
        });
        if (follows[0]) await api.entities.Follow.delete(follows[0].id);
      } else {
        await api.users.toggleFollow({
          follower_id: user.id,
          following_id: sellerId
        });
      }
      return !isFollowing;
    },
    onSuccess: (nowFollowing) => {
      setIsFollowing(nowFollowing);
      toast.success(nowFollowing ? 'Vous suivez ce vendeur' : 'Vous ne suivez plus ce vendeur');
    }
  });

  const handleFollow = () => {
    if (!user) {
      navigate('/');
      return;
    }
    followMutation.mutate();
  };

  // Stats: note depuis API avis vendeur, ventes depuis commandes complétées
  const averageRating = averageRatingFromApi
    ? Number(averageRatingFromApi).toFixed(1)
    : (seller?.seller_profile?.rating != null ? Number(seller.seller_profile.rating).toFixed(1) : '0');
  const { data: ordersForSales } = useQuery({
    queryKey: ['seller-orders-count', sellerId],
    queryFn: async () => {
      const orders = await api.orders.list({ seller_id: sellerId, status: 'completed' }, '-created_date', 500);
      return orders?.length ?? 0;
    },
    enabled: !!sellerId
  });
  const totalSales = ordersForSales ?? 0;
  const activeProducts = products.filter(p => (p.stock ?? 0) > 0).length;

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewOrderId, setReviewOrderId] = useState('');
  const createReviewMutation = useMutation({
    mutationFn: () => api.sellerReviews.create({
      seller_id: sellerId,
      rating: reviewRating,
      content: reviewContent || undefined,
      order_id: reviewOrderId || undefined
    }),
    onSuccess: () => {
      _queryClient.invalidateQueries({ queryKey: ['seller-reviews', sellerId] });
      setShowReviewForm(false);
      setReviewRating(5);
      setReviewContent('');
      setReviewOrderId('');
      toast.success('Avis enregistré');
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur')
  });

  if (!seller) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-_t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Profil vendeur</h1>
        </div>
      </div>

      {/* Seller Info */}
      <div className="bg-white border-b border-gray-100">
        <div className="p-4">
          <div className="flex items-start gap-4 mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-2xl font-bold">
                {seller.full_name?.[0]?.toUpperCase() || seller.email?.[0]?.toUpperCase() || 'V'}
              </div>
              {(seller.seller_profile?.is_verified || seller.is_verified) && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center" title="Vendeur vérifié">
                  <BadgeCheck className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1">
                {seller.seller_profile?.store_name || seller.full_name || seller.email?.split('@')[0]}
              </h2>
              {seller.seller_profile?.store_description && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{seller.seller_profile.store_description}</p>
              )}
              {(seller.seller_profile?.country || seller.seller_profile?.city || seller.location) && (
                <div className="flex items-center gap-1 text-gray-500 text-sm mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>{[seller.seller_profile?.city, seller.seller_profile?.country].filter(Boolean).join(', ') || seller.location}</span>
                </div>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold">{averageRating}</span>
                  <span className="text-gray-500 text-sm">({totalReviewsCount})</span>
                </div>
                <span className="text-gray-300">•</span>
                <span className="text-gray-600 text-sm">{totalSales} ventes</span>
                {/* Badge Confiance CDC 2.2.6 : vendeur vérifié + note ≥4 et ≥5 avis */}
                {(seller.seller_profile?.is_verified || seller.is_verified) &&
                 parseFloat(averageRating) >= 4 &&
                 totalReviewsCount >= 5 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                    <Shield className="w-3.5 h-3.5" />
                    Confiance
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Card className="p-3 text-center">
              <ShoppingBag className="w-5 h-5 text-gray-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{activeProducts}</p>
              <p className="text-xs text-gray-500">Produits</p>
            </Card>
            <Card className="p-3 text-center">
              <Package className="w-5 h-5 text-gray-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{totalSales}</p>
              <p className="text-xs text-gray-500">Ventes</p>
            </Card>
            <Card className="p-3 text-center">
              <Star className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{averageRating}</p>
              <p className="text-xs text-gray-500">Note</p>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleFollow}
              disabled={followMutation.isPending}
              className={`flex-1 ${
                isFollowing
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
              }`}
            >
              {isFollowing ? 'Suivi' : 'Suivre'}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.location.href = `${createPageUrl('Chat')}?_userId=${sellerId}`}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Contacter
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="products" className="px-4 pt-4">
        <TabsList className="w-full">
          <TabsTrigger value="products" className="flex-1">
            Produits ({products.length})
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex-1">
            Avis ({totalReviewsCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          {products.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun produit en vente</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link to={`${createPageUrl('Product')}?id=${product.id}`}>
                    <ProductCard product={product} />
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="mt-4 space-y-3">
          {user && user.id !== sellerId && (
            <Card className="p-4">
              {!showReviewForm ? (
                <Button variant="outline" className="w-full" onClick={() => setShowReviewForm(true)}>
                  <Star className="w-4 h-4 mr-2" />
                  Laisser un avis
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="font-semibold text-sm">Votre avis</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="text-2xl focus:outline-none"
                      >
                        {star <= reviewRating ? '⭐' : '☆'}
                      </button>
                    ))}
                  </div>
                  <textarea
                    placeholder="Commentaire (optionnel)"
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    className="w-full min-h-[80px] p-3 border rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="ID commande (optionnel)"
                    value={reviewOrderId}
                    onChange={(e) => setReviewOrderId(e.target.value)}
                    className="w-full p-2 border rounded text-sm"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowReviewForm(false)} className="flex-1">
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-orange-500 hover:bg-orange-600"
                      disabled={createReviewMutation.isPending}
                      onClick={() => createReviewMutation.mutate()}
                    >
                      {createReviewMutation.isPending ? 'Envoi...' : 'Envoyer'}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
          {reviewsList.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun avis</p>
            </div>
          ) : (
            reviewsList.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                      {(review.user?.full_name || review.user?.username || 'A')[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{review.user?.full_name || review.user?.username || 'Acheteur'}</p>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < (review.rating ?? 0)
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.content && <p className="text-sm text-gray-600">{review.content}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        {review.created_at ? new Date(review.created_at).toLocaleDateString('fr-FR') : ''}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
}

