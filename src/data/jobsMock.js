/**
 * Données fictives Offres d'emploi AfriWonder — démo
 * Pour que l'interface ne soit pas vide avant les vraies offres.
 */

const now = new Date();
const feb10 = new Date(2025, 1, 10);
const feb12 = new Date(2025, 1, 12);
const feb14 = new Date(2025, 1, 14);
const expires1 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
const expires2 = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
const expires3 = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000);

/** Offres d'emploi fictives */
export const MOCK_JOBS = [
  {
    id: 'job-1',
    title: 'Développeur Full Stack',
    description: 'Nous recherchons un développeur Full Stack pour rejoindre notre équipe technique. Missions : développement des applications web (React, Node.js), maintenance des APIs, participation aux revues de code. 3 ans d\'expérience minimum.',
    job_type: 'cdi',
    location: 'Bamako',
    country: 'ML',
    salary_min: 500000,
    salary_max: 800000,
    salary_currency: 'XOF',
    expires_at: expires1.toISOString(),
    created_at: feb10.toISOString(),
    status: 'open',
    category: 'tech',
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=300&fit=crop',
    employer: {
      id: 'emp-1',
      full_name: 'TechMali SARL',
      profile_image: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop',
      company_profile: { company_name: 'TechMali SARL', logo_url: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop' },
    },
    _count: { applications: 45 },
    applications: [],
    skills: ['React', 'Node.js', 'PostgreSQL'],
    posted_at: feb10.toISOString(),
  },
  {
    id: 'job-2',
    title: 'Comptable Senior',
    description: 'Poste de comptable senior pour la direction financière. Responsabilités : clôtures mensuelles, reporting, respect SYSCOHADA. Maîtrise d\'Excel et 5 ans d\'expérience en entreprise requises.',
    job_type: 'cdi',
    location: 'Bamako',
    country: 'ML',
    salary_min: 400000,
    salary_max: 600000,
    salary_currency: 'XOF',
    expires_at: expires2.toISOString(),
    created_at: feb12.toISOString(),
    status: 'open',
    category: 'commerce',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=300&fit=crop',
    employer: {
      id: 'emp-2',
      full_name: 'Banque Malienne',
      profile_image: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=100&h=100&fit=crop',
      company_profile: { company_name: 'Banque Malienne', logo_url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=100&h=100&fit=crop' },
    },
    _count: { applications: 78 },
    applications: [],
    skills: ['SYSCOHADA', 'Excel', '5 ans d\'expérience'],
    posted_at: feb12.toISOString(),
  },
  {
    id: 'job-3',
    title: 'Chauffeur Livreur',
    description: 'Recrutement de chauffeurs livreurs pour la zone Bamako. Permis B obligatoire, bonne connaissance de Bamako et environs. Véhicule fourni.',
    job_type: 'cdd',
    location: 'Bamako',
    country: 'ML',
    salary_min: 150000,
    salary_max: 200000,
    salary_currency: 'XOF',
    expires_at: expires3.toISOString(),
    created_at: feb14.toISOString(),
    status: 'open',
    category: 'transport',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=300&fit=crop',
    employer: {
      id: 'emp-3',
      full_name: 'MaliExpress',
      profile_image: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=100&h=100&fit=crop',
      company_profile: { company_name: 'MaliExpress', logo_url: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=100&h=100&fit=crop' },
    },
    _count: { applications: 123 },
    applications: [],
    skills: ['Permis B', 'Connaissance Bamako'],
    posted_at: feb14.toISOString(),
  },
];
