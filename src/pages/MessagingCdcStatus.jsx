import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Type, Image as ImageIcon, Users, Trash2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api } from '@/api/expressClient';
import { useAuth } from '@/lib/AuthContext';
import MessagingCdcShell from '@/components/messaging/MessagingCdcShell';
import {
  CdcCallout,
  CdcImplBadge,
  useCdcPersistedJson,
  CdcSubsectionTitle,
  CdcRequirementChecklist,
  CdcTierLegend,
} from '@/components/messaging/MessagingCdcUi';
import { createPageUrl } from '@/utils';

export default function MessagingCdcStatus() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [prefs, setPrefs] = useCdcPersistedJson('status_prefs', {
    audienceAll: true,
    hideFrom: false,
  });

  const [textOpen, setTextOpen] = useState(false);
  const [textBody, setTextBody] = useState('');

  const {
    data: stories,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['cdc-stories-by-user', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => api.stories.getByUser(user.id),
    staleTime: 15_000,
  });

  const createTextMutation = useMutation({
    mutationFn: async () => {
      const t = textBody.trim();
      if (!t) throw new Error('Saisissez un texte');
      // Important : Stories.jsx interprète tout sauf `image` comme une vidéo.
      // On publie donc le texte sous forme d'une image SVG encodée (data URI).
      const escaped = t
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
        .replace(/\s+/g, ' ');
      const svg = `<?xml version="1.0" encoding="UTF-8"?>` +
        `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">` +
        `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0ea5e9" stop-opacity="0.25"/><stop offset="1" stop-color="#070a12" stop-opacity="1"/></linearGradient></defs>` +
        `<rect width="1080" height="1920" fill="#070a12"/>` +
        `<rect x="0" y="0" width="1080" height="1920" fill="url(#g)"/>` +
        `<text x="54" y="340" font-size="72" font-family="Arial, Helvetica, sans-serif" fill="#ffffff" font-weight="700">${escaped.slice(0, 320)}</text>` +
        `</svg>`;
      const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      return api.stories.create({ mediaUrl: svgDataUrl, mediaType: 'image', expiresInHours: 24 });
    },
    onSuccess: () => {
      setTextBody('');
      setTextOpen(false);
      toast.success('Statut publié');
      queryClient.invalidateQueries({ queryKey: ['cdc-stories-by-user', user?.id] });
    },
    onError: (e) => {
      toast.error(e?.message || 'Impossible de publier');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (storyId) => api.stories.delete(storyId),
    onSuccess: () => {
      toast.success('Statut supprimé');
      queryClient.invalidateQueries({ queryKey: ['cdc-stories-by-user', user?.id] });
    },
    onError: (e) => {
      toast.error(e?.response?.data?.message || e?.message || 'Suppression impossible');
    },
  });

  const sortedStories = useMemo(() => {
    const arr = Array.isArray(stories) ? stories : [];
    return arr.slice().sort((a, b) => {
      const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
  }, [stories]);

  return (
    <MessagingCdcShell title="Statuts" subtitle="Stories 24 h — CDC">
      <CdcCallout variant="info">
        Écran CDC branché sur l’API « Stories » : liste, statut texte (SVG) et suppression. Photo / vidéo : branchement
        média à finaliser.
      </CdcCallout>

      <CdcSubsectionTitle>Périmètre CDC statuts</CdcSubsectionTitle>
      <CdcRequirementChecklist
        className="mt-2"
        items={[
          { status: 'ui', label: 'Liste serveur, texte 24 h, audience locale (maquette) et lien Stories.' },
          { status: 'partial', label: 'Caméra, galerie, sticker et durée variable : à brancher sur upload + API.' },
          { status: 'server', label: 'Statistiques vues, réponses, masquage liste proches : règles finales.' },
        ]}
      />
      <CdcTierLegend className="mt-3" />

      <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
        <p className="text-[14px] leading-relaxed text-white/75">
          Photo, vidéo (jusqu’à 30 s), texte ou sticker. Disparition après 24 h.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-auto flex-col gap-2 rounded-xl bg-white/[0.08] py-4 text-white hover:bg-white/[0.12]"
            onClick={() => toast.message('Caméra : branchement API média et fil de statuts prévu.')}
          >
            <Camera className="h-6 w-6 text-white/70" />
            <span className="text-xs font-medium">Caméra</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-auto flex-col gap-2 rounded-xl bg-white/[0.08] py-4 text-white hover:bg-white/[0.12]"
            onClick={() => toast.message('Galerie : sélection média côté API à venir.')}
          >
            <ImageIcon className="h-6 w-6 text-white/70" />
            <span className="text-xs font-medium">Galerie</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-auto flex-col gap-2 rounded-xl bg-white/[0.08] py-4 text-white hover:bg-white/[0.12]"
            onClick={() => (user?.id ? setTextOpen(true) : navigate(createPageUrl('Landing')))}
          >
            <Type className="h-6 w-6 text-white/70" />
            <span className="text-xs font-medium">Texte</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-auto flex-col gap-2 rounded-xl bg-white/[0.08] py-4 text-white hover:bg-white/[0.12]"
            onClick={() => toast.message('Audience : règles côté serveur à finaliser.')}
          >
            <Users className="h-6 w-6 text-white/70" />
            <span className="text-xs font-medium">Audience</span>
          </Button>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mt-4 w-full rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/15"
          onClick={() => navigate(createPageUrl('Stories'))}
        >
          Ouvrir le fil Stories
        </Button>
      </div>

      <div className="mt-6 space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/38">Visibilité (local)</p>
          <CdcImplBadge tier="api" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="st-all" className="text-[14px] text-white/80">
            Tous mes contacts
          </Label>
          <Switch
            id="st-all"
            checked={prefs.audienceAll}
            onCheckedChange={(v) => setPrefs((p) => ({ ...p, audienceAll: v }))}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="st-hide" className="text-[14px] text-white/80">
            Exclure certains contacts
          </Label>
          <Switch
            id="st-hide"
            checked={prefs.hideFrom}
            onCheckedChange={(v) => setPrefs((p) => ({ ...p, hideFrom: v }))}
            disabled={!prefs.audienceAll}
          />
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/38">Vos stories</p>
          {isLoading ? <CdcImplBadge tier="api" /> : null}
        </div>

        {!user?.id ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-10 text-center">
            <p className="text-[15px] font-medium text-white/55">Connectez-vous</p>
            <p className="mt-2 text-[13px] text-white/38">Pour gérer vos statuts.</p>
          </div>
        ) : null}

        {user?.id && isError ? (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.08] px-4 py-10">
            <p className="text-[14px] text-red-100/90">
              {error?.response?.data?.error?.message || error?.message || 'Chargement impossible'}
            </p>
          </div>
        ) : null}

        {user?.id && !isLoading && !isError && sortedStories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-10 text-center">
            <p className="text-[15px] font-medium text-white/55">Aucune story</p>
            <p className="mt-2 text-[13px] text-white/38">Cliquez sur “Texte” pour publier un statut.</p>
          </div>
        ) : null}

        {user?.id && !isLoading && !isError && sortedStories.length > 0 ? (
          <ul className="space-y-2">
            {sortedStories.map((s) => {
              const isTextSvg =
                s?.media_type === 'image' &&
                typeof s?.media_url === 'string' &&
                s.media_url.startsWith('data:image/svg+xml');
              const when = s?.expires_at
                ? format(new Date(s.expires_at), "d MMM yyyy 'à' HH:mm", { locale: fr })
                : '—';

              const mediaBadge =
                isTextSvg
                  ? 'Texte'
                  : s.media_type === 'image'
                    ? 'Image'
                    : s.media_type === 'video'
                      ? 'Vidéo'
                      : s.media_type;

              const reactionCounts = Array.isArray(s.reactions)
                ? s.reactions.reduce((acc, r) => {
                    const emoji = r?.emoji || '❤️';
                    acc[emoji] = (acc[emoji] || 0) + 1;
                    return acc;
                  }, {})
                : {};

              const topReactions = Object.entries(reactionCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);

              return (
                <li
                  key={s.id}
                  className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3.5"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-white/70">
                    {isTextSvg ? (
                      <Type className="h-5 w-5" />
                    ) : s.media_type === 'image' ? (
                      <ImageIcon className="h-5 w-5" />
                    ) : s.media_type === 'video' ? (
                      <Video className="h-5 w-5" />
                    ) : (
                      <Camera className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-white/90">{mediaBadge}</p>
                    <p className="mt-1 line-clamp-3 text-[13px] text-white/50">
                      {isTextSvg ? 'Texte (statut)' : s.media_type === 'image' ? 'Image' : 'Contenu'}
                    </p>
                    <p className="mt-1 text-[12px] text-orange-200/55">{when}</p>
                    {topReactions.length > 0 ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {topReactions.map(([emoji, count]) => (
                          <span
                            key={emoji}
                            className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2 py-0.5 text-[12px] text-white/70"
                          >
                            <span aria-hidden>{emoji}</span>
                            <span>{count}</span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-white/45 hover:text-rose-300"
                    aria-label="Supprimer la story"
                    onClick={() => deleteMutation.mutate(s.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <Dialog open={textOpen} onOpenChange={setTextOpen}>
        <DialogContent className="border-white/10 bg-[#0c1220] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Nouveau statut texte</DialogTitle>
            <DialogDescription className="text-white/50">
              Création via l’API “Stories” (type `text`). Les médias photo/vidéo restent à raccorder séparément.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={textBody}
            onChange={(e) => setTextBody(e.target.value)}
            placeholder="Votre message…"
            className="border-white/15 bg-white/[0.06] text-white placeholder:text-white/35"
            maxLength={500}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              className="bg-white/10 text-white"
              onClick={() => setTextOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-600"
              onClick={() => createTextMutation.mutate()}
              disabled={createTextMutation.isPending}
            >
              Publier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MessagingCdcShell>
  );
}
