/**
 * Données fictives pour le hub Services (aucun partenaire requis).
 * Les IDs préfixés `afw-demo-` ne doivent pas déclencher d’actions réelles (commande, paiement, RDV).
 */
import type { Restaurant, MenuItem } from '../api/restaurantsApi';
import type { Doctor } from '../api/doctorsApi';
import type { EventItem } from '../api/eventsApi';
import type { Property } from '../api/propertiesApi';
import type { NewsArticle } from '../api/newsApi';
import type { Doctor as TeleDoctor } from '../api/teleconsultationApi';
import type { Driver, Ride } from '../api/ridesApi';
import type { Job } from '../api/jobsApi';
import type { ServiceProvider } from '../api/providersApi';
import type { Course } from '../api/coursesApi';

export const AFW_DEMO_PREFIX = 'afw-demo-';

export function isAfriWonderDemoId(id: string | undefined | null): boolean {
  return Boolean(id && String(id).startsWith(AFW_DEMO_PREFIX));
}

const IMG = {
  food: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
  food2: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
  concert: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=960&q=80',
  villa: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  apt: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
  land: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
  news1: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=960&q=80',
  news2: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=960&q=80',
  news3: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=960&q=80',
};

/** Restaurants visibles dans la liste livraison (démo). */
export const DEMO_RESTAURANTS: Restaurant[] = [
  {
    id: 'afw-demo-food-relais',
    name: 'Le Relais — démo',
    description: 'Cuisine malienne · données fictives pour la présentation.',
    address: 'Hamdallaye AC 2000',
    city: 'Bamako',
    phone: '+223 70 00 00 01',
    cuisine_type: 'malienne',
    cover_image: IMG.food,
    rating: 4.8,
    is_open: true,
    delivery_fee: 1500,
    minimum_order: 0,
    delivery_time_min: 35,
    delivery_time_max: 50,
  },
  {
    id: 'afw-demo-food-teranga',
    name: 'Téranga Grill — démo',
    description: 'Grillades & jus maison (fictif).',
    address: 'Hippodrome',
    city: 'Bamako',
    phone: '+223 70 00 00 02',
    cuisine_type: ['grillades', 'international'],
    cover_image: IMG.food2,
    rating: 4.6,
    is_open: true,
    delivery_fee: 2000,
    minimum_order: 3000,
    delivery_time_min: 40,
    delivery_time_max: 55,
  },
];

const DEMO_MENUS: Record<string, MenuItem[]> = {
  'afw-demo-food-relais': [
    {
      id: 'afw-demo-m-jus',
      restaurant_id: 'afw-demo-food-relais',
      name: 'Jus bissap maison',
      price: 800,
      category: 'Boissons',
      image_url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',
      is_available: true,
    },
    {
      id: 'afw-demo-m-brochette',
      restaurant_id: 'afw-demo-food-relais',
      name: 'Brochettes mouton & attiéké',
      price: 4200,
      category: 'Plats',
      is_available: true,
    },
    {
      id: 'afw-demo-m-riz',
      restaurant_id: 'afw-demo-food-relais',
      name: 'Riz gras & poulet braisé',
      price: 3500,
      category: 'Plats',
      is_available: true,
    },
  ],
  'afw-demo-food-teranga': [
    {
      id: 'afw-demo-m-burger',
      restaurant_id: 'afw-demo-food-teranga',
      name: 'Menu burger + frites',
      price: 4500,
      category: 'Plats',
      is_available: true,
    },
    {
      id: 'afw-demo-m-ginger',
      restaurant_id: 'afw-demo-food-teranga',
      name: 'Ginger maison',
      price: 1000,
      category: 'Boissons',
      is_available: true,
    },
  ],
};

export function getDemoRestaurantById(id: string): Restaurant | null {
  return DEMO_RESTAURANTS.find((r) => r.id === id) ?? null;
}

export function getDemoMenuForRestaurant(restaurantId: string): MenuItem[] {
  return DEMO_MENUS[restaurantId] ?? [];
}

