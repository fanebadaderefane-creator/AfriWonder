/* cspell:disable-file */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/api/expressClient';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { getAbsoluteImageUrl } from '@/lib/utils';
import { createPageUrl } from '@/utils';

export default function SavedVideos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [collectionId, setCollectionId] = useState('');
  const [newFolderName, setNewFolderName] = useState('');

  const { data: collections = [] } = useQuery({
    queryKey: ['save-collections', user?.id],
    queryFn: () => api.saves.listCollections(),
    enabled: !!user?.id,
  });

  const { data: savesData, isLoading } = useQuery({
    queryKey: ['saves-list', user?.id, collectionId || 'all'],
    queryFn: () =>
      api.saves.list({
        page: 1,
        limit: 60,
        ...(collectionId ? { collection_id: collectionId } : {}),
        ...(!collectionId ? {} : {}),
      }),
    enabled: !!user?.id,
  });

  const videos = savesData?.videos || [];

  const createCol = useMutation({
    mutationFn: () => api.saves.createCollection(newFolderName.trim()),
    onSuccess: () => {
      setNewFolderName('');
      queryClient.invalidateQueries({ queryKey: ['save-collections', user?.id] });
      toast.success('Dossier créé');
    },
    onError: () => toast.error('Impossible de créer le dossier'),
  });

  if (!user) {
    return (
      <div className="min-h-dvh bg-gray-950 p-4 text-white">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Retour" className="mb-4">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <p>Connectez-vous pour voir vos sauvegardes.</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-950 text-white">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/10 bg-gray-950/95 px-3 py-3 backdrop-blur-md">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Retour" className="rounded-xl">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold tracking-tight">Mes sauvegardes</h1>
      </header>

      <div className="space-y-4 p-4">
        <p className="text-sm text-white/55">Privé — seul vous voyez cette liste.</p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCollectionId('')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              !collectionId ? 'bg-white text-black' : 'bg-white/10 text-white/80'
            }`}
          >
            Toutes
          </button>
          {collections.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCollectionId(c.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                collectionId === c.id ? 'bg-white text-black' : 'bg-white/10 text-white/80'
              }`}
            >
              {c.name}
              {typeof c.save_count === 'number' ? ` (${c.save_count})` : ''}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-[11px] font-medium text-white/45">Nouveau dossier</label>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Ex. Inspiration"
              className="border-white/15 bg-black/40 text-white"
            />
          </div>
          <Button
            type="button"
            disabled={!newFolderName.trim() || createCol.isPending}
            onClick={() => createCol.mutate()}
            className="rounded-full bg-white text-black hover:bg-white/90"
          >
            Créer
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-white/45">Chargement…</p>
        ) : videos.length === 0 ? (
          <p className="text-sm text-white/45">Aucune vidéo sauvegardée pour ce dossier.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {videos.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => navigate(`${createPageUrl('VideoView')}?id=${encodeURIComponent(v.id)}`)}
                  className="block w-full overflow-hidden rounded-xl border border-white/10 bg-black/40 text-left"
                >
                  <div className="aspect-[9/16] w-full bg-zinc-900">
                    {v.thumbnail_url ? (
                      <img
                        src={getAbsoluteImageUrl(v.thumbnail_url)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <p className="line-clamp-2 px-2 py-2 text-xs font-semibold text-white/90">{v.title}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
