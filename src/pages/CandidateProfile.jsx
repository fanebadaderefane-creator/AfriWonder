import React, { useEffect, useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import BottomNav from '../components/navigation/BottomNav';

function parseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return undefined;
  }
}

export default function CandidateProfile() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ cvUrl: '', portfolioUrl: '', phone: '', availability: '', skills: '', experience: '', education: '' });
  const queryClient = useQueryClient();

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['candidate-profile'],
    queryFn: () => api.jobs.getCandidateProfile(),
    enabled: !!user
  });

  useEffect(() => {
    if (profile) {
      setForm({
        cvUrl: profile.cv_url || '',
        portfolioUrl: profile.portfolio_url || '',
        phone: profile.phone || '',
        availability: profile.availability || '',
        skills: Array.isArray(profile.skills) ? profile.skills.join(', ') : (profile.skills || ''),
        experience: typeof profile.experience === 'string' ? profile.experience : JSON.stringify(profile.experience || [], null, 2),
        education: typeof profile.education === 'string' ? profile.education : JSON.stringify(profile.education || [], null, 2)
      });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const skills = form.skills ? form.skills.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
      const experience = parseJson(form.experience);
      const education = parseJson(form.education);
      return api.jobs.upsertCandidateProfile({
        cvUrl: form.cvUrl || undefined,
        portfolioUrl: form.portfolioUrl || undefined,
        phone: form.phone || undefined,
        availability: form.availability || undefined,
        skills,
        experience,
        education
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['candidate-profile']);
      toast.success('Profil enregistré');
    },
    onError: (err) => toast.error(err?.apiMessage || 'Erreur')
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-gray-500">Connectez-vous pour gérer votre profil candidat.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 bg-white border-b z-40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => window.history.back()}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-xl font-bold">Mon profil candidat</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">URL du CV</label>
            <Input value={form.cvUrl} onChange={(e) => setForm({ ...form, cvUrl: e.target.value })} placeholder="https://..." />
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio</label>
            <Input value={form.portfolioUrl} onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })} placeholder="https://..." />
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+221..." />
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">Disponibilité</label>
            <select className="w-full border rounded px-3 py-2" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })}>
              <option value="">—</option>
              <option value="immediate">Immédiate</option>
              <option value="2weeks">Sous 2 semaines</option>
              <option value="1month">Sous 1 mois</option>
            </select>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">Compétences (séparées par des virgules)</label>
            <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="React, Node, ..." />
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">Expériences (JSON)</label>
            <Textarea value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} rows={4} className="font-mono text-sm" />
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">Formation (JSON)</label>
            <Textarea value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} rows={4} className="font-mono text-sm" />
          </div>
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