export const DEMO_DOCTORS: Doctor[] = [
  {
    id: 'afw-demo-dr-aminata',
    full_name: 'Aminata Traoré',
    specialty: 'Généraliste',
    city: 'Bamako',
    clinic_name: 'Cabinet démo — Hippodrome',
    consultation_fee: 15000,
    currency: 'XOF',
    rating: 5,
    total_reviews: 42,
    avatar_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80',
    is_verified: true,
  },
  {
    id: 'afw-demo-dr-moussa',
    full_name: 'Moussa Keita',
    specialty: 'Pédiatre',
    city: 'Bamako',
    clinic_name: 'Cabinet démo — Kalaban',
    consultation_fee: 18000,
    currency: 'XOF',
    rating: 4.9,
    total_reviews: 28,
    avatar_url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80',
    is_verified: true,
  },
];

export function getDemoDoctorById(id: string): Doctor | null {
  return DEMO_DOCTORS.find((d) => d.id === id) ?? null;
}

export function getDemoTeleDoctorById(id: string): TeleDoctor | null {
  const d = getDemoDoctorById(id);
  if (!d) return null;
  return {
    id: d.id,
    user_id: `${d.id}-user`,
    full_name: d.full_name,
    specialty: d.specialty,
    bio: 'Médecin fictif pour démonstration AfriWonder — pas de téléconsultation réelle.',
    city: d.city ?? 'Bamako',
    country: 'ML',
    consultation_fee_fcfa: d.consultation_fee ?? 15000,
    is_verified: true,
    is_available_now: false,
    profile_image: d.avatar_url ?? null,
  };
}

export const DEMO_EVENTS: EventItem[] = [
  {
    id: 'afw-demo-event-festival',
    title: 'Festival des arts — Bamako (démo)',
    description: 'Scène fictive pour maquette produit.',
    event_type: 'festival',
    location: 'Palais des Congrès, Bamako',
    city: 'Bamako',
    start_date: '2026-05-23T18:00:00.000Z',
    end_date: '2026-05-23T23:00:00.000Z',
    ticket_price: 5000,
    cover_image: IMG.concert,
    ticket_types: [{ id: 'standard', name: 'Pass standard', price: 5000, quantity_available: 200 }],
  },
  {
    id: 'afw-demo-event-concert',
    title: 'Concert solidarité éducation (démo)',
    event_type: 'concert',
    location: 'Stade 26 Mars, Bamako',
    city: 'Bamako',
    start_date: '2026-06-06T20:00:00.000Z',
    ticket_price: 3000,
    cover_image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=960&q=80',
    ticket_types: [{ id: 'place', name: 'Place debout', price: 3000, quantity_available: 500 }],
  },
];

export function getDemoEventById(id: string): EventItem | null {
  return DEMO_EVENTS.find((e) => e.id === id) ?? null;
}

export const DEMO_PROPERTIES: Property[] = [
  {
    id: 'afw-demo-prop-villa',
    title: 'Villa 4 ch. — Badalabougou (démo)',
    description: 'Annonce fictive.',
    listing_type: 'sale',
    address: 'Badalabougou',
    city: 'Bamako',
    price: 185_000_000,
    currency: 'FCFA',
    bedrooms: 4,
    bathrooms: 3,
    surface_m2: 220,
    cover_image: IMG.villa,
    status: 'available',
  },
  {
    id: 'afw-demo-prop-apt',
    title: 'Appartement meublé — ACI 2000 (démo)',
    listing_type: 'rent',
    address: 'ACI 2000',
    city: 'Bamako',
    price: 350_000,
    currency: 'FCFA',
    bedrooms: 2,
    bathrooms: 2,
    surface_m2: 85,
    cover_image: IMG.apt,
    status: 'available',
  },
  {
    id: 'afw-demo-prop-terrain',
    title: 'Terrain 500 m² — Kati (démo)',
    listing_type: 'land',
    address: 'Kati',
    city: 'Kati',
    price: 25_000_000,
    currency: 'FCFA',
    surface_m2: 500,
    cover_image: IMG.land,
    status: 'available',
  },
];

