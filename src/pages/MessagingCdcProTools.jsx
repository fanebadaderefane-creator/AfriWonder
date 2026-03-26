import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, MessageSquareText, BarChart2, Webhook, Languages, Wand2, ImagePlus, Bot } from 'lucide-react';
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

export default function MessagingCdcProTools() {
  const navigate = useNavigate();

  return (
    <MessagingCdcShell title="Business et intelligence" subtitle="Outils pro — cahier des charges">
      <CdcCallout variant="warn">
        Alignement type « WhatsApp Business » et assistants : reliez ces blocs au marketplace AfriWonder, aux créateurs et
        aux futurs webhooks temps réel.
      </CdcCallout>

      <CdcSubsectionTitle>Exigences business & IA CDC</CdcSubsectionTitle>
      <CdcRequirementChecklist
        className="mt-2"
        items={[
          { status: 'partial', label: 'Catalogue vendeur et messages structurés : continuité avec Marketplace.' },
          { status: 'server', label: 'Automatisation, stats, webhooks CRM, quotas IA et journal d’usage.' },
          { status: 'ui', label: 'Traduction à la demande dans le fil lorsque le service est disponible.' },
        ]}
      />
      <CdcTierLegend className="mt-3" />

      <CdcSubsectionTitle className="!mt-6">Business</CdcSubsectionTitle>
      <div className="mt-2 space-y-3">
        <CdcFeatureRow
          icon={Store}
          title="Catalogue produits ou services"
          description="Photos, prix, liens — cohérent avec les fiches vendeur et la marketplace."
          tier="partial"
        />
        <CdcFeatureRow
          icon={MessageSquareText}
          title="Messages automatiques"
          description="Accueil, absence, réponses rapides et modèles réutilisables."
          tier="api"
        />
        <CdcFeatureRow
          icon={BarChart2}
          title="Statistiques"
          description="Messages envoyés, lus, clics sur liens — tableaux de bord vendeur."
          tier="api"
        />
        <CdcFeatureRow
          icon={Webhook}
          title="API et CRM"
          description="Notifications transactionnelles et intégrations tierces."
          tier="api"
        />
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          className="flex-1 rounded-xl bg-white/[0.08] text-white hover:bg-white/[0.12]"
          onClick={() => navigate(createPageUrl('SellerDashboard'))}
        >
          Espace vendeur
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1 rounded-xl bg-white/[0.08] text-white hover:bg-white/[0.12]"
          onClick={() => navigate(createPageUrl('Marketplace'))}
        >
          Marketplace
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1 rounded-xl bg-white/[0.08] text-white hover:bg-white/[0.12]"
          onClick={() => navigate(createPageUrl('CreatorTools'))}
        >
          Outils créateur
        </Button>
      </div>

      <CdcSubsectionTitle className="!mt-8">Intelligence artificielle</CdcSubsectionTitle>
      <div className="mt-2 space-y-3">
        <CdcFeatureRow
          icon={Languages}
          title="Traduction dans le fil"
          description="Bouton Traduire dans le chat privé lorsque le service est disponible."
          tier="partial"
        />
        <CdcFeatureRow
          icon={Wand2}
          title="Résumé des non lus"
          description="Agrégation multi-conversations et synthèse — service à brancher."
          tier="api"
        />
        <CdcFeatureRow
          icon={ImagePlus}
          title="Génération d’images et assistant"
          description="Politique modèle, quotas et journal d’usage — gouvernance produit."
          tier="api"
        />
        <CdcFeatureRow
          icon={Bot}
          title="Assistant conversationnel (opt-in)"
          description="Réponses suggérées dans le compositeur ; jamais sans consentement explicite."
          tier="api"
        />
      </div>

      <Button
        type="button"
        className="mt-8 w-full rounded-2xl bg-white/[0.08] py-5 text-white hover:bg-white/[0.12]"
        onClick={() => navigate(createPageUrl('Inbox'))}
      >
        Retour aux messages
      </Button>
    </MessagingCdcShell>
  );
}
