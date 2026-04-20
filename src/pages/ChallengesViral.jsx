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

export default function ChallengesViral() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [hashtag, setHashtag] = useState('');
  const [title, setTitle] = useState('');
  const [joinHashtag, setJoinHashtag] = useState('');
  const [joinVideoId, setJoinVideoId] = useState('');

  const { data: trending = [], isLoading } = useQuery({
    queryKey: ['challenges-viral-trending'],
    queryFn: () => api.challenges.viralTrending(20),
  });

  const createMut = useMutation({
    mutationFn: () =>
      api.challenges.viralCreate({
        hashtag: hashtag.replace(/^#/, ''),
        title: title.trim(),
      }),
    onSuccess: () => {
      toast.success('Challenge créé');
      setHashtag('');
      setTitle('');
      queryClient.invalidateQueries({ queryKey: ['challenges-viral-trending'] });
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || 'Échec création'),
  });

  const joinMut = useMutation({
    mutationFn: () => api.challenges.viralJoin(joinHashtag.replace(/^#/, ''), joinVideoId.trim()),
    onSuccess: () => {
      toast.success('Vidéo associée au challenge');
      setJoinVideoId('');
      queryClient.invalidateQueries({ queryKey: ['challenges-viral-trending'] });
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || 'Échec participation'),
  });

  return (
    <div className="min-h-dvh bg-gray-950 text-white">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/10 bg-gray-950/95 px-3 py-3 backdrop-blur-md">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Retour" className="rounded-xl">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold tracking-tight">Challenges</h1>
      </header>

      <div className="space-y-6 p-4">
        <section className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <h2 className="text-sm font-bold text-white/90">Tendance</h2>
          {isLoading ? (
            <p className="mt-2 text-sm text-white/45">Chargement…</p>
          ) : trending.length === 0 ? (
            <p className="mt-2 text-sm text-white/45">Aucun challenge pour le moment.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {trending.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold">#{c.hashtag}</p>
                    <p className="text-xs text-white/50">{c.title}</p>
                    {c.is_sponsored && c.sponsor_brand ? (
                      <p className="text-[10px] text-amber-200/90">Sponsorisé · {c.sponsor_brand}</p>
                    ) : null}
                  </div>
                  <span className="text-xs tabular-nums text-white/55">{c.participation_count ?? 0} vidéos</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {user && (
          <>
            <section className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <h2 className="text-sm font-bold text-white/90">Créer un challenge</h2>
              <div className="mt-3 space-y-2">
                <Input
                  value={hashtag}
                  onChange={(e) => setHashtag(e.target.value)}
                  placeholder="Hashtag (sans #)"
                  className="border-white/15 bg-black/40 text-white"
                />
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre"
                  className="border-white/15 bg-black/40 text-white"
                />
                <Button
                  type="button"
                  className="w-full rounded-full bg-white text-black hover:bg-white/90"
                  disabled={!hashtag.trim() || !title.trim() || createMut.isPending}
                  onClick={() => createMut.mutate()}
                >
                  Publier le challenge
                </Button>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <h2 className="text-sm font-bold text-white/90">Participer (tag auto)</h2>
              <p className="mt-1 text-xs text-white/45">Associe une de vos vidéos au hashtag du challenge.</p>
              <div className="mt-3 space-y-2">
                <Input
                  value={joinHashtag}
                  onChange={(e) => setJoinHashtag(e.target.value)}
                  placeholder="Hashtag du challenge"
                  className="border-white/15 bg-black/40 text-white"
                />
                <Input
                  value={joinVideoId}
                  onChange={(e) => setJoinVideoId(e.target.value)}
                  placeholder="ID de la vidéo"
                  className="border-white/15 bg-black/40 text-white"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full rounded-full"
                  disabled={!joinHashtag.trim() || !joinVideoId.trim() || joinMut.isPending}
                  onClick={() => joinMut.mutate()}
                >
                  Associer ma vidéo
                </Button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
