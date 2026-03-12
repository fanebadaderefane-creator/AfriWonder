// Données fictives Immobilier — cohérentes avec PWA RealEstate.jsx

export const TRANSACTION_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'sale', label: 'Vente' },
  { value: 'rent', label: 'Location' },
];

export const PROPERTY_TYPE_OPTIONS = [
  { value: '', label: 'Tous types' },
  { value: 'villa', label: 'Villa' },
  { value: 'apartment', label: 'Appartement' },
  { value: 'office', label: 'Bureau' },
  { value: 'land', label: 'Terrain' },
  { value: 'shop', label: 'Commerce' },
];

export const MOCK_PROPERTIES = [
  {
    id: 'mock-villa-aci',
    _mock: true,
    listing_type: 'sale',
    property_type: 'villa',
    title: 'Villa moderne à ACI 2000',
    address: 'ACI 2000',
    city: 'Bamako',
    neighborhood: 'ACI 2000',
    price: 150000000,
    bedrooms: 4,
    bathrooms: 3,
    surface_area: 250,
    description: 'Belle villa moderne avec toutes les commodités.',
    amenities: ['Piscine', 'Garage', 'Jardin', 'Sécurité 24h'],
    owner_phone: '+223 70 00 00 00',
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'],
    status: 'available',
  },
  {
    id: 'mock-apt-badalabougou',
    _mock: true,
    listing_type: 'rent',
    property_type: 'apartment',
    title: 'Appartement F3 à Badalabougou',
    address: 'Badalabougou',
    city: 'Bamako',
    neighborhood: 'Badalabougou',
    price: 250000,
    bedrooms: 2,
    bathrooms: 1,
    surface_area: 85,
    description: 'Appartement bien situé proche des commodités.',
    amenities: ['Climatisation', 'Eau courante', 'Électricité'],
    owner_phone: '+223 76 12 34 56',
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
    status: 'available',
  },
];
