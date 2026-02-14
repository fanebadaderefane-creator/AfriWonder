/**
 * CDC §4 ÉTAPE 1 - Création compte publicitaire
 * Nom entreprise, téléphone, email, pays, document légal (optionnel)
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/expressClient';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import BottomNav from '@/components/navigation/BottomNav';
import { ALL_COUNTRIES } from '@/constants/countries';

export default function AdvertiserRegistration() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    phone: '',
    email: '',
    country: '',
  });

  useEffect(() => {
    api.auth
      .me()
      .then((u) => {
        setUser(u);
        setFormData((p) => ({
          ...p,
          email: u.email || p.email,
          country: u.country || p.country,
        }));
      })
      .catch(() => navigate(createPageUrl('Home')))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.company_name?.trim()) {
      toast.error('Nom de l\'entreprise requis');
      return;
    }
    if (!formData.phone?.trim()) {
      toast.error('Numéro de téléphone requis');
      return;
    }
    setSubmitting(true);
    try {
      await api.auth.updateMe({
        full_name: formData.company_name.trim(),
        country: formData.country || null,
      }).catch(() => null);
      try {
        localStorage.setItem(
          'afw_advertiser_profile',
          JSON.stringify({
            company_name: formData.company_name.trim(),
            phone: formData.phone.trim(),
            email: formData.email,
            country: formData.country,
          })
        );
      } catch (_e) {}
      toast.success('Profil annonceur enregistré');
      navigate(createPageUrl('AdvertiserDashboard'));
    } catch (err) {
      toast.error(err?.apiMessage || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900/20 to-slate-900 pb-24">
      <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-amber-600 border-b border-white/20 shadow-xl z-40">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Compte publicitaire
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        <p className="text-white/70 text-sm">
          Complétez vos informations pour créer des campagnes publicitaires sur AfriWonder.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-white/80">Nom de l&apos;entreprise *</Label>
            <Input
              value={formData.company_name}
              onChange={(e) => setFormData((p) => ({ ...p, company_name: e.target.value }))}
              placeholder="Ex: Ma Boutique Sénégal"
              className="mt-1 bg-white/10 border-white/20 text-white"
              required
            />
          </div>
          <div>
            <Label className="text-white/80">Numéro de téléphone *</Label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Ex: 77 12 34 56 78"
              className="mt-1 bg-white/10 border-white/20 text-white"
              required
            />
          </div>
          <div>
            <Label className="text-white/80">Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              placeholder="contact@entreprise.com"
              className="mt-1 bg-white/10 border-white/20 text-white"
            />
          </div>
          <div>
            <Label className="text-white/80">Pays</Label>
            <Select
              value={formData.country || 'all'}
              onValueChange={(v) => setFormData((p) => ({ ...p, country: v === 'all' ? '' : v }))}
            >
              <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Sélectionnez" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sélectionnez un pays</SelectItem>
                {ALL_COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600"
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Créer mon compte publicitaire'
            )}
          </Button>
        </form>
      </div>
      <BottomNav />
    </div>
  );
}
