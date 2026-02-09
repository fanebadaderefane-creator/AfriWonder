import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function ReturnForm({ orderId, productId, onSuccess }) {
  const [formData, setFormData] = useState({
    reason: 'defective',
    description: '',
    images: []
  });
  const [uploadedImages, setUploadedImages] = useState([]);
  const queryClient = useQueryClient();

  const createReturnMutation = useMutation({
    mutationFn: async (data) => {
      const user = await api.auth.me();
      
      const returnRequest = await api.entities.Return.create({
        order_id: orderId,
        product_id: productId,
        user_id: user.id,
        reason: data.reason,
        description: data.description,
        images: uploadedImages,
        requested_amount: 0,
        status: 'pending_approval'
      });

      return returnRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Demande de retour créée avec succès');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('Erreur lors de la création de la demande');
      console.error(error);
    }
  });

  const uploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { file_url } = await api.upload.video({ file });
      setUploadedImages([...uploadedImages, file_url]);
      toast.success('Image uploadée');
    } catch (_error) {
      toast.error('Erreur lors de l\'upload');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.reason || !formData.description) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    createReturnMutation.mutate(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg p-6 max-w-2xl"
    >
      <h2 className="text-2xl font-bold mb-6">Demander un retour</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-sm font-semibold block mb-2">Raison du retour</label>
          <Select 
            value={formData.reason} 
            onValueChange={(value) => setFormData({...formData, reason: value})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="defective">Produit défectueux</SelectItem>
              <SelectItem value="not_as_described">Pas conforme à la description</SelectItem>
              <SelectItem value="changed_mind">Changement d'avis</SelectItem>
              <SelectItem value="damaged_shipping">Endommagé à la livraison</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-semibold block mb-2">Description détaillée</label>
          <Textarea
            placeholder="Décrivez le problème en détail..."
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="min-h-24"
          />
        </div>

        <div>
          <label className="text-sm font-semibold block mb-2">Photos du produit</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <label className="flex flex-col items-center cursor-pointer">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-600">Cliquez pour uploader ou drag-drop</span>
              <input
                type="file"
                accept="image/*"
                onChange={uploadImage}
                className="hidden"
              />
            </label>
          </div>

          {uploadedImages.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {uploadedImages.map((url, idx) => (
                <div key={idx} className="relative">
                  <img src={url} alt="Return proof" className="w-full h-24 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setUploadedImages(uploadedImages.filter((_, i) => i !== idx))}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              Une fois approuvée, vous recevrez un label de retour gratuit par email.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={createReturnMutation.isPending}
            className="flex-1 bg-orange-500 hover:bg-orange-600"
          >
            {createReturnMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              'Soumettre la demande'
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}


