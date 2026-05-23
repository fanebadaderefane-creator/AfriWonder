/**
 * Données fictives Crowdfunding AfriWonder — démo et pré-remplissage
 * Pour que l'interface ne soit pas vide avant les vraies campagnes.
 */

const now = new Date();
const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
const in22Days = new Date(now.getTime() + 22 * 24 * 60 * 60 * 1000);
const in45Days = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

/** Campagnes fictives (visibles comme actives pour la démo) */
export const MOCK_CAMPAIGNS = [
  {
    id: 'cf-1',
    title: "Construction d'une école à Mopti",
    description: "Financement d'une école primaire de 6 salles de classe à Mopti pour scolariser 300 enfants. Matériel pédagogique et cantine inclus.",
    category: 'education',
    goal_amount: 10000000,
    current_amount: 6750000,
    end_date: in15Days.toISOString(),
    backers_count: 234,
    creator_name: 'Association Mali Éducation',
    creator_avatar: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100',
    location: 'Mopti, Mali',
    images: ['https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600'],
    status: 'active',
    created_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    is_featured: true,
    contributions: [],
  },
  {
    id: 'cf-2',
    title: 'Startup AgriTech Mali',
    description: 'Développement d\'une plateforme mobile pour connecter agriculteurs et acheteurs. Réduction du gaspillage et meilleurs prix.',
    category: 'technologie',
    goal_amount: 5000000,
    current_amount: 3200000,
    end_date: in22Days.toISOString(),
    backers_count: 156,
    creator_name: 'AgriTech Mali',
    creator_avatar: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=100',
    location: 'Bamako, Mali',
    images: ['https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600'],
    status: 'active',
    created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    is_featured: false,
    contributions: [],
  },
  {
    id: 'cf-3',
    title: 'Centre de santé communautaire à Kayes',
    description: 'Construction d\'un dispensaire avec maternité et pharmacie pour 5 villages. Formation du personnel local.',
    category: 'sante',
    goal_amount: 15000000,
    current_amount: 8200000,
    end_date: in45Days.toISOString(),
    backers_count: 412,
    creator_name: 'Santé Pour Tous',
    creator_avatar: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=100',
    location: 'Kayes, Mali',
    images: ['https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600'],
    status: 'active',
    created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    is_featured: true,
    contributions: [],
  },
  {
    id: 'cf-4',
    title: 'Reforestation villageoise - Région de Ségou',
    description: 'Planter 10 000 arbres et former les villageois à l\'agroforesterie. Lutte contre l\'érosion et revenus durables.',
    category: 'environnement',
    goal_amount: 3500000,
    current_amount: 1200000,
    end_date: in30Days.toISOString(),
    backers_count: 89,
    creator_name: 'Vert Mali',
    creator_avatar: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=100',
    location: 'Ségou, Mali',
    images: ['https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600'],
    status: 'active',
    created_at: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    is_featured: false,
    contributions: [],
  },
  {
    id: 'cf-5',
    title: 'Festival des musiques traditionnelles',
    description: 'Organisation du 3e festival annuel à Tombouctou : concerts, ateliers et transmission aux jeunes générations.',
    category: 'art',
    goal_amount: 4500000,
    current_amount: 2800000,
    end_date: in22Days.toISOString(),
    backers_count: 198,
    creator_name: 'Association Culture Tombouctou',
    creator_avatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100',
    location: 'Tombouctou, Mali',
    images: ['https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600'],
    status: 'active',
    created_at: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    is_featured: false,
    contributions: [],
  },
];

/** Stats globales fictives pour le bandeau (dérivées des campagnes mock ou fixes) */
export function getMockCrowdfundingStats(campaigns = MOCK_CAMPAIGNS) {
  const totalContributors = campaigns.reduce((acc, c) => acc + (c.backers_count ?? 0), 0);
  const totalFunded = campaigns.reduce((acc, c) => acc + (c.current_amount ?? 0), 0);
  return {
    campaignCount: campaigns.length,
    contributorCount: totalContributors,
    totalFundedXOF: totalFunded,
  };
}
