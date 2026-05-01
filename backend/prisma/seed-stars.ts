/**
 * Seed dédié au module "Appels vidéo payants" (User ↔ Star).
 * Isolé du seed principal — directive produit : la feature ne doit pas être
 * mélangée avec les autres modules.
 *
 * Crée ~12 stars de test, vérifiées et actives, réparties sur 6 catégories
 * (Musicians, Comedians, Coachs, Influencer, Media, Mentors) pour permettre
 * de tester la discovery, le hero featured, les stories et les sections.
 *
 * Idempotent : ré-exécutable sans dupliquer.
 *
 * Exécution :
 *   cd backend
 *   npm run db:seed:stars
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is not set. Configure backend/.env first.');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type DayRule = { day_of_week: number; start_time: string; end_time: string };
type StarCategory = 'Musicians' | 'Comedians' | 'Coachs' | 'Influencer' | 'Media' | 'Mentors';
type StarTier = 'standard' | 'premium';

type SeedStar = {
  email: string;
  username: string;
  full_name: string;
  profile_image: string;
  bio: string;
  headline: string;
  languages: string[];
  tags: string[];
  category: StarCategory;
  country: string; // ISO-2
  tier: StarTier;
  is_featured?: boolean;
  price5: number;
  price10: number;
  price15: number;
  max_calls_per_day: number;
  availability: DayRule[];
};

const SEED_PASSWORD = 'Star123!@#';
const TIMEZONE = 'Africa/Bamako';

/** Créneaux hebdomadaires standards : Lun-Ven 18h-22h + Sam-Dim 14h-20h. */
const STD_AVAILABILITY: DayRule[] = [
  { day_of_week: 1, start_time: '18:00', end_time: '22:00' },
  { day_of_week: 2, start_time: '18:00', end_time: '22:00' },
  { day_of_week: 3, start_time: '18:00', end_time: '22:00' },
  { day_of_week: 4, start_time: '18:00', end_time: '22:00' },
  { day_of_week: 5, start_time: '18:00', end_time: '23:00' },
  { day_of_week: 6, start_time: '14:00', end_time: '20:00' },
  { day_of_week: 0, start_time: '14:00', end_time: '20:00' },
];

