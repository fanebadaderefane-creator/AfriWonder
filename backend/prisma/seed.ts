import 'dotenv/config';
import { randomUUID, createHash } from 'crypto';
import { LIVE_GIFTS_SEED } from './liveGiftsSeedData.js';

function stableGiftId(name: string): string {
  const h = createHash('sha256').update(`AfriWonder:gift:${name}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(12, 15)}-8${h.slice(15, 18)}-${h.slice(18, 30)}`;
}
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Create a .env file or set the variable.');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEMO_USER_EMAIL = 'demo@afriwonder.app';
const DEMO_USER_USERNAME = 'afriwonder_demo';

/** Images placeholder (picsum) */
const img = (w: number, h: number, seed: number) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

/** Vidéos sample (sources publiques courtes) */
const SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
];

async function main() {
  console.log('🌱 Running seed...');

  let demoUser = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
  });

  if (!demoUser) {
    const password_hash = await bcrypt.hash('Demo123!@#', 10);
    demoUser = await prisma.user.create({
      data: {
        email: DEMO_USER_EMAIL,
        username: DEMO_USER_USERNAME,
        password_hash,
        full_name: 'AfriWonder Demo',
        profile_image: img(200, 200, 1),
        bio: 'Compte démo pour présenter la plateforme.',
        role: 'user',
        is_verified: true,
      },
    });
    console.log('   ✓ Utilisateur démo créé:', demoUser.username);
  }

  // SellerProfile pour le marketplace
  let sellerProfile = await prisma.sellerProfile.findUnique({
    where: { user_id: demoUser.id },
  });
  if (!sellerProfile) {
    sellerProfile = await prisma.sellerProfile.create({
      data: {
        user_id: demoUser.id,
        store_name: 'Boutique AfriWonder Demo',
        store_description: 'Produits de démonstration pour découvrir le marketplace.',
        rating: 4.8,
        total_sales: 42,
        is_verified: true,
        status: 'active',
        country: 'ML',
        city: 'Bamako',
        subscription_tier: 'starter',
      },
    });
    console.log('   ✓ Profil vendeur créé');
  }

  // SellerWallet (requis pour les vendeurs)
  let sellerWallet = await prisma.sellerWallet.findUnique({
    where: { user_id: demoUser.id },
  });
  if (!sellerWallet) {
    sellerWallet = await prisma.sellerWallet.create({
      data: {
        user_id: demoUser.id,
        balance: 0,
        currency: 'XOF',
      },
    });
    console.log('   ✓ Portefeuille vendeur créé');
  }

  // Produits fictifs (marketplace)
  const productCount = await prisma.product.count();
  const PRODUCTS = [
    { name: 'Tissu wax africain premium', description: 'Tissu wax de qualité, motifs traditionnels. Idéal pour tenues et décoration.', price: 8500, category: 'mode', imgSeed: 10 },
    { name: 'Attiéké 1 kg', description: 'Attiéké frais, produit en Côte d\'Ivoire. Livraison rapide.', price: 2500, category: 'alimentation', imgSeed: 20 },
    { name: 'Shea butter Bio 500g', description: 'Beurre de karité pur, cosmétique naturel. Made in Mali.', price: 4500, category: 'beaute', imgSeed: 30 },
    { name: 'Sac bandoulière cuir', description: 'Sac artisanal en cuir, fabrication locale. Design unique.', price: 15000, category: 'mode', imgSeed: 40 },
    { name: 'Café moulu 250g', description: 'Café arabica d\'Afrique de l\'Est. Torréfaction artisanale.', price: 3500, category: 'alimentation', imgSeed: 50 },
    { name: 'Bracelet perles colorées', description: 'Bracelet artisanat local. Parfait en cadeau.', price: 1200, category: 'accessoires', imgSeed: 60 },
  ];

  if (productCount === 0) {
    for (const p of PRODUCTS) {
      await prisma.product.create({
        data: {
          name: p.name,
          description: p.description,
          price: p.price,
          stock: 20,
          seller_id: demoUser.id,
          images: [img(800, 800, p.imgSeed)],
          category: p.category,
          status: 'active',
          currency: 'XOF',
          condition: 'new',
          product_type: 'physical',
        },
      });
    }
    console.log('   ✓', PRODUCTS.length, 'produits fictifs créés');
  }

  // Vidéos fictives (accueil)
  const videoCount = await prisma.video.count();
  const VIDEOS = [
    { title: 'Bienvenue sur AfriWonder ✨', description: 'Découvrez la Super App africaine ! #AfriWonder #Africa', category: 'divertissement', vidIdx: 0 },
    { title: 'Tutoriel tissu wax', description: 'Comment porter le wax avec style 🌟 #mode #wax', category: 'mode', vidIdx: 1 },
    { title: 'Recette attiéké maison', description: 'La recette traditionnelle en 5 étapes 🍽️ #cuisine #attieke', category: 'cuisine', vidIdx: 2 },
  ];

  if (videoCount === 0) {
    for (const v of VIDEOS) {
      await prisma.video.create({
        data: {
          title: v.title,
          description: v.description,
          video_url: SAMPLE_VIDEOS[v.vidIdx],
          thumbnail_url: img(400, 600, 100 + v.vidIdx),
          creator_id: demoUser.id,
          visibility: 'public',
          category: v.category,
          views: Math.floor(Math.random() * 500) + 50,
          likes: Math.floor(Math.random() * 80) + 5,
          comments_count: Math.floor(Math.random() * 15),
          shares: Math.floor(Math.random() * 20),
        },
      });
    }
    console.log('   ✓', VIDEOS.length, 'vidéos fictives créées');
  }

  // Feature flags — Lancement 26 février (Phase 2 modules cachés, réactivables en 1 clic)
  try {
    const LAUNCH_FLAGS = [
      { key: 'FEATURE_TRANSPORT', enabled: false, description: 'Transport & Courses' },
      { key: 'FEATURE_FOOD', enabled: false, description: 'Restaurants & Livraison' },
      { key: 'FEATURE_TELEMEDECINE', enabled: false, description: 'Santé & Télémedecine' },
      { key: 'FEATURE_REALESTATE', enabled: false, description: 'Immobilier' },
      { key: 'FEATURE_INSURANCE', enabled: false, description: 'Assurances' },
      { key: 'FEATURE_UTILITIES', enabled: false, description: 'Airtime & Factures' },
      { key: 'FEATURE_TICKETING', enabled: false, description: 'Billets & Événements' },
      { key: 'FEATURE_SERVICES', enabled: false, description: 'Services locaux' },
      { key: 'FEATURE_EDUCATION', enabled: false, description: 'Formations' },
      { key: 'FEATURE_JOBS', enabled: false, description: "Offres d'emploi" },
      { key: 'FEATURE_CIVIC', enabled: false, description: 'Services publics' },
      { key: 'FEATURE_CROWDFUNDING', enabled: false, description: 'Crowdfunding' },
      { key: 'FEATURE_MICROCREDIT', enabled: false, description: 'Microcrédit' },
      { key: 'FEATURE_NEWS', enabled: false, description: 'Actualités' },
      { key: 'FEATURE_OFFLINE', enabled: false, description: 'Mode hors-ligne' },
      { key: 'FEATURE_QRCODE', enabled: false, description: 'Mon QR Code' },
    ];
    for (const f of LAUNCH_FLAGS) {
      await prisma.featureFlag.upsert({
        where: { key: f.key },
        create: f,
        update: { description: f.description },
      });
    }
    console.log('   ✓ Feature flags (Phase 2) initialisés');
  } catch (err: any) {
    console.warn('   ⚠ Feature flags non initialisés (table feature_flags absente?). Exécutez: npx prisma migrate deploy');
  }

  // Mots interdits (CPO 2.43) — liste initiale modérée
  try {
    const BANNED_WORDS = ['spam', 'scam', 'arnaque', 'hack', 'piratage'];
    for (const word of BANNED_WORDS) {
      const w = word.trim().toLowerCase();
      if (w.length < 2) continue;
      await prisma.bannedWord.upsert({
        where: { word: w },
        create: { word: w, is_active: true },
        update: {},
      });
    }
    console.log('   ✓ Mots interdits (BannedWord) initialisés');
  } catch (err: any) {
    console.warn('   ⚠ BannedWord non initialisés (table absente?). Exécutez la migration RUN_MANUAL_CPO_WAVE2.sql');
  }

  // Phase 9 — packs coins (DB)
  try {
    const packs: Array<{
      slug: string;
      name: string;
      coins_amount: number;
      price_fcfa: number;
      bonus_coins: number;
      is_popular: boolean;
      sort_order: number;
    }> = [
      // Petit pack pour essayer (test new user)
      { slug: 'coins-50', name: 'Pack Découverte', coins_amount: 50, price_fcfa: 250, bonus_coins: 0, is_popular: false, sort_order: 5 },
      // Starter — équivalent ~1-2 cadeaux moyens
      { slug: 'coins-100', name: 'Pack 100', coins_amount: 100, price_fcfa: 500, bonus_coins: 0, is_popular: false, sort_order: 10 },
      // Standard — 5% bonus
      { slug: 'coins-300', name: 'Pack 300', coins_amount: 300, price_fcfa: 1500, bonus_coins: 15, is_popular: false, sort_order: 15 },
      // Populaire — 5% bonus
      { slug: 'coins-500', name: 'Pack 500', coins_amount: 500, price_fcfa: 2500, bonus_coins: 25, is_popular: true, sort_order: 20 },
      // Pro — 7.5% bonus
      { slug: 'coins-1000', name: 'Pack 1000', coins_amount: 1000, price_fcfa: 5000, bonus_coins: 75, is_popular: false, sort_order: 30 },
      // Premium — 10% bonus
      { slug: 'coins-2500', name: 'Pack 2500', coins_amount: 2500, price_fcfa: 12500, bonus_coins: 250, is_popular: false, sort_order: 35 },
      // Power user — 10% bonus
      { slug: 'coins-5000', name: 'Pack 5000', coins_amount: 5000, price_fcfa: 25000, bonus_coins: 500, is_popular: false, sort_order: 40 },
      // VIP — 12% bonus
      { slug: 'coins-10000', name: 'Pack VIP 10K', coins_amount: 10000, price_fcfa: 50000, bonus_coins: 1200, is_popular: false, sort_order: 50 },
      // Whale — 15% bonus + badge VIP
      { slug: 'coins-25000', name: 'Pack Whale 25K', coins_amount: 25000, price_fcfa: 125000, bonus_coins: 3750, is_popular: false, sort_order: 60 },
      // Mythic — 18% bonus (cap supérieur)
      { slug: 'coins-50000', name: 'Pack Légende 50K', coins_amount: 50000, price_fcfa: 250000, bonus_coins: 9000, is_popular: false, sort_order: 70 },
    ];
    for (const p of packs) {
      await prisma.coinPackage.upsert({
        where: { slug: p.slug },
        create: {
          id: randomUUID(),
          ...p,
          is_active: true,
        },
        update: {
          name: p.name,
          coins_amount: p.coins_amount,
          price_fcfa: p.price_fcfa,
          bonus_coins: p.bonus_coins,
          is_popular: p.is_popular,
          sort_order: p.sort_order,
          is_active: true,
        },
      });
    }
    console.log(`   ✓ CoinPackage (Phase 9) initialisés (${packs.length} packs)`);
  } catch (err: any) {
    console.warn('   ⚠ CoinPackage non initialisés — migration Phase 9 appliquée ?', err?.message);
  }

  // Phase 9 — cadeaux virtuels live (catalogue CDC 50+)
  try {
    for (const g of LIVE_GIFTS_SEED) {
      const id = stableGiftId(g.name);
      await prisma.gift.upsert({
        where: { id },
        create: {
          id,
          name: g.name,
          icon: g.icon,
          price: g.price,
          coin_value: g.coin_value,
          category: g.category,
          animation_url: g.animation_url,
          rarity: g.rarity,
          is_active: true,
        },
        update: {
          icon: g.icon,
          price: g.price,
          coin_value: g.coin_value,
          category: g.category,
          animation_url: g.animation_url,
          rarity: g.rarity,
          is_active: true,
        },
      });
    }
    console.log(`   ✓ Gifts virtuels live (${LIVE_GIFTS_SEED.length} entrées, upsert stable)`);
  } catch (err: any) {
    console.warn('   ⚠ Gifts non initialisés', err?.message);
  }

  console.log('✅ Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