export function getDemoPropertyById(id: string): Property | null {
  return DEMO_PROPERTIES.find((p) => p.id === id) ?? null;
}

export const DEMO_NEWS: NewsArticle[] = [
  {
    id: 'afw-demo-news-foot',
    title: 'CAN 2025 : le Mali se prépare (article démo)',
    summary: 'Contenu fictif pour illustrer le fil d’actualités.',
    content:
      '<p>Article de démonstration AfriWonder — aucune information sportive réelle.</p>'
      + '<p>Les partenaires médias seront intégrés lorsque les accords seront signés.</p>',
    category: 'sports',
    cover_image: IMG.news3,
    is_featured: true,
    published_at: new Date().toISOString(),
    source_name: 'AfriWonder Démo',
  },
  {
    id: 'afw-demo-news-tech',
    title: 'Fintech : le mobile money en hausse (démo)',
    summary: 'Tendances fictives pour maquette produit.',
    content: '<p>Données illustratives uniquement — pas de conseil financier.</p>',
    category: 'tech',
    image_url: IMG.news1,
    published_at: new Date(Date.now() - 86400000).toISOString(),
    source_name: 'AfriWonder Démo',
  },
  {
    id: 'afw-demo-news-culture',
    title: 'Festival sur les rives du Niger (démo)',
    summary: 'Événement fictif pour présentation UX.',
    content: '<p>Programme et lieux imaginaires — contenu de démonstration.</p>',
    category: 'culture',
    cover_image: IMG.concert,
    published_at: new Date(Date.now() - 172800000).toISOString(),
    source_name: 'AfriWonder Démo',
  },
  {
    id: 'afw-demo-news-econ',
    title: 'Coopératives agricoles : perspectives (démo)',
    summary: 'Analyse fictive pour parcours complet du fil.',
    content: '<p>Chiffres et tendances imaginaires — pas de recommandation d’investissement.</p>',
    category: 'economie',
    cover_image: IMG.news2,
    published_at: new Date(Date.now() - 250000000).toISOString(),
    source_name: 'AfriWonder Démo',
  },
  {
    id: 'afw-demo-news-pol',
    title: 'Décentralisation : étapes clés (démo)',
    summary: 'Synthèse pédagogique sans actualité réelle.',
    content: '<p>Rappel institutionnel générique — données de maquette.</p>',
    category: 'politique',
    image_url: IMG.news1,
    published_at: new Date(Date.now() - 300000000).toISOString(),
    source_name: 'AfriWonder Démo',
  },
];

export function filterDemoNews(categoryLower?: string): NewsArticle[] {
  if (!categoryLower || categoryLower === 'tous') return DEMO_NEWS;
  return DEMO_NEWS.filter((a) => (a.category || '').toLowerCase() === categoryLower);
}

export function getDemoNewsArticleById(id: string): NewsArticle | null {
  return DEMO_NEWS.find((a) => a.id === id) ?? null;
}

/** Chauffeurs fictifs (transport VTC). */
export const DEMO_DRIVERS: Driver[] = [
  {
    id: 'afw-demo-drv-moto',
    full_name: 'Moussa K.',
    vehicle_type: 'moto',
    rating: 4.8,
    distance_km: 0.8,
    license_plate: 'ML-01-AF-42',
    is_available: true,
  },
  {
    id: 'afw-demo-drv-taxi',
    full_name: 'Amadou Diallo',
    vehicle_type: 'taxi',
    rating: 4.9,
    distance_km: 1.2,
    license_plate: 'ML-02-BK-88',
    is_available: true,
  },
  {
    id: 'afw-demo-drv-comfort',
    full_name: 'Fatoumata S.',
    vehicle_type: 'comfort',
    rating: 5,
    distance_km: 2.1,
    license_plate: 'ML-03-CC-15',
    is_available: true,
  },
  {
    id: 'afw-demo-drv-van',
    full_name: 'Ibrahim T.',
    vehicle_type: 'van',
    rating: 4.7,
    distance_km: 3.4,
    license_plate: 'ML-04-VN-03',
    is_available: true,
  },
];

