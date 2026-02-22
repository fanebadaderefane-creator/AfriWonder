import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createPageUrl } from '@/utils';
import { FILE_ACCEPT_IMAGES } from '@/lib/fileAccept';
import { useNavigate } from "react-router-dom";
import BottomNav from '../components/navigation/BottomNav';

export default function CreatePetition() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [petitionData, setPetitionData] = useState({
    title: '',
    description: '',
    category: 'infrastructure',
    location: '',
    country: '',
    region: '',
    city: '',
    target_authority: '',
    target_authority_email: '',
    goal_signatures: 100,
    deadline: '',
    isNational: true,
    images: []
  });

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        navigate('/', { replace: true });
      }
    };
    getUser();
  }, [navigate]);

  const createPetitionMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        toast.error('Connectez-vous d\'abord');
        return;
      }
      await api.civic.create({
        title: petitionData.title,
        description: petitionData.description,
        category: petitionData.category,
        goalSignatures: petitionData.goal_signatures,
        endDate: petitionData.deadline ? new Date(petitionData.deadline) : undefined,
        country: petitionData.country || undefined,
        region: petitionData.region || undefined,
        city: petitionData.city || petitionData.location || undefined,
        isNational: petitionData.isNational !== false,
        targetAuthorityEmail: petitionData.target_authority_email || petitionData.target_authority || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Pétition créée !');
      setTimeout(() => { navigate(createPageUrl('Civic')); }, 1500);
    },
    onError: (err) => toast.error(err?.apiMessage || 'Erreur')
  });

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files) return;

    try {
      for (let file of files) {
        const result = await api.upload.video({ file });
        setPetitionData({
          ...petitionData,
          images: [...petitionData.images, result.file_url]
        });
      }
      toast.success('Images ajoutées');
    } catch (_error) {
      toast.error('Erreur upload image');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">Créer une pétition</h1>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        {/* Basic Info */}
        <div className="bg-white rounded-lg p-4 space-y-3">
          <h2 className="font-bold">Détails de la pétition</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Titre *</label>
            <Input
              placeholder="Ex: Améliorer les transports publics"
              value={petitionData.title}
              onChange={(e) => setPetitionData({...petitionData, title: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description détaillée *</label>
            <Textarea
              placeholder="Expliquez votre pétition en détail..."
              value={petitionData.description}
              onChange={(e) => setPetitionData({...petitionData, description: e.target.value})}
              className="h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Catégorie</label>
              <select
                value={petitionData.category}
                onChange={(e) => setPetitionData({...petitionData, category: e.target.value})}
                className="w-full p-2 border rounded-lg text-sm"
              >
                <option value="infrastructure">Infrastructure</option>
                <option value="education">Éducation</option>
                <option value="sante">Santé</option>
                <option value="securite">Sécurité</option>
                <option value="environnement">Environnement</option>
                <option value="corruption">Anti-corruption</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Objectif (signatures)</label>
              <Input
                type="number"
                value={petitionData.goal_signatures}
                onChange={(e) => setPetitionData({...petitionData, goal_signatures: Number(e.target.value)})}
                min="10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Pays</label>
              <Input
                placeholder="Ex: SN, FR"
                value={petitionData.country}
                onChange={(e) => setPetitionData({...petitionData, country: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Région</label>
              <Input
                placeholder="Région"
                value={petitionData.region}
                onChange={(e) => setPetitionData({...petitionData, region: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ville / Lieu</label>
              <Input
                placeholder="Ville ou lieu"
                value={petitionData.city || petitionData.location}
                onChange={(e) => setPetitionData({...petitionData, city: e.target.value, location: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Pétition nationale ?</label>
            <select
              value={petitionData.isNational ? 'yes' : 'no'}
              onChange={(e) => setPetitionData({...petitionData, isNational: e.target.value === 'yes'})}
              className="w-full p-2 border rounded-lg text-sm"
            >
              <option value="yes">Oui (tout le pays)</option>
              <option value="no">Non (locale)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Autorité concernée (nom)</label>
            <Input
              placeholder="Ex: Mairie de Dakar, Gouvernement"
              value={petitionData.target_authority}
              onChange={(e) => setPetitionData({...petitionData, target_authority: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email autorité (envoi auto à l’objectif)</label>
            <Input
              type="email"
              placeholder="email@autorite.gouv"
              value={petitionData.target_authority_email}
              onChange={(e) => setPetitionData({...petitionData, target_authority_email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date limite</label>
            <Input
              type="date"
              value={petitionData.deadline}
              onChange={(e) => setPetitionData({...petitionData, deadline: e.target.value})}
            />
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-lg p-4 space-y-3">
          <h2 className="font-bold">Images de soutien</h2>
          
          <label className="w-full p-4 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all flex flex-col items-center justify-center">
            <ImageIcon className="w-8 h-8 text-gray-400 mb-1" />
            <span className="text-xs text-gray-600">Cliquez ou glissez pour ajouter</span>
            <input
              type="file"
              multiple
              accept={FILE_ACCEPT_IMAGES}
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>

          {petitionData.images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {petitionData.images.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img} alt={`${i + 1}`} className="w-full h-24 object-cover rounded" />
                  <button
                    onClick={() => setPetitionData({
                      ...petitionData,
                      images: petitionData.images.filter((_, idx) => idx !== i)
                    })}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-xs text-blue-800">
            <strong>Conseil:</strong> Décrivez précisément le problème et la solution que vous demandez. Plus votre pétition est détaillée, plus vous aurez de chances de succès.
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-20 left-0 right-0 bg-white border-_t border-gray-100 p-4">
        <Button
          onClick={() => createPetitionMutation.mutate()}
          disabled={createPetitionMutation.isPending || !petitionData.title || !petitionData.description}
          className="w-full bg-green-500 hover:bg-green-600 h-12"
        >
          {createPetitionMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          Créer la pétition
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}

