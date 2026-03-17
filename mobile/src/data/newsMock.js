/**
 * Données fictives Actualités — démo (aligné PWA News.jsx)
 */

export const CATEGORIES = [
  { id: 'all', label: 'Tous' },
  { id: 'politique', label: 'Politique' },
  { id: 'economie', label: 'Économie' },
  { id: 'technologie', label: 'Technologie' },
  { id: 'sante', label: 'Santé' },
  { id: 'sport', label: 'Sport' },
  { id: 'culture', label: 'Culture' },
  { id: 'international', label: 'International' },
];

export const MOCK_FEATURED = {
  id: 'mock-featured-satellite',
  slug: 'mock-mali-satellite',
  title: 'Le Mali lance son premier satellite de communication',
  excerpt: 'Une étape historique pour la souveraineté numérique du pays.',
  category: 'technologie',
  featured_image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&h=450&fit=crop',
  author_name: 'Fatoumata Diallo',
  author: { full_name: 'Fatoumata Diallo', profile_image: null },
  published_at: '2025-02-15T10:00:00Z',
  views: 12450,
  _mock: true,
};

export const MOCK_TRENDING = [
  {
    id: 'mock-economie-2025',
    slug: 'mock-economie-croissance',
    title: 'Croissance économique : le Mali vise 6% en 2025',
    excerpt: 'Le gouvernement présente son plan de développement économique ambitieux.',
    category: 'economie',
    featured_image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop',
    published_at: '2025-02-14T09:00:00Z',
    views: 8920,
    _mock: true,
  },
  {
    id: 'mock-sante-sikasso',
    slug: 'mock-sante-sikasso',
    title: 'Nouveau centre de santé inauguré à Sikasso',
    excerpt: 'Un centre de santé moderne ouvre ses portes pour servir 50 000 habitants.',
    category: 'sante',
    featured_image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop',
    published_at: '2025-02-13T14:00:00Z',
    views: 5670,
    _mock: true,
  },
  {
    id: 'mock-culture-festival',
    slug: 'mock-culture-festival',
    title: 'Festival sur le Niger 2025 : les dates dévoilées',
    excerpt: 'La 22e édition du festival se tiendra en février.',
    category: 'culture',
    featured_image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400&h=300&fit=crop',
    published_at: '2025-02-12T11:00:00Z',
    views: 4320,
    _mock: true,
  },
  {
    id: 'mock-sport-basket',
    slug: 'mock-sport-basket',
    title: 'Championnat national de basket : la finale à Bamako',
    excerpt: 'Les équipes de Bamako et Ségou s\'affrontent ce week-end pour le titre.',
    category: 'sport',
    featured_image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=300&fit=crop',
    published_at: '2025-02-11T08:00:00Z',
    views: 3100,
    _mock: true,
  },
];

export const MOCK_ARTICLES = [MOCK_FEATURED, ...MOCK_TRENDING];
