import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { FILE_ACCEPT_IMAGES } from '@/lib/fileAccept';
import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';

const categories = [
  { id: 'education', label: 'Éducation', icon: '📚' },
  { id: 'sante', label: 'Santé', icon: '🏥' },
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'urgence', label: 'Urgence', icon: '🚨' },
  { id: 'communaute', label: 'Communauté', icon: '🤝' },
  { id: 'environnement', label: 'Environnement', icon: '🌱' },
  { id: 'technologie', label: 'Technologie', icon: '💻' },
  { id: 'art', label: 'Art & Culture', icon: '🎨' }
];

export default function CreateCampaign() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'education',
    goal_amount: '',
    end_date: '',
    location: '',
    story: '',
    benefits: [''],
    risks: '',
    reward_tiers: []
  });
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

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

  const createCampaignMutation = useMutation({
    mutationFn: async (data) => {
      const goalAmount = Number(data.goal_amount || data.goalAmount) || 0;
      const endDate = data.end_date || data.endDate;
      if (!goalAmount || !endDate) throw new Error('Objectif et date de fin requis');
      return await api.crowdfunding.create({
        title: data.title,
        description: data.description || data.story || '',
        goalAmount,
        endDate: new Date(endDate).toISOString(),
        status: 'pending',
      });
    },
    onSuccess: (campaign) => {
      toast.success(
        "Campagne créée ! Elle ne sera visible qu'après validation par un administrateur. Vous serez notifié une fois approuvée."
      );
      navigate(`${createPageUrl('CampaignDetails')}?id=${campaign.id}`);
    },
    onError: (e) => {
      toast.error(e.response?.data?.error?.message || e.apiMessage || e.message || 'Erreur');
    },
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    try {
      const uploadPromises = files.map(file => 
        api.upload.video({ file })
      );
      const results = await Promise.all(uploadPromises);
      setImages([...images, ...results.map(r => r.file_url)]);
      toast.success(`${files.length} image(s) uploadée(s)`);
    } catch (_e) {
      toast.error('Erreur lors de l\'upload');
    }
    setUploading(false);
  };

  const addBenefit = () => {
    setFormData({ ...formData, benefits: [...formData.benefits, ''] });
  };

  const updateBenefit = (index, value) => {
    const newBenefits = [...formData.benefits];
    newBenefits[index] = value;
    setFormData({ ...formData, benefits: newBenefits });
  };

  const removeBenefit = (index) => {
    setFormData({ 
      ...formData, 
      benefits: formData.benefits.filter((_, i) => i !== index) 
    });
  };

  const addReward = () => {
    setFormData({
      ...formData,
      reward_tiers: [...formData.reward_tiers, { amount: '', title: '', description: '', backers: 0 }]
    });
  };

  const updateReward = (index, field, value) => {
    const newRewards = [...formData.reward_tiers];
    newRewards[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
    setFormData({ ...formData, reward_tiers: newRewards });
  };

  const removeReward = (index) => {
    setFormData({
      ...formData,
      reward_tiers: formData.reward_tiers.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.description || !formData.goal_amount || !formData.end_date) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const cleanData = {
      ...formData,
      goal_amount: parseFloat(formData.goal_amount),
      benefits: formData.benefits.filter(b => b.trim() !== '')
    };

    createCampaignMutation.mutate(cleanData);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}>
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">Créer une campagne</h1>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={createCampaignMutation.isPending}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {createCampaignMutation.isPending ? 'Création...' : 'Publier'}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Images */}
        <div>
          <Label>Images du projet *</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {images.map((url, i) => (
              <div key={i} className="relative aspect-square">
                <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                <button
                  onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500">
              <Upload className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-xs text-gray-500">Ajouter</span>
              <input
                type="file"
                multiple
                accept={FILE_ACCEPT_IMAGES}
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {/* Title */}
        <div>
          <Label>Titre de la campagne *</Label>
          <Input
            placeholder="Ex: Éducation pour les enfants du village"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="mt-2"
          />
        </div>

        {/* Category */}
        <div>
          <Label>Catégorie *</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.icon} {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div>
          <Label>Description courte *</Label>
          <Textarea
            placeholder="Résumé en quelques phrases"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-2"
            rows={3}
          />
        </div>

        {/* Story */}
        <div>
          <Label>Histoire complète</Label>
          <Textarea
            placeholder="Racontez l'histoire de votre projet en détail..."
            value={formData.story}
            onChange={(e) => setFormData({ ...formData, story: e.target.value })}
            className="mt-2"
            rows={6}
          />
        </div>

        {/* Goal & End Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Objectif (FCFA) *</Label>
            <Input
              type="number"
              placeholder="500000"
              value={formData.goal_amount}
              onChange={(e) => setFormData({ ...formData, goal_amount: e.target.value })}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Date de fin *</Label>
            <Input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="mt-2"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <Label>Localisation</Label>
          <Input
            placeholder="Ville, Pays"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="mt-2"
          />
        </div>

        {/* Benefits */}
        <div>
          <Label>Impact attendu</Label>
          <div className="space-y-2 mt-2">
            {formData.benefits.map((benefit, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="Ex: 100 enfants auront accès à l'éducation"
                  value={benefit}
                  onChange={(e) => updateBenefit(i, e.target.value)}
                />
                {formData.benefits.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBenefit(i)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              onClick={addBenefit}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un impact
            </Button>
          </div>
        </div>

        {/* Risks */}
        <div>
          <Label>Risques et défis</Label>
          <Textarea
            placeholder="Quels sont les risques et comment comptez-vous les gérer?"
            value={formData.risks}
            onChange={(e) => setFormData({ ...formData, risks: e.target.value })}
            className="mt-2"
            rows={3}
          />
        </div>

        {/* Rewards */}
        <div>
          <Label>Récompenses (optionnel)</Label>
          <div className="space-y-3 mt-2">
            {formData.reward_tiers.map((reward, i) => (
              <div key={i} className="bg-white p-4 rounded-xl border-2 border-gray-200 space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-600">Palier {i + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeReward(i)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  type="number"
                  placeholder="Montant (FCFA)"
                  value={reward.amount}
                  onChange={(e) => updateReward(i, 'amount', e.target.value)}
                />
                <Input
                  placeholder="Titre de la récompense"
                  value={reward.title}
                  onChange={(e) => updateReward(i, 'title', e.target.value)}
                />
                <Textarea
                  placeholder="Description"
                  value={reward.description}
                  onChange={(e) => updateReward(i, 'description', e.target.value)}
                  rows={2}
                />
              </div>
            ))}
            <Button
              variant="outline"
              onClick={addReward}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une récompense
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

