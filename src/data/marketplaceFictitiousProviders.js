// Données fictives pour Prestataires en Vedette / Voir tout — partagées entre Marketplace et Providers

const CARD_IMAGES = {
  mariam: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop",
  amadou: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&h=400&fit=crop",
  aissata: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=400&fit=crop",
  oumar: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=400&fit=crop",
  fatoumata: "https://images.unsplash.com/photo-1561070791-2526d31fe1b6?w=600&h=400&fit=crop",
  ibrahim: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600&h=400&fit=crop",
};

export const FICTITIOUS_FEATURED_PROVIDERS = [
  { id: "fic-mariam", display_name: "Mariam Traoré", category_name: "Santé & Bien-être", city: "Bamako", neighborhood: "Hippodrome", price_range_min: 7500, average_rating: 4.9, is_verified: true, subscription_plan: "pro", is_available: true, services_offered: ["Fitness", "Yoga", "Coach personnel", "Autre"], portfolio_urls: [CARD_IMAGES.mariam] },
  { id: "fic-amadou", display_name: "Amadou Diallo", category_name: "Cours & Formation", city: "Bamako", neighborhood: "Hamdallaye ACI 2000", price_range_min: 5000, average_rating: 4.8, is_verified: true, subscription_plan: "premium", is_available: true, services_offered: ["Cours de maths", "Cours de physique", "Préparation BAC", "Autre"], portfolio_urls: [CARD_IMAGES.amadou] },
  { id: "fic-aissata", display_name: "Aïssata Diarra", category_name: "Photographie", city: "Bamako", neighborhood: "Kalaban Coura", price_range_min: 30000, average_rating: 4.8, is_verified: true, subscription_plan: "pro", is_available: true, services_offered: ["Mariage", "Portraits", "Événements", "Autre"], portfolio_urls: [CARD_IMAGES.aissata] },
  { id: "fic-oumar", display_name: "Oumar Sangaré", category_name: "Informatique & Tech", city: "Bamako", neighborhood: "Sotuba ACI", price_range_min: 50000, average_rating: 4.7, is_verified: true, subscription_plan: "premium", is_available: true, services_offered: ["Sites web", "Applications mobiles", "E-commerce", "Autre"], portfolio_urls: [CARD_IMAGES.oumar] },
  { id: "fic-fatoumata", display_name: "Fatoumata Keita", category_name: "Design & Créativité", city: "Bamako", neighborhood: "Badalabougou", price_range_min: 25000, average_rating: 4.6, is_verified: true, subscription_plan: "pro", is_available: true, services_offered: ["Logo design", "Identité visuelle", "Flyers & Brochures", "Autre"], portfolio_urls: [CARD_IMAGES.fatoumata] },
  { id: "fic-ibrahim", display_name: "Ibrahim Coulibaly", category_name: "Artisanat", city: "Bamako", neighborhood: "Magnambougou", price_range_min: 10000, average_rating: 4.5, is_verified: true, subscription_plan: "pro", is_available: true, services_offered: ["Plomberie générale", "Installation sanitaire", "Réparation fuites", "Autre"], portfolio_urls: [CARD_IMAGES.ibrahim] },
];