export function filterDemoDrivers(vehicleType: string): Driver[] {
  const v = (vehicleType || 'taxi').toLowerCase();
  const match = DEMO_DRIVERS.filter((d) => String(d.vehicle_type).toLowerCase() === v);
  return match.length > 0 ? match : DEMO_DRIVERS;
}

/** Offres d’emploi fictives. */
export const DEMO_JOBS: Job[] = [
  {
    id: 'afw-demo-job-mobile',
    title: 'Développeur·se mobile React Native',
    company: 'Studio Bamako Tech (démo)',
    description: 'Mission fictive pour maquette produit.',
    city: 'Bamako',
    location: 'Hippodrome · Hybride',
    type: 'full_time',
    salary_min: 450_000,
    salary_max: 750_000,
    currency: 'FCFA',
    remote: true,
    posted_at: new Date().toISOString(),
  },
  {
    id: 'afw-demo-job-compta',
    title: 'Comptable junior',
    company: 'Cabinet Diarra (démo)',
    city: 'Bamako',
    type: 'contract',
    salary_min: 300_000,
    salary_max: 420_000,
    currency: 'FCFA',
    posted_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'afw-demo-job-stage',
    title: 'Stage — community manager',
    company: 'AfriWonder Marketing (démo)',
    city: 'Bamako',
    type: 'internship',
    salary_min: 75_000,
    currency: 'FCFA',
    posted_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

export function filterDemoJobs(search: string): Job[] {
  const q = search.trim().toLowerCase();
  if (!q) return DEMO_JOBS;
  return DEMO_JOBS.filter(
    (j) =>
      j.title.toLowerCase().includes(q)
      || (j.company || '').toLowerCase().includes(q)
      || (j.city || '').toLowerCase().includes(q),
  );
}

export function getDemoJobById(id: string): Job | null {
  return DEMO_JOBS.find((j) => j.id === id) ?? null;
}

/** Historique de courses fictif (covoiturage / activité). */
export const DEMO_RIDES: Ride[] = [
  {
    id: 'afw-demo-ride-1',
    pickup_location: 'Hippodrome, Bamako',
    dropoff_location: 'Aéroport Modibo Keïta',
    status: 'completed',
    fare_amount: 8500,
    vehicle_type: 'taxi',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'afw-demo-ride-2',
    pickup_location: 'ACI 2000',
    dropoff_location: 'Marché Médina',
    status: 'completed',
    fare_amount: 3200,
    vehicle_type: 'moto',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export function getDemoRideById(id: string): Ride | null {
  return DEMO_RIDES.find((r) => r.id === id) ?? null;
}

/**
 * Payload pour l’écran suivi trajet (`app/rides/[id].tsx`) — pas d’API réelle.
 */
export function getDemoTrackedRidePayload(id: string): {
  id: string;
  passenger_id: string;
  driver_id?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  driver_avatar?: string | null;
  vehicle_type: string;
  pickup_location: string;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dropoff_location: string;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  distance_km?: number | null;
  estimated_duration_min?: number | null;
  price?: number | null;
  currency: string;
  status: string;
  rating?: number | null;
} | null {
  const r = getDemoRideById(id);
  if (!r) return null;
  return {
    id: r.id,
    passenger_id: 'afw-demo-passenger',
    driver_id: 'afw-demo-drv-taxi',
    driver_name: 'Amadou Diallo (démo)',
    driver_phone: null,
    vehicle_type: r.vehicle_type || 'taxi',
    pickup_location: r.pickup_location,
    pickup_lat: 12.6392,
    pickup_lng: -8.0029,
    dropoff_location: r.dropoff_location,
    dropoff_lat: 12.5537,
    dropoff_lng: -7.9695,
    distance_km: 12.4,
    estimated_duration_min: 28,
    price: r.fare_amount ?? 7500,
    currency: 'FCFA',
    status: r.status || 'completed',
    rating: 4.9,
  };
}

const DEMO_PROVIDERS_CHILDCARE: ServiceProvider[] = [
  {
    id: 'afw-demo-nanny-aminata',
    display_name: 'Aminata — nounou agréée (démo)',
    bio: 'Garde à domicile 0–10 ans · données fictives.',
    city: 'Bamako',
    rating: 4.95,
    total_jobs: 48,
    is_verified: true,
    base_price: 3500,
    currency: 'FCFA',
    status: 'approved',
    service_categories: ['childcare'],
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
  },
  {
    id: 'afw-demo-nanny-kadi',
    display_name: 'Kadiatou Baby-sitting (démo)',
    bio: 'Jeux éducatifs, aide aux devoirs le soir.',
    city: 'Kalaban',
    rating: 4.8,
    total_jobs: 22,
    is_verified: true,
    base_price: 4000,
    currency: 'FCFA',
    status: 'approved',
    service_categories: ['childcare'],
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
  },
];

const DEMO_PROVIDERS_TRAVEL: ServiceProvider[] = [
  {
    id: 'afw-demo-travel-horizon',
    display_name: 'Horizon Voyages Bamako (démo)',
    bio: 'Billets, visas, séjours — contenu de présentation.',
    city: 'Bamako',
    rating: 4.7,
    is_verified: true,
    status: 'approved',
    service_categories: ['travel'],
    cover_image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80',
  },
];

const DEMO_PROVIDERS_VEHICLE: ServiceProvider[] = [
  {
    id: 'afw-demo-rent-mali-auto',
    display_name: 'Mali Auto Rent (démo)',
    bio: 'Berlines et SUV · kilométrage limité fictif.',
    city: 'Bamako',
    rating: 4.6,
    total_jobs: 120,
    is_verified: true,
    base_price: 25_000,
    currency: 'FCFA',
    status: 'approved',
    service_categories: ['vehicle_rental'],
    cover_image: 'https://images.unsplash.com/photo-1489823555147-2d0db59c9c7a?w=800&q=80',
  },
];

export function getDemoProvidersForCategory(category: string): ServiceProvider[] {
  switch (category) {
    case 'childcare':
      return DEMO_PROVIDERS_CHILDCARE;
    case 'travel':
      return DEMO_PROVIDERS_TRAVEL;
    case 'vehicle_rental':
      return DEMO_PROVIDERS_VEHICLE;
    default:
      return [];
  }
}

export function getDemoProviderById(id: string): ServiceProvider | null {
  return (
    [...DEMO_PROVIDERS_CHILDCARE, ...DEMO_PROVIDERS_TRAVEL, ...DEMO_PROVIDERS_VEHICLE].find((p) => p.id === id)
    ?? null
  );
}

/** Lignes « produit » au format attendu par `app/(tabs)/market.tsx` après transformation. */
export function getDemoMarketplaceProductRows(): Record<string, unknown>[] {
  return DEMO_MARKET_PRODUCTS.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    oldPrice: p.oldPrice,
    image: p.imageUrl,
    rating: p.rating,
    reviews: p.reviews,
    seller: p.seller,
    sellerVerified: p.sellerVerified,
    freeDelivery: p.freeDelivery,
    isNew: p.isNew,
    isBestseller: p.isBestseller,
    wishlisted: false,
    description: p.description,
    category: p.category,
    currency: 'XOF',
    stock: p.stock,
    city: p.city,
  }));
}

const DEMO_MARKET_PRODUCTS: {
  id: string;
  name: string;
  price: number;
  oldPrice: number | null;
  imageUrl: string;
  rating: number;
  reviews: number;
  seller: string;
  sellerVerified: boolean;
  freeDelivery: boolean;
  isNew: boolean;
  isBestseller: boolean;
  description: string;
  category: string;
  stock: number;
  city: string;
}[] = [
  {
    id: 'afw-demo-prod-bogolan',
    name: 'Pagne bogolan artisanal (démo)',
    price: 18500,
    oldPrice: 22000,
    imageUrl: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=600&q=80',
    rating: 4.8,
    reviews: 42,
    seller: 'Maison Siraba',
    sellerVerified: true,
    freeDelivery: true,
    isNew: true,
    isBestseller: true,
    description: 'Article de démonstration marketplace — aucune commande réelle.',
    category: 'Mode',
    stock: 15,
    city: 'Bamako',
  },
  {
    id: 'afw-demo-prod-honey',
    name: 'Miel local 500g (démo)',
    price: 4500,
    oldPrice: null,
    imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&q=80',
    rating: 4.9,
    reviews: 128,
    seller: 'Ruche du Mandé',
    sellerVerified: true,
    freeDelivery: false,
    isNew: false,
    isBestseller: true,
    description: 'Produit fictif pour vitrine AfriWonder.',
    category: 'Alimentation',
    stock: 80,
    city: 'Sikasso',
  },
  {
    id: 'afw-demo-prod-phone',
    name: 'Accessoires smartphone (démo)',
    price: 12000,
    oldPrice: 15000,
    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80',
    rating: 4.5,
    reviews: 56,
    seller: 'Tech Kalaban',
    sellerVerified: false,
    freeDelivery: false,
    isNew: true,
    isBestseller: false,
    description: 'Étui & protection — données de présentation.',
    category: 'Électronique',
    stock: 30,
    city: 'Bamako',
  },
];

/** Détail produit pour `app/product/[id].tsx`. */
export function getDemoMarketProductDetail(id: string): {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  images: string[];
  rating: number;
  reviews: number;
  sold: number;
  seller: { name: string; avatar: string; rating: number; products: number };
  sizes: string[];
  colors: string[];
  inStock: boolean;
} | null {
  const p = DEMO_MARKET_PRODUCTS.find((x) => x.id === id);
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    originalPrice: p.oldPrice ?? p.price,
    images: [p.imageUrl],
    rating: p.rating,
    reviews: p.reviews,
    sold: p.reviews * 2,
    seller: { name: p.seller, avatar: '', rating: 4.8, products: 24 },
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['#1a1a1a', '#8B4513'],
    inStock: p.stock > 0,
  };
}

