/**
 * STAR CALL SERVICE — Appels vidéo payants (User ↔ Star).
 *
 * Module ISOLÉ : aucune modification / dépendance aux features existantes
 * (bookings services, Appointment télémédecine, DirectCall messages, lives).
 *
 * Modèles exclusifs :
 *  - StarProfile, StarAvailabilityRule
 *  - StarBooking, StarCallSession, StarBookingExtension
 *  - StarRating, StarDispute, StarDisputeMessage
 *
 * ============================= FLOW FINANCIER =============================
 *  1a. Fan réserve + paiement **wallet** → StarBooking `confirmed` + escrow immédiat :
 *       fan.wallet.available_balance -= price ; locked_balance += price
 *       (ledger `star_call_escrow_lock` + transaction `star_call_payment`).
 *  1b. Fan réserve + **Orange Money** → StarBooking `pending_payment`, pas d’escrow tant que le paiement n’est pas SUCCESS.
 *       Webhook / verify Orange Money → transaction `star_call_booking` completed puis
 *       crédit synthétique + même escrow que wallet (`confirmBookingAfterOrangeMoney`).
 *
 *  2. Si appel complété (timer dépassé ou fin normale) :
 *       fan.wallet.locked_balance   -= price
 *       star.wallet.available_balance += star_earnings (= price - platform_fee)
 *     Platform garde la commission (20%). Ledger complet.
 *
 *  3. Si remboursement (no-show star / litige validé / annulation eligible) :
 *       fan.wallet.locked_balance  -= refund_amount
 *       fan.wallet.available_balance += refund_amount
 *       (résidu éventuel → platform, ex: frais annulation tardive fan)
 *
 * ============================= ANTI-ABUS =============================
 *  - Prix min / max configurables côté admin.
 *  - max_calls_per_day par star (compté sur scheduled_start_at jour local).
 *  - Overlap slot (une star ne peut pas avoir 2 bookings qui se chevauchent).
 *  - Fenêtre no-show fan : 2 min après scheduled_start_at (configurable).
 *  - Fenêtre annulation fan « anticipée » : STAR_CALL_REFUND_CANCEL_WINDOW_MIN (défaut 30 min) avant début.
 *    Au-delà : remboursement partiel au fan (STAR_CALL_FAN_LATE_CANCEL_REFUND_RATE), solde = frais → star + commission.
 *  - Limite d'extensions par appel : StarProfile.max_extensions_per_call.
 *
 * ============================= RÉSEAU FAIBLE =============================
 *  - La route /call/:id/heartbeat permet au client mobile d'envoyer un ping
 *    toutes les 10 s et de déclencher la terminaison serveur si l'une des
 *    deux parties disparaît > 60 s après `both_present_at`.
 *
 * ============================= AUDIT =============================
 *  - Tous les changements d'état business loguent via logger.
 *  - Les extensions, litiges et remboursements créent des LedgerEntry tracés.
 */
import crypto from 'crypto';
import prisma from '../config/database.js';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';
import notificationService from './notification.service.js';
import type { CreateStarBookingResult } from './starCall.bookingResult.js';

export type { CreateStarBookingPaymentPayload, CreateStarBookingResult } from './starCall.bookingResult.js';

// ============================================================
// CONSTANTES BUSINESS
// ============================================================
const PLATFORM_COMMISSION_RATE = Number(process.env.STAR_CALL_PLATFORM_COMMISSION ?? '0.20');
const MIN_PRICE_FCFA = Number(process.env.STAR_CALL_MIN_PRICE_FCFA ?? '500');      // 500 XOF ≈ 0.8 USD
const MAX_PRICE_FCFA = Number(process.env.STAR_CALL_MAX_PRICE_FCFA ?? '250000');   // 250k XOF ≈ 400 USD
const REFUND_CANCEL_WINDOW_MIN = Number(process.env.STAR_CALL_REFUND_CANCEL_WINDOW_MIN ?? '30');
const FAN_NO_SHOW_WINDOW_MIN = Number(process.env.STAR_CALL_FAN_NO_SHOW_WINDOW_MIN ?? '2');
/** CdC §13 « tolérance retard » — fenêtre avant no-show star (défaut 2 min, comme exemple CdC). */
const STAR_NO_SHOW_WINDOW_MIN = Number(process.env.STAR_CALL_STAR_NO_SHOW_WINDOW_MIN ?? '2');
/** CdC §6 grille exemple 18:00 / 18:10 / 18:20 — pas fixe entre **débuts** de créneaux (pas durée). */
const SLOT_STEP_MINUTES = Math.max(5, Math.min(60, Number(process.env.STAR_CALL_SLOT_STEP_MINUTES ?? '10')));
/** CdC §14 fan tardif : part remboursée (reste = frais / redistribution comme séquestre libéré). */
const FAN_LATE_CANCEL_REFUND_RATE = Math.min(1, Math.max(0, Number(process.env.STAR_CALL_FAN_LATE_CANCEL_REFUND_RATE ?? '0.5')));
const MAX_HEARTBEAT_GAP_MS = Number(process.env.STAR_CALL_HEARTBEAT_GAP_MS ?? '60000');
const MAX_BOOKINGS_PER_FAN_PER_DAY = Number(process.env.STAR_CALL_MAX_BOOKINGS_PER_FAN_PER_DAY ?? '10');
const MAX_ACTIVE_BOOKINGS_PER_FAN = Number(process.env.STAR_CALL_MAX_ACTIVE_BOOKINGS_PER_FAN ?? '5');
const EXTENSION_MINUTES = 5;
const ALLOWED_DURATIONS = [5, 10, 15] as const;

export type StarPriceKey = 5 | 10 | 15;

type StarBookingRow = Awaited<ReturnType<typeof prisma.starBooking.create>>;

// ============================================================
// HELPERS
// ============================================================
function toAgoraUid(userId: string): number {
  const h = crypto.createHash('md5').update(userId).digest();
  const raw = h.readUInt32BE(0) >>> 0;
  // Prisma column is Int (signed 32-bit); keep deterministic UID in valid range.
  const uid = raw % 2_147_483_647;
  return uid > 0 ? uid : 1;
}

function starError(message: string, statusCode = 400, code?: string): Error {
  const err = new Error(message) as Error & { statusCode?: number; code?: string };
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}

function priceForDuration(profile: {
  price_fcfa_5min: number | null;
  price_fcfa_10min: number | null;
  price_fcfa_15min: number | null;
}, duration: StarPriceKey): number | null {
  if (duration === 5) return profile.price_fcfa_5min;
  if (duration === 10) return profile.price_fcfa_10min;
  if (duration === 15) return profile.price_fcfa_15min;
  return null;
}

function computePlatformFee(amount: number): { fee: number; starShare: number } {
  const fee = Math.round(amount * PLATFORM_COMMISSION_RATE);
  return { fee, starShare: amount - fee };
}

function assertValidPrice(amount: number) {
  if (!Number.isFinite(amount) || amount < MIN_PRICE_FCFA) {
    throw starError(`Prix minimum : ${MIN_PRICE_FCFA.toLocaleString()} XOF`, 400);
  }
  if (amount > MAX_PRICE_FCFA) {
    throw starError(`Prix maximum : ${MAX_PRICE_FCFA.toLocaleString()} XOF`, 400);
  }
}

/** Parse 'HH:MM' safe. */
function parseHHMM(v: string): { h: number; m: number } {
  const m = /^(\d{2}):(\d{2})$/.exec(v || '');
  if (!m) throw starError('Format horaire invalide (HH:MM attendu)', 400);
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h < 0 || h > 23 || mi < 0 || mi > 59) throw starError('Heure invalide', 400);
  return { h, m: mi };
}

function hhmmToMinutes(v: string): number {
  const { h, m } = parseHHMM(v);
  return h * 60 + m;
}

/** Catégories publiques affichées en discovery (alignées sur l'UX des screenshots produit). */
export const STAR_CATEGORIES = [
  'Musicians',
  'Comedians',
  'Coachs',
  'Influencer',
  'Media',
  'Mentors',
  'Other',
] as const;
export type StarCategory = typeof STAR_CATEGORIES[number];

const STAR_TIERS = ['standard', 'premium'] as const;
export type StarTier = typeof STAR_TIERS[number];

function normalizeCategory(input?: string | null): StarCategory | null {
  if (!input) return null;
  const v = String(input).trim();
  if (!v) return null;
  const found = STAR_CATEGORIES.find((c) => c.toLowerCase() === v.toLowerCase());
  return found ?? 'Other';
}

function normalizeTier(input?: string | null): StarTier {
  if (input && STAR_TIERS.includes(input as StarTier)) return input as StarTier;
  return 'standard';
}

function normalizeCountry(input?: string | null): string | null {
  if (!input) return null;
  const v = String(input).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(v)) return null;
  return v;
}

/**
 * Génère un `display_id` (5 chiffres : 10000-99999) unique en base.
 * Tente jusqu'à 12 fois avant d'élargir à 6 chiffres si la 5-digits zone est saturée.
 * Aucune fuite d'info (pas de séquence prévisible).
 */
