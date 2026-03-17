// Même données que PWA FoodDelivery.jsx

export const CATEGORIES = [
  { id: 'all', label: 'Tous' },
  { id: 'malienne', label: 'Malienne' },
  { id: 'africaine', label: 'Africaine' },
  { id: 'internationale', label: 'Internationale' },
  { id: 'fast_food', label: 'Fast Food' },
  { id: 'vegetarien', label: 'Végétarien' },
];

export const MOCK_RESTAURANTS = [
  { id: '1', name: 'Le Djembe', cuisine_type: ['malienne'], cuisineLabel: 'Malienne', rating: 4.8, total_reviews: 234, delivery_time_min: 30, address: 'Hamdallaye, Bamako', city: 'Bamako', delivery_fee: 500, minimum_order: 2000, is_open: true, banner_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop' },
  { id: '2', name: 'Chez Aminata', cuisine_type: ['africaine'], cuisineLabel: 'Africaine', rating: 4.6, total_reviews: 189, delivery_time_min: 25, address: 'ACI 2000, Bamako', city: 'Bamako', delivery_fee: 500, minimum_order: 1500, is_open: true, banner_url: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&h=300&fit=crop' },
  { id: '3', name: 'Pizza Mali', cuisine_type: ['internationale', 'fast_food'], cuisineLabel: 'Internationale', rating: 4.5, total_reviews: 312, delivery_time_min: 35, address: 'Badalabougou, Bamako', city: 'Bamako', delivery_fee: 750, minimum_order: 2500, is_open: false, banner_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop' },
];
