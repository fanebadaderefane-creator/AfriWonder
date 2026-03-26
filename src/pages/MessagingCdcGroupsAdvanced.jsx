import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AtSign, BarChart2, Calendar, Pin, History, Link2, Tag, Phone } from 'lucide-react';
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
    icon: Users,
    title: 'Jusqu’à 1024 membres',
    description: 'Limite cible CDC ; effectif réel contrôlé à la création et aux invitations.',
    tier: 'partial',
  },
  {
    icon: Tag,
    title: 'Libellé à côté du nom dans le groupe',
    description: 'Exemple « Parent », « Admin » : disponible dans le chat de groupe.',
    tier: 'app',
  },
  {
    icon: AtSign,
    title: 'Mentions',
    description: 'Notifications lorsque quelqu’un vous mentionne dans le fil.',
    tier: 'app',
  },
  {
    icon: BarChart2,
    title: 'Sondages',
    description: 'Création et vote depuis le compositeur de groupe.',
    tier: 'app',
  },
  {
    icon: Calendar,
    title: 'Événements et rappels',
    description: 'Partage d’événement dans le fil ; rappels personnalisés côté serveur à étendre.',
    tier: 'partial',
  },
  {
    icon: Pin,
    title: 'Message épinglé',
    description: 'Visible en tête du groupe depuis les infos du groupe.',
    tier: 'app',
  },
  {
    icon: History,
    title: 'Historique pour nouveaux membres',
    description: 'Envoi des derniers messages (25 à 100) : réglage par groupe, à activer en API.',
    tier: 'api',
  },
  {
    icon: Link2,
    title: 'Lien d’invitation et rôle',
    description: 'Génération, partage et révocation depuis les paramètres du groupe.',
    tier: 'app',
  },
];

export default function MessagingCdcGroupsAdvanced() {
  const navigate = useNavigate();

  return (
    <MessagingCdcShell title="Groupes avancés" subtitle="Fonctionnalités groupe — cahier des charges">
      <CdcCallout variant="info">
        Tout le parcours groupe « riche » (sondages, épingles, invitations, transfert limité) est utilisable depuis
        l’app ; ce tableau rappelle le cadrage CDC et ce qui reste côté serveur.
      </CdcCallout>

      <CdcSubsectionTitle>Exigences groupe CDC</CdcSubsectionTitle>
      <CdcRequirementChecklist
        className="mt-2"
        items={[
          { status: 'ui', label: 'Création, membres, admin, sondage, événement, épinglage, transfert avec limite.' },
          { status: 'partial', label: 'Historique à l’arrivée, rappels événements : paramètres groupe + API.' },
          { status: 'server', label: 'Audit modération, quotas fichiers groupe, export planifié serveur.' },
        ]}
      />
      <CdcTierLegend className="mt-3" />

      <CdcSubsectionTitle className="!mt-5">Accès rapide</CdcSubsectionTitle>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="flex-1 rounded-xl bg-emerald-600/90 text-white hover:bg-emerald-600"
          onClick={() => navigate(createPageUrl('Inbox'))}
        >
          Ouvrir mes groupes
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1 rounded-xl border border-white/12 bg-white/[0.07] text-white hover:bg-white/[0.1]"
          onClick={() => navigate(createPageUrl('GroupCallLobby'))}
        >
          <Phone className="mr-2 h-4 w-4" />
          Appel groupe
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1 rounded-xl border border-white/12 bg-white/[0.07] text-white hover:bg-white/[0.1]"
          onClick={() => navigate(createPageUrl('MessagingCdcModeration'))}
        >
          Modération CDC
        </Button>
      </div>

      <CdcSubsectionTitle className="!mt-6">Fonctionnalités</CdcSubsectionTitle>
      <div className="mt-2 space-y-3">
        {features.map((f) => (
          <CdcFeatureRow key={f.title} {...f} />
        ))}
      </div>

      <CdcCallout variant="neutral" className="mt-5">
        Permissions fines (qui modifie les infos, qui envoie) : à enrichir dans l’écran d’informations du groupe, en
        parallèle des endpoints dédiés.
      </CdcCallout>
    </MessagingCdcShell>
  );
}
