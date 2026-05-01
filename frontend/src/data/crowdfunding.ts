import { uiAvatarFromSeed } from '../utils/avatarFallback';

// AfriWonder Crowdfunding Mock Data (sans picsum / pravatar — avatars via initiales)

export interface CrowdfundingCreator {
  id: string;
  name: string;
  avatar: string;
  location: string;
  isVerified: boolean;
  projectsCount: number;
  successRate: number;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  amount: number;
  claimed: number;
  limit: number;
  deliveryDate: string;
  icon: string;
}

/** Jalons escrow (JSON Prisma `milestones`) — libération partielle. */
export interface CrowdfundingMilestone {
  id: string;
  label: string;
  amount_target: number;
  amount_released?: number;
  status: string;
  released_at?: string;
}

export interface CrowdfundingProject {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  images: string[];
  goal: number;
  raised: number;
  backers: number;
  daysLeft: number;
  category: string;
  creator: CrowdfundingCreator;
  isVerified: boolean;
  isSponsored: boolean;
  rewards: Reward[];
  createdAt: string;
  updates: number;
  comments: number;
  /** Statut API : active, funded, failed, suspended… */
  status?: string;
  /** Présent si la campagne définit des jalons (porteur). */
  milestones?: CrowdfundingMilestone[];
}

export interface CrowdfundingCategory {
  id: string;
  name: string;
  nameKey: string;
  icon: string;
  color: string;
}

export const CROWDFUNDING_CATEGORIES: CrowdfundingCategory[] = [
  { id: 'all', name: 'Tout', nameKey: 'cf.cat.all', icon: 'grid', color: '#FF6B00' },
  { id: 'agriculture', name: 'Agriculture', nameKey: 'cf.cat.agriculture', icon: 'leaf', color: '#4CAF50' },
  { id: 'business', name: 'Business', nameKey: 'cf.cat.business', icon: 'briefcase', color: '#2196F3' },
  { id: 'education', name: 'Education', nameKey: 'cf.cat.education', icon: 'school', color: '#9C27B0' },
  { id: 'tech', name: 'Tech', nameKey: 'cf.cat.tech', icon: 'hardware-chip', color: '#00BCD4' },
  { id: 'sante', name: 'Sante', nameKey: 'cf.cat.health', icon: 'medkit', color: '#F44336' },
  { id: 'culture', name: 'Culture', nameKey: 'cf.cat.culture', icon: 'musical-notes', color: '#FF9800' },
  { id: 'environnement', name: 'Environnement', nameKey: 'cf.cat.environment', icon: 'earth', color: '#009688' },
  { id: 'immobilier', name: 'Immobilier', nameKey: 'cf.cat.realestate', icon: 'home', color: '#795548' },
];

