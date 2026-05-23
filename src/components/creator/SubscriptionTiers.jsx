import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, Star, Sparkles, Plus, Trash2 } from 'lucide-react';
import { toast } from "sonner";
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const tierIcons = {
  bronze: Star,
  silver: Sparkles,
  gold: Crown
};

const tierColors = {
  bronze: 'from-blue-400 to-indigo-600',
  silver: 'from-gray-300 to-gray-500',
  gold: 'from-blue-400 to-indigo-500'
};

export default function SubscriptionTiers({ isOpen, onClose, creatorId }) {
  const queryClient = useQueryClient();
  const [_editingTier, setEditingTier] = useState(null);
  const [tierForm, setTierForm] = useState({
    name: '',
    price: '',
    benefits: ['']
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ['subscription-tiers', creatorId],
    queryFn: () => api.entities.SubscriptionTier.filter({ creator_id: creatorId }),
    enabled: isOpen && !!creatorId
  });

  const createTierMutation = useMutation({
    mutationFn: (data) => api.entities.SubscriptionTier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['subscription-tiers']);
      toast.success('Palier créé avec succès');
      resetForm();
    }
  });

  const deleteTierMutation = useMutation({
    mutationFn: (id) => api.entities.SubscriptionTier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['subscription-tiers']);
      toast.success('Palier supprimé');
    }
  });

  const resetForm = () => {
    setTierForm({ name: '', price: '', benefits: [''] });
    setEditingTier(null);
  };

  const handleSubmit = () => {
    if (!tierForm.name || !tierForm.price) {
      toast.error('Remplissez tous les champs requis');
      return;
    }

    createTierMutation.mutate({
      creator_id: creatorId,
      name: tierForm.name,
      price: Number(tierForm.price),
      benefits: tierForm.benefits.filter(b => b.trim())
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-blue-600" />
            Gérer les abonnements
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Existing Tiers */}
          <div className="space-y-3">
            {tiers.map((tier) => {
              const Icon = tierIcons[tier.badge_color] || Star;
              return (
                <div
                  key={tier.id}
                  className={`bg-gradient-to-r ${tierColors[tier.badge_color] || 'from-gray-400 to-gray-600'} p-4 rounded-xl text-white`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5" />
                      <h3 className="font-bold text-lg">{tier.name}</h3>
                    </div>
                    <button
                      onClick={() => deleteTierMutation.mutate(tier.id)}
                      className="text-white/80 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-2xl font-bold mb-3">{tier.price.toLocaleString()} FCFA/mois</p>
                  <div className="space-y-1">
                    {tier.benefits?.map((benefit, i) => (
                      <p key={i} className="text-sm text-white/90">✓ {benefit}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add New Tier Form */}
          <div className="border-_t pt-4">
            <h3 className="font-semibold mb-3">Créer un nouveau palier</h3>
            
            <div className="space-y-3">
              <Input
                placeholder="Nom du palier (ex: Bronze, Silver, Gold)"
                value={tierForm.name}
                onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
              />

              <Input
                type="number"
                placeholder="Prix mensuel (FCFA)"
                value={tierForm.price}
                onChange={(e) => setTierForm({ ...tierForm, price: e.target.value })}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Avantages</label>
                {tierForm.benefits.map((benefit, index) => (
                  <Input
                    key={index}
                    placeholder={`Avantage ${index + 1}`}
                    value={benefit}
                    onChange={(e) => {
                      const newBenefits = [...tierForm.benefits];
                      newBenefits[index] = e.target.value;
                      setTierForm({ ...tierForm, benefits: newBenefits });
                    }}
                  />
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTierForm({ ...tierForm, benefits: [...tierForm.benefits, ''] })}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un avantage
                </Button>
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                Créer le palier
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


