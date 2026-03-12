/**
 * Données fictives Mini-Apps AfriWonder — démo
 */

export const MOCK_MINI_APPS = [
  { id: 'mini-app-1', name: 'Taxi Mali Express', description: 'Reservez un taxi a Bamako. Paiement mobile money.', icon: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=200&h=200&fit=crop&auto=format', category: 'transport', developer: { id: 'dev-1', name: 'MaliTech Solutions', verified: true }, version: '1.2.0', installs: 12500, rating: 4.5, reviews_count: 234, price: 'gratuit', status: 'published', featured: true },
  { id: 'mini-app-2', name: 'Pharmacie Express', description: 'Commandez medicaments en ligne, livraison rapide.', icon: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=200&h=200&fit=crop&auto=format', category: 'sante', developer: { id: 'dev-2', name: 'HealthTech Mali', verified: true }, version: '2.0.1', installs: 8900, rating: 4.7, reviews_count: 156, price: 'gratuit', status: 'published', featured: true },
  { id: 'mini-app-3', name: 'Ecole Privee Connect', description: 'Gestion scolaire : notes, absences, paiement frais.', icon: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200&h=200&fit=crop&auto=format', category: 'education', developer: { id: 'dev-3', name: 'EduTech Mali', verified: false }, version: '1.5.2', installs: 3400, rating: 4.3, reviews_count: 89, price: 'gratuit', status: 'published', featured: false },
  { id: 'mini-app-4', name: 'Agence Voyage Sahel', description: 'Billets avion, hotels, circuits. Mobile money.', icon: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200&h=200&fit=crop&auto=format', category: 'travel', developer: { id: 'dev-4', name: 'Sahel Travel', verified: true }, version: '1.8.0', installs: 5600, rating: 4.6, reviews_count: 123, price: 'gratuit', status: 'published', featured: false },
  { id: 'mini-app-5', name: 'ONG Solidarite Mali', description: 'Dons, projets, campagnes solidarite.', icon: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=200&h=200&fit=crop&auto=format', category: 'social', developer: { id: 'dev-5', name: 'Solidarite Mali', verified: true }, version: '1.0.5', installs: 2100, rating: 4.8, reviews_count: 45, price: 'gratuit', status: 'published', featured: false },
  { id: 'mini-app-6', name: 'Boutique WhatsApp Pro', description: 'Boutique en ligne, vente via WhatsApp.', icon: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200&h=200&fit=crop&auto=format', category: 'commerce', developer: { id: 'dev-6', name: 'WhatsApp Commerce', verified: false }, version: '2.1.0', installs: 7800, rating: 4.4, reviews_count: 198, price: 'gratuit', status: 'published', featured: true },
  { id: 'mini-app-7', name: 'Services Agricoles Mali', description: 'Meteo agricole, conseils, marche produits.', icon: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=200&h=200&fit=crop&auto=format', category: 'agriculture', developer: { id: 'dev-7', name: 'AgriTech Mali', verified: true }, version: '1.3.2', installs: 4200, rating: 4.2, reviews_count: 67, price: 'gratuit', status: 'published', featured: false },
  { id: 'mini-app-8', name: 'Banque Mobile Mali', description: 'Virements, paiements, epargne, credits.', icon: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=200&h=200&fit=crop&auto=format', category: 'finance', developer: { id: 'dev-8', name: 'BankTech Mali', verified: true }, version: '3.0.0', installs: 15200, rating: 4.9, reviews_count: 456, price: 'gratuit', status: 'published', featured: true },
];

export const MOCK_CATEGORIES = [
  { id: 'all', label: 'Toutes', icon: '📱' },
  { id: 'transport', label: 'Transport', icon: '🚕' },
  { id: 'sante', label: 'Santé', icon: '💊' },
  { id: 'education', label: 'Éducation', icon: '📚' },
  { id: 'travel', label: 'Voyage', icon: '✈️' },
  { id: 'social', label: 'Social', icon: '🤝' },
  { id: 'commerce', label: 'Commerce', icon: '🛍️' },
  { id: 'agriculture', label: 'Agriculture', icon: '🌾' },
  { id: 'finance', label: 'Finance', icon: '🏦' },
];

export const MOCK_INSTALLED_APPS = ['mini-app-1', 'mini-app-2', 'mini-app-8'];
