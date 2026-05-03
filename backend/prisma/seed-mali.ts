/**
 * Seed Mali — données minimales pour que les écrans "services locaux" ne soient
 * pas vides au jour J du lancement public.
 *
 * Principe : 5 villes majeures maliennes × 2 à 3 entrées par catégorie.
 *
 * Villes : Bamako, Sikasso, Ségou, Kayes, Mopti.
 * Catégories seedées :
 *   - Restaurants (food delivery)
 *   - Providers santé (doctors + pharmacies)
 *   - Providers immobilier (properties)
 *   - Providers emploi (jobs)
 *   - Providers transport (rides active)
 *
 * Usage :
 *   cd backend
 *   npx tsx prisma/seed-mali.ts
 *
 * Sécurité : idempotent — utilise `upsert` sur des slugs stables pour pouvoir
 * relancer plusieurs fois sans duplicats. Aucun utilisateur réel n'est créé —
 * les providers sont attachés à un utilisateur système `seed-ml-system@afriwonder.app`.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { FOOD_MEDIA_BY_CUISINE, ensureRestaurantMenusAndBanners } from './seed-mali-food.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Create a .env file or set the variable.');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SYSTEM_EMAIL = 'seed-ml-system@afriwonder.app';
const SYSTEM_USERNAME = 'afriwonder_mali_system';

const CITIES = [
  { name: 'Bamako', lat: 12.6392, lng: -8.0029 },
  { name: 'Sikasso', lat: 11.3176, lng: -5.6654 },
  { name: 'Ségou', lat: 13.4317, lng: -6.2157 },
  { name: 'Kayes', lat: 14.4469, lng: -11.4454 },
  { name: 'Mopti', lat: 14.4843, lng: -4.1828 },
];

async function getOrCreateSystemUser(): Promise<{ id: string }> {
  let user = await prisma.user.findUnique({ where: { email: SYSTEM_EMAIL } });
  if (!user) {
    const password_hash = await bcrypt.hash(`seed_${Date.now()}_${Math.random().toString(36).slice(2)}`, 10);
    user = await prisma.user.create({
      data: {
        email: SYSTEM_EMAIL,
        username: SYSTEM_USERNAME,
        password_hash,
        full_name: 'AfriWonder Mali — Comptes système',
        role: 'admin',
        is_verified: true,
      },
    });
    console.log('Compte système Mali créé :', user.id);
  }
  return { id: user.id };
}

async function seedRestaurants(ownerId: string) {
  const samples = [
    { name: 'Le Relais', cuisine: 'malienne', city: 'Bamako' },
    { name: 'Chez Fanta', cuisine: 'africaine', city: 'Bamako' },
    { name: 'Restaurant Amandine', cuisine: 'fast-food', city: 'Bamako' },
    { name: 'Le Jardin', cuisine: 'traditionnelle', city: 'Sikasso' },
    { name: 'La Terrasse', cuisine: 'malienne', city: 'Sikasso' },
    { name: 'Ségou Délices', cuisine: 'malienne', city: 'Ségou' },
    { name: 'Restaurant du Fleuve', cuisine: 'poissons', city: 'Ségou' },
    { name: 'Chez Mariam', cuisine: 'traditionnelle', city: 'Kayes' },
    { name: 'Mopti Plage', cuisine: 'poissons', city: 'Mopti' },
    { name: 'Dogon Lodge', cuisine: 'malienne', city: 'Mopti' },
  ];

  let created = 0;
  for (const s of samples) {
    try {
      const existing = await prisma.restaurant.findFirst({
        where: { name: s.name, city: s.city },
      });
      if (existing) continue;
      const media = FOOD_MEDIA_BY_CUISINE[s.cuisine] ?? FOOD_MEDIA_BY_CUISINE.malienne;
      await prisma.restaurant.create({
        data: {
          owner_id: ownerId,
          name: s.name,
          cuisine_type: [s.cuisine],
          city: s.city,
          address: `Avenue principale, ${s.city}`,
          phone: '+22370001000',
          delivery_time_min: 25,
          delivery_fee: 1500,
          minimum_order: 2000,
          rating: 4.2,
          is_open: true,
          is_verified: true,
          banner_url: media.banner,
          logo_url: media.logo,
          description: `Restaurant ${s.cuisine} à ${s.city}. Livraison rapide avec AfriWonder.`,
        },
      });
      created++;
    } catch (e) {
      console.warn(`Restaurant ${s.name} non créé :`, (e as Error).message);
    }
  }
  console.log(`Restaurants seedés : ${created}/${samples.length}`);
}

/** Médecins `Doctor` (API `/api/doctors`) — alignés sur les filtres Expo `services/health.tsx`. */
async function seedDoctors() {
  const samples = [
    { full_name: 'Dr. Aminata Traoré', specialty: 'Généraliste', city: 'Bamako' },
    { full_name: 'Dr. Moussa Keïta', specialty: 'Pédiatre', city: 'Bamako' },
    { full_name: 'Dr. Ibrahim Coulibaly', specialty: 'Cardiologue', city: 'Sikasso' },
    { full_name: 'Dr. Fatoumata Diallo', specialty: 'Dermatologue', city: 'Bamako' },
    { full_name: 'Dr. Oumou Sangaré', specialty: 'Gynécologue', city: 'Ségou' },
  ];

  let created = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const email = `seed-doctor-${i}-${s.city.toLowerCase()}@afriwonder.app`;
    try {
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        const password_hash = await bcrypt.hash(`seed_doc_${Date.now()}_${i}`, 10);
        user = await prisma.user.create({
          data: {
            email,
            username: `doc_seed_${s.city.toLowerCase()}_${i}`,
            password_hash,
            full_name: s.full_name,
            is_verified: true,
          },
        });
      }
      const existing = await prisma.doctor.findUnique({ where: { user_id: user.id } });
      if (existing) continue;
      await prisma.doctor.create({
        data: {
          user_id: user.id,
          full_name: s.full_name,
          specialty: s.specialty,
          phone: `+223700020${String(i).padStart(2, '0')}`,
          city: s.city,
          clinic_name: `Cabinet ${s.city}`,
          clinic_address: `Quartier centre, ${s.city}`,
          consultation_fee: 15_000,
          is_verified: true,
          is_available: true,
          bio: `${s.specialty} — téléconsultation et rendez-vous. Données de démonstration AfriWonder.`,
        },
      });
      created++;
    } catch (e) {
      console.warn(`Médecin ${s.full_name} non créé :`, (e as Error).message);
    }
  }
  console.log(`Médecins (Doctor) seedés : ${created}/${samples.length}`);
}

