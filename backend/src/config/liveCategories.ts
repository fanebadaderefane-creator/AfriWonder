/** CDC Live Streaming Mali — Catégories principales */
export const LIVE_CATEGORIES = [
  { id: 'musique', name: 'Musique', icon: '🎵' },
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  { id: 'education', name: 'Éducation', icon: '📚' },
  { id: 'cuisine', name: 'Cuisine', icon: '🍳' },
  { id: 'sport', name: 'Sport', icon: '⚽' },
  { id: 'art', name: 'Art', icon: '🎨' },
  { id: 'influenceurs', name: 'Influenceurs', icon: '⭐' },
  { id: 'entrepreneurs', name: 'Entrepreneurs', icon: '💼' },
  { id: 'journalisme', name: 'Journalisme', icon: '📰' },
  { id: 'religion', name: 'Religion', icon: '🕌' },
  { id: 'general', name: 'Général', icon: '📺' },
] as const;

export const LIVE_TIP_TIERS = {
  standard: { min: 100, max: 500, tier: 'standard', pinSeconds: 0 },
  featured: { min: 500, max: 1000, tier: 'featured', pinSeconds: 0 },
  super: { min: 1000, max: 5000, tier: 'super', pinSeconds: 0 },
  premium: { min: 5000, max: 10000, tier: 'premium', pinSeconds: 30 },
  vip: { min: 10000, max: 1_000_000, tier: 'vip', pinSeconds: 120 },
} as const;

export const LIVE_LANGUAGES = [
  { id: 'fr', name: 'Français' },
  { id: 'bm', name: 'Bambara' },
  { id: 'other', name: 'Autre' },
] as const;

export const LIVE_AGE_RESTRICTIONS = [
  { id: 'all', name: 'Tout public' },
  { id: '13+', name: '13+' },
  { id: '18+', name: '18+' },
] as const;
