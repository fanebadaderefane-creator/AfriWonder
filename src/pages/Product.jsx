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
  Flag, MessageCircle, MessageCircleMore
} from 'lucide-react';

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
                  <Badge className="bg-orange-100 text-orange-700">
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
            <p className="text-3xl font-bold text-orange-500">
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

        {/* Géolocalisation (CDC) */}
        {(product.latitude && product.longitude) && (
          <Card className="p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-500" />
              Localisation
            </h3>
            <a
              href={`https://www.openstreetmap.org/?mlat=${product.latitude}&mlon=${product.longitude}&zoom=15`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-orange-600 hover:underline"
            >
              Voir sur la carte →
            </a>
          </Card>
        )}

        {/* Q/R publiques (CDC) */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-orange-500" />
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
                      <button type="button" onClick={() => setAnsweringQuestionId(q.id)} className="text-xs text-orange-600 hover:underline">
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
                    <div className="mt-2 ml-4 pl-3 border-l-2 border-orange-200 bg-orange-50/50 rounded p-2">
                      <p className="text-xs font-medium text-orange-700">Réponse du vendeur</p>
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
                        <button type="button" onClick={() => setReplyingToReviewId(r.id)} className="text-xs text-orange-600 hover:underline flex items-center gap-1">
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
            className="py-6 border-orange-500 text-orange-600 hover:bg-orange-50"
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
