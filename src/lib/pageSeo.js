/**
 * Titres et descriptions par écran (SPA). Complété par des pages dynamiques
 * (ArticleDetails, Product) qui appellent applyPageMetaTags avec les données API.
 */

const DEFAULT_DESCRIPTION =
  "AfriWonder — super-app africaine : vidéo, marketplace, actualités et services. Optimisée pour les faibles débits et les paiements mobiles.";

/** Découpe CamelCase en mots pour un titre lisible (fallback). */
export function humanizePageKey(key) {
  if (!key) return 'AfriWonder';
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .trim();
}

/**
 * Surcharges pour les pages les plus importantes (SEO + partage social).
 * Les autres pages utilisent humanizePageKey + template.
 */
export const PAGE_SEO_OVERRIDES = {
  Home: {
    title: 'Accueil — Fil vidéo | AfriWonder',
    description:
      'Découvrez le fil vidéo AfriWonder : créateurs africains, tendances et contenus adaptés aux connexions lentes.',
  },
  Landing: {
    title: 'AfriWonder — Connexion & découverte',
    description:
      'Rejoignez AfriWonder : la super-app vidéo, marketplace et services pensée pour l’Afrique.',
  },
  Marketplace: {
    title: 'Marketplace | AfriWonder',
    description: 'Achetez et vendez sur la marketplace AfriWonder : produits locaux, livraison et paiements mobiles.',
  },
  Discover: {
    title: 'Découvrir | AfriWonder',
    description: 'Explorez créateurs, tendances et contenus à découvrir sur AfriWonder.',
  },
  Search: {
    title: 'Recherche | AfriWonder',
    description: 'Recherchez des vidéos, produits, personnes et contenus sur AfriWonder.',
  },
  Profile: {
    title: 'Mon profil | AfriWonder',
    description: 'Gérez votre profil, vos publications et vos paramètres sur AfriWonder.',
  },
  Inbox: {
    title: 'Messages | AfriWonder',
    description: 'Vos conversations et messages sur AfriWonder.',
  },
  Wallet: {
    title: 'Portefeuille | AfriWonder',
    description: 'Votre portefeuille et moyens de paiement AfriWonder.',
  },
  News: {
    title: 'Actualités & blog | AfriWonder',
    description: 'Articles, analyses et actualités AfriWonder — votre source d’infos sur la plateforme.',
  },
  ArticleDetails: {
    title: 'Article | AfriWonder',
    description: DEFAULT_DESCRIPTION,
  },
  FeedPosts: {
    title: 'Publications | AfriWonder',
    description: 'Fil de publications et posts sur AfriWonder.',
  },
  Create: {
    title: 'Créer | AfriWonder',
    description: 'Créez une vidéo ou un contenu sur AfriWonder.',
  },
  Lives: {
    title: 'Lives | AfriWonder',
    description: 'Lives et diffusions en direct sur AfriWonder.',
  },
  Help: {
    title: 'Aide | AfriWonder',
    description: "Centre d'aide et questions fréquentes AfriWonder.",
  },
  FAQ: {
    title: 'FAQ | AfriWonder',
    description: 'Questions fréquentes sur AfriWonder : marketplace, prestataires, abonnements et paiements.',
  },
  About: {
    title: 'À propos | AfriWonder',
    description: 'À propos d’AfriWonder : mission, équipe et vision.',
  },
  PrivacyPolicy: {
    title: 'Politique de confidentialité | AfriWonder',
    description: 'Politique de confidentialité et traitement des données AfriWonder.',
  },
  TermsOfService: {
    title: 'Conditions d’utilisation | AfriWonder',
    description: "Conditions générales d'utilisation AfriWonder.",
  },
  Product: {
    title: 'Produit | AfriWonder',
    description: 'Fiche produit marketplace AfriWonder.',
  },
  Cart: {
    title: 'Panier | AfriWonder',
    description: 'Votre panier marketplace AfriWonder.',
  },
  Checkout: {
    title: 'Paiement | AfriWonder',
    description: 'Finalisez votre commande sur AfriWonder.',
  },
};

export function getSeoForPageKey(pageKey) {
  const override = PAGE_SEO_OVERRIDES[pageKey];
  if (override) {
    return { title: override.title, description: override.description || DEFAULT_DESCRIPTION };
  }
  const human = humanizePageKey(pageKey);
  return {
    title: `${human} | AfriWonder`,
    description: `${human} sur AfriWonder — ${DEFAULT_DESCRIPTION}`,
  };
}

export { DEFAULT_DESCRIPTION };
