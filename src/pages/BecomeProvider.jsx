import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';
import BottomNav from '../components/navigation/BottomNav';

const serviceCategories = [
  'plomberie',
  'electricite',
  'menage',
  'jardinage',
  'reparation',
  'beaute',
  'sante',
  'education',
  'transport',
  'immobilier',
  'restaurant',
  'autre',
];

const payoutMethods = [
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'mtn_money', label: 'MTN Money' },
  { value: 'wave', label: 'Wave' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
];

export default function BecomeProvider() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    service_categories: [],
    service_radius_km: 10,
    location_type: 'both',
    payout_method: '',
    payout_account: '',
  });

  const createProviderMutation = useMutation({
    mutationFn: (data) => api.providers.create(data),
    onSuccess: () => {
      toast.success('Compte prestataire créé avec succès!');
      queryClient.invalidateQueries(['provider-by-user']);
      setStep(3);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création du compte');
    },
  });

  const handleCategoryToggle = (category) => {
    setFormData((prev) => ({
      ...prev,
      service_categories: prev.service_categories.includes(category)
        ? prev.service_categories.filter((c) => c !== category)
        : [...prev.service_categories, category],
    }));
  };

  const handleSubmit = () => {
    if (formData.service_categories.length === 0) {
      toast.error('Veuillez sélectionner au moins une catégorie de service');
      return;
    }

    if (!formData.payout_method || !formData.payout_account) {
      toast.error('Veuillez remplir les informations de paiement');
      return;
    }

    createProviderMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold flex-1">Devenir prestataire</h1>
          <div className="text-sm text-gray-600">Étape {step}/3</div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= s ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step > s ? 'bg-orange-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-6 space-y-6">
        {/* Step 1: Categories */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Catégories de services</CardTitle>
                <p className="text-sm text-gray-600">
                  Sélectionnez les catégories de services que vous proposez
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {serviceCategories.map((category) => (
                    <div
                      key={category}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.service_categories.includes(category)
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleCategoryToggle(category)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold capitalize">{category}</span>
                        {formData.service_categories.includes(category) && (
                          <CheckCircle className="w-5 h-5 text-orange-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <Label>Rayon de service (km)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.service_radius_km}
                    onChange={(e) =>
                      setFormData({ ...formData, service_radius_km: parseInt(e.target.value) || 10 })
                    }
                    className="mt-2"
                  />
                </div>

                <div className="pt-4">
                  <Label>Type de location</Label>
                  <Select
                    value={formData.location_type}
                    onValueChange={(value) => setFormData({ ...formData, location_type: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Sur place et à domicile</SelectItem>
                      <SelectItem value="on_site">Sur place uniquement</SelectItem>
                      <SelectItem value="home">À domicile uniquement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => setStep(2)}
                  disabled={formData.service_categories.length === 0}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  Suivant
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Payout Info */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Informations de paiement</CardTitle>
                <p className="text-sm text-gray-600">
                  Comment souhaitez-vous recevoir vos paiements?
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Méthode de paiement</Label>
                  <Select
                    value={formData.payout_method}
                    onValueChange={(value) => setFormData({ ...formData, payout_method: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Sélectionner une méthode" />
                    </SelectTrigger>
                    <SelectContent>
                      {payoutMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>
                    {formData.payout_method === 'bank_transfer'
                      ? 'Numéro de compte bancaire'
                      : 'Numéro de téléphone'}
                  </Label>
                  <Input
                    value={formData.payout_account}
                    onChange={(e) => setFormData({ ...formData, payout_account: e.target.value })}
                    placeholder={
                      formData.payout_method === 'bank_transfer'
                        ? 'IBAN ou numéro de compte'
                        : '+221 77 123 45 67'
                    }
                    className="mt-2"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Retour
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createProviderMutation.isPending || !formData.payout_method || !formData.payout_account}
                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                  >
                    {createProviderMutation.isPending ? 'Création...' : 'Créer mon compte'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Compte créé avec succès!</h2>
                <p className="text-gray-600 mb-6">
                  Votre compte prestataire a été créé. Il sera vérifié par notre équipe avant activation.
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => navigate(createPageUrl('ProviderDashboard'))}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    Accéder au tableau de bord
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(createPageUrl('Services'))}
                    className="w-full"
                  >
                    Ajouter un service
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
