import React, { useEffect, useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNavigate } from "react-router-dom";
import BottomNav from '../components/navigation/BottomNav';

export default function CompanyProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ companyName: '', description: '', logoUrl: '', documentsLegal: '' });
  const queryClient = useQueryClient();

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => api.jobs.getCompanyProfile(),
    enabled: !!user
  });

  useEffect(() => {
    if (profile) {
      setForm({
        companyName: profile.company_name || '',
        description: profile.description || '',
        logoUrl: profile.logo_url || '',
        documentsLegal: profile.documents_legal || ''
      });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () => api.jobs.upsertCompanyProfile({
      companyName: form.companyName || undefined,
      description: form.description || undefined,
      logoUrl: form.logoUrl || undefined,
      documentsLegal: form.documentsLegal || undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['company-profile']);
      toast.success('Profil entreprise enregistré');
    },
    onError: (err) => toast.error(err?.apiMessage || 'Erreur')
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-gray-500">Connectez-vous pour gérer votre profil entreprise.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 bg-white border-b z-40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-xl font-bold">Profil entreprise</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : (
        <div className="p-4 space-y-4">
          {profile?.is_verified && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
              <Badge className="bg-green-600">Vérifié</Badge>
              <span className="text-sm text-green-800">Entreprise vérifiée</span>
            </div>
          )}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise</label>
            <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Nom" />
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Présentation..." />
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">URL du logo</label>
            <Input value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://..." />
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">Documents légaux (URL ou référence)</label>
            <Input value={form.documentsLegal} onChange={(e) => setForm({ ...form, documentsLegal: e.target.value })} placeholder="Optionnel" />
          </div>
          {profile?.rating_count > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-600">Note moyenne: <strong>{profile.rating_avg?.toFixed(1) ?? '—'}</strong> / 5 ({profile.rating_count} avis)</p>
            </div>
          )}
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full bg-orange-500">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      )}
      <BottomNav />
    </div>
  );
}
