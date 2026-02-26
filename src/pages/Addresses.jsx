import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MapPin, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import BottomNav from '../components/navigation/BottomNav';

export default function Addresses() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    street: '',
    city: '',
    country: 'Sénégal',
    postal_code: '',
    phone: '',
    type: 'Maison',
    is_default: false,
  });

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate(createPageUrl('Landing')));
  }, [navigate]);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: () => api.addresses.list(),
    enabled: !!user?.id
  });
  const addresses = Array.isArray(list) ? list : [];

  const createMutation = useMutation({
    mutationFn: () => api.addresses.create({
      street: form.street,
      city: form.city,
      country: form.country || 'Sénégal',
      postal_code: form.postal_code || undefined,
      phone: form.phone || undefined,
      type: form.type || 'shipping',
      is_default: form.is_default,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses', user?.id] });
      setShowForm(false);
      setForm({ street: '', city: '', country: 'Sénégal', postal_code: '', phone: '', type: 'Maison', is_default: false });
      toast.success('Adresse enregistrée');
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.addresses.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses', user?.id] });
      toast.success('Adresse supprimée');
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.street?.trim() || !form.city?.trim()) {
      toast.error('Rue et ville requis');
      return;
    }
    createMutation.mutate();
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
      <div className="sticky top-0 bg-white border-b z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Adresses de livraison</h1>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)} className="rounded-full">
              <Plus className="w-4 h-4 mr-1" /> Ajouter
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {showForm && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Nouvelle adresse</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label>Rue / Adresse *</Label>
                <Input
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                  placeholder="123 rue de la Paix"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ville *</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Dakar"
                    required
                  />
                </div>
                <div>
                  <Label>Code postal</Label>
                  <Input
                    value={form.postal_code}
                    onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                    placeholder="12500"
                  />
                </div>
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="77 123 45 67"
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                  Annuler
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="flex-1 bg-blue-500 hover:bg-blue-600">
                  {createMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : addresses.length === 0 && !showForm ? (
          <Card className="p-8 text-center">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">Aucune adresse enregistrée</p>
            <Button onClick={() => setShowForm(true)} className="bg-blue-500 hover:bg-blue-600">
              <Plus className="w-4 h-4 mr-2" /> Ajouter une adresse
            </Button>
          </Card>
        ) : (
          addresses.map((a) => (
            <Card key={a.id} className="p-4 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{a.street}</p>
                <p className="text-sm text-gray-600">{a.city}{a.postal_code ? `, ${a.postal_code}` : ''}</p>
                {a.phone && <p className="text-sm text-gray-500">{a.phone}</p>}
                {a.is_default && (
                  <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Par défaut</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(a.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </Card>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
}