export const DEMO_COURSES: Course[] = [
  {
    id: 'afw-demo-course-rn',
    title: 'React Native — bases (démo)',
    description: 'Composants, navigation, appels API — contenu fictif.',
    thumbnail_url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
    price: 15000,
    currency: 'XOF',
    category: 'tech',
    duration_hours: 12,
    rating: 4.9,
    total_students: 180,
    instructor: { id: 'afw-demo-ins-1', full_name: 'Ibrahim Dembélé', bio: 'Formateur démo' },
  },
  {
    id: 'afw-demo-course-pitch',
    title: 'Pitch startup en 10 slides (démo)',
    description: 'Structurer son storytelling investisseur — maquette.',
    thumbnail_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80',
    price: 0,
    currency: 'XOF',
    category: 'business',
    duration_hours: 3,
    rating: 4.7,
    total_students: 420,
    instructor: { id: 'afw-demo-ins-2', full_name: 'Fatoumata S.', bio: 'Coach démo' },
  },
  {
    id: 'afw-demo-course-bambara',
    title: 'Bambara conversationnel (démo)',
    description: 'Phrases du quotidien — audio fictif.',
    thumbnail_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80',
    price: 8000,
    currency: 'XOF',
    category: 'langue',
    duration_hours: 20,
    rating: 5,
    total_students: 95,
    instructor: { id: 'afw-demo-ins-3', full_name: 'Dr. Touré', bio: 'Linguiste démo' },
  },
  {
    id: 'afw-demo-course-photo',
    title: 'Photo smartphone pro (démo)',
    description: 'Cadrage, lumière et retouche légère — parcours fictif.',
    thumbnail_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244ccff?w=800&q=80',
    price: 5000,
    currency: 'XOF',
    category: 'art',
    duration_hours: 5,
    rating: 4.6,
    total_students: 210,
    instructor: { id: 'afw-demo-ins-4', full_name: 'Mariam K.', bio: 'Photographe démo' },
  },
  {
    id: 'afw-demo-course-firstaid',
    title: 'Premiers secours citoyens (démo)',
    description: 'Gestes simples — contenu pédagogique fictif, pas un avis médical.',
    thumbnail_url: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=800&q=80',
    price: 0,
    currency: 'XOF',
    category: 'sante',
    duration_hours: 2,
    rating: 4.8,
    total_students: 640,
    instructor: { id: 'afw-demo-ins-5', full_name: 'Secouriste démo', bio: 'Sensibilisation' },
  },
];

