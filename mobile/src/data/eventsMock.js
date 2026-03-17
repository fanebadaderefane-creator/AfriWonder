// Même données que PWA Events.jsx

export const CATEGORIES = [
  { id: 'all', label: 'Tous' },
  { id: 'musique', label: 'Musique' },
  { id: 'technologie', label: 'Technologie' },
  { id: 'culture', label: 'Culture' },
  { id: 'sport', label: 'Sport' },
  { id: 'business', label: 'Business' },
  { id: 'art', label: 'Art' },
];

export const PAYMENT_METHODS = [
  { id: 'orange_money', label: 'Orange Money', icon: '🟠' },
  { id: 'mtn_mobile', label: 'MTN Mobile', icon: '🟡' },
  { id: 'wave', label: 'Wave', icon: '🔵' },
  { id: 'wallet', label: 'Mon Wallet', icon: '💚' },
];

export const MOCK_EVENTS = [
  { id: '1', title: 'Festival de Musique de Bamako', description: 'Un grand festival de musique réunissant les meilleurs artistes du Mali', start_date: '2025-03-15T18:00:00Z', location: 'Stade Modibo Keïta, Bamako', price: 5000, is_free: false, currency: 'XOF', category: 'musique', organizer_name: 'Mali Events', tickets_sold: 0, capacity_remaining: 1234, image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop' },
  { id: '2', title: 'Conférence Tech Mali 2025', description: 'Conférence sur les technologies émergentes et l\'innovation au Mali', start_date: '2025-04-10T09:00:00Z', location: 'Centre International de Conférences, Bamako', price: 0, is_free: true, currency: 'XOF', category: 'technologie', organizer_name: 'TechMali', tickets_sold: 0, capacity_remaining: 234, image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop' },
  { id: '3', title: 'Marché Artisanal de Bamako', description: 'Découvrez l\'artisanat malien dans un marché traditionnel', start_date: '2025-03-20T08:00:00Z', location: 'Grand Marché, Bamako', price: 1000, is_free: false, currency: 'XOF', category: 'culture', organizer_name: 'Artisans Mali', tickets_sold: 0, capacity_remaining: 1500, image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop' },
  { id: '4', title: 'Tournoi de Football Inter-Quartiers', description: 'Compétition de football entre les quartiers de Bamako', start_date: '2025-03-25T15:00:00Z', location: 'Stade du 26 Mars, Bamako', price: 2000, is_free: false, currency: 'XOF', category: 'sport', organizer_name: 'Fédération Sportive Mali', tickets_sold: 0, capacity_remaining: 5000, image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=600&fit=crop' },
  { id: '5', title: 'Forum Entrepreneurial 2025', description: 'Rencontrez des entrepreneurs et investisseurs pour développer votre business', start_date: '2025-04-05T10:00:00Z', location: 'Hôtel Radisson Blu, Bamako', price: 10000, is_free: false, currency: 'XOF', category: 'business', organizer_name: 'Chambre de Commerce', tickets_sold: 0, capacity_remaining: 150, image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=600&fit=crop' },
  { id: '6', title: 'Exposition d\'Art Contemporain', description: 'Découvrez les œuvres des artistes contemporains maliens', start_date: '2025-03-18T14:00:00Z', location: 'Musée National du Mali, Bamako', price: 3000, is_free: false, currency: 'XOF', category: 'art', organizer_name: 'Galerie Art Mali', tickets_sold: 0, capacity_remaining: 300, image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop' },
];
