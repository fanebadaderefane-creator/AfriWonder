import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Pin, Palette, Music, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { createPageUrl } from '@/utils';
import MessagingCdcShell from '@/components/messaging/MessagingCdcShell';
import {
  CdcCallout,
  CdcFeatureRow,
  CdcSubsectionTitle,
  CdcRequirementChecklist,
  CdcTierLegend,
} from '@/components/messaging/MessagingCdcUi';

const COMPARE = [
  { label: 'Thèmes & accents étendus', free: false, plus: true },
  { label: 'Épingles conversations', free: '3', plus: '20' },
  { label: 'Sonneries par contact', free: false, plus: true },
  { label: 'Badge « Plus » visible', free: false, plus: true },
];

export default function MessagingCdcPremium() {
  const navigate = useNavigate();
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <MessagingCdcShell title="AfriWonder Plus" subtitle="Abonnement premium — cahier des charges">
      <CdcCallout variant="warn">
        Écran produit CDC : aucun paiement n’est traité ici. Le bouton « S’abonner » ouvre la feuille de route
        monétisation ; l’activation réelle suivra le billing backend.
      </CdcCallout>

      <CdcSubsectionTitle>Exigences offre Plus (CDC)</CdcSubsectionTitle>
      <CdcRequirementChecklist
        className="mt-2"
        items={[
          { status: 'ui', label: 'Parcours et contenus d’upsell cohérents avec Réglages / hub CDC.' },
          { status: 'server', label: 'Passerelle paiement (Mobile Money, carte, stores) et droits feature flags.' },
          { status: 'partial', label: 'Thèmes, packs sonneries, limites épingles : appliquer côté client après achat.' },
        ]}
      />
      <CdcTierLegend className="mt-3" />

      <CdcSubsectionTitle className="!mt-6">Grille gratuite / Plus</CdcSubsectionTitle>
      <div className="mt-2 overflow-hidden rounded-2xl border border-white/[0.08]">
        <div className="grid grid-cols-[1fr_0.85fr_0.85fr] gap-px bg-white/[0.08] text-[12px] font-medium text-white/88">
          <div className="bg-[#0a1018] px-3 py-2.5">Fonctionnalité</div>
          <div className="bg-[#0a1018] px-2 py-2.5 text-center">Gratuit</div>
          <div className="bg-[#0a1018] px-2 py-2.5 text-center text-amber-200/90">Plus</div>
        </div>
        {COMPARE.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_0.85fr_0.85fr] gap-px border-t border-white/[0.06] bg-white/[0.03] text-[13px]"
          >
            <div className="px-3 py-2.5 text-white/75">{row.label}</div>
            <div className="flex items-center justify-center px-2 py-2.5 text-white/45">
              {row.free === true ? (
                <Check className="h-4 w-4 text-emerald-400/90" />
              ) : row.free === false ? (
                '—'
              ) : (
                row.free
              )}
            </div>
            <div className="flex items-center justify-center px-2 py-2.5 text-amber-100/85">
              {row.plus === true ? <Check className="h-4 w-4 text-amber-300" /> : row.plus}
            </div>
          </div>
        ))}
      </div>

      <CdcSubsectionTitle className="!mt-6">Détail marketing CDC</CdcSubsectionTitle>
      <ul className="mt-2 space-y-3">
        <li>
          <CdcFeatureRow
            icon={Palette}
            title="Thèmes et icônes d’application"
            description="Jusqu’à 14 icônes et 19 couleurs d’accent selon le CDC commercial de référence."
            tier="api"
          />
        </li>
        <li>
          <CdcFeatureRow
            icon={Pin}
            title="Épingles étendues"
            description="Trois épingles gratuites, jusqu’à vingt avec abonnement."
            tier="api"
          />
        </li>
        <li>
          <CdcFeatureRow
            icon={Music}
            title="Sonneries par contact"
            description="Packs de sonneries supplémentaires et attribution par conversation."
            tier="api"
          />
        </li>
        <li>
          <CdcFeatureRow
            icon={Crown}
            title="Badge et avantages"
            description="Visibilité du statut « Plus » et avantages marketplace à définir avec l’équipe produit."
            tier="api"
          />
        </li>
      </ul>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="flex-1 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 py-6 text-white shadow-lg shadow-orange-900/30 hover:from-amber-500 hover:to-orange-500"
          onClick={() => setInfoOpen(true)}
        >
          <Crown className="mr-2 inline h-5 w-5" />
          S’abonner
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1 rounded-2xl border border-white/12 bg-white/[0.07] py-6 text-white hover:bg-white/[0.1]"
          onClick={() => navigate(createPageUrl('MessagingCdcCustomize'))}
        >
          Apparence (démo locale)
        </Button>
      </div>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="border-white/10 bg-[#0c1220] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Abonnement</DialogTitle>
            <DialogDescription className="text-white/55">
              L’intégration paiement (Mobile Money, carte, stores) et l’activation des fonctionnalités premium seront
              réalisées en phase backend et billing. Cet écran valide le contenu et le parcours CDC côté interface.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" className="w-full bg-white text-slate-900 hover:bg-white/90" onClick={() => setInfoOpen(false)}>
              Compris
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MessagingCdcShell>
  );
}
