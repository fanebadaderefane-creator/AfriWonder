import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, Upload, Save, Store, MapPin, Phone, Mail, 
  Clock, Facebook, Instagram, Twitter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FILE_ACCEPT_IMAGES } from '@/lib/fileAccept';
import { toast } from "sonner";

export default function SellerStorefront() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState({
    shop_name: '',
    bio: '',
    shop_banner: '',
    shop_logo: '',
    contact_email: '',
    contact_phone: '',
    whatsapp: '',
    location: '',
    business_hours: '',
    return_policy: '',
    shipping_info: '',
    theme_color: '#f97316',
    social_links: {
      facebook: '',
      instagram: '',
      twitter: ''
    }
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

  const { data: existingProfile } = useQuery({
    queryKey: ['seller-profile', user?.id],
    queryFn: async () => {
      const profiles = await api.entities.SellerProfile.filter({ seller_id: user.id });
      if (profiles.length > 0) {
        setProfile(profiles[0]);
        return profiles[0];
      }
      return null;
    },
    enabled: !!user?.id
  });

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await api.upload.video({ file });
      setProfile({ ...profile, [field]: file_url });
      toast.success('Image téléchargée');
    } catch (_error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (existingProfile) {
        await api.entities.SellerProfile.update(existingProfile.id, profile);
      } else {
        await api.entities.SellerProfile.create({
          ...profile,
          seller_id: user.id
        });
      }
    },
    onSuccess: () => {
      toast.success('Boutique mise à jour !');
      queryClient.invalidateQueries(['seller-profile']);
      navigate(-1);
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">Personnaliser ma boutique</h1>
          </div>
          <Button
            onClick={() => saveProfileMutation.mutate()}
            disabled={saveProfileMutation.isPending || uploading}
            className="bg-gradient-to-r from-orange-500 to-red-500"
          >
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Banner & Logo */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Images de la boutique</h3>
          
          <div className="space-y-4">
            <div>
              <Label>Bannière</Label>
              <div className="mt-2 relative h-32 bg-gray-100 rounded-lg overflow-hidden">
                {profile.shop_banner ? (
                  <img src={profile.shop_banner} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <Store className="w-8 h-8" />
                  </div>
                )}
                <input
                  type="file"
                  accept={FILE_ACCEPT_IMAGES}
                  onChange={(e) => handleImageUpload(e, 'shop_banner')}
                  className="hidden"
                  id="banner-upload"
                />
                <label
                  htmlFor="banner-upload"
                  className="absolute bottom-2 right-2 bg-white rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 shadow"
                >
                  <Upload className="w-4 h-4 inline mr-1" />
                  Changer
                </label>
              </div>
            </div>

            <div>
              <Label>Logo</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden">
                  {profile.shop_logo ? (
                    <img src={profile.shop_logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <Store className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept={FILE_ACCEPT_IMAGES}
                  onChange={(e) => handleImageUpload(e, 'shop_logo')}
                  className="hidden"
                  id="logo-upload"
                />
                <label htmlFor="logo-upload">
                  <Button variant="outline" asChild>
                    <span>Changer le logo</span>
                  </Button>
                </label>
              </div>
            </div>

            <div>
              <Label>Couleur du thème</Label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={profile.theme_color}
                  onChange={(e) => setProfile({ ...profile, theme_color: e.target.value })}
                  className="w-12 h-12 rounded-lg cursor-pointer"
                />
                <Input
                  value={profile.theme_color}
                  onChange={(e) => setProfile({ ...profile, theme_color: e.target.value })}
                  placeholder="#f97316"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Basic Info */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Informations générales</h3>
          
          <div className="space-y-3">
            <div>
              <Label>Nom de la boutique *</Label>
              <Input
                value={profile.shop_name}
                onChange={(e) => setProfile({ ...profile, shop_name: e.target.value })}
                placeholder="Ma Super Boutique"
              />
            </div>

            <div>
              <Label>À propos de votre boutique</Label>
              <Textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Racontez l'histoire de votre boutique..."
                rows={4}
              />
            </div>

            <div>
              <Label>Localisation</Label>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <Input
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  placeholder="Dakar, Sénégal"
                />
              </div>
            </div>

            <div>
              <Label>Horaires d'ouverture</Label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <Input
                  value={profile.business_hours}
                  onChange={(e) => setProfile({ ...profile, business_hours: e.target.value })}
                  placeholder="Lun-Sam: 9h-18h"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Contact */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Contact</h3>
          
          <div className="space-y-3">
            <div>
              <Label>Email</Label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  value={profile.contact_email}
                  onChange={(e) => setProfile({ ...profile, contact_email: e.target.value })}
                  placeholder="contact@boutique.com"
                />
              </div>
            </div>

            <div>
              <Label>Téléphone</Label>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <Input
                  value={profile.contact_phone}
                  onChange={(e) => setProfile({ ...profile, contact_phone: e.target.value })}
                  placeholder="+221 77 123 45 67"
                />
              </div>
            </div>

            <div>
              <Label>WhatsApp</Label>
              <Input
                value={profile.whatsapp}
                onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
                placeholder="+221 77 123 45 67"
              />
            </div>
          </div>
        </Card>

        {/* Social Media */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Réseaux sociaux</h3>
          
          <div className="space-y-3">
            <div>
              <Label>Facebook</Label>
              <div className="flex items-center gap-2">
                <Facebook className="w-4 h-4 text-gray-400" />
                <Input
                  value={profile.social_links?.facebook}
                  onChange={(e) => setProfile({ 
                    ...profile, 
                    social_links: { ...profile.social_links, facebook: e.target.value } 
                  })}
                  placeholder="https://facebook.com/..."
                />
              </div>
            </div>

            <div>
              <Label>Instagram</Label>
              <div className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-gray-400" />
                <Input
                  value={profile.social_links?.instagram}
                  onChange={(e) => setProfile({ 
                    ...profile, 
                    social_links: { ...profile.social_links, instagram: e.target.value } 
                  })}
                  placeholder="https://instagram.com/..."
                />
              </div>
            </div>

            <div>
              <Label>Twitter</Label>
              <div className="flex items-center gap-2">
                <Twitter className="w-4 h-4 text-gray-400" />
                <Input
                  value={profile.social_links?.twitter}
                  onChange={(e) => setProfile({ 
                    ...profile, 
                    social_links: { ...profile.social_links, twitter: e.target.value } 
                  })}
                  placeholder="https://twitter.com/..."
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Policies */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Politiques</h3>
          
          <div className="space-y-3">
            <div>
              <Label>Politique de retour</Label>
              <Textarea
                value={profile.return_policy}
                onChange={(e) => setProfile({ ...profile, return_policy: e.target.value })}
                placeholder="Décrivez votre politique de retour..."
                rows={3}
              />
            </div>

            <div>
              <Label>Informations de livraison</Label>
              <Textarea
                value={profile.shipping_info}
                onChange={(e) => setProfile({ ...profile, shipping_info: e.target.value })}
                placeholder="Zones de livraison, délais, tarifs..."
                rows={3}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