/** Événements publiés visibles sur `GET /api/events` (status published). */
async function seedEvents(organizerId: string) {
  const now = new Date();
  const samples = [
    { title: 'Festival des arts — Bamako', location: 'Palais des Congrès, Bamako', days: 21 },
    { title: 'Concert solidarité éducation', location: 'Stade 26 Mars, Bamako', days: 35 },
    { title: 'Forum jeunesse & emploi — Sikasso', location: 'Maison des jeunes, Sikasso', days: 49 },
  ];

  let created = 0;
  for (const s of samples) {
    try {
      const existing = await prisma.event.findFirst({ where: { title: s.title } });
      if (existing) continue;
      const start = new Date(now);
      start.setDate(start.getDate() + s.days);
      start.setHours(18, 0, 0, 0);
      const end = new Date(start);
      end.setHours(21, 0, 0, 0);
      await prisma.event.create({
        data: {
          organizer_id: organizerId,
          title: s.title,
          description:
            'Événement de démonstration AfriWonder — billetterie et détail disponibles dans l’app.',
          location: s.location,
          start_date: start,
          end_date: end,
          status: 'published',
          category: 'culture',
          event_type: 'concert',
          is_free: false,
          price: 5_000,
          currency: 'XOF',
          capacity: 800,
          organizer_name: 'AfriWonder Mali',
        },
      });
      created++;
    } catch (e) {
      console.warn(`Événement ${s.title} non créé :`, (e as Error).message);
    }
  }
  console.log(`Événements seedés : ${created}/${samples.length}`);
}

