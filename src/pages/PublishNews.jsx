import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/api/expressClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, FileText } from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import { toast } from 'sonner';

const CATEGORIES = [
  { id: 'politique', label: 'Politique' },
  { id: 'economie', label: 'Économie' },
  { id: 'technologie', label: 'Technologie' },
  { id: 'sante', label: 'Santé' },
  { id: 'sport', label: 'Sport' },
  { id: 'culture', label: 'Culture' },
  { id: 'international', label: 'International' },
];

export default function PublishNews() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'politique',
    featured_image: '',
  });

  React.useEffect(() => {
    api.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const article = await api.news.create(payload);
      await api.news.setStatus(article.id, 'published');
      return article;
    },
    onSuccess: (article) => {
      queryClient.invalidateQueries({ queryKey: ['news-list'] });
      queryClient.invalidateQueries({ queryKey: ['news-trending'] });
      toast.success('Actualité publiée avec succès');
      navigate(createPageUrl('ArticleDetails') + `?id=${article.slug || article.id}`);
    },
    onError: (e) => {
      const msg = e.response?.data?.error || e.response?.data?.message || e.message;
      toast.error(msg || 'Impossible de publier l\'actualité');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Le titre est obligatoire');
      return;
    }
    if (!form.content.trim()) {
      toast.error('Le contenu est obligatoire');
      return;
    }
    createMutation.mutate({
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || undefined,
      content: form.content.trim(),
      category: form.category || undefined,
      featured_image: form.featured_image.trim() || undefined,
      language: 'FR',
    });
  };

  if (user === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 pb-24">
        <FileText className="w-16 h-16 text-blue-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Connexion requise</h2>
        <p className="text-gray-600 text-center mb-6">
          Connectez-vous pour publier une actualité sur AfriWonder.
        </p>
        <Button
          className="bg-blue-500 hover:bg-blue-600"
          onClick={() => navigate(createPageUrl('Landing'))}
        >
          Se connecter
        </Button>
        <Button variant="ghost" className="mt-3" onClick={() => navigate(-1)}>
          Retour
        </Button>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-xl"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-gray-900">Publier une actualité</h1>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Titre de l'article"
            className="rounded-xl border-gray-200"
            maxLength={200}
            required
          />
          <p className="text-xs text-gray-500 mt-0.5">{form.title.length}/200</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Résumé (optionnel)</label>
          <Input
            value={form.excerpt}
            onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
            placeholder="Courte description pour l'aperçu"
            className="rounded-xl border-gray-200"
            maxLength={300}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image de couverture (URL, optionnel)</label>
          <Input
            value={form.featured_image}
            onChange={(e) => setForm((f) => ({ ...f, featured_image: e.target.value }))}
            placeholder="https://..."
            className="rounded-xl border-gray-200"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contenu *</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Rédigez votre article..."
            className="w-full min-h-[200px] rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white resize-y"
            required
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={() => navigate(-1)}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-blue-500 hover:bg-blue-600 rounded-xl"
            disabled={createMutation.isPending || !form.title.trim() || !form.content.trim()}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Publication...
              </>
            ) : (
              'Publier'
            )}
          </Button>
        </div>
      </form>

      <BottomNav />
    </div>
  );
}
