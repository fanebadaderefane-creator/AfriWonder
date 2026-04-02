/**
 * Roadmap audit AfriWonder (pages 16–17 — Rapport 2026-04-01).
 * Source unique exposée via GET /api/platform/config → data.audit_roadmap
 *
 * IMPORTANT : ce tableau est le **cahier des charges** du rapport d’audit, pas un bilan « tout est livré ».
 * Statut réel par point : docs/AUDIT_ALIGNMENT_STATUS_2026-04-01.md (charte d’honnêteté).
 */
/** Hébergement API cible audit — Render uniquement (pas Railway). */
export const AUDIT_BACKEND_HOSTING = 'render' as const;

/** Même nom de variable Prisma en local et sur Render : DATABASE_URL. */
export const AUDIT_DATABASE_ENV_VAR = 'DATABASE_URL' as const;

/** Message pour éviter toute confusion API / produit. */
export const AUDIT_ROADMAP_DISCLAIMER_FR =
  'Liste des exigences du rapport d’audit (pages 16–17). Ce n’est pas un bilan de complétion : chaque point doit être validé séparément. ' +
  'Backend cible : Render. Base Prisma/Postgres : variable DATABASE_URL (identique dans backend/.env et sur Render). ' +
  'Voir docs/AUDIT_ALIGNMENT_STATUS_2026-04-01.md pour le statut factuel.';

export const AUDIT_ROADMAP_2026 = {
  title: 'Roadmap de développement',
  reference: 'AfriWonder Audit Complet & Business Plan — CONFIDENTIEL (2026-04-01)',
  phases: [
    {
      id: 1,
      name: 'Fondation',
      items: [
        'Nettoyage complet du repository',
        'Migration vers Supabase (DB + Auth + Storage)',
        'Déploiement backend sur Render avec CI/CD',
        'Sécurisation : Doppler, GitHub Secret Scanning, rate limiting',
        'Création du design system Figma AfriWonder',
        'Fichiers .env.example créés et documentés',
        'Tests de charge : API cible 1000 req/s',
      ],
    },
    {
      id: 2,
      name: 'MVP Vidéo + Marketplace',
      items: [
        'Feed vidéo vertical (TikTok-like) — fonctionnalité centrale',
        'Upload vidéo chunked vers Cloudflare R2',
        'Live streaming avec Agora (intégration existante à finaliser)',
        'Marketplace : produits, panier, checkout',
        'Intégration Orange Money + Wave (Sénégal, Côte d’Ivoire, Mali)',
        'PWA finalisée et déployée sur afri-wonder.app',
        'Beta test avec 500 utilisateurs sélectionnés',
      ],
    },
    {
      id: 3,
      name: 'Flutter + Lancement',
      items: [
        'Application Flutter (iOS + Android) — architecture Riverpod',
        'Soumission App Store + Google Play',
        'Système de notifications push (Firebase)',
        'Mode offline first avec Hive',
        'Optimisation performance (Lighthouse > 90)',
        'Lancement marketing dans 3 pays pilotes',
        'Recrutement des 100 premiers créateurs partenaires',
      ],
    },
    {
      id: 4,
      name: 'Croissance',
      items: [
        'Gamification complète (badges, points, leaderboard)',
        'Système de recommandation IA (TensorFlow.js ou API Python)',
        'Expansion paiements : MTN Mobile Money, Stripe Afrique',
        'Télémedecine (priorité 2 après vidéo + marketplace)',
        'Programme AfriWonder for Business (B2B SDK)',
        'Levée de fonds Seed ($500K - $2M cible)',
      ],
    },
  ],
} as const;
