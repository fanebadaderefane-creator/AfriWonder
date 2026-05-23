/**
 * Catalogue cadeaux live (CDC 6.4 : 50+ entrées, thème africain + paliers).
 * Les `id` sont dérivés du nom dans seed.ts (upsert stable).
 *
 * Catégories : classic, reaction, music, food, party, african, luxury, sport, fantasy, gaming, nature, culture, vip
 * Rarités : common (≤100 coins), rare (101-500), epic (501-2000), legendary (2001-10000), mythic (10001+)
 *
 * 1 coin = 5 FCFA (taux indicatif, ajustable via env LIVE_COIN_RATE_XOF)
 */
export const LIVE_GIFTS_SEED = [
  // === COMMON (1-100 coins / 5-500 FCFA) — Les "petits" cadeaux fréquents ===
  { name: 'Rose', icon: '🌹', price: 1, coin_value: 1, category: 'classic', rarity: 'common', animation_url: '/animations/gifts/rose.json' },
  { name: 'Pétale', icon: '🌸', price: 2, coin_value: 2, category: 'classic', rarity: 'common', animation_url: '/animations/gifts/petal.json' },
  { name: 'Cœur', icon: '❤️', price: 3, coin_value: 3, category: 'classic', rarity: 'common', animation_url: '/animations/gifts/heart.json' },
  { name: 'Étoile', icon: '⭐', price: 5, coin_value: 5, category: 'classic', rarity: 'common', animation_url: '/animations/gifts/star.json' },
  { name: 'Sparkle', icon: '✨', price: 5, coin_value: 5, category: 'classic', rarity: 'common', animation_url: '/animations/gifts/sparkle.json' },
  { name: 'Café', icon: '☕', price: 7, coin_value: 7, category: 'food', rarity: 'common', animation_url: '/animations/gifts/coffee.json' },
  { name: 'Cupcake', icon: '🧁', price: 8, coin_value: 8, category: 'food', rarity: 'common', animation_url: '/animations/gifts/cupcake.json' },
  { name: 'Applaudissements', icon: '👏', price: 10, coin_value: 10, category: 'reaction', rarity: 'common', animation_url: '/animations/gifts/clap.json' },
  { name: 'Pizza', icon: '🍕', price: 12, coin_value: 12, category: 'food', rarity: 'common', animation_url: '/animations/gifts/pizza.json' },
  { name: 'Micro', icon: '🎤', price: 15, coin_value: 15, category: 'music', rarity: 'common', animation_url: '/animations/gifts/mic.json' },
  { name: 'Sushi', icon: '🍣', price: 18, coin_value: 18, category: 'food', rarity: 'common', animation_url: '/animations/gifts/sushi.json' },
  { name: 'Note de musique', icon: '🎵', price: 20, coin_value: 20, category: 'music', rarity: 'common', animation_url: '/animations/gifts/note.json' },
  { name: 'Gâteau', icon: '🎂', price: 22, coin_value: 22, category: 'food', rarity: 'common', animation_url: '/animations/gifts/cake.json' },
  { name: 'Bière', icon: '🍺', price: 25, coin_value: 25, category: 'food', rarity: 'common', animation_url: '/animations/gifts/beer.json' },
  { name: 'Thiéboudienne', icon: '🍛', price: 28, coin_value: 28, category: 'culture', rarity: 'common', animation_url: '/animations/gifts/thieb.json' },
  { name: 'Bouquet', icon: '💐', price: 30, coin_value: 30, category: 'classic', rarity: 'common', animation_url: '/animations/gifts/bouquet.json' },
  { name: 'Bissap', icon: '🥤', price: 32, coin_value: 32, category: 'culture', rarity: 'common', animation_url: '/animations/gifts/bissap.json' },
  { name: 'Football', icon: '⚽', price: 35, coin_value: 35, category: 'sport', rarity: 'common', animation_url: '/animations/gifts/football.json' },
  { name: 'Basket', icon: '🏀', price: 38, coin_value: 38, category: 'sport', rarity: 'common', animation_url: '/animations/gifts/basket.json' },
  { name: 'Ballon', icon: '🎈', price: 40, coin_value: 40, category: 'party', rarity: 'common', animation_url: '/animations/gifts/balloon.json' },
  { name: 'Manette', icon: '🎮', price: 45, coin_value: 45, category: 'gaming', rarity: 'common', animation_url: '/animations/gifts/controller.json' },
  { name: 'Mangue', icon: '🥭', price: 48, coin_value: 48, category: 'culture', rarity: 'common', animation_url: '/animations/gifts/mango.json' },
  { name: 'Djembé', icon: '🥁', price: 50, coin_value: 50, category: 'african', rarity: 'common', animation_url: '/animations/gifts/djembe.json' },

  // === RARE (51-300 coins / 250-1500 FCFA) ===
  { name: 'Casque VR', icon: '🥽', price: 55, coin_value: 55, category: 'gaming', rarity: 'rare', animation_url: '/animations/gifts/vr.json' },
  { name: 'Kora', icon: '🎼', price: 60, coin_value: 60, category: 'african', rarity: 'rare', animation_url: '/animations/gifts/kora.json' },
  { name: 'Balafon', icon: '🎹', price: 65, coin_value: 65, category: 'african', rarity: 'rare', animation_url: '/animations/gifts/balafon.json' },
  { name: 'Boubou', icon: '👘', price: 70, coin_value: 70, category: 'culture', rarity: 'rare', animation_url: '/animations/gifts/boubou.json' },
  { name: 'Masque Dogon', icon: '🎭', price: 75, coin_value: 75, category: 'african', rarity: 'rare', animation_url: '/animations/gifts/mask.json' },
  { name: 'Soleil Afrique', icon: '☀️', price: 80, coin_value: 80, category: 'african', rarity: 'rare', animation_url: '/animations/gifts/sun.json' },
  { name: 'Éclair', icon: '⚡', price: 90, coin_value: 90, category: 'reaction', rarity: 'rare', animation_url: '/animations/gifts/bolt.json' },
  { name: 'Baobab', icon: '🌳', price: 100, coin_value: 100, category: 'african', rarity: 'rare', animation_url: '/animations/gifts/baobab.json' },
  { name: 'Arc-en-ciel', icon: '🌈', price: 110, coin_value: 110, category: 'nature', rarity: 'rare', animation_url: '/animations/gifts/rainbow.json' },
  { name: 'Couronne', icon: '👑', price: 120, coin_value: 120, category: 'luxury', rarity: 'rare', animation_url: '/animations/gifts/crown.json' },
  { name: 'Tabaski', icon: '🐏', price: 140, coin_value: 140, category: 'culture', rarity: 'rare', animation_url: '/animations/gifts/tabaski.json' },
  { name: 'Diamant', icon: '💎', price: 150, coin_value: 150, category: 'luxury', rarity: 'rare', animation_url: '/animations/gifts/diamond.json' },
  { name: 'Tour Eiffel africaine', icon: '🗼', price: 160, coin_value: 160, category: 'culture', rarity: 'rare', animation_url: '/animations/gifts/tower.json' },
  { name: 'Rubis', icon: '♦️', price: 180, coin_value: 180, category: 'luxury', rarity: 'rare', animation_url: '/animations/gifts/ruby.json' },
  { name: 'Feu d\'artifice', icon: '🎆', price: 200, coin_value: 200, category: 'party', rarity: 'rare', animation_url: '/animations/gifts/firework.json' },
  { name: 'Saphir', icon: '🔷', price: 220, coin_value: 220, category: 'luxury', rarity: 'rare', animation_url: '/animations/gifts/sapphire.json' },
  { name: 'Lion africain', icon: '🦁', price: 250, coin_value: 250, category: 'african', rarity: 'rare', animation_url: '/animations/gifts/lion.json' },
  { name: 'Zèbre', icon: '🦓', price: 260, coin_value: 260, category: 'african', rarity: 'rare', animation_url: '/animations/gifts/zebra.json' },
  { name: 'Girafe', icon: '🦒', price: 270, coin_value: 270, category: 'african', rarity: 'rare', animation_url: '/animations/gifts/giraffe.json' },
  { name: 'Safari', icon: '🚙', price: 280, coin_value: 280, category: 'african', rarity: 'rare', animation_url: '/animations/gifts/safari.json' },
  { name: 'Éléphant', icon: '🐘', price: 300, coin_value: 300, category: 'african', rarity: 'rare', animation_url: '/animations/gifts/elephant.json' },

  // === EPIC (301-2000 coins / 1500-10000 FCFA) ===
  { name: 'Volcan', icon: '🌋', price: 350, coin_value: 350, category: 'nature', rarity: 'epic', animation_url: '/animations/gifts/volcano.json' },
  { name: 'Trophée', icon: '🏆', price: 400, coin_value: 400, category: 'sport', rarity: 'epic', animation_url: '/animations/gifts/trophy.json' },
  { name: 'Voiture sport', icon: '🚗', price: 450, coin_value: 450, category: 'luxury', rarity: 'epic', animation_url: '/animations/gifts/car.json' },
  { name: 'Champagne', icon: '🍾', price: 500, coin_value: 500, category: 'luxury', rarity: 'epic', animation_url: '/animations/gifts/champagne.json' },
  { name: 'Hélicoptère', icon: '🚁', price: 550, coin_value: 550, category: 'luxury', rarity: 'epic', animation_url: '/animations/gifts/heli.json' },
  { name: 'Yacht', icon: '🛥️', price: 600, coin_value: 600, category: 'luxury', rarity: 'epic', animation_url: '/animations/gifts/yacht.json' },
  { name: 'Pyramide', icon: '🔺', price: 650, coin_value: 650, category: 'culture', rarity: 'epic', animation_url: '/animations/gifts/pyramid.json' },
  { name: 'Tigre', icon: '🐅', price: 700, coin_value: 700, category: 'african', rarity: 'epic', animation_url: '/animations/gifts/tiger.json' },
  { name: 'Dragon', icon: '🐉', price: 750, coin_value: 750, category: 'fantasy', rarity: 'epic', animation_url: '/animations/gifts/dragon.json' },
  { name: 'Bague de fiançailles', icon: '💍', price: 800, coin_value: 800, category: 'luxury', rarity: 'epic', animation_url: '/animations/gifts/ring.json' },
  { name: 'Drapeau Mali', icon: '🇲🇱', price: 850, coin_value: 850, category: 'culture', rarity: 'epic', animation_url: '/animations/gifts/flag_ml.json' },
  { name: 'Drapeau Sénégal', icon: '🇸🇳', price: 850, coin_value: 850, category: 'culture', rarity: 'epic', animation_url: '/animations/gifts/flag_sn.json' },
  { name: 'Drapeau Côte d\'Ivoire', icon: '🇨🇮', price: 850, coin_value: 850, category: 'culture', rarity: 'epic', animation_url: '/animations/gifts/flag_ci.json' },
  { name: 'Cheval blanc', icon: '🐎', price: 900, coin_value: 900, category: 'culture', rarity: 'epic', animation_url: '/animations/gifts/horse.json' },
  { name: 'Phoenix', icon: '🔥', price: 1000, coin_value: 1000, category: 'fantasy', rarity: 'epic', animation_url: '/animations/gifts/phoenix.json' },
  { name: 'Météore', icon: '☄️', price: 1200, coin_value: 1200, category: 'fantasy', rarity: 'epic', animation_url: '/animations/gifts/meteor.json' },
  { name: 'Pluie d\'étoiles', icon: '💫', price: 1300, coin_value: 1300, category: 'fantasy', rarity: 'epic', animation_url: '/animations/gifts/stars.json' },
  { name: 'Aurora boréale', icon: '🌌', price: 1500, coin_value: 1500, category: 'fantasy', rarity: 'epic', animation_url: '/animations/gifts/aurora.json' },
  { name: 'Pluie de roses', icon: '🌺', price: 1700, coin_value: 1700, category: 'classic', rarity: 'epic', animation_url: '/animations/gifts/roses-rain.json' },
  { name: 'Couronne royale', icon: '👸', price: 2000, coin_value: 2000, category: 'luxury', rarity: 'epic', animation_url: '/animations/gifts/royal.json' },

  // === LEGENDARY (2001-10000 coins / 10000-50000 FCFA) ===
  { name: 'Concert privé', icon: '🎙️', price: 2200, coin_value: 2200, category: 'music', rarity: 'legendary', animation_url: '/animations/gifts/concert.json' },
  { name: 'Château', icon: '🏰', price: 2500, coin_value: 2500, category: 'luxury', rarity: 'legendary', animation_url: '/animations/gifts/castle.json' },
  { name: 'Fusée', icon: '🚀', price: 3000, coin_value: 3000, category: 'fantasy', rarity: 'legendary', animation_url: '/animations/gifts/rocket.json' },
  { name: 'Caravane du Sahara', icon: '🐪', price: 3300, coin_value: 3300, category: 'african', rarity: 'legendary', animation_url: '/animations/gifts/caravan.json' },
  { name: 'Île privée', icon: '🏝️', price: 4000, coin_value: 4000, category: 'luxury', rarity: 'legendary', animation_url: '/animations/gifts/island.json' },
  { name: 'Mausolée de Tombouctou', icon: '🕌', price: 4500, coin_value: 4500, category: 'culture', rarity: 'legendary', animation_url: '/animations/gifts/tombouctou.json' },
  { name: 'Jet privé', icon: '✈️', price: 5000, coin_value: 5000, category: 'luxury', rarity: 'legendary', animation_url: '/animations/gifts/jet.json' },
  { name: 'Couronne diamant', icon: '💠', price: 6000, coin_value: 6000, category: 'luxury', rarity: 'legendary', animation_url: '/animations/gifts/diamondcrown.json' },
  { name: 'Empire Mansa Musa', icon: '👑', price: 7000, coin_value: 7000, category: 'culture', rarity: 'legendary', animation_url: '/animations/gifts/mansa-musa.json' },
  { name: 'Palais', icon: '🏛️', price: 7500, coin_value: 7500, category: 'luxury', rarity: 'legendary', animation_url: '/animations/gifts/palace.json' },
  { name: 'Or massif', icon: '🪙', price: 8000, coin_value: 8000, category: 'luxury', rarity: 'legendary', animation_url: '/animations/gifts/gold.json' },
  { name: 'Pluie d\'or', icon: '💰', price: 8500, coin_value: 8500, category: 'luxury', rarity: 'legendary', animation_url: '/animations/gifts/gold-rain.json' },
  { name: 'Planète', icon: '🪐', price: 9000, coin_value: 9000, category: 'fantasy', rarity: 'legendary', animation_url: '/animations/gifts/planet.json' },
  { name: 'Ferrari virtuelle', icon: '🏎️', price: 10000, coin_value: 10000, category: 'luxury', rarity: 'legendary', animation_url: '/animations/gifts/ferrari.json' },

  // === MYTHIC (10001+ coins / 50000+ FCFA) — VIP whales ===
  { name: 'Lamborghini', icon: '🚓', price: 12000, coin_value: 12000, category: 'vip', rarity: 'mythic', animation_url: '/animations/gifts/lambo.json' },
  { name: 'Galaxie complète', icon: '🌠', price: 15000, coin_value: 15000, category: 'vip', rarity: 'mythic', animation_url: '/animations/gifts/galaxy-full.json' },
  { name: 'Empire africain', icon: '🌍', price: 20000, coin_value: 20000, category: 'vip', rarity: 'mythic', animation_url: '/animations/gifts/empire.json' },
  { name: 'Trône royal', icon: '🎖️', price: 25000, coin_value: 25000, category: 'vip', rarity: 'mythic', animation_url: '/animations/gifts/throne.json' },
  { name: 'Légende vivante', icon: '🔱', price: 30000, coin_value: 30000, category: 'vip', rarity: 'mythic', animation_url: '/animations/gifts/legend.json' },
  { name: 'Univers', icon: '♾️', price: 50000, coin_value: 50000, category: 'vip', rarity: 'mythic', animation_url: '/animations/gifts/universe.json' },
];