export const SEED_PROJECTS: CrowdfundingProject[] = [
  {
    id: 'cf1',
    title: 'Ecole Numerique de Bamako',
    shortDescription: 'Offrir un acces au numerique a 500 enfants de Bamako avec des tablettes et une connexion internet.',
    description: 'Notre projet vise a equiper une ecole primaire de Bamako avec 50 tablettes educatives, une connexion internet fiable et des contenus pedagogiques adaptes. Plus de 500 enfants pourront beneficier d\'un enseignement moderne et connecte.\n\nNous avons deja identifie l\'ecole partenaire et negocie les tarifs avec les fournisseurs. Les premiers equipements seront livres des que l\'objectif sera atteint a 60%.\n\nChaque contribution compte pour offrir un avenir meilleur a ces enfants.',
    images: [] as string[],
    goal: 5000000,
    raised: 3250000,
    backers: 189,
    daysLeft: 12,
    category: 'education',
    creator: {
      id: 'u1',
      name: 'Aminata Diallo',
      avatar: uiAvatarFromSeed('Aminata Diallo'),
      location: 'Bamako, Mali',
      isVerified: true,
      projectsCount: 3,
      successRate: 100,
    },
    isVerified: true,
    isSponsored: true,
    rewards: [
      { id: 'r1', title: 'Supporter', description: 'Votre nom sur le mur des donateurs de l\'ecole', amount: 5000, claimed: 89, limit: 200, deliveryDate: 'Janvier 2026', icon: 'heart' },
      { id: 'r2', title: 'Parrain Digital', description: 'Parrainez un enfant pendant 1 an + photo personnalisee', amount: 25000, claimed: 45, limit: 100, deliveryDate: 'Fevrier 2026', icon: 'people' },
      { id: 'r3', title: 'Bienfaiteur', description: 'Visite de l\'ecole + certificat officiel + T-shirt', amount: 100000, claimed: 12, limit: 30, deliveryDate: 'Mars 2026', icon: 'trophy' },
    ],
    createdAt: '2025-05-15',
    updates: 8,
    comments: 45,
  },
  {
    id: 'cf2',
    title: 'Centre de Sante Communautaire Sikasso',
    shortDescription: 'Construire un centre de sante moderne pour les habitants de Sikasso et les villages environnants.',
    description: 'Le projet consiste a batir un centre de sante communautaire a Sikasso, equipe de materiel medical moderne. Ce centre servira plus de 10 000 habitants de la region qui doivent actuellement parcourir plus de 50 km pour acceder aux soins.\n\nLe terrain est deja acquis et les plans architecturaux sont prets. Les travaux commenceront des que 50% de l\'objectif sera atteint.',
    images: [] as string[],
    goal: 10000000,
    raised: 7800000,
    backers: 456,
    daysLeft: 8,
    category: 'sante',
    creator: {
      id: 'u2',
      name: 'Dr. Moussa Keita',
      avatar: uiAvatarFromSeed('Dr Moussa Keita'),
      location: 'Sikasso, Mali',
      isVerified: true,
      projectsCount: 2,
      successRate: 100,
    },
    isVerified: true,
    isSponsored: false,
    rewards: [
      { id: 'r4', title: 'Ami du Centre', description: 'Remerciement officiel + newsletter du centre', amount: 5000, claimed: 200, limit: 500, deliveryDate: 'Avril 2026', icon: 'heart' },
      { id: 'r5', title: 'Pilier Sante', description: 'Votre nom sur la plaque d\'inauguration', amount: 50000, claimed: 80, limit: 150, deliveryDate: 'Juin 2026', icon: 'shield-checkmark' },
      { id: 'r6', title: 'Fondateur', description: 'Invitation a l\'inauguration + plaque nominative', amount: 250000, claimed: 15, limit: 25, deliveryDate: 'Septembre 2026', icon: 'star' },
    ],
    createdAt: '2025-04-20',
    updates: 15,
    comments: 123,
  },
  {
    id: 'cf3',
    title: 'Studio Musique Jeunes Artistes',
    shortDescription: 'Creer un studio d\'enregistrement professionnel pour les jeunes talents musicaux de Bamako.',
    description: 'Bamako regorge de talents musicaux mais les jeunes artistes n\'ont pas acces a des studios professionnels. Notre projet va creer un espace creatif avec un studio d\'enregistrement haut de gamme, ouvert et accessible a tous les jeunes artistes.\n\nLe studio proposera des seances d\'enregistrement a prix reduit et des formations gratuites en production musicale.',
    images: [] as string[],
    goal: 2000000,
    raised: 850000,
    backers: 67,
    daysLeft: 25,
    category: 'culture',
    creator: {
      id: 'u3',
      name: 'Ibrahima Sangare',
      avatar: uiAvatarFromSeed('Ibrahima Sangare'),
      location: 'Bamako, Mali',
      isVerified: true,
      projectsCount: 1,
      successRate: 100,
    },
    isVerified: true,
    isSponsored: false,
    rewards: [
      { id: 'r7', title: 'Fan', description: 'Acces gratuit a 5 seances d\'ecoute', amount: 5000, claimed: 30, limit: 100, deliveryDate: 'Mars 2026', icon: 'musical-notes' },
      { id: 'r8', title: 'Producteur', description: '1 heure d\'enregistrement gratuite', amount: 50000, claimed: 15, limit: 50, deliveryDate: 'Avril 2026', icon: 'mic' },
    ],
    createdAt: '2025-05-01',
    updates: 4,
    comments: 23,
  },
  {
    id: 'cf4',
    title: 'Ferme Solaire Communautaire Mopti',
    shortDescription: 'Installer une ferme solaire pour electrifier 3 villages de la region de Mopti.',
    description: 'Plus de 5 000 habitants de trois villages de Mopti n\'ont pas acces a l\'electricite. Ce projet installera des panneaux solaires et un systeme de stockage pour fournir une energie propre et durable.\n\nL\'electricite permettra l\'eclairage des maisons, le fonctionnement de pompes a eau et la conservation des aliments.',
    images: [] as string[],
    goal: 8000000,
    raised: 4500000,
    backers: 234,
    daysLeft: 18,
    category: 'environnement',
    creator: {
      id: 'u4',
      name: 'Awa Traore',
      avatar: uiAvatarFromSeed('Awa Traore'),
      location: 'Mopti, Mali',
      isVerified: true,
      projectsCount: 2,
      successRate: 50,
    },
    isVerified: true,
    isSponsored: true,
    rewards: [
      { id: 'r9', title: 'Ecolo', description: 'Certificat de contribution + sticker', amount: 2500, claimed: 100, limit: 300, deliveryDate: 'Fevrier 2026', icon: 'leaf' },
      { id: 'r10', title: 'Solaire', description: 'Visite de la ferme solaire + photo', amount: 25000, claimed: 50, limit: 100, deliveryDate: 'Mai 2026', icon: 'sunny' },
      { id: 'r11', title: 'Illuminateur', description: 'Panneau solaire a votre nom + visite VIP', amount: 200000, claimed: 8, limit: 20, deliveryDate: 'Aout 2026', icon: 'flash' },
    ],
    createdAt: '2025-04-10',
    updates: 11,
    comments: 89,
  },
  {
    id: 'cf5',
    title: 'Application Mobile AgriConnect',
    shortDescription: 'Developper une app mobile pour connecter les agriculteurs maliens aux marches et a la meteo.',
    description: 'AgriConnect est une application mobile qui permettra aux agriculteurs de la region de Segou de consulter les prix du marche en temps reel, recevoir des alertes meteo et echanger des conseils agricoles.\n\nL\'application fonctionnera meme hors connexion grace a un systeme de cache intelligent.',
    images: [] as string[],
    goal: 3000000,
    raised: 1200000,
    backers: 95,
    daysLeft: 30,
    category: 'tech',
    creator: {
      id: 'u5',
      name: 'Oumar Coulibaly',
      avatar: uiAvatarFromSeed('Oumar Coulibaly'),
      location: 'Segou, Mali',
      isVerified: true,
      projectsCount: 1,
      successRate: 100,
    },
    isVerified: true,
    isSponsored: false,
    rewards: [
      { id: 'r12', title: 'Beta Testeur', description: 'Acces anticipe a l\'application', amount: 5000, claimed: 40, limit: 100, deliveryDate: 'Decembre 2025', icon: 'phone-portrait' },
      { id: 'r13', title: 'Ambassadeur', description: 'Abonnement premium 1 an + goodies', amount: 25000, claimed: 20, limit: 50, deliveryDate: 'Janvier 2026', icon: 'ribbon' },
    ],
    createdAt: '2025-05-20',
    updates: 3,
    comments: 34,
  },
  {
    id: 'cf6',
    title: 'Cooperative Karite des Femmes de Koulikoro',
    shortDescription: 'Aider 200 femmes a creer une cooperative de production et vente de beurre de karite.',
    description: 'Ce projet soutient 200 femmes de Koulikoro dans la creation d\'une cooperative de karite. Les fonds serviront a acheter du materiel de production moderne, former les femmes aux techniques de transformation et creer une marque commerciale.\n\nLe karite de Koulikoro est repute pour sa qualite exceptionnelle.',
    images: [] as string[],
    goal: 4000000,
    raised: 2800000,
    backers: 178,
    daysLeft: 15,
    category: 'business',
    creator: {
      id: 'u6',
      name: 'Fatoumata Camara',
      avatar: uiAvatarFromSeed('Fatoumata Camara'),
      location: 'Koulikoro, Mali',
      isVerified: true,
      projectsCount: 2,
      successRate: 100,
    },
    isVerified: true,
    isSponsored: false,
    rewards: [
      { id: 'r14', title: 'Ami(e)', description: 'Pot de beurre de karite artisanal 100g', amount: 5000, claimed: 80, limit: 200, deliveryDate: 'Mars 2026', icon: 'gift' },
      { id: 'r15', title: 'Partenaire', description: 'Coffret cadeau karite (3 produits)', amount: 25000, claimed: 40, limit: 80, deliveryDate: 'Avril 2026', icon: 'cube' },
      { id: 'r16', title: 'Mecene', description: 'Visite de la cooperative + coffret premium', amount: 100000, claimed: 10, limit: 20, deliveryDate: 'Mai 2026', icon: 'diamond' },
    ],
    createdAt: '2025-05-10',
    updates: 6,
    comments: 56,
  },
  {
    id: 'cf7',
    title: 'Jardin Maraicher Bio de Kati',
    shortDescription: 'Creer un jardin maraicher biologique pour nourrir les familles de Kati avec des legumes frais.',
    description: 'Le jardin maraicher bio de Kati s\'etendra sur 2 hectares et fournira des legumes frais et biologiques a plus de 1 000 familles. Le projet prevoit un systeme d\'irrigation goutte-a-goutte et des formations en agriculture biologique.',
    images: [] as string[],
    goal: 1500000,
    raised: 750000,
    backers: 112,
    daysLeft: 20,
    category: 'agriculture',
    creator: {
      id: 'u7',
      name: 'Sekou Doumbia',
      avatar: uiAvatarFromSeed('Sekou Doumbia'),
      location: 'Kati, Mali',
      isVerified: false,
      projectsCount: 1,
      successRate: 0,
    },
    isVerified: false,
    isSponsored: false,
    rewards: [
      { id: 'r17', title: 'Graine', description: 'Panier de legumes bio (1 livraison)', amount: 5000, claimed: 60, limit: 150, deliveryDate: 'Avril 2026', icon: 'nutrition' },
      { id: 'r18', title: 'Cultivateur', description: 'Abonnement panier bio 3 mois', amount: 30000, claimed: 25, limit: 50, deliveryDate: 'Mai 2026', icon: 'basket' },
    ],
    createdAt: '2025-06-01',
    updates: 2,
    comments: 18,
  },
  {
    id: 'cf8',
    title: 'Bibliotheque Mobile pour les Villages',
    shortDescription: 'Un camion-bibliotheque pour apporter des livres dans 20 villages isoles du Mali.',
    description: 'Ce projet innovant transformera un vehicule en bibliotheque mobile qui circulera dans 20 villages isoles de la region de Tombouctou. Le camion transportera plus de 2 000 livres en francais, bambara et arabe.',
    images: [] as string[],
    goal: 6000000,
    raised: 1800000,
    backers: 145,
    daysLeft: 35,
    category: 'education',
    creator: {
      id: 'u8',
      name: 'Kadiatou Toure',
      avatar: uiAvatarFromSeed('Kadiatou Toure'),
      location: 'Tombouctou, Mali',
      isVerified: true,
      projectsCount: 1,
      successRate: 100,
    },
    isVerified: true,
    isSponsored: false,
    rewards: [
      { id: 'r19', title: 'Lecteur', description: 'Marque-page artisanal + remerciement', amount: 2500, claimed: 70, limit: 200, deliveryDate: 'Juin 2026', icon: 'book' },
      { id: 'r20', title: 'Bibliothecaire', description: 'Votre nom dans un livre + photo', amount: 25000, claimed: 30, limit: 60, deliveryDate: 'Juillet 2026', icon: 'library' },
    ],
    createdAt: '2025-05-25',
    updates: 5,
    comments: 67,
  },
];

// Platform stats
export const PLATFORM_STATS = {
  totalRaised: 45000000,
  totalProjects: 156,
  totalBackers: 8500,
  successRate: 85,
};

// Helper functions
export const formatCFA = (amount: number): string => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
  return String(amount);
};

export const formatFullCFA = (amount: number): string => {
  return (amount || 0).toLocaleString('fr-FR') + ' FCFA';
};

export const getProgressPercent = (raised: number, goal: number): number => {
  if (!goal || !raised) return 0;
  return Math.min(Math.round((raised / goal) * 100), 100);
};
