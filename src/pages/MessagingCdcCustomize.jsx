import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Pin, Image as ImageIcon, Droplet, Check, MessageCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import MessagingCdcShell from '@/components/messaging/MessagingCdcShell';
import { CdcCallout, useCdcPersistedJson } from '@/components/messaging/MessagingCdcUi';

const ACCENTS = [
  { id: 'emerald', class: 'bg-emerald-500' },
  { id: 'sky', class: 'bg-sky-500' },
  { id: 'violet', class: 'bg-violet-500' },
  { id: 'rose', class: 'bg-rose-500' },
  { id: 'amber', class: 'bg-amber-500' },
  { id: 'slate', class: 'bg-slate-400' },
];

const WALLPAPERS = [
  { id: 'none', label: 'Par défaut', bg: 'bg-[#070a12]' },
  { id: 'mesh1', label: 'Voile vert', bg: 'bg-gradient-to-br from-emerald-950/80 via-[#070a12] to-slate-950' },
  { id: 'mesh2', label: 'Bleu nuit', bg: 'bg-gradient-to-br from-sky-950/70 via-[#070a12] to-indigo-950/80' },
  { id: 'mesh3', label: 'Violet', bg: 'bg-gradient-to-tr from-violet-950/70 via-[#0a0a14] to-fuchsia-950/50' },
  { id: 'noise', label: 'Grain léger', bg: 'bg-[#070a12] bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.06),_transparent_50%)]' },
  { id: 'warm', label: 'Ambre doux', bg: 'bg-gradient-to-b from-amber-950/40 via-[#070a12] to-[#050913]' },
];

export function MessagingCdcCustomizePanel() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useCdcPersistedJson('customize_prefs', {
    accent: 'emerald',
    wallpaper: 'none',
  });
  const [wallOpen, setWallOpen] = useState(false);
  const pinsMax = 3;

  const selectWall = (id) => {
    setPrefs((p) => ({ ...p, wallpaper: id }));
    setWallOpen(false);
    toast.success('Fond enregistré pour cette maquette');
  };

  return (
    <MessagingCdcShell title="Apparence" subtitle="Fonds, couleurs, épingles — cahier des charges">
      <CdcCallout variant="info">
        Accent et fond choisis ici sont mémorisés sur cet appareil pour valider l’UX. Application par conversation et
        sync multi-appareils : phase backend.
      </CdcCallout>

      <CdcSubsectionTitle>Exigences personnalisation CDC</CdcSubsectionTitle>
      <CdcRequirementChecklist
        className="mt-2"
        items={[
          { status: 'ui', label: 'Choix visuels locaux (accent, fond) pour prototype et tests UX.' },
          { status: 'partial', label: 'Thèmes par conversation dans Chat : à brancher sur préférences persistées.' },
          { status: 'server', label: 'Sync multi-appareils, packs premium, sonneries par contact.' },
        ]}
      />
      <CdcTierLegend className="mt-3" />

      <Button
        type="button"
        variant="secondary"
        className="mt-4 w-full rounded-xl border border-white/12 bg-white/[0.07] text-white hover:bg-white/[0.1]"
        onClick={() => navigate(createPageUrl('Inbox'))}
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        Voir les conversations
      </Button>

      <CdcSubsectionTitle className="!mt-6">Couleur d’accent (démo)</CdcSubsectionTitle>
      <div className="mt-2 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white/38">
          <Droplet className="h-4 w-4" />
          Palette
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-label={`Accent ${a.id}`}
              className={`relative h-10 w-10 rounded-full ring-2 ring-offset-2 ring-offset-[#070a12] transition ${
                prefs.accent === a.id ? 'ring-white' : 'ring-transparent opacity-85 hover:opacity-100'
              } ${a.class}`}
              onClick={() => setPrefs((p) => ({ ...p, accent: a.id }))}
            >
              {prefs.accent === a.id ? (
                <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <CdcSubsectionTitle className="!mt-5">Fond d’écran (aperçu)</CdcSubsectionTitle>
      <div className="mt-2 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white/38">
          <ImageIcon className="h-4 w-4" />
          Bibliothèque
        </div>
        <p className="mt-2 text-[13px] text-white/45">
          Sélection actuelle : {WALLPAPERS.find((w) => w.id === prefs.wallpaper)?.label || '—'}
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-3 rounded-xl bg-white/10 text-white hover:bg-white/[0.14]"
          onClick={() => setWallOpen(true)}
        >
          Choisir un fond
        </Button>
        <div
          className={`mt-4 h-24 w-full overflow-hidden rounded-xl border border-white/10 ${WALLPAPERS.find((w) => w.id === prefs.wallpaper)?.bg || 'bg-[#070a12]'}`}
        />
      </div>

      <CdcSubsectionTitle className="!mt-5">Épingles</CdcSubsectionTitle>
      <div className="mt-2 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
        <div className="flex items-center gap-2">
          <Pin className="h-4 w-4 text-amber-300/90" />
          <Label className="text-[14px] text-white/88">Conversations épinglées</Label>
        </div>
        <p className="mt-2 text-[13px] text-white/45">
          Offre gratuite : jusqu’à {pinsMax} épingles (CDC). Offre étendue : jusqu’à 20 avec abonnement — règles côté
          serveur.
        </p>
        <p className="mt-3 text-[12px] text-white/35">
          Épinglage depuis la liste Messages (geste long ou menu) une fois le flux unifié.
        </p>
      </div>

      <Dialog open={wallOpen} onOpenChange={setWallOpen}>
        <DialogContent className="border-white/10 bg-[#0c1220] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Fonds d’écran</DialogTitle>
            <DialogDescription className="text-white/50">
              Choix enregistré localement pour cette maquette CDC.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {WALLPAPERS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => selectWall(w.id)}
                className={`flex flex-col overflow-hidden rounded-xl border text-left transition ${
                  prefs.wallpaper === w.id ? 'border-white/50 ring-1 ring-white/30' : 'border-white/10 hover:border-white/25'
                }`}
              >
                <div className={`h-16 w-full ${w.bg}`} />
                <span className="bg-black/50 px-2 py-1.5 text-[12px] text-white/85">{w.label}</span>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" className="bg-white/10 text-white" onClick={() => setWallOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MessagingCdcShell>
  );
}

export default function MessagingCdcCustomize() {
  return <Navigate to={`${createPageUrl('MessagingCdcHub')}?section=customize`} replace />;
}
