import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { KeyRound, Mail, Lock, Cloud, Fingerprint, HelpCircle } from 'lucide-react';
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

const blocks = [
  {
    icon: KeyRound,
    title: 'Vérification en deux étapes',
    description: 'Code SMS ou application d’authentification pour les connexions sensibles.',
    tier: 'partial',
  },
  {
    icon: Mail,
    title: 'E-mail et récupération',
    description: 'Réinitialisation du mot de passe et alertes de connexion inhabituelle.',
    tier: 'partial',
  },
  {
    icon: Lock,
    title: 'Mot de passe du compte',
    description: 'Distinct d’un éventuel code PIN applicatif ; politique de force du mot de passe.',
    tier: 'app',
  },
  {
    icon: Cloud,
    title: 'Sauvegardes cloud chiffrées',
    description: 'Archive messagerie protégée par mot de passe dédié ; chiffrement bout en bout ou enveloppes.',
    tier: 'api',
  },
  {
    icon: Fingerprint,
    title: 'Verrouillage des conversations',
    description: 'Biométrie ou code pour rouvrir certains fils : surtout pertinent sur appareils natifs.',
    tier: 'api',
  },
];

export function MessagingCdcSecurityAccountPanel() {
  const navigate = useNavigate();

  return (
    <MessagingCdcShell title="Sécurité du compte" subtitle="Authentification et sauvegardes — cahier des charges">
      <CdcCallout variant="warn">
        Synthèse CDC : reliez ces sujets aux écrans Réglages et confidentialité déjà présents dans l’app. La 2FA et les
        sauvegardes messagerie suivront les endpoints dédiés.
      </CdcCallout>

      <CdcSubsectionTitle>Exigences sécurité CDC</CdcSubsectionTitle>
      <CdcRequirementChecklist
        className="mt-2"
        items={[
          { status: 'ui', label: 'Mot de passe, session, déconnexion : flux compte existant (Réglages).' },
          { status: 'partial', label: '2FA, alertes e-mail, récupération : parcours à homogénéiser.' },
          { status: 'server', label: 'Sauvegarde chiffrée messagerie, verrouillage par conversation, clés E2EE.' },
        ]}
      />
      <CdcTierLegend className="mt-3" />

      <CdcSubsectionTitle className="!mt-6">Périmètre détaillé</CdcSubsectionTitle>
      <div className="mt-2 space-y-3">
        {blocks.map((b) => (
          <CdcFeatureRow key={b.title} {...b} />
        ))}
      </div>

      <CdcSubsectionTitle className="!mt-6">Raccourcis</CdcSubsectionTitle>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          className="flex-1 rounded-xl bg-white/[0.08] text-white hover:bg-white/[0.12]"
          onClick={() => navigate(createPageUrl('Settings'))}
        >
          Réglages
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1 rounded-xl bg-white/[0.08] text-white hover:bg-white/[0.12]"
          onClick={() => navigate(createPageUrl('PrivacySettings'))}
        >
          Confidentialité et cookies
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1 rounded-xl bg-white/[0.08] text-white hover:bg-white/[0.12]"
          onClick={() => navigate(createPageUrl('Help'))}
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          Aide
        </Button>
      </div>
    </MessagingCdcShell>
  );
}

export default function MessagingCdcSecurityAccount() {
  return <Navigate to={`${createPageUrl('MessagingCdcHub')}?section=security-account`} replace />;
}