export function filterDemoCourses(categoryTabLower: string): Course[] {
  const raw = categoryTabLower.trim().toLowerCase();
  if (!raw || raw === 'tous') return DEMO_COURSES;
  const norm = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return DEMO_COURSES.filter((c) => (c.category || '').toLowerCase() === norm);
}

export function getDemoCourseByIdForApi(id: string): Course | null {
  return DEMO_COURSES.find((c) => c.id === id) ?? null;
}

/** Modèle affiché par `app/courses/[id].tsx`. */
export function getDemoCourseDetailView(id: string): {
  id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  price: number;
  currency?: string | null;
  duration_hours?: number | null;
  rating?: number | null;
  students_count?: number | null;
  instructor_name?: string | null;
  instructor_avatar?: string | null;
  lessons?: { id: string; title: string; duration_minutes?: number | null; order?: number }[];
} | null {
  const c = getDemoCourseByIdForApi(id);
  if (!c) return null;
  return {
    id: c.id,
    title: c.title,
    description: c.description ?? null,
    thumbnail_url: c.thumbnail_url ?? null,
    price: c.price,
    currency: c.currency ?? 'XOF',
    duration_hours: c.duration_hours ?? 8,
    rating: c.rating ?? 4.8,
    students_count: c.total_students ?? 0,
    instructor_name: c.instructor?.full_name ?? null,
    instructor_avatar: c.instructor?.avatar ?? null,
    lessons: [
      { id: 'afw-demo-lesson-1', title: 'Introduction', duration_minutes: 12, order: 1 },
      { id: 'afw-demo-lesson-2', title: 'Mise en pratique', duration_minutes: 28, order: 2 },
      { id: 'afw-demo-lesson-3', title: 'Quiz & ressources', duration_minutes: 15, order: 3 },
    ],
  };
}

