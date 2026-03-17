/** Données fictives Offres d'emploi AfriWonder — démo (aligné PWA) */

const now = new Date();
const exp1 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
const exp2 = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
const exp3 = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000);

export const MOCK_JOBS = [
  { id: 'job-1', title: 'Développeur Full Stack', description: 'Développeur Full Stack React, Node.js, 3 ans d\'expérience.', job_type: 'cdi', location: 'Bamako', country: 'ML', salary_min: 500000, salary_max: 800000, salary_currency: 'XOF', expires_at: exp1.toISOString(), created_at: new Date(2025, 1, 10).toISOString(), status: 'open', category: 'tech', image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=300&fit=crop', employer: { id: 'emp-1', full_name: 'TechMali SARL', profile_image: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100', company_profile: { company_name: 'TechMali SARL', logo_url: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100' } }, _count: { applications: 45 }, skills: ['React', 'Node.js', 'PostgreSQL'], posted_at: new Date(2025, 1, 10).toISOString() },
  { id: 'job-2', title: 'Comptable Senior', description: 'Comptable senior, SYSCOHADA, Excel, 5 ans d\'expérience.', job_type: 'cdi', location: 'Bamako', country: 'ML', salary_min: 400000, salary_max: 600000, salary_currency: 'XOF', expires_at: exp2.toISOString(), created_at: new Date(2025, 1, 12).toISOString(), status: 'open', category: 'commerce', image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=300&fit=crop', employer: { id: 'emp-2', full_name: 'Banque Malienne', profile_image: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=100', company_profile: { company_name: 'Banque Malienne', logo_url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=100' } }, _count: { applications: 78 }, skills: ['SYSCOHADA', 'Excel'], posted_at: new Date(2025, 1, 12).toISOString() },
  { id: 'job-3', title: 'Chauffeur Livreur', description: 'Chauffeurs livreurs zone Bamako. Permis B, véhicule fourni.', job_type: 'cdd', location: 'Bamako', country: 'ML', salary_min: 150000, salary_max: 200000, salary_currency: 'XOF', expires_at: exp3.toISOString(), created_at: new Date(2025, 1, 14).toISOString(), status: 'open', category: 'transport', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=300&fit=crop', employer: { id: 'emp-3', full_name: 'MaliExpress', profile_image: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=100', company_profile: { company_name: 'MaliExpress', logo_url: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=100' } }, _count: { applications: 123 }, skills: ['Permis B', 'Bamako'], posted_at: new Date(2025, 1, 14).toISOString() },
];

export const JOB_CATEGORIES = [
  { id: 'all', label: 'Tous', icon: '💼' },
  { id: 'tech', label: 'Tech', icon: '💻' },
  { id: 'commerce', label: 'Commerce', icon: '🛍️' },
  { id: 'sante', label: 'Santé', icon: '🏥' },
  { id: 'education', label: 'Éducation', icon: '📚' },
  { id: 'construction', label: 'Construction', icon: '🏗️' },
  { id: 'agriculture', label: 'Agriculture', icon: '🌾' },
  { id: 'transport', label: 'Transport', icon: '🚚' },
  { id: 'restauration', label: 'Restauration', icon: '🍽️' },
  { id: 'services', label: 'Services', icon: '🔧' },
];

export const JOB_TYPE_LABELS = { cdi: 'CDI', cdd: 'CDD', freelance: 'Freelance', stage: 'Stage', alternance: 'Alternance', full_time: 'Temps plein', part_time: 'Temps partiel', remote: 'Télétravail' };
