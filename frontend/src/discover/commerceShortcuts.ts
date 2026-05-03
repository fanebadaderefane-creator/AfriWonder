import { Ionicons } from '@expo/vector-icons';

export type CommerceShortcut = {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
  /** Masqué si le flag correspondant est false (voir `featureFlags`). */
  flag?: 'marketplace' | 'news';
};

/**
 * Même périmètre que la section « COMMERCE & SERVICES » du Menu + mobile / PWA
 * (`frontend/app/menu-plus.tsx`, `src/components/navigation/MenuPlus.jsx`).
 */
export const COMMERCE_AND_SERVICES_SHORTCUTS: CommerceShortcut[] = [
  { id: 'market', name: 'Marketplace', icon: 'cart-outline', color: '#FF6B00', route: '/(tabs)/market', flag: 'marketplace' },
  { id: 'events', name: 'Événements', icon: 'ticket-outline', color: '#DDA0DD', route: '/services/events' },
  { id: 'transport', name: 'Transport', icon: 'car-outline', color: '#4ECDC4', route: '/services/transport' },
  { id: 'food', name: 'Restauration', icon: 'restaurant-outline', color: '#FF6B6B', route: '/services/food' },
  { id: 'services', name: 'Services', icon: 'flash-outline', color: '#FFB347', route: '/services' },
  { id: 'health', name: 'Santé', icon: 'heart-outline', color: '#45B7D1', route: '/services/health' },
  { id: 'realestate', name: 'Immobilier', icon: 'business-outline', color: '#96CEB4', route: '/services/realestate' },
  { id: 'insurance', name: 'Assurances', icon: 'shield-outline', color: '#6C5CE7', route: '/services/insurance' },
  { id: 'seller', name: 'Prestataires', icon: 'construct-outline', color: '#F8B500', route: '/seller' },
  { id: 'news', name: 'Actualités', icon: 'newspaper-outline', color: '#E67E22', route: '/news', flag: 'news' },
  { id: 'microcredit', name: 'Microcrédit', icon: 'card-outline', color: '#1ABC9C', route: '/wallet/microcredit' },
  { id: 'menuplus', name: 'Menu +', icon: 'reorder-three-outline', color: '#9B59B6', route: '/menu-plus' },
];

export function filterCommerceShortcuts(flags: { marketplace: boolean; news: boolean }): CommerceShortcut[] {
  return COMMERCE_AND_SERVICES_SHORTCUTS.filter((s) => {
    if (s.flag === 'marketplace' && !flags.marketplace) return false;
    if (s.flag === 'news' && !flags.news) return false;
    return true;
  });
}
