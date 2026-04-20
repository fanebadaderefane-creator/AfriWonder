import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type GiftCatalogRow = {
  id: string;
  name: string;
  icon: IconName;
  /** Montant facturé côté API (FCFA / XOF), min 100. */
  amountXof: number;
  color: string;
};

/** Catalogue étendu (50+). Les montants respectent le plancher backend 100 FCFA. 100 coins ≈ 500 FCFA (taux indicatif). */
export const EXTENDED_GIFT_CATALOG: GiftCatalogRow[] = [
  { id: 'rose', name: 'Rose', icon: 'flower-outline', amountXof: 100, color: '#FF6B9D' },
  { id: 'like', name: 'Pouce', icon: 'thumbs-up', amountXof: 100, color: '#74B9FF' },
  { id: 'icecream', name: 'Glacier', icon: 'ice-cream', amountXof: 150, color: '#FD79A8' },
  { id: 'cafe', name: 'Café', icon: 'cafe', amountXof: 200, color: '#6D4C41' },
  { id: 'beer', name: 'Bière', icon: 'beer', amountXof: 250, color: '#FDCB6E' },
  { id: 'pizza', name: 'Pizza', icon: 'pizza', amountXof: 300, color: '#E17055' },
  { id: 'djembe', name: 'Djembé', icon: 'ellipse', amountXof: 400, color: '#D35400' },
  { id: 'kora2', name: 'Kora', icon: 'musical-notes', amountXof: 500, color: '#E17055' },
  { id: 'mask_dogon', name: 'Masque Dogon', icon: 'color-filter', amountXof: 600, color: '#A29BFE' },
  { id: 'lion_sahel', name: 'Lion Sahel', icon: 'paw-outline', amountXof: 700, color: '#F39C12' },
  { id: 'baobab2', name: 'Baobab', icon: 'leaf', amountXof: 800, color: '#00B894' },
  { id: 'soleil', name: 'Soleil Afrique', icon: 'sunny', amountXof: 900, color: '#F9CA24' },
  { id: 'heart', name: 'Cœur', icon: 'heart', amountXof: 100, color: '#FF4757' },
  { id: 'star', name: 'Étoile', icon: 'star', amountXof: 200, color: '#FFEAA7' },
  { id: 'flame', name: 'Feu', icon: 'flame', amountXof: 350, color: '#FF6B00' },
  { id: 'leaf', name: 'Baobab', icon: 'leaf', amountXof: 750, color: '#00B894' },
  { id: 'diamond', name: 'Diamant', icon: 'diamond', amountXof: 1500, color: '#74B9FF' },
  { id: 'people', name: 'Ubuntu', icon: 'people', amountXof: 2500, color: '#A29BFE' },
  { id: 'kente', name: 'Kente', icon: 'color-filter', amountXof: 4000, color: '#E84393' },
  { id: 'crown', name: 'Couronne', icon: 'trophy', amountXof: 6000, color: '#FFD700' },
  { id: 'lion', name: "Lion d'or", icon: 'shield', amountXof: 10000, color: '#FF6B00' },
  { id: 'sparkles', name: 'Masque & fête', icon: 'sparkles', amountXof: 15000, color: '#FD79A8' },
  { id: 'rocket', name: 'Fusée', icon: 'rocket', amountXof: 20000, color: '#A855F7' },
  { id: 'africa', name: 'Afrique', icon: 'globe', amountXof: 25000, color: '#10B981' },
  { id: 'planet', name: 'Planète', icon: 'planet', amountXof: 40000, color: '#0984E3' },
  { id: 'ribbon', name: 'Union & paix', icon: 'ribbon', amountXof: 50000, color: '#F9CA24' },
  { id: 'car', name: 'Ferrari', icon: 'car-sport-outline', amountXof: 50000, color: '#E74C3C' },
  { id: 'yacht', name: 'Yacht', icon: 'boat', amountXof: 45000, color: '#3498DB' },
  { id: 'castle', name: 'Palais', icon: 'business', amountXof: 48000, color: '#9B59B6' },
  { id: 'galaxy', name: 'Galaxie', icon: 'planet', amountXof: 52000, color: '#1ABC9C' },
  { id: 'phoenix', name: 'Phoenix', icon: 'flame', amountXof: 38000, color: '#E67E22' },
  { id: 'crown2', name: 'Roi du live', icon: 'medal', amountXof: 42000, color: '#FFD700' },
  { id: 'drum', name: 'Tamtam', icon: 'radio', amountXof: 1200, color: '#8E44AD' },
  { id: 'savane', name: 'Savane', icon: 'partly-sunny', amountXof: 1100, color: '#F1C40F' },
  { id: 'elephant', name: 'Éléphant', icon: 'paw', amountXof: 18000, color: '#95A5A6' },
  { id: 'girafe', name: 'Girafe', icon: 'barcode', amountXof: 9000, color: '#F39C12' },
  { id: 'zebre', name: 'Zèbre', icon: 'remove', amountXof: 8500, color: '#BDC3C7' },
  { id: 'hippo', name: 'Hippo', icon: 'water', amountXof: 13000, color: '#7F8C8D' },
  { id: 'okapi', name: 'Forêt', icon: 'trail-sign', amountXof: 7000, color: '#27AE60' },
  { id: 'ruby', name: 'Rubis', icon: 'diamond', amountXof: 22000, color: '#C0392B' },
  { id: 'saphir', name: 'Saphir', icon: 'water', amountXof: 24000, color: '#2980B9' },
  { id: 'emeraude', name: 'Émeraude', icon: 'leaf', amountXof: 26000, color: '#16A085' },
  { id: 'opal', name: 'Opale', icon: 'cloud', amountXof: 28000, color: '#BDC3C7' },
  { id: 'meteor', name: 'Météore', icon: 'flash', amountXof: 32000, color: '#E74C3C' },
  { id: 'comet', name: 'Comète', icon: 'flash-outline', amountXof: 30000, color: '#9B59B6' },
  { id: 'volcano', name: 'Volcan', icon: 'bonfire', amountXof: 35000, color: '#E74C3C' },
  { id: 'oasis', name: 'Oasis', icon: 'water', amountXof: 16000, color: '#1ABC9C' },
  { id: 'desert', name: 'Dune', icon: 'triangle', amountXof: 14000, color: '#D68910' },
  { id: 'harmattan', name: 'Harmattan', icon: 'cloudy', amountXof: 17000, color: '#B7950B' },
  { id: 'sahel_star', name: 'Étoile Sahel', icon: 'star', amountXof: 19000, color: '#F4D03F' },
  { id: 'nile', name: 'Nil', icon: 'water-outline', amountXof: 21000, color: '#3498DB' },
  { id: 'kilimanjaro', name: 'Sommet', icon: 'trending-up', amountXof: 33000, color: '#7F8C8D' },
  { id: 'sahara', name: 'Sahara', icon: 'sunny', amountXof: 36000, color: '#F39C12' },
  { id: 'afrobeat', name: 'AfroBeat', icon: 'headset', amountXof: 44000, color: '#E91E63' },
  { id: 'legend', name: 'Légende', icon: 'infinite', amountXof: 55000, color: '#FFD700' },
];