const STARS: SeedStar[] = [
  // ======================== MUSICIANS ========================
  {
    email: 'aicha.star@afriwonder.app',
    username: 'aicha_diallo_star',
    full_name: 'Aïcha Diallo',
    profile_image: 'https://picsum.photos/seed/star-aicha/600/600',
    headline: 'Chanteuse — échanges perso avec tes fans',
    bio: 'Chanteuse et artiste malienne. J’aime échanger avec mes fans, partager mes inspirations et parler musique africaine.',
    languages: ['fr', 'bm'],
    tags: ['musique', 'art', 'bamako'],
    category: 'Musicians',
    country: 'ML',
    tier: 'premium',
    is_featured: true,
    price5: 1500,
    price10: 2800,
    price15: 4000,
    max_calls_per_day: 10,
    availability: STD_AVAILABILITY,
  },
  {
    email: 'iba.star@afriwonder.app',
    username: 'iba_one_star',
    full_name: 'Iba One',
    profile_image: 'https://picsum.photos/seed/star-iba/600/600',
    headline: 'Salut les gladias — appel vidéo perso',
    bio: 'Salut les gladias, je suis là pour vous. Venez, on va échanger en appel vidéo. Ce sera juste moi et mon Fan.',
    languages: ['fr', 'bm'],
    tags: ['musique', 'rap', 'gladias'],
    category: 'Musicians',
    country: 'ML',
    tier: 'premium',
    is_featured: false,
    price5: 2000,
    price10: 3500,
    price15: 5000,
    max_calls_per_day: 8,
    availability: STD_AVAILABILITY,
  },
  {
    email: 'sagaba.star@afriwonder.app',
    username: 'sagaba_star',
    full_name: 'Sagaba Diarra',
    profile_image: 'https://picsum.photos/seed/star-sagaba/600/600',
    headline: 'Producteur & artiste — parle musique avec moi',
    bio: 'Producteur de musique malienne et artiste. Conseils carrière, écoute de tes maquettes, échange créatif.',
    languages: ['fr', 'bm', 'en'],
    tags: ['musique', 'production', 'studio'],
    category: 'Musicians',
    country: 'ML',
    tier: 'standard',
    price5: 1500,
    price10: 2800,
    price15: 4000,
    max_calls_per_day: 6,
    availability: STD_AVAILABILITY,
  },

  // ======================== COMEDIANS ========================
  {
    email: 'diaba.star@afriwonder.app',
    username: 'diaba_comedy_star',
    full_name: 'Diaba Sora',
    profile_image: 'https://picsum.photos/seed/star-diaba/600/600',
    headline: 'Humoriste — un appel pour rire ensemble',
    bio: 'Humoriste malienne. On va rire, je raconte mes meilleures vannes et tu me racontes ta semaine la plus folle.',
    languages: ['fr', 'bm'],
    tags: ['humour', 'comedy', 'fun'],
    category: 'Comedians',
    country: 'ML',
    tier: 'premium',
    is_featured: false,
    price5: 1200,
    price10: 2200,
    price15: 3000,
    max_calls_per_day: 12,
    availability: STD_AVAILABILITY,
  },
  {
    email: 'modibo.comedy.star@afriwonder.app',
    username: 'modibo_comedy_star',
    full_name: 'Modibo Coulibaly',
    profile_image: 'https://picsum.photos/seed/star-modibo/600/600',
    headline: 'Stand-up Bamako — un appel décalé',
    bio: 'Comédien stand-up. Je fais du contenu humoristique sur la vie quotidienne au Mali. On rigole en appel.',
    languages: ['fr', 'bm'],
    tags: ['standup', 'humour'],
    category: 'Comedians',
    country: 'ML',
    tier: 'standard',
    price5: 1000,
    price10: 1800,
    price15: 2500,
    max_calls_per_day: 8,
    availability: STD_AVAILABILITY,
  },

  // ======================== COACHS ========================
  {
    email: 'mamadou.star@afriwonder.app',
    username: 'mamadou_coach_star',
    full_name: 'Mamadou Kéita',
    profile_image: 'https://picsum.photos/seed/star-mamadou/600/600',
    headline: 'Coach football — 1-à-1 motivation & conseils',
    bio: 'Coach sportif et ancien joueur de football. Je partage conseils, motivation et plans d’entraînement adaptés.',
    languages: ['fr', 'en'],
    tags: ['sport', 'football', 'coaching'],
    category: 'Coachs',
    country: 'ML',
    tier: 'standard',
    price5: 1500,
    price10: 2800,
    price15: 4000,
    max_calls_per_day: 6,
    availability: STD_AVAILABILITY,
  },
  {
    email: 'kadidia.coach.star@afriwonder.app',
    username: 'kadidia_coach_star',
    full_name: 'Kadidia Sangaré',
    profile_image: 'https://picsum.photos/seed/star-kadidia/600/600',
    headline: 'Coach bien-être — recentre-toi en 10 min',
    bio: 'Coach bien-être et sophrologue. Méditation, gestion du stress, équilibre vie pro et perso.',
    languages: ['fr', 'bm'],
    tags: ['bien-être', 'coaching', 'mindset'],
    category: 'Coachs',
    country: 'ML',
    tier: 'standard',
    price5: 1200,
    price10: 2200,
    price15: 3200,
    max_calls_per_day: 8,
    availability: STD_AVAILABILITY,
  },

  // ======================== INFLUENCER ========================
  {
    email: 'fatou.star@afriwonder.app',
    username: 'fatou_mode_star',
    full_name: 'Fatou Traoré',
    profile_image: 'https://picsum.photos/seed/star-fatou/600/600',
    headline: 'Styliste & créatrice mode africaine',
    bio: 'Créatrice de mode et styliste. On parle wax, conseils look, entreprenariat créatif et culture africaine.',
    languages: ['fr', 'bm', 'en'],
    tags: ['mode', 'wax', 'style', 'entrepreneuriat'],
    category: 'Influencer',
    country: 'ML',
    tier: 'premium',
    is_featured: false,
    price5: 1000,
    price10: 1800,
    price15: 2500,
    max_calls_per_day: 12,
    availability: STD_AVAILABILITY,
  },
  {
    email: 'faiza.influencer.star@afriwonder.app',
    username: 'faiza_lifestyle_star',
    full_name: 'FAÏZA Diakité',
    profile_image: 'https://picsum.photos/seed/star-faiza/600/600',
    headline: 'Lifestyle & beauté — un appel inspirant',
    bio: 'Influenceuse lifestyle et beauté. Routines, voyage, conseils digital. On échange entre passionnées.',
    languages: ['fr', 'en'],
    tags: ['lifestyle', 'beauté', 'voyage'],
    category: 'Influencer',
    country: 'ML',
    tier: 'standard',
    price5: 1500,
    price10: 2800,
    price15: 4000,
    max_calls_per_day: 10,
    availability: STD_AVAILABILITY,
  },

  // ======================== MEDIA ========================
  {
    email: 'ilsha.media.star@afriwonder.app',
    username: 'ilsha_voice_star',
    full_name: 'Ilsha Voice',
    profile_image: 'https://picsum.photos/seed/star-ilsha/600/600',
    headline: 'Voix radio & présentatrice — appel médias',
    bio: 'Présentatrice radio et podcast. Tips voix, prise de parole en public, storytelling.',
    languages: ['fr', 'bm'],
    tags: ['média', 'radio', 'podcast', 'voix'],
    category: 'Media',
    country: 'ML',
    tier: 'premium',
    is_featured: false,
    price5: 2000,
    price10: 3500,
    price15: 5000,
    max_calls_per_day: 6,
    availability: STD_AVAILABILITY,
  },

  // ======================== MENTORS ========================
  {
    email: 'oumar.mentor.star@afriwonder.app',
    username: 'oumar_tech_star',
    full_name: 'Oumar Cissé',
    profile_image: 'https://picsum.photos/seed/star-oumar/600/600',
    headline: 'Mentor tech — code, produit, carrière',
    bio: 'Ingénieur logiciel sénior, mentor tech. Code review, choix de carrière, lancer un projet en Afrique.',
    languages: ['fr', 'en'],
    tags: ['tech', 'mentorat', 'carrière'],
    category: 'Mentors',
    country: 'ML',
    tier: 'standard',
    price5: 2000,
    price10: 3800,
    price15: 5500,
    max_calls_per_day: 4,
    availability: STD_AVAILABILITY,
  },
  {
    email: 'bintou.mentor.star@afriwonder.app',
    username: 'bintou_business_star',
    full_name: 'Bintou Touré',
    profile_image: 'https://picsum.photos/seed/star-bintou/600/600',
    headline: 'Mentor business — entrepreneuriat féminin',
    bio: 'Entrepreneure en série et mentor. Lancement business, levée de fonds, leadership féminin en Afrique.',
    languages: ['fr', 'en'],
    tags: ['business', 'mentorat', 'leadership'],
    category: 'Mentors',
    country: 'ML',
    tier: 'premium',
    is_featured: false,
    price5: 2500,
    price10: 4500,
    price15: 6500,
    max_calls_per_day: 4,
    availability: STD_AVAILABILITY,
  },
];

