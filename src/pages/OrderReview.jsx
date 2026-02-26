import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Star, Upload, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { getAbsoluteImageUrl, MARKETPLACE_PLACEHOLDER_IMG } from '@/lib/utils';
import { FILE_ACCEPT_IMAGES } from '@/lib/fileAccept';
import { toast } from 'sonner';

export default function OrderReview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [orderId, setOrderId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [productRating, setProductRating] = useState(5);
  const [sellerRating, setSellerRating] = useState(5);
  const [qualityRating, setQualityRating] = useState(5);
  const [communicationRating, setCommunicationRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [conformityRating, setConformityRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOrderId(params.get('orderId'));
  }, []);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.orders.getById(orderId),
    enabled: !!orderId,
  });

  const { data: existingReviews } = useQuery({
    queryKey: ['order-reviews', orderId],
    queryFn: () => api.orderReviews.getOrderReviews(orderId),
    enabled: !!orderId,
  });

  useEffect(() => {
    if (order?.items && order.items.length > 0 && !selectedItem) {
      // Sélectionner le premier produit qui n'a pas encore d'avis
      const itemWithoutReview = order.items.find(item => {
        const hasReview = existingReviews?.some(r => r.product_id === item.product_id);
        return !hasReview;
      });
      setSelectedItem(itemWithoutReview || order.items[0]);
    }
  }, [order, existingReviews, selectedItem]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadPromises = files.map((file) => api.upload.image(file));
      const results = await Promise.all(uploadPromises);
      const urls = results.map((r) => r?.file_url || r?.url || r?.fileUrl).filter(Boolean);
      setPhotos((prev) => [...prev, ...urls]);
      toast.success(`${urls.length} photo(s) ajoutée(s)`);
    } catch (error) {
      toast.error('Erreur lors de l\'upload des photos');
    } finally {
      setUploadingImages(false);
    }
  };

  const createReviewMutation = useMutation({
    mutationFn: (data) => api.orderReviews.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-reviews', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success('Avis enregistré avec succès');
      navigate(`${createPageUrl('OrderTracking')}?id=${orderId}`);
    },
    onError: (error) => {
      const apiMsg = error?.response?.data?.error?.message
        || error?.response?.data?.message
        || error?.apiMessage
        || error?.message;
      toast.error(apiMsg || 'Erreur lors de l\'enregistrement de l\'avis');
    },
  });

  const handleSubmit = () => {
    if (!selectedItem) {
      toast.error('Veuillez sélectionner un produit');
      return;
    }
    if (!content.trim()) {
      toast.error('Veuillez écrire un avis');
      return;
    }

    createReviewMutation.mutate({
      order_id: orderId,
      order_item_id: selectedItem.id,
      product_id: selectedItem.product_id,
      product_rating: productRating,
      seller_rating: sellerRating,
      quality_rating: qualityRating,
      communication_rating: communicationRating,
      delivery_rating: deliveryRating,
      conformity_rating: conformityRating,
      title: title.trim() || undefined,
      content,
      photos,
    });
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Commande non trouvée</p>
        <Button onClick={() => navigate(createPageUrl('Orders'))} className="mt-4">Retour aux commandes</Button>
      </div>
    );
  }

  const itemsToReview = order.items?.filter(item => {
    const hasReview = existingReviews?.some(r => r.product_id === item.product_id);
    return !hasReview;
  }) || [];

  if (itemsToReview.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto p-4 safe-area-pb pb-20">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Tous les avis ont été donnés</h3>
            <p className="text-gray-500 mb-6">Vous avez déjà laissé un avis pour tous les produits de cette commande.</p>
            <Button onClick={() => navigate(`${createPageUrl('OrderTracking')}?id=${orderId}`)}>
              Retour aux détails
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto p-4 safe-area-pb pb-20">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="w-5 h-5" />
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Laisser un avis</CardTitle>
        </CardHeader>
        <CardContent>
          {order.items && order.items.length > 1 && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Produit à noter</label>
              <select
                value={selectedItem?.id || ''}
                onChange={(e) => {
                  const item = order.items.find(i => i.id === e.target.value);
                  setSelectedItem(item);
                }}
                className="w-full p-2 border rounded-lg"
              >
                {itemsToReview.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.product?.name || item.product_snapshot?.name || 'Produit'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedItem && (
            <div className="flex gap-3 mb-4">
              <img
                src={getAbsoluteImageUrl(selectedItem.product?.images?.[0] || selectedItem.product_snapshot?.images?.[0]) || MARKETPLACE_PLACEHOLDER_IMG}
                alt={selectedItem.product?.name || selectedItem.product_snapshot?.name || 'Produit'}
                className="w-20 h-20 rounded-lg object-cover bg-gray-100"
                onError={(e) => { e.target.onerror = null; e.target.src = MARKETPLACE_PLACEHOLDER_IMG; }}
              />
              <div className="flex-1">
                <h3 className="font-semibold">{selectedItem.product?.name || selectedItem.product_snapshot?.name || 'Produit'}</h3>
                <p className="text-sm text-gray-500">Quantité: {selectedItem.quantity}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Votre avis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Note produit *</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setProductRating(star)}
                  className="text-3xl"
                >
                  {star <= productRating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Note vendeur *</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setSellerRating(star)}
                  className="text-3xl"
                >
                  {star <= sellerRating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
          </div>

          {/* CDC: Critères détaillés d'évaluation */}
          <div className="border-t pt-4 space-y-3">
            <label className="block text-sm font-medium">Critères détaillés (CDC)</label>
            {[
              { key: 'quality', label: 'Qualité du produit', value: qualityRating, setter: setQualityRating },
              { key: 'communication', label: 'Communication vendeur', value: communicationRating, setter: setCommunicationRating },
              { key: 'delivery', label: 'Délai de livraison', value: deliveryRating, setter: setDeliveryRating },
              { key: 'conformity', label: 'Conformité à l\'annonce', value: conformityRating, setter: setConformityRating },
            ].map(({ key, label, value, setter }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="text-xs text-gray-600">{label}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onClick={() => setter(s)} className="text-xl">
                      {s <= value ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Titre (optionnel)</label>
            <Input
              placeholder="Résumez votre expérience..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Votre avis *</label>
            <Textarea
              placeholder="Parlez de votre expérience avec ce produit..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Photos (optionnel)</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {photos.map((url, idx) => (
                <div key={idx} className="relative">
                  <img src={url} alt={`Photo ${idx + 1}`} className="w-20 h-20 object-cover rounded" />
                  <button
                    onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept={FILE_ACCEPT_IMAGES}
                multiple
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploadingImages}
              />
              <Button type="button" variant="outline" size="sm" disabled={uploadingImages}>
                <Upload className="w-4 h-4 mr-2" />
                {uploadingImages ? 'Upload...' : 'Ajouter des photos'}
              </Button>
            </label>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              ✓ Votre avis sera marqué comme "Acheteur vérifié" car vous avez acheté ce produit.
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!selectedItem || !content.trim() || createReviewMutation.isPending}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500"
          >
            <Star className="w-4 h-4 mr-2" />
            {createReviewMutation.isPending ? 'Enregistrement...' : 'Publier l\'avis'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