export type DemoCommunityListItem = {
  id: string;
  name: string;
  members_count?: number;
  avatar?: string | null;
  banner?: string | null;
  category?: string | null;
  description?: string | null;
  is_member?: boolean;
};

export const DEMO_COMMUNITIES: DemoCommunityListItem[] = [
  {
    id: 'afw-demo-com-live',
    name: 'Créateurs Live Bamako',
    members_count: 1240,
    category: 'Création',
    description: 'Astuces streaming & monétisation — communauté fictive.',
    banner: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=960&q=80',
  },
  {
    id: 'afw-demo-com-fintech',
    name: 'Fintech & mobile money',
    members_count: 890,
    category: 'Finance',
    description: 'Discussions pédagogiques — pas de conseil financier réel.',
    banner: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=960&q=80',
  },
];

export function getDemoCommunityDetail(id: string): DemoCommunityListItem & {
  members?: { id?: string; role?: string; user?: { id?: string; username?: string | null; profile_image?: string | null } | null }[];
} | null {
  const c = DEMO_COMMUNITIES.find((x) => x.id === id);
  if (!c) return null;
  return {
    ...c,
    members: [
      { id: 'm1', role: 'admin', user: { id: 'u1', username: 'modo_demo', profile_image: null } },
    ],
  };
}