/** Génère un display_id (5 chiffres) unique. Identique au service. */
async function generateUniqueDisplayId(): Promise<number> {
  for (let i = 0; i < 30; i++) {
    const candidate = 10000 + Math.floor(Math.random() * 90000);
    const exists = await prisma.starProfile.findUnique({
      where: { display_id: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  // Fallback 6 chiffres
  return 100000 + Math.floor(Math.random() * 900000);
}

async function upsertStar(s: SeedStar): Promise<void> {
  const existingUser = await prisma.user.findUnique({ where: { email: s.email } });
  let userId: string;

  if (!existingUser) {
    const password_hash = await bcrypt.hash(SEED_PASSWORD, 10);
    const created = await prisma.user.create({
      data: {
        email: s.email,
        username: s.username,
        password_hash,
        full_name: s.full_name,
        profile_image: s.profile_image,
        bio: s.bio,
        role: 'user',
        is_verified: true,
      },
    });
    userId = created.id;
    console.log(`   ✓ Utilisateur créé : ${s.full_name} (${s.email})`);
  } else {
    userId = existingUser.id;
    // On rafraîchit la photo pour avoir des avatars exploitables côté UI.
    if (existingUser.profile_image !== s.profile_image) {
      await prisma.user.update({ where: { id: userId }, data: { profile_image: s.profile_image, full_name: s.full_name, bio: s.bio } });
    }
    console.log(`   · Utilisateur existe déjà : ${s.full_name}`);
  }

  // Le display_id est conservé s'il existe déjà (idempotence stricte).
  const existingProfile = await prisma.starProfile.findUnique({ where: { user_id: userId } });
  const displayId = existingProfile?.display_id ?? (await generateUniqueDisplayId());

  const profile = await prisma.starProfile.upsert({
    where: { user_id: userId },
    create: {
      user_id: userId,
      display_id: displayId,
      is_active: true,
      is_verified: true,
      is_banned: false,
      is_featured: !!s.is_featured,
      tier: s.tier,
      category: s.category,
      country: s.country,
      headline: s.headline,
      bio: s.bio,
      languages: s.languages,
      tags: s.tags,
      price_fcfa_5min: s.price5,
      price_fcfa_10min: s.price10,
      price_fcfa_15min: s.price15,
      max_calls_per_day: s.max_calls_per_day,
      currency: 'XOF',
    },
    update: {
      display_id: displayId,
      is_active: true,
      is_verified: true,
      is_banned: false,
      is_featured: !!s.is_featured,
      tier: s.tier,
      category: s.category,
      country: s.country,
      headline: s.headline,
      bio: s.bio,
      languages: s.languages,
      tags: s.tags,
      price_fcfa_5min: s.price5,
      price_fcfa_10min: s.price10,
      price_fcfa_15min: s.price15,
      max_calls_per_day: s.max_calls_per_day,
    },
  });

  await prisma.starAvailabilityRule.deleteMany({
    where: { star_profile_id: profile.id, specific_date: null },
  });
  for (const rule of s.availability) {
    await prisma.starAvailabilityRule.create({
      data: {
        star_profile_id: profile.id,
        day_of_week: rule.day_of_week,
        start_time: rule.start_time,
        end_time: rule.end_time,
        timezone: TIMEZONE,
        is_blocked: false,
      },
    });
  }
  console.log(
    `   ✓ Star : ${s.full_name} #${displayId} [${s.category}] — ${s.price5}/${s.price10}/${s.price15} XOF`,
  );
}

async function main(): Promise<void> {
  console.log('🌟 Seed : Appels vidéo payants (stars de test)');
  console.log(`   Mot de passe commun : ${SEED_PASSWORD}`);
  for (const s of STARS) {
    await upsertStar(s);
  }
  console.log('');
  console.log(`✅ Seed stars terminé : ${STARS.length} stars.`);
  console.log('');
  console.log('   Comptes de test (mot de passe : ' + SEED_PASSWORD + ') :');
  for (const s of STARS) {
    console.log(`     • [${s.category.padEnd(11)}] ${s.email}`);
  }
  console.log('');
  console.log('   Côté fan : "Plus" → "Appels vidéo" pour parcourir les stars.');
}

main()
  .catch((err) => {
    console.error('❌ Seed stars a échoué :', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
