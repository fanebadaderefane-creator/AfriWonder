import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

export default function EditProduct() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: 1,
    video_url: '',
  });

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate('/'));
  }, [navigate]);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => api.products.getById(productId),
    enabled: !!productId && !!user
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price != null ? String(product.price) : '',
        category: product.category || '',
        stock: product.stock ?? 1,
        video_url: product.video_url || '',
      });
      setImages(Array.isArray(product.images) ? [...product.images] : (product.image_url ? [product.image_url] : []));
    }
  }, [product]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploadingImages(true);
    try {
      const urls = await Promise.all(files.map((file) => api.upload.image(file).then((res) => res?.file_url || res?.url || res?.fileUrl)));
      setImages((prev) => [...prev, ...urls].slice(0, 5));
      toast.success('Images ajoutées');
    } catch (_e) {
      toast.error('Erreur téléchargement');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMutation = useMutation({
    mutationFn: () => api.products.update(productId, {
      name: formData.name,
      description: formData.description || '',
      price: parseFloat(formData.price),
      stock: parseInt(String(formData.stock), 10) || 1,
      category: formData.category,
      images: images.length ? images : undefined,
      video_url: formData.video_url?.trim() || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      toast.success('Produit mis à jour');
      navigate(createPageUrl('Marketplace'));
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.category) {
      toast.error('Remplissez les champs obligatoires');
      return;
    }
    if (images.length === 0) {
      toast.error('Ajoutez au moins une image');
      return;
    }
    updateMutation.mutate();
  };

  if (!user || !productId) return null;
  if (isLoading || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (product.seller_id !== user.id && product.seller?.id !== user.id) {
    toast.error('Vous ne pouvez pas modifier ce produit');
    navigate(-1);
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b z-40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Modifier le produit</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        <div>
          <Label>Photos *</Label>
          <div className="grid grid-cols-3 gap-3 mt-2">
            {images.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer">
                <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImages} />
                {uploadingImages ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" /> : <ImageIcon className="w-6 h-6 text-gray-400" />}
                <span className="text-xs text-gray-400 mt-1">Ajouter</span>
              </label>
            )}
          </div>
        </div>

        <div>
          <Label>Vidéo (optionnel)</Label>
          <Input
            type="url"
            placeholder="https://..."
            value={formData.video_url}
            onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
            className="mt-1"
          />
        </div>

        <div>
          <Label>Nom *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nom du produit"
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label>Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description..."
            rows={4}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Prix (FCFA) *</Label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label>Stock</Label>
            <Input
              type="number"
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label>Catégorie *</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" disabled={updateMutation.isPending} className="w-full py-6 bg-orange-500 hover:bg-orange-600">
          {updateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          Enregistrer les modifications
        </Button>
      </form>
    </div>
  );
}
