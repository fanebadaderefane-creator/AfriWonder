import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Image, Video, FileStack, Sticker, MapPin, Contact, Gauge, HardDrive, Zap } from 'lucide-react';
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

const items = [
  {
    icon: Image,
    title: 'Photos',
    description:
      'Compression automatique et option qualité HD dans le flux d’envoi. Afficher clairement le choix qualité avant envoi.',
    tier: 'partial',
  },
  {
    icon: Video,
    title: 'Vidéos et documents lourds',
    description: 'Plafond configurable côté serveur (variables d’upload). Message d’erreur explicite si dépassement.',
    tier: 'partial',
  },
  {
    icon: FileStack,
    title: 'PDF, bureautique, archives',
    description: 'Sélecteur de fichiers dans les conversations privées et de groupe.',
    tier: 'app',
  },
  {
    icon: Sticker,
    title: 'GIF et stickers',
    description:
      'GIF via clé GIPHY si configurée ; stickers animés ou texte : parcours magasin à finaliser dans l’UI.',
    tier: 'partial',
  },
  {
    icon: MapPin,
    title: 'Localisation',
    description: 'Position statique dans le fil ; partage en temps réel (carte + socket) prévu en phase API.',
    tier: 'partial',
  },
  {
    icon: Contact,
    title: 'Carte de contact',
    description: 'Fiche structurée (vCard) : prévisualisation avant envoi et réception.',
    tier: 'api',
  },
  {
    icon: Gauge,
    title: 'Vitesse de lecture vocale',
    description: 'Contrôles ×1, ×1,5, ×2 sur les messages vocaux dans le chat.',
    tier: 'app',
  },
];

export function MessagingCdcMediaAndSharePanel() {
  const navigate = useNavigate();

  return (
    <MessagingCdcShell title="Médias et partage" subtitle="Pièces jointes — cahier des charges">
      <CdcCallout variant="info">
        Tableau de couverture CDC : ce qui est déjà dans l’application, ce qui est partiel, et ce qui dépend de l’API ou
        de finitions UI.
      </CdcCallout>

      <CdcSubsectionTitle>Cibles techniques (référence CDC)</CdcSubsectionTitle>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <div className="flex gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3.5">
          <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-sky-300/80" />
          <div>
            <p className="text-[12px] font-medium text-white/88">Taille max</p>
            <p className="mt-1 text-[12px] text-white/45">Documents jusqu’à ~2 Go (serveur / client à aligner).</p>
          </div>
        </div>
        <div className="flex gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3.5">
          <Zap className="mt-0.5 h-5 w-5 shrink-0 text-amber-300/80" />
          <div>
            <p className="text-[12px] font-medium text-white/88">Progression</p>
            <p className="mt-1 text-[12px] text-white/45">Barre d’upload et reprise si réseau instable (Afrique).</p>
          </div>
        </div>
        <div className="flex gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3.5 sm:col-span-1">
          <Image className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300/80" />
          <div>
            <p className="text-[12px] font-medium text-white/88">Prévisualisation</p>
            <p className="mt-1 text-[12px] text-white/45">Galerie, PDF première page, audio waveform.</p>
          </div>
        </div>
      </div>

      <CdcSubsectionTitle className="!mt-6">Exigences</CdcSubsectionTitle>
      <CdcRequirementChecklist
        className="mt-2"
        items={[
          { status: 'ui', label: 'Envoi fichier / média depuis Chat et GroupChat avec feedback utilisateur.' },
          { status: 'partial', label: 'GIF, localisation live, HD explicite : à finaliser côté UI et config.' },
          { status: 'server', label: 'Quotas, antivirus, transcodage vidéo : pipeline backend.' },
        ]}
      />
      <CdcTierLegend className="mt-3" />

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          className="flex-1 rounded-xl border border-white/12 bg-white/[0.07] text-white hover:bg-white/[0.1]"
          onClick={() => navigate(createPageUrl('Inbox'))}
        >
          Tester depuis Messages
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1 rounded-xl border border-white/12 bg-white/[0.07] text-white hover:bg-white/[0.1]"
          onClick={() => navigate(createPageUrl('Create'))}
        >
          Créer du contenu
        </Button>
      </div>

      <CdcSubsectionTitle className="!mt-6">Fonctionnalités</CdcSubsectionTitle>
      <ul className="mt-2 space-y-3">
        {items.map((item) => (
          <li key={item.title}>
            <CdcFeatureRow {...item} />
          </li>
        ))}
      </ul>
    </MessagingCdcShell>
  );
}

export default function MessagingCdcMediaAndShare() {
  return <Navigate to={`${createPageUrl('MessagingCdcHub')}?section=media-share`} replace />;
}