export type DemoCivicPetition = {
  id: string;
  title: string;
  description: string;
  goal_signatures: number;
  current_signatures: number;
  category?: string | null;
  creator?: { full_name?: string | null; profile_image?: string | null } | null;
};

export const DEMO_CIVIC_PETITIONS: DemoCivicPetition[] = [
  {
    id: 'afw-demo-civic-eau',
    title: 'Accès à l’eau potable — quartier démo',
    description:
      'Pétition fictive pour illustrer l’espace civique. Aucune collecte officielle.',
    goal_signatures: 5000,
    current_signatures: 1840,
    category: 'Social',
    creator: { full_name: 'Collectif démo ACI 2000', profile_image: null },
  },
  {
    id: 'afw-demo-civic-verdure',
    title: 'Plus d’espaces verts à Bamako (démo)',
    description: 'Texte d’exemple pour maquette produit — ne pas signer comme engagement réel.',
    goal_signatures: 3000,
    current_signatures: 720,
    category: 'Environnement',
    creator: { full_name: 'ONG Vert Mali (fictif)', profile_image: null },
  },
];

export type DemoMiniAppItem = {
  id: string;
  name: string;
  category?: string | null;
  rating?: number | null;
  installs_count?: number | null;
  icon_url?: string | null;
  description?: string | null;
};

export const DEMO_MINI_APPS: DemoMiniAppItem[] = [
  {
    id: 'afw-demo-mini-budget',
    name: 'Budget perso (démo)',
    category: 'finance',
    rating: 4.6,
    installs_count: 3200,
    description: 'Suivi de dépenses fictif.',
  },
  {
    id: 'afw-demo-mini-sante',
    name: 'Rappels santé (démo)',
    category: 'sante',
    rating: 4.4,
    installs_count: 1500,
    description: 'Notifications démo — pas d’avis médical.',
  },
  {
    id: 'afw-demo-mini-quiz',
    name: 'Quiz culture Mali (démo)',
    category: 'education',
    rating: 4.9,
    installs_count: 8900,
    description: 'Jeu questions-réponses pour présentation.',
  },
  {
    id: 'afw-demo-mini-delivery',
    name: 'Suivi colis local (démo)',
    category: 'commerce',
    rating: 4.3,
    installs_count: 2100,
    description: 'Suivi fictif de livraisons.',
  },
];

export function filterDemoMiniApps(categoryLabel: string, search: string): DemoMiniAppItem[] {
  const cat = categoryLabel.trim().toLowerCase();
  const q = search.trim().toLowerCase();
  return DEMO_MINI_APPS.filter((app) => {
    const okCat = cat === 'tous' || String(app.category || '').toLowerCase() === cat;
    const okQ =
      !q
      || app.name.toLowerCase().includes(q)
      || String(app.description || '').toLowerCase().includes(q);
    return okCat && okQ;
  });
}

export type DemoWalletTransactionRow = {
  id: string;
  type: 'received' | 'sent' | string;
  name: string;
  amount: number;
  date: string;
  icon: string;
};

export const DEMO_WALLET_TRANSACTIONS: DemoWalletTransactionRow[] = [
  {
    id: 'afw-demo-wtx-1',
    type: 'received',
    name: 'Recharge (démo)',
    amount: 25000,
    date: "Aujourd'hui, 09:30",
    icon: 'arrow-down',
  },
  {
    id: 'afw-demo-wtx-2',
    type: 'sent',
    name: 'Transfert sortant (démo)',
    amount: 5000,
    date: 'Hier, 14:12',
    icon: 'arrow-up',
  },
  {
    id: 'afw-demo-wtx-3',
    type: 'received',
    name: 'Cashback partenaire (démo)',
    amount: 1200,
    date: '28 Avr.',
    icon: 'arrow-down',
  },
];
