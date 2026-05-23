/**
 * Statuts d’implémentation par domaine (copy écran À propos).
 * La validation automatique des 7 axes super-app : `validateSuperApp()` dans `src/product/featureMatrix.ts`.
 */

export type CapabilityShipLevel = 'shipped' | 'partial' | 'depends_on_deployment' | 'ongoing';

export type ProductCapabilityPillar = {
  id: string;
  level: CapabilityShipLevel;
  labelFr: string;
  detailFr: string;
  /** Chemins relatifs repo (audit rapide). */
  codeRefs: readonly string[];
};

/** Niveau → libellé court pour UI. */
export const capabilityLevelLabelFr: Record<CapabilityShipLevel, string> = {
  shipped: 'Disponible',
  partial: 'Partiel',
  depends_on_deployment: 'Selon configuration serveur',
  ongoing: 'En renforcement',
};

/** Domaines couverts par l’app (ids utilisés par `competitiveMatrix`). */
export const PRODUCT_CAPABILITY_PILLARS: readonly ProductCapabilityPillar[] = [
  {
    id: 'social',
    level: 'shipped',
    labelFr: 'Réseau social & vidéo',
    detailFr:
      'Feed vertical, profils, abonnements, création de contenu — implémenté dans le client et l’API.',
    codeRefs: ['frontend/app/(tabs)/index.tsx', 'backend/prisma/schema.prisma (Follow, Video, …)'],
  },
  {
    id: 'marketplace',
    level: 'shipped',
    labelFr: 'Marketplace',
    detailFr: 'Catalogue, panier et commandes branchés sur l’API ; le catalogue réel dépend des vendeurs et données.',
    codeRefs: ['frontend/app/(tabs)/market.tsx', 'frontend/app/cart/index.tsx'],
  },
  {
    id: 'mobile_money',
    level: 'shipped',
    labelFr: 'Paiement mobile (Orange Money, Wave, portefeuille)',
    detailFr:
      'Flux checkout + API (Orange Money, Wave, portefeuille) dans l’app ; l’exploitation en prod suit la configuration des clés et partenaires.',
    codeRefs: ['backend/src/routes/payments.routes.ts', 'frontend/app/cart/index.tsx'],
  },
  {
    id: 'messaging',
    level: 'shipped',
    labelFr: 'Messagerie',
    detailFr:
      'Conversations, groupes, médias et temps réel côté API + clients ; améliorations continues sur certains écrans natifs (QA).',
    codeRefs: ['backend/src/routes/messages.routes.ts', 'frontend/app/messages'],
  },
  {
    id: 'low_bandwidth',
    level: 'shipped',
    labelFr: 'Optimisation réseaux faibles',
    detailFr:
      'Détection 2G/3G / data saver (NetInfo + profil), fenêtres de rendu réduites sur le feed, cache images (expo-image), compression HTTP côté API.',
    codeRefs: [
      'frontend/src/dataSaver/DataSaverContext.tsx',
      'frontend/app/(tabs)/index.tsx (FlashList drawDistance, scroll batch)',
      'frontend/src/components/CreatorAvatar.tsx',
      'backend/src/app.ts (compression)',
    ],
  },
  {
    id: 'africa_product',
    level: 'shipped',
    labelFr: 'Adaptation Afrique de l’Ouest',
    detailFr: 'FCFA, français, parcours mobile money et documentation cible Mali / région.',
    codeRefs: ['AGENTS.md', 'frontend/src/config/featureFlags.ts'],
  },
  {
    id: 'open_engineering',
    level: 'shipped',
    labelFr: 'Ingénierie inspectable',
    detailFr: 'Dépôt versionné, CI, politique de sécurité documentée (revue de code, pas certification tierce).',
    codeRefs: ['docs/SECURITY.md', '.github/workflows/ci.yml'],
  },
] as const;