async function seedServiceProviders(ownerId: string) {
  const samples = [
    // Santé
    { category: 'doctor', name: 'Dr. Sissoko (médecine générale)', city: 'Bamako', specialty: 'médecine générale' },
    { category: 'doctor', name: 'Dr. Diarra (pédiatrie)', city: 'Bamako', specialty: 'pédiatrie' },
    { category: 'doctor', name: 'Dr. Koné (cardiologie)', city: 'Sikasso', specialty: 'cardiologie' },
    { category: 'pharmacy', name: 'Pharmacie Centrale', city: 'Bamako', specialty: 'pharmacie' },
    { category: 'pharmacy', name: 'Pharmacie du Fleuve', city: 'Ségou', specialty: 'pharmacie' },
    { category: 'pharmacy', name: 'Pharmacie Mopti', city: 'Mopti', specialty: 'pharmacie' },
    // Transport
    { category: 'transport', name: 'Taxi Bamako 24/7', city: 'Bamako', specialty: 'taxi urbain' },
    { category: 'transport', name: 'Sotrama Ségou', city: 'Ségou', specialty: 'transport collectif' },
    // Garde d'enfants
    { category: 'childcare', name: 'Crèche Les Étoiles', city: 'Bamako', specialty: 'garde 0-3 ans' },
    { category: 'childcare', name: 'Nounou Bamako', city: 'Bamako', specialty: 'nounou à domicile' },
    // Immobilier
    { category: 'realestate', name: 'Agence Immobilière Bamako', city: 'Bamako', specialty: 'location + vente' },
    { category: 'realestate', name: 'Kayes Habitat', city: 'Kayes', specialty: 'location' },
    // Emploi
    { category: 'job', name: 'Cabinet Recrutement Mali', city: 'Bamako', specialty: 'cadres' },
    { category: 'job', name: 'Emplois Sikasso', city: 'Sikasso', specialty: 'agriculture + artisanat' },
    // Voyage
    { category: 'travel', name: 'Agence Voyage Bamako', city: 'Bamako', specialty: 'billets avion + bus' },
  ];

  let created = 0;
  for (const s of samples) {
    try {
      const existing = await prisma.serviceProvider
        .findFirst({
          where: {
            service_categories: { has: s.category },
            city: s.city,
            bio: { contains: s.name },
          },
        })
        .catch(() => null);
      if (existing) continue;

      // Le modèle ServiceProvider requiert un user_id unique. On crée un utilisateur
      // plateforme simple par provider pour que l'upsert ne casse pas si relancé.
      const providerEmail = `provider-${s.category}-${s.city.toLowerCase()}-${created}@afriwonder.app`;
      let providerUser = await prisma.user.findUnique({ where: { email: providerEmail } }).catch(() => null);
      if (!providerUser) {
        const hash = await bcrypt.hash(`seed_${Date.now()}`, 10);
        providerUser = await prisma.user.create({
          data: {
            email: providerEmail,
            username: `prov_${s.category}_${s.city.toLowerCase()}_${created}`,
            password_hash: hash,
            full_name: s.name,
            role: 'user',
          },
        });
      }

      await prisma.serviceProvider.create({
        data: {
          user_id: providerUser.id,
          status: 'active',
          is_verified: true,
          service_categories: [s.category],
          city: s.city,
          country: 'ML',
          bio: `${s.name} — ${s.specialty}. Disponible à ${s.city}.`,
          phone: '+223 00 00 00 00',
          average_rating: 4.3,
          kyc_status: 'verified',
        },
      });
      created++;
    } catch (e) {
      console.warn(`Provider ${s.name} non créé :`, (e as Error).message);
    }
  }
  console.log(`ServiceProviders seedés : ${created}/${samples.length}`);
}

async function main() {
  console.log('🇲🇱 Seed Mali — démarrage');

  const sysUser = await getOrCreateSystemUser();
  await seedRestaurants(sysUser.id);
  await ensureRestaurantMenusAndBanners(prisma);
  await seedDoctors();
  await seedEvents(sysUser.id);
  await seedServiceProviders(sysUser.id);

  console.log('🇲🇱 Seed Mali — terminé');
  console.log('Villes couvertes :', CITIES.map((c) => c.name).join(', '));
}

main()
  .catch((err) => {
    console.error('Erreur seed Mali :', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
