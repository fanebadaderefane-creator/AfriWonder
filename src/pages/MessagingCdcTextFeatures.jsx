import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Type, EyeOff, Reply, Pencil, Trash2, Clock, Smile, Timer, FileEdit, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import MessagingCdcShell from '@/components/messaging/MessagingCdcShell';
import {
  CdcCallout,
  CdcFeatureRow,
  CdcSubsectionTitle,
  CdcRequirementChecklist,
  CdcTierLegend,
} from '@/components/messaging/MessagingCdcUi';

const features = [
  {
    icon: Type,
    title: 'Formatage',
    description: 'Gras, italique, barré, monospace via le parseur dans les conversations.',
    tier: 'app',
  },
  {
    icon: EyeOff,
    title: 'Spoiler',
    description: 'Délimiteurs type masquage : appui pour révéler le texte.',
    tier: 'app',
  },
  {
    icon: Reply,
    title: 'Réponse et citation',
    description: 'Fil de réponse dans le chat privé et le chat de groupe.',
    tier: 'app',
  },
  {
    icon: Pencil,
    title: 'Édition (fenêtre 15 min)',
    description: 'Texte modifiable avec mention « modifié » selon les règles métier.',
    tier: 'app',
  },
  {
    icon: Trash2,
    title: 'Supprimer pour moi ou pour tous',
    description: 'Délais et permissions selon le type de conversation.',
    tier: 'partial',
  },
  {
    icon: Clock,
    title: 'Messages programmés',
    description: 'Minuteur dans le compositeur ; liste centralisée dans le hub CDC.',
    tier: 'app',
  },
  {
    icon: Smile,
    title: 'Réactions emoji',
    description: 'Réactions sur les messages ; détail et animations sur certains emojis.',
    tier: 'app',
  },
  {
    icon: FileEdit,
    title: 'Brouillons synchronisés',
    description: 'Brouillon par conversation côté serveur pour le chat ouvert.',
    tier: 'partial',
  },
  {
    icon: Timer,
    title: 'Messages éphémères',
    description: 'Durées 24 h, 7 j ou 90 j par conversation ; disparition automatique après lecture.',
    tier: 'partial',
  },
];

export function MessagingCdcTextFeaturesPanel() {
  const navigate = useNavigate();
  const [spoilerOpen, setSpoilerOpen] = useState(false);

  return (
    <MessagingCdcShell title="Texte et interactions" subtitle="Messages — cahier des charges">
      <CdcCallout variant="info">
        Synthèse des interactions message du CDC : repères produit, liens vers l’app réelle et démo locale du spoiler.
      </CdcCallout>

      <CdcSubsectionTitle>Périmètre & exigences</CdcSubsectionTitle>
      <CdcRequirementChecklist
        className="mt-2"
        items={[
          { status: 'ui', label: 'Compositeur, réponses, réactions et édition limitée dans Chat / GroupChat.' },
          { status: 'ui', label: 'Liste centralisée des envois programmés (écran Messages programmés).' },
          { status: 'partial', label: 'Éphémère par conversation, brouillon multi-appareil : finitions + API.' },
          { status: 'server', label: 'Politique de rétention et accusés croisés : règles serveur finales.' },
        ]}
      />
      <CdcTierLegend className="mt-3" />

      <CdcSubsectionTitle className="!mt-6">Démo spoiler (local)</CdcSubsectionTitle>
      <button
        type="button"
        onClick={() => setSpoilerOpen((v) => !v)}
        className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.07] [touch-action:manipulation]"
      >
        <div className="flex items-center gap-2 text-[12px] font-medium text-white/55">
          <EyeOff className="h-4 w-4 text-violet-300/80" />
          Zone spoiler — appuyer pour révéler
        </div>
        {spoilerOpen ? (
          <p className="mt-2 text-[14px] leading-relaxed text-white/88">
            Ceci imite le contenu masqué du CDC. Dans l’app, le parseur conversationnel applique la même idée sur le fil
            réel.
          </p>
        ) : (
          <p className="mt-2 h-10 rounded-lg bg-black/35 text-[12px] text-white/25">&nbsp;</p>
        )}
      </button>

      <CdcSubsectionTitle className="!mt-6">Raccourcis produit</CdcSubsectionTitle>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="flex-1 rounded-xl bg-emerald-600/90 text-white hover:bg-emerald-600"
          onClick={() => navigate(createPageUrl('Inbox'))}
        >
          Ouvrir Messages
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1 rounded-xl border border-white/12 bg-white/[0.07] text-white hover:bg-white/[0.1]"
          onClick={() => navigate(createPageUrl('MessagingCdcScheduled'))}
        >
          Messages programmés
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1 rounded-xl border border-white/12 bg-white/[0.07] text-white hover:bg-white/[0.1]"
          onClick={() => navigate(createPageUrl('MessagingCdcPrivacy'))}
        >
          Confidentialité
        </Button>
      </div>

      <CdcSubsectionTitle className="!mt-6">Fonctionnalités détaillées</CdcSubsectionTitle>
      <div className="mt-2 space-y-3">
        {features.map((f) => (
          <CdcFeatureRow key={f.title} {...f} />
        ))}
      </div>

      <CdcCallout variant="neutral" className="mt-5">
        <span className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-white/50" />
          Les réglages par défaut (éphémère, accusés) suivent les écrans Confidentialité CDC et Réglages compte une fois
          les endpoints finalisés.
        </span>
      </CdcCallout>
    </MessagingCdcShell>
  );
}

export default function MessagingCdcTextFeatures() {
  return <Navigate to={`${createPageUrl('MessagingCdcHub')}?section=text-features`} replace />;
}