async function generateUniqueDisplayId(): Promise<number> {
  for (let i = 0; i < 12; i++) {
    const candidate = 10000 + Math.floor(Math.random() * 90000);
    const exists = await prisma.starProfile.findUnique({
      where: { display_id: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  for (let i = 0; i < 12; i++) {
    const candidate = 100000 + Math.floor(Math.random() * 900000);
    const exists = await prisma.starProfile.findUnique({
      where: { display_id: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  throw starError('Impossible de générer un identifiant star unique, réessayez', 500);
}

// ============================================================
// WALLET HELPERS (scoped à star calls)
// ============================================================
async function getOrCreateUserWallet(tx: Prisma.TransactionClient, userId: string) {
  const existing = await tx.wallet.findFirst({
    where: { user_id: userId, wallet_type: 'user' },
  });
  if (existing) return existing;
  return tx.wallet.create({
    data: { user_id: userId, wallet_type: 'user', balance: 0, available_balance: 0, currency: 'XOF' },
  });
}

/** Garde-fous créneau star + quotas fan (wallet et Orange Money partagent la même logique). */
async function assertStarBookingSlotAndFanLimits(
  tx: Prisma.TransactionClient,
  args: {
    starProfileId: string;
    fanUserId: string;
    startAt: Date;
    endAt: Date;
    maxCallsPerDay: number;
  },
) {
  const { starProfileId, fanUserId, startAt, endAt, maxCallsPerDay } = args;
  const clash = await tx.starBooking.findFirst({
    where: {
      star_profile_id: starProfileId,
      status: { in: ['pending_payment', 'confirmed', 'ongoing'] },
      scheduled_start_at: { lt: endAt },
      scheduled_end_at: { gt: startAt },
    },
    select: { id: true },
  });
  if (clash) throw starError('Créneau déjà réservé', 409);

  const dayStart = new Date(startAt);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCHours(23, 59, 59, 999);
  const bookedToday = await tx.starBooking.count({
    where: {
      star_profile_id: starProfileId,
      status: { in: ['confirmed', 'ongoing', 'completed'] },
      scheduled_start_at: { gte: dayStart, lte: dayEnd },
    },
  });
  if (bookedToday >= maxCallsPerDay) {
    throw starError('Star : limite journalière d\'appels atteinte', 409);
  }

  const fanActive = await tx.starBooking.count({
    where: {
      fan_user_id: fanUserId,
      status: { in: ['pending_payment', 'confirmed', 'ongoing'] },
    },
  });
  if (fanActive >= MAX_ACTIVE_BOOKINGS_PER_FAN) {
    throw starError(`Limite atteinte: maximum ${MAX_ACTIVE_BOOKINGS_PER_FAN} réservations actives`, 409);
  }
  const fanBookedToday = await tx.starBooking.count({
    where: {
      fan_user_id: fanUserId,
      created_at: { gte: dayStart, lte: dayEnd },
    },
  });
  if (fanBookedToday >= MAX_BOOKINGS_PER_FAN_PER_DAY) {
    throw starError(`Limite atteinte: maximum ${MAX_BOOKINGS_PER_FAN_PER_DAY} réservations par jour`, 429);
  }
}

class StarCallService {
  // ========================================================================
  // 1. PROFIL STAR (devenir star / configurer)
  // ========================================================================
  async getMyProfile(userId: string) {
    return prisma.starProfile.findUnique({
      where: { user_id: userId },
      include: { availability_rules: { orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }] } },
    });
  }

  /**
   * Tableau de bord star : solde, prochains appels, stats période.
   * Isolé du wallet global AfriWonder — ne manipule que les bookings/extensions
   * payées à cette star. Le retrait effectif utilise le module /api/withdrawals
   * (onglet "Mes gains" du dashboard star).
   */
  async getMyStarStats(userId: string) {
    const profile = await prisma.starProfile.findUnique({
      where: { user_id: userId },
      select: { id: true, is_active: true, rating_avg: true, rating_count: true, calls_completed: true, calls_no_show: true, total_earnings_fcfa: true, max_calls_per_day: true },
    });
    if (!profile) throw starError('Mode star non activé', 404);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - ((startOfDay.getDay() + 6) % 7));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      upcoming,
      todayCount,
      weekCount,
      monthCount,
      pendingAgg,
      recentCompleted,
      openDisputes,
    ] = await Promise.all([
      prisma.starBooking.findMany({
        where: {
          star_user_id: userId,
          status: { in: ['confirmed', 'ongoing'] },
          scheduled_end_at: { gt: now },
        },
        orderBy: { scheduled_start_at: 'asc' },
        take: 5,
        include: { fan: { select: { id: true, username: true, full_name: true, profile_image: true } } },
      }),
      prisma.starBooking.count({
        where: { star_user_id: userId, status: 'completed', actually_ended_at: { gte: startOfDay } },
      }),
      prisma.starBooking.count({
        where: { star_user_id: userId, status: 'completed', actually_ended_at: { gte: startOfWeek } },
      }),
      prisma.starBooking.count({
        where: { star_user_id: userId, status: 'completed', actually_ended_at: { gte: startOfMonth } },
      }),
      prisma.starBooking.aggregate({
        _sum: { star_earnings_fcfa: true },
        where: { star_user_id: userId, status: { in: ['confirmed', 'ongoing'] } },
      }),
      prisma.starBooking.findMany({
        where: { star_user_id: userId, status: 'completed' },
        orderBy: { actually_ended_at: 'desc' },
        take: 5,
        select: {
          id: true, duration_minutes: true, extra_minutes: true,
          star_earnings_fcfa: true, actually_ended_at: true,
          fan: { select: { username: true, full_name: true, profile_image: true } },
        },
      }),
      prisma.starDispute.count({
        where: { booking: { star_user_id: userId }, status: 'open' },
      }),
    ]);

    const pendingEarnings = Number(pendingAgg._sum.star_earnings_fcfa || 0);
    const totalEarnings = Number(profile.total_earnings_fcfa || 0);
    const availableBalance = Math.max(0, totalEarnings - pendingEarnings);

    return {
      balance: {
        available_fcfa: availableBalance,
        pending_fcfa: pendingEarnings,
        total_earned_fcfa: totalEarnings,
        currency: 'XOF',
      },
      calls: {
        today: todayCount,
        this_week: weekCount,
        this_month: monthCount,
        completed_total: profile.calls_completed,
        no_show_total: profile.calls_no_show,
        max_per_day: profile.max_calls_per_day,
      },
      rating: {
        avg: profile.rating_avg,
        count: profile.rating_count,
      },
      upcoming_bookings: upcoming,
      recent_completed: recentCompleted,
      open_disputes_count: openDisputes,
      is_active: profile.is_active,
    };
  }

  async becomeStar(userId: string, input: {
    headline?: string;
    bio?: string;
    languages?: string[];
    tags?: string[];
    category?: string | null;
    country?: string | null;
    tier?: string | null;
  }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, full_name: true, profile_image: true, bio: true, account_suspended: true },
    });
    if (!user || user.account_suspended) throw starError('Compte non éligible', 403);
    if (!user.profile_image || !(user.bio || input.bio)) {
      throw starError('Profil incomplet : une photo et une bio sont requises pour activer le mode star', 400);
    }

    const category = normalizeCategory(input.category);
    const country = normalizeCountry(input.country);
    const tier = normalizeTier(input.tier);

    const existing = await prisma.starProfile.findUnique({ where: { user_id: userId } });
    if (existing) {
      // Si le profil existe sans display_id (anciens enregistrements), on en génère un.
      const displayId = existing.display_id ?? (await generateUniqueDisplayId());
      return prisma.starProfile.update({
        where: { id: existing.id },
        data: {
          headline: input.headline ?? existing.headline,
          bio: input.bio ?? existing.bio,
          languages: input.languages ?? existing.languages,
          tags: input.tags ?? existing.tags,
          category: category ?? existing.category,
          country: country ?? existing.country,
          tier,
          display_id: displayId,
        },
      });
    }

    const displayId = await generateUniqueDisplayId();
    return prisma.starProfile.create({
      data: {
        user_id: userId,
        display_id: displayId,
        headline: input.headline ?? null,
        bio: input.bio ?? user.bio ?? null,
        languages: input.languages ?? [],
        tags: input.tags ?? [],
        category: category ?? 'Other',
        country: country ?? 'ML',
        tier,
      },
    });
  }

  async updateProfile(userId: string, input: {
    headline?: string | null;
    bio?: string | null;
    languages?: string[];
    tags?: string[];
    price_fcfa_5min?: number | null;
    price_fcfa_10min?: number | null;
    price_fcfa_15min?: number | null;
    max_calls_per_day?: number;
    category?: string | null;
    country?: string | null;
  }) {
    const profile = await prisma.starProfile.findUnique({ where: { user_id: userId } });
    if (!profile) throw starError('Mode star non activé', 404);
    if (profile.is_banned) throw starError('Mode star suspendu par la plateforme', 403);

    if (input.price_fcfa_5min != null) assertValidPrice(input.price_fcfa_5min);
    if (input.price_fcfa_10min != null) assertValidPrice(input.price_fcfa_10min);
    if (input.price_fcfa_15min != null) assertValidPrice(input.price_fcfa_15min);
    if (input.max_calls_per_day != null && (input.max_calls_per_day < 1 || input.max_calls_per_day > 50)) {
      throw starError('max_calls_per_day doit être entre 1 et 50', 400);
    }

    const category = input.category === undefined ? undefined : normalizeCategory(input.category);
    const country = input.country === undefined ? undefined : normalizeCountry(input.country);

    return prisma.starProfile.update({
      where: { id: profile.id },
      data: {
        headline: input.headline === undefined ? undefined : input.headline,
        bio: input.bio === undefined ? undefined : input.bio,
        languages: input.languages ?? undefined,
        tags: input.tags ?? undefined,
        price_fcfa_5min: input.price_fcfa_5min === undefined ? undefined : input.price_fcfa_5min,
        price_fcfa_10min: input.price_fcfa_10min === undefined ? undefined : input.price_fcfa_10min,
        price_fcfa_15min: input.price_fcfa_15min === undefined ? undefined : input.price_fcfa_15min,
        max_calls_per_day: input.max_calls_per_day ?? undefined,
        category,
        country,
      },
    });
  }

  async toggleActive(userId: string, active: boolean) {
    const profile = await prisma.starProfile.findUnique({ where: { user_id: userId } });
    if (!profile) throw starError('Mode star non activé', 404);
    if (profile.is_banned) throw starError('Mode star suspendu par la plateforme', 403);
    if (active) {
      const hasPrice = profile.price_fcfa_5min || profile.price_fcfa_10min || profile.price_fcfa_15min;
      if (!hasPrice) throw starError('Définissez au moins un prix avant d\'activer le mode star', 400);
    }
    return prisma.starProfile.update({
      where: { id: profile.id },
      data: { is_active: active },
    });
  }

  // ========================================================================
  // 2. DISPONIBILITÉS (règles récurrentes + overrides ponctuelles)
  // ========================================================================
  async setAvailability(userId: string, rules: Array<{
    day_of_week?: number | null;
    specific_date?: string | null; // ISO
    start_time: string;
    end_time: string;
    timezone?: string;
    is_blocked?: boolean;
  }>) {
    const profile = await prisma.starProfile.findUnique({ where: { user_id: userId } });
    if (!profile) throw starError('Mode star non activé', 404);

    for (const r of rules) {
      if (r.day_of_week == null && !r.specific_date) {
        throw starError('Chaque règle doit avoir day_of_week ou specific_date', 400);
      }
      if (r.day_of_week != null && (r.day_of_week < 0 || r.day_of_week > 6)) {
        throw starError('day_of_week invalide (0-6)', 400);
      }
      const s = hhmmToMinutes(r.start_time);
      const e = hhmmToMinutes(r.end_time);
      if (e <= s) throw starError('end_time doit être > start_time', 400);
    }

    return prisma.$transaction(async (tx) => {
      await tx.starAvailabilityRule.deleteMany({ where: { star_profile_id: profile.id } });
      if (!rules.length) return [];
      await tx.starAvailabilityRule.createMany({
        data: rules.map((r) => ({
          star_profile_id: profile.id,
          day_of_week: r.day_of_week ?? null,
          specific_date: r.specific_date ? new Date(r.specific_date) : null,
          start_time: r.start_time,
          end_time: r.end_time,
          timezone: r.timezone || 'UTC',
          is_blocked: !!r.is_blocked,
        })),
      });
      return tx.starAvailabilityRule.findMany({
        where: { star_profile_id: profile.id },
        orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }],
      });
    });
  }

  // ========================================================================
  // 3. DISCOVERY (liste publique)
  // ========================================================================
  async discover(params: {
    limit?: number;
    cursor?: string;
    search?: string;
    verifiedOnly?: boolean;
    tag?: string;
    category?: string;
  } = {}) {
    const limit = Math.min(Math.max(Number(params.limit ?? 20), 1), 50);
    const normalizedCategory = normalizeCategory(params.category);
    const where: Prisma.StarProfileWhereInput = {
      is_active: true,
      is_banned: false,
      ...(params.verifiedOnly ? { is_verified: true } : {}),
      ...(params.tag ? { tags: { has: params.tag } } : {}),
      ...(normalizedCategory ? { category: normalizedCategory } : {}),
      ...(params.search
        ? {
            OR: [
              { headline: { contains: params.search, mode: 'insensitive' } },
              { bio: { contains: params.search, mode: 'insensitive' } },
              { user: { username: { contains: params.search, mode: 'insensitive' } } },
              { user: { full_name: { contains: params.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const profiles = await prisma.starProfile.findMany({
      where,
      // Premium d'abord, puis vérifiés, puis featured, puis note, puis volume.
      orderBy: [
        { tier: 'desc' },
        { is_featured: 'desc' },
        { is_verified: 'desc' },
        { rating_avg: 'desc' },
        { calls_completed: 'desc' },
      ],
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        user: {
          select: { id: true, username: true, full_name: true, profile_image: true, is_verified: true },
        },
      },
    });
    const hasMore = profiles.length > limit;
    return {
      items: profiles.slice(0, limit),
      next_cursor: hasMore ? profiles[limit - 1].id : null,
    };
  }

  /**
   * Page d'accueil discovery : retourne en un seul appel
   *  - 1 star "vedette" (hero) : featured ou la mieux notée
   *  - 5-8 stars "stories" (vérifiées et actives)
   *  - les catégories peuplées avec un compteur
   *  - quelques stars par catégorie (preview rapide)
   *
   * Utilisé par l'écran `/stars` (Explorer). Optimisé en 2-3 requêtes parallèles.
   */
  async discoverHome() {
    const baseFilter: Prisma.StarProfileWhereInput = { is_active: true, is_banned: false };

    const [featured, stories, categoryCounts, allActive] = await Promise.all([
      // Hero featured : priorité is_featured, puis premium, puis rating
      prisma.starProfile.findFirst({
        where: baseFilter,
        orderBy: [
          { is_featured: 'desc' },
          { tier: 'desc' },
          { rating_avg: 'desc' },
          { calls_completed: 'desc' },
        ],
        include: {
          user: { select: { id: true, username: true, full_name: true, profile_image: true, is_verified: true } },
        },
      }),
      // Stories : top 8 stars vérifiées
      prisma.starProfile.findMany({
        where: { ...baseFilter, is_verified: true },
        orderBy: [{ tier: 'desc' }, { rating_avg: 'desc' }, { calls_completed: 'desc' }],
        take: 8,
        include: {
          user: { select: { id: true, username: true, full_name: true, profile_image: true, is_verified: true } },
        },
      }),
      prisma.starProfile.groupBy({
        by: ['category'],
        where: baseFilter,
        _count: { _all: true },
      }),
      prisma.starProfile.findMany({
        where: baseFilter,
        orderBy: [{ tier: 'desc' }, { rating_avg: 'desc' }, { calls_completed: 'desc' }],
        take: 60,
        include: {
          user: { select: { id: true, username: true, full_name: true, profile_image: true, is_verified: true } },
        },
      }),
    ]);

    // Préviews : 6 premiers de chaque catégorie présente
    const categories = STAR_CATEGORIES.map((cat) => {
      const count = categoryCounts.find((c) => c.category === cat)?._count._all ?? 0;
      const preview = allActive.filter((p) => (p.category ?? 'Other') === cat).slice(0, 6);
      return { category: cat, count, preview };
    }).filter((c) => c.count > 0);

    return {
      featured,
      stories,
      categories,
    };
  }

  async getProfileById(starProfileId: string) {
    const profile = await prisma.starProfile.findUnique({
      where: { id: starProfileId },
      include: {
        user: { select: { id: true, username: true, full_name: true, profile_image: true, is_verified: true, bio: true } },
        availability_rules: { orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }] },
      },
    });
    if (!profile || profile.is_banned) throw starError('Star introuvable', 404);
    return profile;
  }

  async listRatings(starProfileId: string, limit = 20) {
    return prisma.starRating.findMany({
      where: { star_profile_id: starProfileId, is_hidden: false },
      orderBy: { created_at: 'desc' },
      take: Math.min(Math.max(limit, 1), 50),
      include: {
        fan: { select: { id: true, username: true, full_name: true, profile_image: true } },
      },
    });
  }

  // ========================================================================
  // 4. SLOTS (calculés à la volée)
  // ========================================================================
  /**
   * Retourne les créneaux disponibles pour un jour local donné et une durée choisie.
   * Jour = 'YYYY-MM-DD' dans le fuseau IANA passé (par défaut Africa/Bamako).
   */
  async listSlots(starProfileId: string, duration: StarPriceKey, dayYMD: string, timezone = 'Africa/Bamako') {
    if (!ALLOWED_DURATIONS.includes(duration)) throw starError('Durée invalide', 400);
    const profile = await prisma.starProfile.findUnique({
      where: { id: starProfileId },
      include: { availability_rules: true },
    });
    if (!profile || !profile.is_active || profile.is_banned) return { slots: [] };
    const price = priceForDuration(profile, duration);
    if (price == null) return { slots: [] };

    const day = this.parseDayYMD(dayYMD);
    const dow = this.dayOfWeekInTz(day, timezone);

    const applicableRules = profile.availability_rules.filter((r) => {
      if (r.is_blocked) return false;
      if (r.specific_date) {
        const d = new Date(r.specific_date);
        return d.toISOString().slice(0, 10) === dayYMD;
      }
      return r.day_of_week === dow;
    });
    if (!applicableRules.length) return { slots: [] };

    const existing = await prisma.starBooking.findMany({
      where: {
        star_profile_id: starProfileId,
        status: { in: ['pending_payment', 'confirmed', 'ongoing'] },
        scheduled_start_at: {
          gte: new Date(`${dayYMD}T00:00:00Z`),
          lt: new Date(`${dayYMD}T23:59:59Z`),
        },
      },
      select: { scheduled_start_at: true, scheduled_end_at: true },
    });

    const now = Date.now();
    /** Créneaux candidats : grille à pas fixe (ex. 10 min), puis filtrage greedy pour éviter deux créneaux qui se chevauchent le même jour. */
    const byStartIso = new Map<string, { startUtc: Date; endUtc: Date }>();
    for (const rule of applicableRules) {
      const sMin = hhmmToMinutes(rule.start_time);
      const eMin = hhmmToMinutes(rule.end_time);
      for (let t = sMin; t + duration <= eMin; t += SLOT_STEP_MINUTES) {
        const startUtc = this.composeUtcFromTz(dayYMD, t, timezone);
        const endUtc = new Date(startUtc.getTime() + duration * 60_000);
        if (startUtc.getTime() <= now + 5 * 60_000) continue;
        const overlapDb = existing.some((b) => b.scheduled_start_at < endUtc && b.scheduled_end_at > startUtc);
        if (overlapDb) continue;
        const key = startUtc.toISOString();
        if (!byStartIso.has(key)) byStartIso.set(key, { startUtc, endUtc });
      }
    }
    const candidates = Array.from(byStartIso.values()).sort(
      (a, b) => a.startUtc.getTime() - b.startUtc.getTime(),
    );
    const accepted: Array<{ start: string; end: string }> = [];
    for (const c of candidates) {
      const overlapsPrior = accepted.some((prev) => {
        const ps = new Date(prev.start).getTime();
        const pe = new Date(prev.end).getTime();
        return ps < c.endUtc.getTime() && c.startUtc.getTime() < pe;
      });
      if (overlapsPrior) continue;
      accepted.push({ start: c.startUtc.toISOString(), end: c.endUtc.toISOString() });
    }
    return { slots: accepted, price_fcfa: price, currency: profile.currency };
  }

  private parseDayYMD(s: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) throw starError('day attendu au format YYYY-MM-DD', 400);
    return new Date(`${s}T00:00:00Z`);
  }

  private dayOfWeekInTz(utcDay: Date, tz: string): number {
    const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz });
    const short = fmt.format(utcDay);
    return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[short as 'Sun'] ?? utcDay.getUTCDay();
  }

  /**
   * Construit une date UTC correspondant à YYYY-MM-DD + minutes locales dans le fuseau tz.
   * Simplification robuste : on laisse Intl calculer l'offset du jour ciblé puis on ajuste.
   */
  private composeUtcFromTz(dayYMD: string, minutesOfDay: number, tz: string): Date {
    const hh = Math.floor(minutesOfDay / 60).toString().padStart(2, '0');
    const mm = (minutesOfDay % 60).toString().padStart(2, '0');
    const localAsUtc = new Date(`${dayYMD}T${hh}:${mm}:00Z`);
    const tzOffsetMs = this.tzOffsetMs(localAsUtc, tz);
    return new Date(localAsUtc.getTime() - tzOffsetMs);
  }

  /** Offset (ms) du fuseau `tz` par rapport à UTC à l'instant `utcDate`. */
  private tzOffsetMs(utcDate: Date, tz: string): number {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const parts = dtf.formatToParts(utcDate);
    const map: Record<string, string> = {};
    for (const p of parts) map[p.type] = p.value;
    const asUtc = Date.UTC(
      Number(map.year), Number(map.month) - 1, Number(map.day),
      Number(map.hour), Number(map.minute), Number(map.second),
    );
    return asUtc - utcDate.getTime();
  }

  // ========================================================================
  // 5. RÉSERVATION (ESCROW)
  // ========================================================================
  /**
   * Réservation : séquestre wallet (`confirmed`) ou Orange Money (`pending_payment` jusqu’au webhook).
   */
  async createBooking(fanUserId: string, input: {
    star_profile_id: string;
    duration_minutes: StarPriceKey;
    scheduled_start_at: string; // ISO UTC
    fan_notes?: string;
    payment_method?: 'wallet' | 'orange_money';
    payment_phone?: string;
  }): Promise<CreateStarBookingResult> {
    if (!ALLOWED_DURATIONS.includes(input.duration_minutes)) throw starError('Durée invalide', 400);

    const profile = await prisma.starProfile.findUnique({
      where: { id: input.star_profile_id },
      include: { user: { select: { id: true, username: true, full_name: true } } },
    });
    if (!profile || !profile.is_active || profile.is_banned) throw starError('Star indisponible', 404);
    if (profile.user_id === fanUserId) throw starError('Vous ne pouvez pas réserver votre propre profil', 400);

    const price = priceForDuration(profile, input.duration_minutes);
    if (price == null || price <= 0) throw starError('Durée non proposée par cette star', 400);

    const startAt = new Date(input.scheduled_start_at);
    if (Number.isNaN(startAt.getTime())) throw starError('scheduled_start_at invalide', 400);
    if (startAt.getTime() < Date.now() + 5 * 60_000) {
      throw starError('Réservation trop proche : minimum 5 minutes à l\'avance', 400);
    }
    const endAt = new Date(startAt.getTime() + input.duration_minutes * 60_000);

    const { fee, starShare } = computePlatformFee(price);
    const paymentMethod = input.payment_method ?? 'wallet';

    if (paymentMethod === 'orange_money') {
      const phoneRaw = String(input.payment_phone || '').trim();
      const digits = phoneRaw.replace(/\D/g, '');
      if (digits.length < 8) {
        throw starError('Numéro Orange Money requis (minimum 8 chiffres)', 400);
      }

      const bookingRow = await prisma.$transaction(async (tx) => {
        await assertStarBookingSlotAndFanLimits(tx, {
          starProfileId: profile.id,
          fanUserId,
          startAt,
          endAt,
          maxCallsPerDay: profile.max_calls_per_day,
        });
        const channel = `star-call:${crypto.randomUUID()}`;
        return tx.starBooking.create({
          data: {
            star_profile_id: profile.id,
            fan_user_id: fanUserId,
            star_user_id: profile.user_id,
            price_fcfa: price,
            duration_minutes: input.duration_minutes,
            currency: profile.currency,
            scheduled_start_at: startAt,
            scheduled_end_at: endAt,
            status: 'pending_payment',
            payment_method: 'orange_money',
            platform_fee_fcfa: fee,
            star_earnings_fcfa: starShare,
            agora_channel: channel,
            fan_notes: input.fan_notes ?? null,
          },
        });
      });

      try {
        const paymentService = (await import('./payment.service.js')).default;
        const appUrl =
          process.env.APP_PUBLIC_URL?.trim() ||
          process.env.APP_URL?.trim() ||
          process.env.FRONTEND_URL?.trim() ||
          'https://afriwonder.com';
        const returnUrl = `${appUrl.replace(/\/$/, '')}/stars?payment=success&bookingId=${encodeURIComponent(bookingRow.id)}`;
        const payResult = await paymentService.initiateOrangeMoneyPayment(
          fanUserId,
          bookingRow.id,
          {
            amount: price,
            phone: phoneRaw,
            returnUrl,
          },
          { useOrderPayment: false, transactionType: 'star_call_booking' },
        );
        return {
          booking: bookingRow,
          payment: {
            paymentUrl: payResult.paymentUrl,
            orderId: payResult.orderId,
            reference: payResult.reference,
            provider: payResult.provider ?? 'orange_money',
          },
        };
      } catch (err) {
        await prisma.starBooking.delete({ where: { id: bookingRow.id } }).catch(() => null);
        logger.warn('Star booking Orange Money init échec', {
          bookingId: bookingRow.id,
          err: err instanceof Error ? err.message : String(err),
        });
        throw starError(
          err instanceof Error ? err.message : 'Impossible d\'initier Orange Money',
          502,
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      await assertStarBookingSlotAndFanLimits(tx, {
        starProfileId: profile.id,
        fanUserId,
        startAt,
        endAt,
        maxCallsPerDay: profile.max_calls_per_day,
      });

      // Escrow fan
      const fanWallet = await getOrCreateUserWallet(tx, fanUserId);
      const fanAvailable = fanWallet.available_balance ?? fanWallet.balance ?? 0;
      if (fanAvailable < price) {
        throw starError(`Solde insuffisant. Disponible : ${fanAvailable.toLocaleString()} XOF`, 402);
      }

      const fanBalanceBefore = fanAvailable;
      const fanBalanceAfter = fanBalanceBefore - price;
      const fanLockedBefore = fanWallet.locked_balance ?? 0;
      const fanLockedAfter = fanLockedBefore + price;

      await tx.wallet.update({
        where: { id: fanWallet.id },
        data: {
          balance: fanBalanceAfter,
          available_balance: fanBalanceAfter,
          locked_balance: fanLockedAfter,
        },
      });

      const channel = `star-call:${crypto.randomUUID()}`;
      const booking = await tx.starBooking.create({
        data: {
          star_profile_id: profile.id,
          fan_user_id: fanUserId,
          star_user_id: profile.user_id,
          price_fcfa: price,
          duration_minutes: input.duration_minutes,
          currency: profile.currency,
          scheduled_start_at: startAt,
          scheduled_end_at: endAt,
          status: 'confirmed',
          payment_method: 'wallet',
          platform_fee_fcfa: fee,
          star_earnings_fcfa: starShare,
          agora_channel: channel,
          fan_notes: input.fan_notes ?? null,
        },
      });

      const txPayment = await tx.transaction.create({
        data: {
          user_id: fanUserId,
          type: 'star_call_payment',
          amount: price,
          currency: profile.currency,
          status: 'completed',
          description: `Réservation appel ${input.duration_minutes} min avec @${profile.user.username ?? 'star'}`,
          reference_id: booking.id,
        },
      });
      await tx.starBooking.update({ where: { id: booking.id }, data: { payment_transaction_id: txPayment.id } });

      await tx.ledgerEntry.create({
        data: {
          wallet_id: fanWallet.id,
          type: 'star_call_escrow_lock',
          amount: -price,
          reference_id: booking.id,
          reference_type: 'star_booking',
          description: `Escrow appel star — ${input.duration_minutes} min`,
          balance_before: fanBalanceBefore,
          balance_after: fanBalanceAfter,
        },
      });

      await tx.starCallSession.create({
        data: {
          booking_id: booking.id,
          fan_uid: toAgoraUid(fanUserId),
          star_uid: toAgoraUid(profile.user_id),
        },
      });

      return { booking, starUsername: profile.user.username };
    }).then(async (result) => {
      // Notifications hors transaction (best-effort)
      await Promise.all([
        notificationService.create(result.booking.fan_user_id, {
          type: 'star_call_booked',
          title: 'Réservation confirmée',
          message: `Rendez-vous fixé avec @${result.starUsername ?? 'la star'} le ${startAt.toLocaleString('fr-FR')}`,
          reference_type: 'star_booking',
          reference_id: result.booking.id,
        }).catch(() => null),
        notificationService.create(result.booking.star_user_id, {
          type: 'star_call_new_booking',
          title: 'Nouvelle réservation',
          message: `Un fan a réservé un appel ${input.duration_minutes} min pour le ${startAt.toLocaleString('fr-FR')}`,
          reference_type: 'star_booking',
          reference_id: result.booking.id,
        }).catch(() => null),
      ]);
      return { booking: result.booking };
    });
  }

  /**
   * Après paiement Orange Money (webhook / verify) : crédit synthétique + séquestre identique au flux wallet.
   * Idempotent si la réservation est déjà `confirmed`.
   */
  async confirmBookingAfterOrangeMoney(bookingId: string): Promise<void> {
    const booking = await prisma.starBooking.findUnique({
      where: { id: bookingId },
      include: { star_profile: { include: { user: { select: { username: true } } } } },
    });
    if (!booking || booking.status !== 'pending_payment') {
      throw new Error('STAR_BOOKING_PAYMENT_SKIP');
    }

    const payTx = await prisma.transaction.findFirst({
      where: {
        reference_id: bookingId,
        user_id: booking.fan_user_id,
        status: 'completed',
        type: 'star_call_booking',
      },
      orderBy: { updated_at: 'desc' },
    });
    if (!payTx || Math.abs(payTx.amount - booking.price_fcfa) > 1) {
      logger.warn('confirmBookingAfterOrangeMoney: transaction introuvable ou montant incohérent', {
        bookingId,
      });
      throw new Error('STAR_BOOKING_PAYMENT_SKIP');
    }

    const uname = booking.star_profile?.user?.username ?? 'star';

    await prisma.$transaction(async (tx) => {
      const b = await tx.starBooking.findUnique({ where: { id: bookingId } });
      if (!b || b.status !== 'pending_payment') return;

      const existingSession = await tx.starCallSession.findUnique({ where: { booking_id: bookingId } });
      if (existingSession) return;

      const fanWallet = await getOrCreateUserWallet(tx, b.fan_user_id);
      const availBefore = fanWallet.available_balance ?? fanWallet.balance ?? 0;
      const lockedBefore = fanWallet.locked_balance ?? 0;
      const price = b.price_fcfa;

      const availAfterCredit = availBefore + price;
      await tx.wallet.update({
        where: { id: fanWallet.id },
        data: {
          balance: availAfterCredit,
          available_balance: availAfterCredit,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          wallet_id: fanWallet.id,
          type: 'star_call_external_credit',
          amount: price,
          reference_id: b.id,
          reference_type: 'star_booking',
          description: `Crédit séquestre Orange Money — ${price.toLocaleString('fr-FR')} XOF`,
          balance_before: availBefore,
          balance_after: availAfterCredit,
        },
      });

      const availAfterLock = availAfterCredit - price;
      const lockedAfter = lockedBefore + price;
      await tx.wallet.update({
        where: { id: fanWallet.id },
        data: {
          balance: availAfterLock,
          available_balance: availAfterLock,
          locked_balance: lockedAfter,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          wallet_id: fanWallet.id,
          type: 'star_call_escrow_lock',
          amount: -price,
          reference_id: b.id,
          reference_type: 'star_booking',
          description: `Escrow appel star — ${b.duration_minutes} min (Orange Money)`,
          balance_before: availAfterCredit,
          balance_after: availAfterLock,
        },
      });

      await tx.starBooking.update({
        where: { id: b.id },
        data: {
          status: 'confirmed',
          payment_transaction_id: payTx.id,
        },
      });

      await tx.starCallSession.create({
        data: {
          booking_id: b.id,
          fan_uid: toAgoraUid(b.fan_user_id),
          star_uid: toAgoraUid(b.star_user_id),
        },
      });
    });

    const refreshed = await prisma.starBooking.findUnique({ where: { id: bookingId } });
    if (refreshed?.status !== 'confirmed') return;

    await Promise.all([
      notificationService.create(refreshed.fan_user_id, {
        type: 'star_call_booked',
        title: 'Réservation confirmée',
        message: `Rendez-vous fixé avec @${uname} le ${refreshed.scheduled_start_at.toLocaleString('fr-FR')}`,
        reference_type: 'star_booking',
        reference_id: refreshed.id,
      }).catch(() => null),
      notificationService.create(refreshed.star_user_id, {
        type: 'star_call_new_booking',
        title: 'Nouvelle réservation',
        message: `Un fan a réservé un appel ${refreshed.duration_minutes} min pour le ${refreshed.scheduled_start_at.toLocaleString('fr-FR')}`,
        reference_type: 'star_booking',
        reference_id: refreshed.id,
      }).catch(() => null),
    ]);
  }

  async listMyBookingsAsFan(fanUserId: string, status?: string) {
    return prisma.starBooking.findMany({
      where: { fan_user_id: fanUserId, ...(status ? { status } : {}) },
      orderBy: { scheduled_start_at: 'desc' },
      take: 50,
      include: {
        star_profile: {
          include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } },
        },
      },
    });
  }

  async listMyBookingsAsStar(starUserId: string, status?: string) {
    return prisma.starBooking.findMany({
      where: { star_user_id: starUserId, ...(status ? { status } : {}) },
      orderBy: { scheduled_start_at: 'desc' },
      take: 50,
      include: {
        fan: { select: { id: true, username: true, full_name: true, profile_image: true } },
      },
    });
  }

  async getBooking(bookingId: string, requesterId: string) {
    const booking = await prisma.starBooking.findUnique({
      where: { id: bookingId },
      include: {
        star_profile: { include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } } },
        fan: { select: { id: true, username: true, full_name: true, profile_image: true } },
        call_session: true,
        extensions: { orderBy: { created_at: 'asc' } },
        rating: true,
      },
    });
    if (!booking) throw starError('Réservation introuvable', 404);
    if (booking.fan_user_id !== requesterId && booking.star_user_id !== requesterId) {
      throw starError('Accès refusé', 403);
    }
    return booking;
  }

  // ========================================================================
  // 6. AGORA TOKEN (scope : starcall)
  // ========================================================================
  async getAgoraTokenForBooking(bookingId: string, requesterId: string) {
    const booking = await prisma.starBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true, fan_user_id: true, star_user_id: true, status: true,
        scheduled_start_at: true, scheduled_end_at: true, agora_channel: true,
        agora_token_nonce: true, extra_minutes: true, duration_minutes: true,
      },
    });
    if (!booking) throw starError('Réservation introuvable', 404);
    if (booking.fan_user_id !== requesterId && booking.star_user_id !== requesterId) {
      throw starError('Accès refusé', 403);
    }
    if (!['confirmed', 'ongoing'].includes(booking.status)) {
      throw starError(`Appel indisponible (statut ${booking.status})`, 409);
    }
    const now = Date.now();
    const windowStart = booking.scheduled_start_at.getTime() - 10 * 60_000; // T-10 min
    const totalDur = booking.duration_minutes + (booking.extra_minutes || 0);
    const windowEnd = booking.scheduled_start_at.getTime() + totalDur * 60_000 + 10 * 60_000;
    if (now < windowStart) throw starError('Appel pas encore ouvert (ouverture 10 min avant)', 425);
    if (now > windowEnd) throw starError('Fenêtre d\'appel expirée', 410);

    const appId = process.env.AGORA_APP_ID?.trim();
    const appCert = process.env.AGORA_APP_CERTIFICATE?.trim();
    if (!appId || !appCert) {
      throw starError('Appels vidéo indisponibles pour l\'instant (config Agora manquante)', 503);
    }
    const agoraToken = await import('agora-token');
    const { RtcTokenBuilder, RtcRole } = agoraToken.default ?? agoraToken;
    const uid = toAgoraUid(requesterId);
    const ttlSec = Math.max(300, Math.ceil((windowEnd - now) / 1000));
    const expireTime = Math.floor(now / 1000) + ttlSec;
    const token = RtcTokenBuilder.buildTokenWithUid(appId, appCert, booking.agora_channel, uid, RtcRole.PUBLISHER, ttlSec, ttlSec);

    await prisma.starBooking.update({
      where: { id: booking.id },
      data: { agora_token_nonce: { increment: 1 } },
    });

    return {
      app_id: appId,
      channel: booking.agora_channel,
      uid,
      token,
      expire_at: expireTime,
      role: booking.fan_user_id === requesterId ? 'fan' : 'star',
    };
  }

  // ========================================================================
  // 7. CYCLE DE VIE DE L'APPEL
  // ========================================================================
  async joinCall(bookingId: string, requesterId: string) {
    const booking = await prisma.starBooking.findUnique({
      where: { id: bookingId },
      include: { call_session: true },
    });
    if (!booking) throw starError('Réservation introuvable', 404);
    if (booking.fan_user_id !== requesterId && booking.star_user_id !== requesterId) {
      throw starError('Accès refusé', 403);
    }
    if (!booking.call_session) throw starError('Session d\'appel manquante', 500);

    const isFan = booking.fan_user_id === requesterId;
    const now = new Date();
    const data: Prisma.StarCallSessionUpdateInput = { last_heartbeat_at: now };
    if (isFan && !booking.call_session.fan_joined_at) data.fan_joined_at = now;
    if (!isFan && !booking.call_session.star_joined_at) data.star_joined_at = now;

    const otherJoinedAt = isFan ? booking.call_session.star_joined_at : booking.call_session.fan_joined_at;
    const bothNow = otherJoinedAt && !booking.call_session.both_present_at;
    if (bothNow) data.both_present_at = now;

    const updated = await prisma.starCallSession.update({
      where: { booking_id: booking.id },
      data,
    });

    if (bothNow || booking.status === 'confirmed') {
      await prisma.starBooking.update({
        where: { id: booking.id },
        data: {
          status: 'ongoing',
          actually_started_at: booking.actually_started_at ?? (bothNow ? now : booking.actually_started_at),
        },
      });
    }
    if (bothNow) {
      await Promise.all([
        notificationService.create(booking.fan_user_id, {
          type: 'star_call_ready',
          title: 'Appel prêt',
          message: 'La star est connectée, vous pouvez commencer.',
          reference_type: 'star_booking',
          reference_id: booking.id,
        }).catch(() => null),
        notificationService.create(booking.star_user_id, {
          type: 'star_call_ready',
          title: 'Appel prêt',
          message: 'Le fan est connecté, vous pouvez commencer.',
          reference_type: 'star_booking',
          reference_id: booking.id,
        }).catch(() => null),
      ]);
    }
    return updated;
  }

  async heartbeat(bookingId: string, requesterId: string) {
    const booking = await prisma.starBooking.findUnique({ where: { id: bookingId }, select: { fan_user_id: true, star_user_id: true } });
    if (!booking) return { ok: false };
    if (booking.fan_user_id !== requesterId && booking.star_user_id !== requesterId) return { ok: false };
    await prisma.starCallSession.update({
      where: { booking_id: bookingId },
      data: { last_heartbeat_at: new Date() },
    }).catch(() => null);
    return { ok: true };
  }

  /** Fin côté client (l'un des deux raccroche) → complète si on a déjà démarré, sinon abort. */
  async endCall(bookingId: string, requesterId: string, reason = 'hangup') {
    const booking = await prisma.starBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw starError('Réservation introuvable', 404);
    if (booking.fan_user_id !== requesterId && booking.star_user_id !== requesterId) throw starError('Accès refusé', 403);
    if (booking.status === 'completed' || booking.status === 'refunded' || booking.status === 'cancelled') {
      return booking;
    }
    if (booking.status === 'ongoing' || booking.actually_started_at) {
      return this.completeBooking(booking.id, reason);
    }
    // Si aucun des deux n'a rejoint → no-show côté opposé au finisher
    const isStar = booking.star_user_id === requesterId;
    return this.handleNoShow(booking.id, isStar ? 'fan' : 'star');
  }

  /**
   * Balayage périodique (cron) : appels terminés silencieusement.
   *  - booking.status = 'ongoing' ET last_heartbeat_at > MAX_HEARTBEAT_GAP_MS → complete
   *  - scheduled_end_at passé de > 5 min sans complétion → complete
   *  - scheduled_start_at + FAN_NO_SHOW_WINDOW_MIN dépassé ET fan_joined_at null → no-show fan
   *  - scheduled_start_at + STAR_NO_SHOW_WINDOW_MIN dépassé ET star_joined_at null → no-show star
   */
  async reaperTick() {
    const now = new Date();
    const stale = await prisma.starBooking.findMany({
      where: {
        status: { in: ['confirmed', 'ongoing'] },
        OR: [
          { scheduled_end_at: { lt: new Date(now.getTime() - 5 * 60_000) } },
          {
            call_session: {
              is: {
                last_heartbeat_at: { lt: new Date(now.getTime() - MAX_HEARTBEAT_GAP_MS) },
              },
            },
          },
        ],
      },
      include: { call_session: true },
      take: 100,
    });
    for (const b of stale) {
      try {
        if (b.status === 'ongoing' || b.call_session?.both_present_at) {
          await this.completeBooking(b.id, 'reaper');
          continue;
        }
        if (!b.call_session?.fan_joined_at && now.getTime() > b.scheduled_start_at.getTime() + FAN_NO_SHOW_WINDOW_MIN * 60_000) {
          await this.handleNoShow(b.id, 'fan'); continue;
        }
        if (!b.call_session?.star_joined_at && now.getTime() > b.scheduled_start_at.getTime() + STAR_NO_SHOW_WINDOW_MIN * 60_000) {
          await this.handleNoShow(b.id, 'star'); continue;
        }
        // Sinon, dépassement planifié sans heartbeat : clôture sans paiement, remboursement intégral
        await this.refundBooking(b.id, b.price_fcfa, 'timeout_no_heartbeat');
      } catch (err) {
        logger.warn('[StarCall] reaper failed', { id: b.id, err: (err as Error).message });
      }
    }
    return { swept: stale.length };
  }

  /** Complétion normale → libère escrow + paie la star. */
  async completeBooking(bookingId: string, reason = 'completed') {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.starBooking.findUnique({ where: { id: bookingId } });
      if (!booking) throw starError('Réservation introuvable', 404);
      if (booking.status === 'completed') return booking;
      if (!['ongoing', 'confirmed'].includes(booking.status)) {
        throw starError(`Complétion refusée (statut ${booking.status})`, 409);
      }

      const fanWallet = await getOrCreateUserWallet(tx, booking.fan_user_id);
      const starWallet = await getOrCreateUserWallet(tx, booking.star_user_id);

      const totalAmount = booking.price_fcfa + this.sumExtensionsFromBooking(booking);
      const { fee: platformFee, starShare } = computePlatformFee(totalAmount);

      // Débloque escrow fan
      const fanLockedBefore = fanWallet.locked_balance ?? 0;
      const fanLockedAfter = Math.max(0, fanLockedBefore - totalAmount);
      await tx.wallet.update({
        where: { id: fanWallet.id },
        data: { locked_balance: fanLockedAfter },
      });

      // Crédit star
      const starAvailBefore = starWallet.available_balance ?? starWallet.balance ?? 0;
      const starAvailAfter = starAvailBefore + starShare;
      await tx.wallet.update({
        where: { id: starWallet.id },
        data: {
          balance: starAvailAfter,
          available_balance: starAvailAfter,
          total_earnings: { increment: starShare },
        },
      });

      const payoutTx = await tx.transaction.create({
        data: {
          user_id: booking.star_user_id,
          type: 'star_call_payout',
          amount: starShare,
          currency: booking.currency,
          status: 'completed',
          description: `Revenus appel star — ${booking.duration_minutes + (booking.extra_minutes || 0)} min`,
          reference_id: booking.id,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          wallet_id: fanWallet.id,
          type: 'star_call_escrow_release',
          amount: 0,
          reference_id: booking.id,
          reference_type: 'star_booking',
          description: `Libération escrow (${totalAmount})`,
          balance_before: fanWallet.available_balance ?? 0,
          balance_after: fanWallet.available_balance ?? 0,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          wallet_id: starWallet.id,
          type: 'star_call_earnings',
          amount: starShare,
          reference_id: booking.id,
          reference_type: 'star_booking',
          description: `Revenus appel star (après commission ${Math.round(PLATFORM_COMMISSION_RATE * 100)}%)`,
          balance_before: starAvailBefore,
          balance_after: starAvailAfter,
        },
      });

      const updated = await tx.starBooking.update({
        where: { id: booking.id },
        data: {
          status: 'completed',
          actually_ended_at: new Date(),
          payout_transaction_id: payoutTx.id,
          platform_fee_fcfa: platformFee,
          star_earnings_fcfa: starShare,
        },
      });

      await tx.starCallSession.update({
        where: { booking_id: booking.id },
        data: { ended_at: new Date(), end_reason: reason },
      }).catch(() => null);

      await tx.starProfile.update({
        where: { id: booking.star_profile_id },
        data: {
          calls_completed: { increment: 1 },
          total_earnings_fcfa: { increment: starShare },
        },
      });

      logger.info('[StarCall] completed', { bookingId, starShare, platformFee, reason });
      return updated;
    });
  }

  private sumExtensionsFromBooking(booking: { extra_minutes: number; duration_minutes: number; price_fcfa: number }) {
    if (!booking.extra_minutes) return 0;
    const perMinute = booking.price_fcfa / booking.duration_minutes;
    return Math.round(perMinute * booking.extra_minutes);
  }

  // ========================================================================
  // 8. EXTENSION +5 MIN
  // ========================================================================
  async extendCall(bookingId: string, fanUserId: string) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.starBooking.findUnique({
        where: { id: bookingId },
        include: { extensions: true, star_profile: true },
      });
      if (!booking) throw starError('Réservation introuvable', 404);
      if (booking.fan_user_id !== fanUserId) throw starError('Seul le fan peut prolonger', 403);
      if (!['ongoing', 'confirmed'].includes(booking.status)) throw starError('Extension indisponible', 409);
      if (booking.extensions.length >= booking.star_profile.max_extensions_per_call) {
        throw starError('Limite d\'extensions atteinte', 409);
      }

      const perMinute = booking.price_fcfa / booking.duration_minutes;
      const extPrice = Math.round(perMinute * EXTENSION_MINUTES);
      const { fee, starShare } = computePlatformFee(extPrice);

      const fanWallet = await getOrCreateUserWallet(tx, fanUserId);
      const fanAvail = fanWallet.available_balance ?? fanWallet.balance ?? 0;
      if (fanAvail < extPrice) {
        throw starError(`Solde insuffisant pour +${EXTENSION_MINUTES} min (${extPrice.toLocaleString()} XOF)`, 402);
      }
      const fanBalanceBefore = fanAvail;
      const fanBalanceAfter = fanBalanceBefore - extPrice;
      const fanLockedBefore = fanWallet.locked_balance ?? 0;
      const fanLockedAfter = fanLockedBefore + extPrice;

      await tx.wallet.update({
        where: { id: fanWallet.id },
        data: {
          balance: fanBalanceAfter,
          available_balance: fanBalanceAfter,
          locked_balance: fanLockedAfter,
        },
      });

      const txPayment = await tx.transaction.create({
        data: {
          user_id: fanUserId,
          type: 'star_call_extension',
          amount: extPrice,
          currency: booking.currency,
          status: 'completed',
          description: `Extension +${EXTENSION_MINUTES} min appel star`,
          reference_id: booking.id,
        },
      });

      const ext = await tx.starBookingExtension.create({
        data: {
          booking_id: booking.id,
          minutes: EXTENSION_MINUTES,
          price_fcfa: extPrice,
          platform_fee_fcfa: fee,
          star_earnings_fcfa: starShare,
          transaction_id: txPayment.id,
          status: 'confirmed',
        },
      });

      const newExtra = (booking.extra_minutes || 0) + EXTENSION_MINUTES;
      const newEnd = new Date(booking.scheduled_end_at.getTime() + EXTENSION_MINUTES * 60_000);
      const updatedBooking = await tx.starBooking.update({
        where: { id: booking.id },
        data: {
          extra_minutes: newExtra,
          scheduled_end_at: newEnd,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          wallet_id: fanWallet.id,
          type: 'star_call_extension_lock',
          amount: -extPrice,
          reference_id: booking.id,
          reference_type: 'star_booking_extension',
          description: `Escrow extension +${EXTENSION_MINUTES} min`,
          balance_before: fanBalanceBefore,
          balance_after: fanBalanceAfter,
        },
      });

      return { booking: updatedBooking, extension: ext };
    });
  }

  // ========================================================================
  // 9. ANNULATIONS (fan & star)
  // ========================================================================
  async cancelByFan(bookingId: string, fanUserId: string, reason?: string) {
    const booking = await prisma.starBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw starError('Réservation introuvable', 404);
    if (booking.fan_user_id !== fanUserId) throw starError('Accès refusé', 403);
    if (!['confirmed', 'pending_payment'].includes(booking.status)) {
      throw starError('Annulation impossible à ce stade', 409);
    }

    if (booking.status === 'pending_payment') {
      await prisma.transaction.updateMany({
        where: {
          reference_id: booking.id,
          user_id: booking.fan_user_id,
          status: 'pending',
          type: 'star_call_booking',
        },
        data: { status: 'failed' },
      });
      const updated = await prisma.starBooking.update({
        where: { id: booking.id },
        data: {
          status: 'cancelled',
          cancel_reason: reason ?? 'paiement_non_finalise',
          cancelled_by: fanUserId,
          cancelled_at: new Date(),
        },
      });
      await notificationService.create(booking.star_user_id, {
        type: 'star_call_cancelled',
        title: 'Réservation annulée',
        message: `Le fan a annulé avant la confirmation du paiement (${booking.scheduled_start_at.toLocaleString('fr-FR')}).`,
        reference_type: 'star_booking',
        reference_id: booking.id,
      }).catch(() => null);
      return updated;
    }

    const msUntilStart = booking.scheduled_start_at.getTime() - Date.now();
    const earlyCancel = msUntilStart > REFUND_CANCEL_WINDOW_MIN * 60_000;
    const price = booking.price_fcfa;
    const rawRefund = earlyCancel ? price : Math.round(price * FAN_LATE_CANCEL_REFUND_RATE);
    const fanRefund = Math.min(price, Math.max(0, rawRefund));
    const remainder = price - fanRefund;

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.starBooking.findUnique({ where: { id: bookingId } });
      if (!b) throw starError('Réservation introuvable', 404);

      if (fanRefund > 0) {
        await this.refundBookingTx(
          tx,
          b,
          fanRefund,
          earlyCancel ? 'fan_cancel_early' : 'fan_cancel_partial',
        );
      }
      if (remainder > 0) {
        await this.forfeitEscrowToStarAndPlatformTx(
          tx,
          b,
          remainder,
          reason || (earlyCancel ? 'fan_cancel' : 'fan_cancel_late_fee'),
        );
      }

      return tx.starBooking.update({
        where: { id: booking.id },
        data: {
          status: 'cancelled',
          cancel_reason: reason ?? null,
          cancelled_by: fanUserId,
          cancelled_at: new Date(),
          ...(fanRefund > 0 ? { refund_amount_fcfa: { increment: fanRefund } } : {}),
        },
      });
    });

    await notificationService.create(booking.star_user_id, {
      type: 'star_call_cancelled',
      title: 'Appel annulé',
      message: `Le fan a annulé l'appel du ${booking.scheduled_start_at.toLocaleString('fr-FR')}`,
      reference_type: 'star_booking',
      reference_id: booking.id,
    }).catch(() => null);
    return updated;
  }

  async cancelByStar(bookingId: string, starUserId: string, reason?: string) {
    const booking = await prisma.starBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw starError('Réservation introuvable', 404);
    if (booking.star_user_id !== starUserId) throw starError('Accès refusé', 403);
    if (!['confirmed', 'pending_payment'].includes(booking.status)) {
      throw starError('Annulation impossible à ce stade', 409);
    }

    if (booking.status === 'pending_payment') {
      await prisma.transaction.updateMany({
        where: {
          reference_id: booking.id,
          user_id: booking.fan_user_id,
          status: 'pending',
          type: 'star_call_booking',
        },
        data: { status: 'failed' },
      });
      await prisma.starProfile.update({
        where: { id: booking.star_profile_id },
        data: { calls_no_show: { increment: 1 } },
      });
      const updated = await prisma.starBooking.update({
        where: { id: booking.id },
        data: {
          status: 'cancelled',
          cancel_reason: reason ?? null,
          cancelled_by: starUserId,
          cancelled_at: new Date(),
        },
      });
      await notificationService.create(booking.fan_user_id, {
        type: 'star_call_star_cancelled',
        title: 'Réservation annulée',
        message: `La star a annulé avant la confirmation du paiement (${booking.scheduled_start_at.toLocaleString('fr-FR')}).`,
        reference_type: 'star_booking',
        reference_id: booking.id,
      }).catch(() => null);
      return updated;
    }

    // Remboursement intégral fan + pénalité star (+1 no-show)
    await this.refundBooking(booking.id, booking.price_fcfa, reason || 'star_cancel');

    await prisma.starProfile.update({
      where: { id: booking.star_profile_id },
      data: { calls_no_show: { increment: 1 } },
    });

    const updated = await prisma.starBooking.update({
      where: { id: booking.id },
      data: {
        status: 'cancelled',
        cancel_reason: reason ?? null,
        cancelled_by: starUserId,
        cancelled_at: new Date(),
      },
    });
    await notificationService.create(booking.fan_user_id, {
      type: 'star_call_star_cancelled',
      title: 'Appel annulé par la star',
      message: `Votre appel du ${booking.scheduled_start_at.toLocaleString('fr-FR')} a été annulé. Remboursement effectué.`,
      reference_type: 'star_booking',
      reference_id: booking.id,
    }).catch(() => null);
    return updated;
  }

  private async handleNoShow(bookingId: string, who: 'fan' | 'star') {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.starBooking.findUnique({ where: { id: bookingId } });
      if (!booking || !['confirmed', 'ongoing'].includes(booking.status)) return booking;

      if (who === 'star') {
        // Remboursement fan intégral + pénalité star
        await this.refundBookingTx(tx, booking, booking.price_fcfa, 'no_show_star');
        await tx.starProfile.update({ where: { id: booking.star_profile_id }, data: { calls_no_show: { increment: 1 } } });
        const updated = await tx.starBooking.update({ where: { id: booking.id }, data: { status: 'no_show_star' } });
        await notificationService.create(booking.fan_user_id, {
          type: 'star_call_no_show_star',
          title: 'Star absente',
          message: 'La star ne s\'est pas connectée. Vous avez été remboursé·e intégralement.',
          reference_type: 'star_booking',
          reference_id: booking.id,
        }).catch(() => null);
        return updated;
      }

      // Fan no-show : la star est payée quand même (simulate appel minimum)
      const fanWallet = await getOrCreateUserWallet(tx, booking.fan_user_id);
      const starWallet = await getOrCreateUserWallet(tx, booking.star_user_id);
      const { fee, starShare } = computePlatformFee(booking.price_fcfa);

      const fanLockedAfter = Math.max(0, (fanWallet.locked_balance ?? 0) - booking.price_fcfa);
      await tx.wallet.update({ where: { id: fanWallet.id }, data: { locked_balance: fanLockedAfter } });

      const starAvailBefore = starWallet.available_balance ?? starWallet.balance ?? 0;
      const starAvailAfter = starAvailBefore + starShare;
      await tx.wallet.update({
        where: { id: starWallet.id },
        data: {
          balance: starAvailAfter,
          available_balance: starAvailAfter,
          total_earnings: { increment: starShare },
        },
      });
      await tx.transaction.create({
        data: {
          user_id: booking.star_user_id,
          type: 'star_call_no_show_payout',
          amount: starShare,
          currency: booking.currency,
          status: 'completed',
          description: 'Indemnisation no-show fan',
          reference_id: booking.id,
        },
      });
      const updated = await tx.starBooking.update({
        where: { id: booking.id },
        data: { status: 'no_show_fan', platform_fee_fcfa: fee, star_earnings_fcfa: starShare },
      });
      return updated;
    });
  }

  /** Remboursement complet (ou partiel) en dehors d'une transaction courante. */
  private async refundBooking(bookingId: string, amount: number, reason: string) {
    return prisma.$transaction(async (tx) => {
      const b = await tx.starBooking.findUnique({ where: { id: bookingId } });
      if (!b) return null;
      await this.refundBookingTx(tx, b, amount, reason);
      return tx.starBooking.update({
        where: { id: bookingId },
        data: { refund_amount_fcfa: { increment: amount }, status: b.status === 'disputed' ? 'refunded' : b.status },
      });
    });
  }

  private async refundBookingTx(
    tx: Prisma.TransactionClient,
    booking: { id: string; fan_user_id: string; price_fcfa: number; currency: string },
    amount: number,
    reason: string,
  ) {
    if (amount <= 0) return;
    const fanWallet = await getOrCreateUserWallet(tx, booking.fan_user_id);
    const lockedBefore = fanWallet.locked_balance ?? 0;
    const lockedAfter = Math.max(0, lockedBefore - amount);
    const availBefore = fanWallet.available_balance ?? fanWallet.balance ?? 0;
    const availAfter = availBefore + amount;
    await tx.wallet.update({
      where: { id: fanWallet.id },
      data: {
        locked_balance: lockedAfter,
        balance: availAfter,
        available_balance: availAfter,
      },
    });
    await tx.transaction.create({
      data: {
        user_id: booking.fan_user_id,
        type: 'star_call_refund',
        amount,
        currency: booking.currency,
        status: 'completed',
        description: `Remboursement appel star (${reason})`,
        reference_id: booking.id,
      },
    });
    await tx.ledgerEntry.create({
      data: {
        wallet_id: fanWallet.id,
        type: 'star_call_refund',
        amount,
        reference_id: booking.id,
        reference_type: 'star_booking',
        description: `Remboursement (${reason})`,
        balance_before: availBefore,
        balance_after: availAfter,
      },
    });
  }

  /**
   * Partie d’escrow non remboursée au fan (frais annulation tardive) :
   * commission plateforme implicite + part créateur comme dans `computePlatformFee`.
   */
  private async forfeitEscrowToStarAndPlatformTx(
    tx: Prisma.TransactionClient,
    booking: { id: string; fan_user_id: string; star_user_id: string; currency: string },
    amount: number,
    reason: string,
  ) {
    if (amount <= 0) return;
    const fanWallet = await getOrCreateUserWallet(tx, booking.fan_user_id);
    const starWallet = await getOrCreateUserWallet(tx, booking.star_user_id);
    const { fee, starShare } = computePlatformFee(amount);

    const lockedBefore = fanWallet.locked_balance ?? 0;
    const lockedAfter = Math.max(0, lockedBefore - amount);
    await tx.wallet.update({ where: { id: fanWallet.id }, data: { locked_balance: lockedAfter } });

    const starAvailBefore = starWallet.available_balance ?? starWallet.balance ?? 0;
    const starAvailAfter = starAvailBefore + starShare;
    await tx.wallet.update({
      where: { id: starWallet.id },
      data: {
        balance: starAvailAfter,
        available_balance: starAvailAfter,
        total_earnings: { increment: starShare },
      },
    });
    await tx.transaction.create({
      data: {
        user_id: booking.star_user_id,
        type: 'star_call_late_cancel_payout',
        amount: starShare,
        currency: booking.currency,
        status: 'completed',
        description: `Indemnisation (${reason})`,
        reference_id: booking.id,
      },
    });
    await tx.ledgerEntry.create({
      data: {
        wallet_id: starWallet.id,
        type: 'star_call_late_cancel_earnings',
        amount: starShare,
        reference_id: booking.id,
        reference_type: 'star_booking',
        description: `Late-cancel payout (${reason}) - fee ${fee}`,
        balance_before: starAvailBefore,
        balance_after: starAvailAfter,
      },
    });
  }

  private async forfeitToPlatform(bookingId: string, amount: number, reason: string) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.starBooking.findUnique({ where: { id: bookingId } });
      if (!booking) return;
      await this.forfeitEscrowToStarAndPlatformTx(tx, booking, amount, reason);
    });
  }

  // ========================================================================
  // 10. RATING & DISPUTES
  // ========================================================================
  async rateBooking(bookingId: string, fanUserId: string, rating: number, review?: string) {
    if (rating < 1 || rating > 5) throw starError('Note entre 1 et 5', 400);
    const booking = await prisma.starBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw starError('Réservation introuvable', 404);
    if (booking.fan_user_id !== fanUserId) throw starError('Accès refusé', 403);
    if (booking.status !== 'completed') throw starError('Note disponible après un appel complété', 409);
    const existing = await prisma.starRating.findUnique({ where: { booking_id: bookingId } });
    if (existing) throw starError('Déjà noté', 409);

    return prisma.$transaction(async (tx) => {
      const r = await tx.starRating.create({
        data: {
          booking_id: booking.id,
          star_profile_id: booking.star_profile_id,
          fan_user_id: booking.fan_user_id,
          star_user_id: booking.star_user_id,
          rating,
          review: review?.slice(0, 1000) ?? null,
          is_positive: rating >= 4,
        },
      });
      const agg = await tx.starRating.aggregate({
        where: { star_profile_id: booking.star_profile_id, is_hidden: false },
        _avg: { rating: true },
        _count: { rating: true },
      });
      await tx.starProfile.update({
        where: { id: booking.star_profile_id },
        data: {
          rating_avg: Number(agg._avg.rating ?? 0),
          rating_count: agg._count.rating,
        },
      });
      return r;
    });
  }

  async openDispute(bookingId: string, userId: string, reason: string, description?: string) {
    const booking = await prisma.starBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw starError('Réservation introuvable', 404);
    if (booking.fan_user_id !== userId && booking.star_user_id !== userId) throw starError('Accès refusé', 403);
    if (!['completed', 'ongoing', 'no_show_fan', 'no_show_star'].includes(booking.status)) {
      throw starError('Litige indisponible à ce stade', 409);
    }
    const existing = await prisma.starDispute.findFirst({ where: { booking_id: bookingId, status: 'open' } });
    if (existing) throw starError('Un litige est déjà ouvert', 409);

    const d = await prisma.starDispute.create({
      data: {
        booking_id: booking.id,
        opener_user_id: userId,
        reason: reason.slice(0, 80),
        description: description?.slice(0, 2000) ?? null,
        status: 'open',
      },
    });
    await prisma.starBooking.update({ where: { id: booking.id }, data: { status: 'disputed' } });
    return d;
  }

  async addDisputeMessage(disputeId: string, authorId: string, body: string) {
    const d = await prisma.starDispute.findUnique({ where: { id: disputeId }, include: { booking: true } });
    if (!d) throw starError('Litige introuvable', 404);
    if (![d.booking.fan_user_id, d.booking.star_user_id].includes(authorId)) throw starError('Accès refusé', 403);
    if (d.status !== 'open') throw starError('Litige clos', 409);
    return prisma.starDisputeMessage.create({
      data: { dispute_id: disputeId, author_id: authorId, body: body.slice(0, 2000), is_admin: false },
    });
  }

  async listDisputesForUser(userId: string) {
    return prisma.starDispute.findMany({
      where: {
        OR: [
          { opener_user_id: userId },
          { booking: { OR: [{ fan_user_id: userId }, { star_user_id: userId }] } },
        ],
      },
      orderBy: { created_at: 'desc' },
      include: { booking: true, messages: { orderBy: { created_at: 'asc' } } },
    });
  }

  // ========================================================================
  // 11. RAPPELS AVANT APPEL
  // ========================================================================
  /**
   * Envoie un rappel unique 10 min avant le créneau aux 2 parties.
   * Marque `reminder_sent_at` pour éviter les doublons.
   */
  async processUpcomingReminders() {
    const now = new Date();
    const in10Min = new Date(now.getTime() + 10 * 60_000);
    const targets = await prisma.starBooking.findMany({
      where: {
        status: 'confirmed',
        reminder_sent_at: null,
        scheduled_start_at: { gte: now, lte: in10Min },
      },
      include: {
        star: { select: { username: true, full_name: true } },
      },
      take: 200,
    });
    if (!targets.length) return { sent: 0 };

    let sent = 0;
    for (const b of targets) {
      const starName = b.star.full_name || b.star.username || 'la star';
      const when = b.scheduled_start_at.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      await Promise.all([
        notificationService.create(b.fan_user_id, {
          type: 'star_call_reminder_10min',
          title: 'Rappel appel dans 10 min',
          message: `Votre appel avec ${starName} démarre à ${when}.`,
          reference_type: 'star_booking',
          reference_id: b.id,
        }).catch(() => null),
        notificationService.create(b.star_user_id, {
          type: 'star_call_reminder_10min',
          title: 'Rappel appel dans 10 min',
          message: `Votre rendez-vous fan démarre à ${when}.`,
          reference_type: 'star_booking',
          reference_id: b.id,
        }).catch(() => null),
      ]);
      await prisma.starBooking.update({
        where: { id: b.id },
        data: { reminder_sent_at: new Date() },
      });
      sent += 2;
    }
    return { sent };
  }
}

export default new StarCallService();
