import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

const categories = [
  { value: 'mode', label: 'Mode' },
  { value: 'beaute', label: 'Beauté' },
  { value: 'electronique', label: 'Électronique' },
  { value: 'maison', label: 'Maison' },
  { value: 'alimentation', label: 'Alimentation' },
  { value: 'artisanat', label: 'Artisanat' },
  { value: 'services', label: 'Services' },
  { value: 'autre', label: 'Autre' },
];

const deliveryOptions = [
  { value: 'livraison_moto', label: 'Livraison moto' },
  { value: 'point_relais', label: 'Point relais' },
  { value: 'retrait_boutique', label: 'Retrait boutique' },
  { value: 'envoi_national', label: 'Envoi national' },
];

const paymentMethods = [
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'wave', label: 'Wave' },
  { value: 'mtn_money', label: 'MTN Money' },
  { value: 'moov_money', label: 'Moov Money' },
  { value: 'cash', label: 'Cash' },
];

export default function AddProduct() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    location: '',
    stock: 1,
    video_url: '',
    delivery_options: [],
    payment_methods: [],
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

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const res = await api.upload.image(file);
        return res?.file_url || res?.url || res?.fileUrl;
      });
      const urls = await Promise.all(uploadPromises);
      setImages(prev => [...prev, ...urls].slice(0, 5));
      toast.success('Images téléchargées');
    } catch (_error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const createProductMutation = useMutation({
    mutationFn: async (productData) => {
      return await api.products.create(productData);
    },
    onSuccess: () => {
      toast.success('Produit publié avec succès !');
      navigate(createPageUrl('Marketplace'));
    },
    onError: () => {
      toast.error('Erreur lors de la publication');
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.category) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (images.length === 0) {
      toast.error('Ajoutez au moins une image');
      return;
    }

    const productData = {
      name: formData.name,
      description: formData.description || '',
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock, 10) || 1,
      category: formData.category,
      images,
      video_url: formData.video_url?.trim() || undefined,
      delivery_options: formData.delivery_options?.length ? formData.delivery_options : undefined,
    };

    createProductMutation.mutate(productData);
  };

  const toggleArrayField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Vendre un produit</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Images */}
        <div>
          <Label className="text-base font-semibold mb-3 block">Photos du produit *</Label>
          <div className="grid grid-cols-3 gap-3">
            {images.map((img, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-square rounded-xl overflow-hidden bg-gray-100"
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </motion.div>
            ))}
            
            {images.length < 5 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImages}
                />
                {uploadingImages ? (
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-400">Ajouter</span>
                  </>
                )}
              </label>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">Maximum 5 photos</p>
        </div>

        {/* Vidéo produit (optionnel) */}
        <div>
          <Label className="text-base font-semibold mb-2 block">Vidéo du produit (optionnel)</Label>
          <Input
            type="url"
            placeholder="https://..."
            value={formData.video_url}
            onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">Lien vers une vidéo de présentation (YouTube, Vimeo, ou URL directe)</p>
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nom du produit *</Label>
            <Input
              id="name"
              placeholder="Ex: iPhone 13 Pro Max"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Décrivez votre produit..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="price">Prix (FCFA) *</Label>
              <Input
                id="price"
                type="number"
                placeholder="50000"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="stock">Stock disponible</Label>
              <Input
                id="stock"
                type="number"
                placeholder="1"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="category">Catégorie *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choisir une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="location">Localisation</Label>
            <Input
              id="location"
              placeholder="Ex: Dakar, Plateau"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        {/* Delivery Options */}
        <div>
          <Label className="text-base font-semibold mb-3 block">Options de livraison</Label>
          <div className="space-y-2">
            {deliveryOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={formData.delivery_options.includes(option.value)}
                  onChange={() => toggleArrayField('delivery_options', option.value)}
                  className="w-4 h-4 text-orange-500"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div>
          <Label className="text-base font-semibold mb-3 block">Modes de paiement acceptés</Label>
          <div className="space-y-2">
            {paymentMethods.map((method) => (
              <label
                key={method.value}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={formData.payment_methods.includes(method.value)}
                  onChange={() => toggleArrayField('payment_methods', method.value)}
                  className="w-4 h-4 text-orange-500"
                />
                <span className="text-sm">{method.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={createProductMutation.isPending}
          className="w-full py-6 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold text-base"
        >
          {createProductMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Publication...
            </>
          ) : (
            'Publier le produit'
          )}
        </Button>
      </form>
    </div>
  );
}
