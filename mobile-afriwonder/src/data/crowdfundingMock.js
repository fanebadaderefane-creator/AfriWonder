/** Données fictives Crowdfunding AfriWonder — démo (aligné PWA) */

const now = new Date();
const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
const in22Days = new Date(now.getTime() + 22 * 24 * 60 * 60 * 1000);
const in45Days = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

export const MOCK_CAMPAIGNS = [
  { id: 'cf-1', title: "Construction d'une école à Mopti", description: "Financement école primaire 6 salles à Mopti pour 300 enfants.", category: 'education', goal_amount: 10000000, current_amount: 6750000, end_date: in15Days.toISOString(), backers_count: 234, creator_name: 'Association Mali Éducation', location: 'Mopti, Mali', images: ['https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600'], status: 'active', is_featured: true },
  { id: 'cf-2', title: 'Startup AgriTech Mali', description: 'Plateforme mobile agriculteurs / acheteurs.', category: 'technologie', goal_amount: 5000000, current_amount: 3200000, end_date: in22Days.toISOString(), backers_count: 156, creator_name: 'AgriTech Mali', location: 'Bamako, Mali', images: ['https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600'], status: 'active', is_featured: false },
  { id: 'cf-3', title: 'Centre de santé communautaire à Kayes', description: 'Dispensaire avec maternité et pharmacie pour 5 villages.', category: 'sante', goal_amount: 15000000, current_amount: 8200000, end_date: in45Days.toISOString(), backers_count: 412, creator_name: 'Santé Pour Tous', location: 'Kayes, Mali', images: ['https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600'], status: 'active', is_featured: true },
];

export const CATEGORIES = [
  { id: 'all', label: 'Tous', icon: '🌍' },
  { id: 'education', label: 'Éducation', icon: '📚' },
  { id: 'sante', label: 'Santé', icon: '🏥' },
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'urgence', label: 'Urgence', icon: '🚨' },
  { id: 'communaute', label: 'Communauté', icon: '🤝' },
  { id: 'environnement', label: 'Environnement', icon: '🌱' },
  { id: 'technologie', label: 'Technologie', icon: '💻' },
  { id: 'art', label: 'Art & Culture', icon: '🎨' },
];
