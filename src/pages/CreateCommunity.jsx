import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function CreateCommunity() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other',
    privacy_type: 'public'
  });

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch {
        navigate('/');
      }
    };
    getUser();
  }, []);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name.trim()) {
        throw new Error('Le nom est requis');
      }

      const community = await api.entities.Community.create({
        ...formData,
        creator_id: user.id,
        creator_name: user.full_name,
        creator_avatar: user.profile_image,
        members_count: 1
      });

      await api.entities.CommunityMember.create({
        community_id: community.id,
        user_id: user.id,
        user_name: user.full_name,
        user_avatar: user.profile_image,
        role: 'admin',
        joined_date: new Date().toISOString()
      });

      return community;
    },
    onSuccess: (community) => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      toast.success('Communauté créée!');
      navigate(`/CommunityDetails?id=${community.id}`);
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b z-40 p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Créer une communauté</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-sm font-semibold block mb-2">Nom *</label>
              <Input
                placeholder="Nom de la communauté"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2">Description</label>
              <Textarea
                placeholder="Décrivez votre communauté..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="h-24"
              />
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2">Catégorie</label>
              <Select value={formData.category} onValueChange={(category) => setFormData({ ...formData, category })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">Technologie</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="education">Éducation</SelectItem>
                  <SelectItem value="entertainment">Divertissement</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="lifestyle">Lifestyle</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2">Type de communauté</label>
              <Select value={formData.privacy_type} onValueChange={(privacy_type) => setFormData({ ...formData, privacy_type })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public (tout le monde peut rejoindre)</SelectItem>
                  <SelectItem value="private">Privé (invitation requise)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
              ℹ️ Vous serez automatiquement admin de cette communauté.
            </div>

            <div className="flex gap-2">
              <Button onClick={() => navigate(-1)} variant="outline" className="flex-1">
                Annuler
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !formData.name.trim()}
                className="flex-1 bg-blue-500 hover:bg-blue-600"
              >
                {createMutation.isPending ? 'Création...' : 'Créer'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

