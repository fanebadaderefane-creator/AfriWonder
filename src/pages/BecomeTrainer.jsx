import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import BottomNav from '@/components/navigation/BottomNav';

export default function BecomeTrainer() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    bio: '',
    domains: '',
    experience: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name?.trim() || !form.email?.trim() || !form.phone?.trim()) {
      toast.error('Nom, email et téléphone sont requis');
      return;
    }
    setLoading(true);
    try {
      await api.courses.providers.register(form);
      toast.success('Demande enregistrée. Un administrateur AfriWonder la validera. Vos formations apparaîtront ensuite dans l\'espace Formations.');
      navigate(createPageUrl('Courses'));
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="sticky top-0 bg-white border-b border-slate-200 z-10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="p-1 -m-1">
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Devenir formateur</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-red-50 border border-orange-100">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Prestataire Formations</p>
            <p className="text-sm text-slate-600">Renseignez vos informations. Après approbation par AfriWonder, vos formations seront visibles dans l’espace Formations.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet *</label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="Ex: Oumar Diarra"
              className="rounded-xl border-slate-200"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="exemple@email.com"
              className="rounded-xl border-slate-200"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone *</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+223 70 12 34 56"
              className="rounded-xl border-slate-200"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Biographie / Présentation</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Parlez de vous et de votre expertise..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Domaines d'expertise</label>
            <Input
              value={form.domains}
              onChange={(e) => setForm((p) => ({ ...p, domains: e.target.value }))}
              placeholder="Ex: Technologie, Business, Langues"
              className="rounded-xl border-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Expérience</label>
            <textarea
              value={form.experience}
              onChange={(e) => setForm((p) => ({ ...p, experience: e.target.value }))}
              placeholder="Diplômes, années d'expérience, réalisations..."
              rows={2}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 rounded-xl py-6 text-base font-medium"
          >
            {loading ? 'Envoi en cours...' : 'Envoyer ma demande'}
          </Button>
        </form>

        <Button
          variant="outline"
          className="w-full mt-4 rounded-xl border-slate-200"
          onClick={() => navigate(createPageUrl('Courses'))}
        >
          Retour aux formations
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
