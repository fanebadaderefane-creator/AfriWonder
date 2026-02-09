import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { 
  ArrowLeft, Upload, MapPin, Phone, Mail, Clock,
  Utensils, Wrench, Home as HomeIcon, Car, Scissors, 
  Heart, GraduationCap, ShoppingCart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";

const serviceCategories = [
  { id: 'restaurant', name: 'Restaurant', icon: Utensils },
  { id: 'reparation', name: 'Réparation', icon: Wrench },
  { id: 'immobilier', name: 'Immobilier', icon: HomeIcon },
  { id: 'transport', name: 'Transport', icon: Car },
  { id: 'beaute', name: 'Beauté', icon: Scissors },
  { id: 'sante', name: 'Santé', icon: Heart },
  { id: 'education', name: 'Éducation', icon: GraduationCap },
  { id: 'commerce', name: 'Commerce', icon: ShoppingCart },
];

export default function AddService() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [service, setService] = useState({
    name: '',
    category: 'restaurant',
    description: '',
    address: '',
    phone: '',
    whatsapp: '',
    email: '',
    hours: '',
    images: [],
    location: null
  });

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
        setService(prev => ({
          ...prev,
          phone: u.phone || '',
          email: u.email || ''
        }));
      } catch (_e) {
        navigate('/');
      }
    };
    getUser();
  }, []);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await api.upload.video({ file });
        uploadedUrls.push(file_url);
      }
      setService(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
      toast.success('Images téléchargées');
    } catch (_error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setService(prev => ({
            ...prev,
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          }));
          toast.success('Position enregistrée');
        },
        () => toast.error('Impossible de récupérer la position')
      );
    }
  };

  const createServiceMutation = useMutation({
    mutationFn: async () => {
      if (!service.name || !service.phone || !service.address) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }

      return api.entities.Service.create({
        ...service,
        owner_id: user.id,
        owner_name: user.full_name || user.email
      });
    },
    onSuccess: () => {
      toast.success('Service créé avec succès !');
      queryClient.invalidateQueries(['services']);
      navigate('/Services');
    },
    onError: (error) => {
      toast.error(error._message || 'Erreur lors de la création');
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}>
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">Ajouter un service</h1>
          </div>
          <Button
            onClick={() => createServiceMutation.mutate()}
            disabled={createServiceMutation.isPending || uploading}
            className="bg-gradient-to-r from-orange-500 to-red-500"
          >
            Publier
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Images */}
        <Card className="p-4">
          <Label className="mb-2 block">Photos du service *</Label>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {service.images.map((img, idx) => (
              <div key={idx} className="aspect-square rounded-lg overflow-hidden relative">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setService(prev => ({
                    ...prev,
                    images: prev.images.filter((_, i) => i !== idx)
                  }))}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload">
            <Button variant="outline" className="w-full" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Téléchargement...' : 'Ajouter des photos'}
              </span>
            </Button>
          </label>
        </Card>

        {/* Basic Info */}
        <Card className="p-4 space-y-3">
          <div>
            <Label>Nom du service *</Label>
            <Input
              value={service.name}
              onChange={(e) => setService({ ...service, name: e.target.value })}
              placeholder="Ex: Restaurant Chez Fatou"
            />
          </div>

          <div>
            <Label>Catégorie *</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {serviceCategories.map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setService({ ...service, category: cat.id })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      service.category === cat.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-1 ${
                      service.category === cat.id ? 'text-orange-500' : 'text-gray-400'
                    }`} />
                    <p className="text-xs text-center">{cat.name}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={service.description}
              onChange={(e) => setService({ ...service, description: e.target.value })}
              placeholder="Décrivez votre service..."
              rows={4}
            />
          </div>
        </Card>

        {/* Contact */}
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Contact</h3>
          
          <div>
            <Label>Téléphone *</Label>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <Input
                value={service.phone}
                onChange={(e) => setService({ ...service, phone: e.target.value })}
                placeholder="+221 77 123 45 67"
              />
            </div>
          </div>

          <div>
            <Label>WhatsApp</Label>
            <Input
              value={service.whatsapp}
              onChange={(e) => setService({ ...service, whatsapp: e.target.value })}
              placeholder="+221 77 123 45 67"
            />
          </div>

          <div>
            <Label>Email</Label>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <Input
                type="email"
                value={service.email}
                onChange={(e) => setService({ ...service, email: e.target.value })}
                placeholder="contact@service.com"
              />
            </div>
          </div>
        </Card>

        {/* Location */}
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Localisation</h3>
          
          <div>
            <Label>Adresse *</Label>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <Input
                value={service.address}
                onChange={(e) => setService({ ...service, address: e.target.value })}
                placeholder="Plateau, Dakar"
              />
            </div>
          </div>

          <Button
            onClick={getLocation}
            variant="outline"
            className="w-full"
          >
            <MapPin className="w-4 h-4 mr-2" />
            {service.location ? '✓ Position enregistrée' : 'Obtenir ma position GPS'}
          </Button>

          <div>
            <Label>Horaires</Label>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <Input
                value={service.hours}
                onChange={(e) => setService({ ...service, hours: e.target.value })}
                placeholder="Lun-Sam: 9h-18h"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

