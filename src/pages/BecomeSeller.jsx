import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Store, CheckCircle, Loader2, ShieldCheck, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function BecomeSeller() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate(createPageUrl('Landing')));
  }, [navigate]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['seller-profile', user?.id],
    queryFn: () => api.sellerProfile.getMe(),
    enabled: !!user?.id
  });

  const { data: verification, refetch: refetchVerification } = useQuery({
    queryKey: ['verification', user?.id],
    queryFn: () => api.verification.getMe(),
    enabled: !!user?.id
  });

  const [form, setForm] = useState({
    store_name: '',
    store_description: '',
    country: '',
    city: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        store_name: profile.store_name || '',
        store_description: profile.store_description || '',
        country: profile.country || '',
        city: profile.city || '',
      });
    }
  }, [profile]);

  const createMutation = useMutation({
    mutationFn: () => api.sellerProfile.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-profile', user?.id] });
      toast.success('Compte vendeur créé !');
      navigate(createPageUrl('AddProduct'));
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur')
  });

  const updateMutation = useMutation({
    mutationFn: () => api.sellerProfile.update(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-profile', user?.id] });
      toast.success('Profil vendeur mis à jour');
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur')
  });

  const [kycForm, setKycForm] = useState({ document_type: 'id_card', document_url: '' });
  const submitKycMutation = useMutation({
    mutationFn: () => api.verification.submit(kycForm),
    onSuccess: () => {
      refetchVerification();
      queryClient.invalidateQueries({ queryKey: ['verification', user?.id] });
      toast.success('Demande KYC envoyée');
      setKycForm((f) => ({ ...f, document_url: '' }));
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.store_name?.trim()) {
      toast.error('Le nom de la boutique est requis');
      return;
    }
    if (profile) updateMutation.mutate();
    else createMutation.mutate();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="sticky top-0 bg-white border-b z-10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">{profile ? 'Mon profil vendeur' : 'Devenir vendeur'}</h1>
      </div>

      <div className="p-4 max-w-xl mx-auto">
        {profile && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">Vous avez déjà un compte vendeur.</span>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              {profile ? 'Ma boutique' : 'Créer ma boutique'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nom de la boutique *</Label>
                <Input
                  value={form.store_name}
                  onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                  placeholder="Ma Boutique AfriWonder"
                  required
                />
              </div>
              <div>
                <Label>Description (optionnel)</Label>
                <Textarea
                  value={form.store_description}
                  onChange={(e) => setForm({ ...form, store_description: e.target.value })}
                  placeholder="Décrivez votre activité..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pays</Label>
                  <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Sénégal" />
                </div>
                <div>
                  <Label>Ville</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Dakar" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : profile ? 'Enregistrer' : 'Créer mon compte vendeur'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {profile && (
          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => navigate(createPageUrl('AddProduct'))}>Ajouter un produit</Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate(createPageUrl('SellerDashboard'))}>Tableau de bord</Button>
          </div>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Vérification d'identité (KYC)
            </CardTitle>
            <p className="text-sm text-gray-500">Soumettez un document pour le badge vendeur vérifié (optionnel).</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {verification?.status === 'approved' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Vérification approuvée</span>
              </div>
            )}
            {verification?.status === 'pending' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-medium">Demande en cours d'examen</span>
              </div>
            )}
            {(verification?.status === 'rejected' || !verification) && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type de document</Label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={kycForm.document_type}
                      onChange={(e) => setKycForm({ ...kycForm, document_type: e.target.value })}
                    >
                      <option value="id_card">Carte d'identité</option>
                      <option value="passport">Passeport</option>
                      <option value="driver_license">Permis de conduire</option>
                    </select>
                  </div>
                  <div>
                    <Label>URL du document (image ou PDF)</Label>
                    <Input placeholder="https://..." value={kycForm.document_url} onChange={(e) => setKycForm({ ...kycForm, document_url: e.target.value })} />
                  </div>
                </div>
                <Button type="button" variant="outline" className="w-full" disabled={!kycForm.document_url?.trim() || submitKycMutation.isPending} onClick={() => submitKycMutation.mutate()}>
                  {submitKycMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                  {verification?.status === 'rejected' ? 'Resoumettre' : 'Soumettre la demande'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
