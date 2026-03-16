import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, Star, MapPin, Truck, ShoppingCart,
  Heart, Share2, BadgeCheck, ChevronLeft, ChevronRight, Shield, HelpCircle, Send,
  Flag, MessageCircle, MessageCircleMore, Bell, BellOff, Calendar, Tag, Scale, Gavel, Users
} from 'lucide-react';
import { addToCompare, getCompareIds } from '@/pages/CompareProducts';

/** Génère l'URL WhatsApp (Phase 1: contact direct, pas de paiement sur AfriWonder) */
function getWhatsAppUrl(phoneOrWhatsapp, message = '') {
  const raw = (phoneOrWhatsapp || '').replace(/\D/g, '');
  if (!raw || raw.length < 8) return null;
  const num = raw.startsWith('221') || raw.startsWith('223') ? raw : `221${raw}`;
  const text = message ? `&text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${num}${text}`;
}
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { getAbsoluteImageUrl, MARKETPLACE_PLACEHOLDER_IMG } from '@/lib/utils';
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
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [newQuestion, setNewQuestion] = useState('');
  const [answeringQuestionId, setAnsweringQuestionId] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [replyingToReviewId, setReplyingToReviewId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [reportingReviewId, setReportingReviewId] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [alertTargetPrice, setAlertTargetPrice] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [showCreateAuction, setShowCreateAuction] = useState(false);
  const [auctionStartPrice, setAuctionStartPrice] = useState('');
  const [auctionEndAt, setAuctionEndAt] = useState('');
  const [showCreateGroupBuy, setShowCreateGroupBuy] = useState(false);
  const [groupMinQuantity, setGroupMinQuantity] = useState('2');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setProductId(params.get('id'));
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

  const { data: productReviewsData } = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: () => api.orderReviews.getProductReviews(productId, { page: 1, limit: 10 }),
    enabled: !!productId
  });
  const productReviews = productReviewsData?.reviews ?? [];

  const { data: questionsData } = useQuery({
    queryKey: ['product-questions', productId],
    queryFn: () => api.products.getQuestions(productId, { page: 1, limit: 20 }),
    enabled: !!productId
  });
  const questions = questionsData?.questions ?? [];

  const { data: productAlerts = [] } = useQuery({
    queryKey: ['product-alerts', productId],
    queryFn: () => api.products.getAlertsForProduct(productId),
    enabled: !!user && !!productId,
  });
  const { data: groupBuys = [] } = useQuery({
    queryKey: ['product-group-buys', productId],
    queryFn: () => api.products.getGroupBuys(productId),
    enabled: !!productId,
  });
  const { data: myOffer } = useQuery({
    queryKey: ['product-offer', productId],
    queryFn: () => api.products.getMyOffer(productId),
    enabled: !!user && !!productId && !!product?.negotiable_price,
  });
  const hasPriceAlert = productAlerts.some((a) => a.alert_type === 'price');
  const hasStockAlert = productAlerts.some((a) => a.alert_type === 'stock');
  const priceAlertTarget = productAlerts.find((a) => a.alert_type === 'price')?.target_price;

  const askQuestionMutation = useMutation({
    mutationFn: (q) => api.products.askQuestion(productId, q),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-questions', productId] });
      toast.success('Question envoyée');
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.message || 'Erreur')
  });

  const replyToReviewMutation = useMutation({
    mutationFn: ({ reviewId, reply }) => api.orderReviews.reply(reviewId, reply),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
      setReplyingToReviewId(null);
      setReplyText('');
      toast.success('Réponse publiée');
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.response?.data?.message || e?.apiMessage || e?.message || 'Erreur'),
  });

  const reportReviewMutation = useMutation({
    mutationFn: ({ reviewId, reason }) => api.orderReviews.report(reviewId, reason),
    onSuccess: () => {
      setReportingReviewId(null);
      setReportReason('');
      toast.success('Signalement enregistré');
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.response?.data?.message || e?.apiMessage || e?.message || 'Erreur'),
  });

  const answerQuestionMutation = useMutation({
    mutationFn: ({ qId, ans }) => api.products.answerQuestion(qId, ans),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-questions', productId] });
      setAnsweringQuestionId(null);
      setAnswerText('');
      toast.success('Réponse envoyée');
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.message || 'Erreur')
  });

  const { formatPrice } = useMarketplaceCurrency();

  const addToCartMutation = useMutation({
    mutationFn: () => api.cart.add(product.id, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart-badge'] });
      toast.success(`${product.name} ajouté au panier`);
    },
    onError: (e) => {
      toast.error(e.response?.data?.message || e.message || 'Erreur');
    }
  });

  const addAlertMutation = useMutation({
    mutationFn: ({ alert_type, target_price }) => api.products.addAlert(productId, { alert_type, target_price }),
    onSuccess: (_, { alert_type }) => {
      queryClient.invalidateQueries({ queryKey: ['product-alerts', productId] });
      toast.success(alert_type === 'price' ? 'Alerte prix enregistrée' : 'Vous serez notifié quand le produit sera en stock');
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.message || 'Erreur'),
  });
  const removeAlertMutation = useMutation({
    mutationFn: (alertType) => api.products.removeAlert(productId, alertType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-alerts', productId] });
      toast.success('Alerte supprimée');
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.message || 'Erreur'),
  });

  const [preorderQty, setPreorderQty] = useState(1);
  const preorderMutation = useMutation({
    mutationFn: () => api.products.createPreorder(productId, preorderQty),
    onSuccess: () => {
      toast.success('Précommande enregistrée. Paiement à la sortie.');
      navigate(createPageUrl('Orders') + '?tab=preorders');
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.message || 'Erreur'),
  });
  const offerMutation = useMutation({
    mutationFn: (price) => api.products.createOffer(productId, price),
    onSuccess: () => {
      toast.success('Offre envoyée au vendeur');
      setOfferPrice('');
      queryClient.invalidateQueries({ queryKey: ['product-offer', productId] });
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.message || 'Erreur'),
  });
  const bidMutation = useMutation({
    mutationFn: (amount) => api.products.placeBid(productId, amount),
    onSuccess: () => {
      toast.success('Enchère enregistrée');
      setBidAmount('');
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.message || 'Erreur'),
  });
  const createAuctionMutation = useMutation({
    mutationFn: ({ start_price, end_at }) => api.products.createAuction(productId, { start_price, end_at }),
    onSuccess: () => {
      toast.success('Enchère créée');
      setShowCreateAuction(false);
      setAuctionStartPrice('');
      setAuctionEndAt('');
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.message || 'Erreur'),
  });
  const createGroupBuyMutation = useMutation({
    mutationFn: () => api.products.createGroupBuy(productId, { min_quantity: parseInt(groupMinQuantity, 10) || 2 }),
    onSuccess: () => {
      toast.success('Groupe d\'achat créé');
      setShowCreateGroupBuy(false);
      queryClient.invalidateQueries({ queryKey: ['product-group-buys', productId] });
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.message || 'Erreur'),
  });
  const joinGroupMutation = useMutation({
    mutationFn: (groupId) => api.groupBuys.join(groupId, 1),
    onSuccess: () => {
      toast.success('Vous avez rejoint le groupe');
      queryClient.invalidateQueries({ queryKey: ['product-group-buys', productId] });
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.message || 'Erreur'),
  });

  if (isLoading || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const rawImages = product.images?.length ? product.images : (product.image_url ? [product.image_url] : []);
  const images = rawImages.length
    ? rawImages.map((url) => getAbsoluteImageUrl(url) || MARKETPLACE_PLACEHOLDER_IMG)
    : [MARKETPLACE_PLACEHOLDER_IMG];
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
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
              onClick={() => {
                const nextIds = addToCompare(product.id);
                toast.success('Ajouté au comparateur');
                navigate(createPageUrl('CompareProducts') + `?ids=${nextIds.join(',')}`);
              }}
              aria-label="Ajouter au comparateur"
            >
              <Scale className="w-5 h-5" />
            </button>
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Image Gallery — fond visible PWA mobile */}
      <div className="relative bg-white">
        <div className="relative aspect-square w-full min-h-[200px] bg-gray-100">
          <img
            src={images[selectedImage]}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
            onError={(e) => { e.target.onerror = null; e.target.src = MARKETPLACE_PLACEHOLDER_IMG; }}
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
                className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 bg-gray-100 ${
                  index === selectedImage ? 'border-blue-500' : 'border-gray-200'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = MARKETPLACE_PLACEHOLDER_IMG; }} />
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
                {(product.seller?.seller_profile?.is_verified || product.is_verified) &&
                 (product.seller?.seller_profile?.rating ?? product.seller_rating ?? 0) >= 4 && (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <Shield className="w-3 h-3 mr-1" />
                    Confiance
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-3xl font-bold text-blue-500">
              {formatPrice(product.price)}
            </p>
            {product.negotiable_price && (
              <Badge variant="outline" className="text-xs">Prix négociable</Badge>
            )}
            {product.condition && (
              <Badge variant="secondary" className="text-xs">
                {product.condition === 'new' && 'Neuf'}
                {product.condition === 'used' && 'Occasion'}
                {product.condition === 'refurbished' && 'Reconditionné'}
              </Badge>
            )}
            {product.valid_until && new Date(product.valid_until) > new Date() && (
              <Badge variant="outline" className="text-xs">Valide jusqu'au {new Date(product.valid_until).toLocaleDateString('fr-FR')}</Badge>
            )}
          </div>
          {product.sold_count > 0 && (
            <p className="text-sm text-gray-500 mt-1">{product.sold_count} vendus</p>
          )}
        </div>

        {/* CPO 6.35 — Enchère */}
        {product.auction && (
          <Card className="p-4 border-amber-200 bg-amber-50/50">
            <div className="flex items-center gap-2 mb-2">
              <Gavel className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-amber-800">Enchère en cours</span>
              {product.auction.status === 'closed' && (
                <Badge variant="secondary">Terminée</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-4 mb-3">
              <div>
                <p className="text-xs text-gray-500">Prix actuel</p>
                <p className="text-xl font-bold text-amber-700">{formatPrice(product.auction.current_bid)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Fin</p>
                <p className="text-sm font-medium">{new Date(product.auction.end_at).toLocaleString('fr-FR')}</p>
              </div>
              {product.auction.current_bidder && (
                <div>
                  <p className="text-xs text-gray-500">Enchérisseur actuel</p>
                  <p className="text-sm">{product.auction.current_bidder?.full_name || 'Anonyme'}</p>
                </div>
              )}
            </div>
            {product.auction.status === 'open' && new Date(product.auction.end_at) > new Date() && user?.id && user.id !== sellerId && (
              <div className="flex gap-2 flex-wrap items-end">
                <div className="flex-1 min-w-[120px]">
                  <label className="text-xs text-gray-500 block mb-1">Votre enchère (min. +5%)</label>
                  <Input
                    type="number"
                    min={product.auction.current_bid * 1.05}
                    step="0.01"
                    placeholder={formatPrice(product.auction.current_bid * 1.05)}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => {
                    const n = parseFloat(bidAmount);
                    if (!Number.isFinite(n) || n < product.auction.current_bid * 1.05) {
                      toast.error('Enchère minimale : ' + formatPrice(product.auction.current_bid * 1.05));
                      return;
                    }
                    bidMutation.mutate(n);
                  }}
                  disabled={bidMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Enchérir
                </Button>
              </div>
            )}
          </Card>
        )}
        {!product.auction && user?.id === sellerId && (
          <Card className="p-4">
            {!showCreateAuction ? (
              <Button variant="outline" onClick={() => setShowCreateAuction(true)} className="w-full">
                <Gavel className="w-4 h-4 mr-2" />
                Créer une enchère
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="font-medium text-sm">Nouvelle enchère</p>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Prix de départ</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={auctionStartPrice}
                    onChange={(e) => setAuctionStartPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Date et heure de fin (ISO ou locale)</label>
                  <Input
                    type="datetime-local"
                    value={auctionEndAt}
                    onChange={(e) => setAuctionEndAt(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const start = parseFloat(auctionStartPrice);
                      const end = auctionEndAt ? new Date(auctionEndAt) : null;
                      if (!Number.isFinite(start) || start <= 0 || !end || isNaN(end.getTime())) {
                        toast.error('Prix de départ > 0 et date de fin requises');
                        return;
                      }
                      createAuctionMutation.mutate({ start_price: start, end_at: end.toISOString() });
                    }}
                    disabled={createAuctionMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    Créer l'enchère
                  </Button>
                  <Button variant="ghost" onClick={() => setShowCreateAuction(false)}>Annuler</Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* CPO 9.25 — Groupes d'achat */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Groupes d'achat
            </span>
            <button
              type="button"
              className="text-sm text-blue-600"
              onClick={() => navigate(createPageUrl('GroupBuys'))}
            >
              Mes groupes
            </button>
          </div>
          {groupBuys.length === 0 && !showCreateGroupBuy && (
            <p className="text-sm text-gray-500 mb-2">Aucun groupe ouvert. Créez-en un pour acheter à plusieurs.</p>
          )}
          {groupBuys.length > 0 && (
            <ul className="space-y-2 mb-3">
              {groupBuys.map((g) => {
                const totalQty = (g.participants || []).reduce((s, p) => s + (p.quantity || 0), 0);
                const isInGroup = user?.id && (g.participants || []).some((p) => p.user_id === user.id);
                return (
                  <li key={g.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                    <span>{totalQty} / {g.min_quantity} participants</span>
                    {user?.id !== sellerId && !isInGroup && (
                      <Button size="sm" variant="outline" onClick={() => joinGroupMutation.mutate(g.id)} disabled={joinGroupMutation.isPending}>
                        Rejoindre
                      </Button>
                    )}
                    {isInGroup && <Badge variant="secondary">Inscrit</Badge>}
                  </li>
                );
              })}
            </ul>
          )}
          {user?.id && user.id !== sellerId && (
            showCreateGroupBuy ? (
              <div className="space-y-2">
                <Input
                  type="number"
                  min={2}
                  value={groupMinQuantity}
                  onChange={(e) => setGroupMinQuantity(e.target.value)}
                  placeholder="Quantité min."
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => createGroupBuyMutation.mutate()} disabled={createGroupBuyMutation.isPending}>
                    Créer le groupe
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowCreateGroupBuy(false)}>Annuler</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowCreateGroupBuy(true)}>
                <Users className="w-4 h-4 mr-1" />
                Créer un groupe d'achat
              </Button>
            )
          )}
        </Card>

        {/* Seller Info */}
        {seller && (
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                className="w-12 h-12 cursor-pointer"
                onClick={() => navigate(`/SellerProfile?id=${seller.id}`)}
              >
                <AvatarImage src={seller.profile_image} />
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {seller.full_name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <button
                  onClick={() => navigate(`/SellerProfile?id=${seller.id}`)}
                  className="font-semibold hover:text-blue-500"
                >
                  {seller.full_name || seller.email?.split('@')[0]}
                </button>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span>{seller?.seller_profile?.rating ?? product.seller?.seller_profile?.rating ?? product.seller_rating ?? 0}</span>
                  </div>
                  {(seller?.seller_profile?.is_verified || seller?.is_verified || product.seller?.seller_profile?.is_verified || product.is_verified) &&
                   (seller?.seller_profile?.rating ?? product.seller?.seller_profile?.rating ?? product.seller_rating ?? 0) >= 4 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                      <Shield className="w-3 h-3" />
                      Confiance
                    </span>
                  )}
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
              ) : (() => {
                const whatsapp = product.seller?.seller_profile?.whatsapp || product.seller?.seller_profile?.phone || seller?.seller_profile?.whatsapp || seller?.seller_profile?.phone;
                const waUrl = getWhatsAppUrl(whatsapp, `Bonjour, je m'intéresse à "${product.name}"`);
                return waUrl ? (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => window.open(waUrl, '_blank')}
                  >
                    <MessageCircleMore className="w-4 h-4 mr-1" />
                    WhatsApp
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`${createPageUrl('Chat')}?_userId=${seller.id}`)}
                  >
                    Contacter
                  </Button>
                );
              })()}
            </div>
            {(product.seller?.seller_profile?.city || product.seller?.seller_profile?.country || product.location) && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{[product.seller?.seller_profile?.city, product.seller?.seller_profile?.country].filter(Boolean).join(', ') || product.location}</span>
              </div>
            )}
          </Card>
        )}

        {/* CPO 6.37 — Précommande */}
        {product.is_preorder && user && user.id !== sellerId && (
          <Card className="p-4 border-blue-100 bg-blue-50/30">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              Précommande — Paiement à la sortie
            </h3>
            {product.preorder_available_at && (
              <p className="text-sm text-gray-600 mb-3">
                Disponible à partir du {new Date(product.preorder_available_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="number"
                min={1}
                max={99}
                value={preorderQty}
                onChange={(e) => setPreorderQty(Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1)))}
                className="w-20"
              />
              <Button
                onClick={() => preorderMutation.mutate()}
                disabled={preorderMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {preorderMutation.isPending ? 'Enregistrement…' : 'Précommander'}
              </Button>
            </div>
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

        {/* CPO 6.36 — Négociation de prix */}
        {user && product?.negotiable_price && user.id !== sellerId && (
          <Card className="p-4 border-amber-100 bg-amber-50/30">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-600" />
              Proposer un prix
            </h3>
            {myOffer ? (
              <p className="text-sm text-gray-600">
                Votre offre : <strong>{formatPrice(myOffer.offered_price)}</strong>
                {myOffer.status === 'pending' && ' — En attente de réponse du vendeur'}
                {myOffer.status === 'accepted' && ' — Acceptée'}
                {myOffer.status === 'declined' && ' — Refusée'}
                {myOffer.seller_note && ` (${myOffer.seller_note})`}
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Votre offre (FCFA)"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  className="w-32 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-600 text-amber-700 hover:bg-amber-50"
                  onClick={() => {
                    const val = parseFloat(offerPrice);
                    if (!val || val <= 0) {
                      toast.error('Indiquez un montant valide');
                      return;
                    }
                    offerMutation.mutate(val);
                  }}
                  disabled={offerMutation.isPending}
                >
                  Envoyer l'offre
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* CPO 6.38 — Alertes prix / disponibilité */}
        {user && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-500" />
              Alertes
            </h3>
            <div className="space-y-3">
              {hasPriceAlert ? (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm text-gray-600">
                    Vous serez notifié si le prix descend {priceAlertTarget != null ? `à ${formatPrice(priceAlertTarget)} ou moins` : ''}.
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeAlertMutation.mutate('price')}
                    disabled={removeAlertMutation.isPending}
                  >
                    <BellOff className="w-4 h-4 mr-1" /> Ne plus notifier
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Prix cible (optionnel)"
                    value={alertTargetPrice}
                    onChange={(e) => setAlertTargetPrice(e.target.value)}
                    className="w-28 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const target = alertTargetPrice ? parseFloat(alertTargetPrice) : (product?.price ?? 0);
                      if (target <= 0) {
                        toast.error('Indiquez un prix cible ou laissez vide pour le prix actuel');
                        return;
                      }
                      addAlertMutation.mutate({ alert_type: 'price', target_price: target });
                      setAlertTargetPrice('');
                    }}
                    disabled={addAlertMutation.isPending}
                  >
                    <Bell className="w-4 h-4 mr-1" /> Me notifier si le prix baisse
                  </Button>
                </div>
              )}
              {Number(product?.stock ?? 0) <= 0 && (
                hasStockAlert ? (
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm text-gray-600">Vous serez notifié quand le produit sera en stock.</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeAlertMutation.mutate('stock')}
                      disabled={removeAlertMutation.isPending}
                    >
                      <BellOff className="w-4 h-4 mr-1" /> Ne plus notifier
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addAlertMutation.mutate({ alert_type: 'stock' })}
                    disabled={addAlertMutation.isPending}
                  >
                    <Bell className="w-4 h-4 mr-1" /> Me notifier quand en stock
                  </Button>
                )
              )}
            </div>
          </Card>
        )}

        {/* Géolocalisation (CDC) */}
        {(product.latitude && product.longitude) && (
          <Card className="p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-500" />
              Localisation
            </h3>
            <a
              href={`https://www.openstreetmap.org/?mlat=${product.latitude}&mlon=${product.longitude}&zoom=15`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              Voir sur la carte →
            </a>
          </Card>
        )}

        {/* Q/R publiques (CDC) */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-500" />
            Questions & Réponses ({questions.length})
          </h3>
          <div className="space-y-3">
            {questions.map((q) => (
              <div key={q.id} className="border-l-2 border-gray-200 pl-3">
                <p className="text-sm font-medium text-gray-800">{q.question}</p>
                <p className="text-xs text-gray-500 mt-0.5">{q.user?.full_name || 'Utilisateur'} · {new Date(q.created_at).toLocaleDateString('fr-FR')}</p>
                {q.answer ? (
                  <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">— {q.answer}</p>
                ) : user?.id === sellerId && (
                  <div className="mt-2">
                    {answeringQuestionId === q.id ? (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Votre réponse..."
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          className="text-sm"
                        />
                        <Button size="sm" onClick={() => answerQuestionMutation.mutate({ qId: q.id, ans: answerText })} disabled={!answerText.trim() || answerQuestionMutation.isPending}>
                          Envoyer
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setAnsweringQuestionId(null); setAnswerText(''); }}>Annuler</Button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setAnsweringQuestionId(q.id)} className="text-xs text-blue-600 hover:underline">
                        Répondre
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {user && (
            <div className="flex gap-2 mt-3">
              <Input
                placeholder="Poser une question..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), askQuestionMutation.mutate(newQuestion), setNewQuestion(''))}
              />
              <Button
                size="sm"
                onClick={() => { if (newQuestion.trim()) askQuestionMutation.mutate(newQuestion.trim()); setNewQuestion(''); }}
                disabled={!newQuestion.trim() || askQuestionMutation.isPending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </Card>

        {/* Avis et notations (CDC: photos, critères détaillés, réponse vendeur, signalement) */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            Avis ({Array.isArray(productReviews) ? productReviews.length : 0})
          </h3>
          {Array.isArray(productReviews) && productReviews.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {productReviews.map((r) => (
                <div key={r.id || r.order_id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= (r.product_rating ?? r.rating ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">
                        {r.user?.full_name || r.buyer_name || 'Acheteur'}
                        {r.is_verified && <span className="ml-1 text-green-600">✓ Vérifié</span>}
                      </span>
                    </div>
                    {user?.id !== r.user_id && (
                      <button
                        type="button"
                        onClick={() => setReportingReviewId(r.id === reportingReviewId ? null : r.id)}
                        className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"
                      >
                        <Flag className="w-3 h-3" /> Signaler
                      </button>
                    )}
                  </div>
                  {reportingReviewId === r.id && (
                    <div className="mt-2 flex gap-2">
                      <Input
                        placeholder="Raison du signalement..."
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={() => reportReason.trim() && reportReviewMutation.mutate({ reviewId: r.id, reason: reportReason })}
                        disabled={!reportReason.trim() || reportReviewMutation.isPending}
                      >
                        Envoyer
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setReportingReviewId(null); setReportReason(''); }}>Annuler</Button>
                    </div>
                  )}
                  {(r.quality_rating || r.communication_rating || r.delivery_rating || r.conformity_rating) && (
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                      {r.quality_rating && <span>Qualité: {r.quality_rating}/5</span>}
                      {r.communication_rating && <span>Com: {r.communication_rating}/5</span>}
                      {r.delivery_rating && <span>Livraison: {r.delivery_rating}/5</span>}
                      {r.conformity_rating && <span>Conformité: {r.conformity_rating}/5</span>}
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mt-1">{r.content || r.title || '—'}</p>
                  {r.photos && r.photos.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {r.photos.map((url, idx) => (
                        <img key={idx} src={url} alt="" className="w-16 h-16 object-cover rounded" />
                      ))}
                    </div>
                  )}
                  {r.seller_reply ? (
                    <div className="mt-2 ml-4 pl-3 border-l-2 border-blue-200 bg-blue-50/50 rounded p-2">
                      <p className="text-xs font-medium text-blue-700">Réponse du vendeur</p>
                      <p className="text-sm text-gray-700">{r.seller_reply}</p>
                    </div>
                  ) : user?.id === sellerId && (
                    <div className="mt-2">
                      {replyingToReviewId === r.id ? (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Répondre à cet avis..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="text-sm"
                          />
                          <Button size="sm" onClick={() => replyToReviewMutation.mutate({ reviewId: r.id, reply: replyText })} disabled={!replyText.trim() || replyToReviewMutation.isPending}>
                            Envoyer
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setReplyingToReviewId(null); setReplyText(''); }}>Annuler</Button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setReplyingToReviewId(r.id)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" /> Répondre
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Aucun avis pour le moment.</p>
          )}
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
                  <div className="aspect-square w-full min-h-[80px] bg-gray-100 rounded-lg overflow-hidden mb-2">
                    <img
                      src={getAbsoluteImageUrl(relatedProduct.images?.[0] || relatedProduct.image_url) || MARKETPLACE_PLACEHOLDER_IMG}
                      alt={relatedProduct.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.onerror = null; e.target.src = MARKETPLACE_PLACEHOLDER_IMG; }}
                    />
                  </div>
                  <p className="text-xs font-medium text-left truncate">{relatedProduct.name}</p>
                    <p className="text-sm font-bold text-blue-500 text-left">
                    {formatPrice(relatedProduct.price)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar — Phase 1: contact direct vendeur, pas de paiement sur AfriWonder */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-40 safe-area-pb">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (!user) {
                toast.error('Connectez-vous pour ajouter au panier');
                return;
              }
              addToCartMutation.mutate();
            }}
            disabled={(product.stock ?? 0) === 0 || addToCartMutation.isPending}
            className="py-6 border-blue-500 text-blue-600 hover:bg-blue-50"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Panier
          </Button>
          {(() => {
            const whatsapp = product.seller?.seller_profile?.whatsapp || product.seller?.seller_profile?.phone;
            const waUrl = getWhatsAppUrl(whatsapp, `Bonjour, je m'intéresse à "${product.name}" (${quantity} unité${quantity > 1 ? 's' : ''})`);
            return waUrl ? (
              <Button
                onClick={() => window.open(waUrl, '_blank')}
                className="flex-1 py-6 bg-green-600 hover:bg-green-700 text-white text-lg"
              >
                <MessageCircleMore className="w-5 h-5 mr-2" />
                Contacter le vendeur
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => navigate(`${createPageUrl('Chat')}?_userId=${sellerId}`)}
                className="flex-1 py-6"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Contacter le vendeur
              </Button>
            );
          })()}
        </div>
      </div>

      <p className="text-xs text-center text-gray-500 mt-2 pb-4 px-4">
        Phase 1: Paiement et livraison à organiser directement avec le vendeur.
      </p>

      <BottomNav />
    </div>
  );
}
