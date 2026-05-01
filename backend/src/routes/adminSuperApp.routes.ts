/**
 * Routes admin super-app — KPIs et contrôles des modules ajoutés en vagues 1-8.
 *
 * Scope (nouveaux modules) :
 *  - Tontines (V1)
 *  - Rides / Shipments tracking live (V2) — lecture
 *  - Doctors / Appointments (V3) — validation
 *  - Bus companies / routes / bookings (V4)
 *  - Hotels / rooms / bookings (V4)
 *  - Live commerce pinned products (V5)
 *  - Utility bill providers + payments (V6)
 *  - Savings plans (V8)
 *  - Virtual cards (V8)
 *
 * Tous les endpoints exigent `requireAnyAdmin` ou un rôle plus fort.
 * Les endpoints **de lecture** n'impactent pas la data existante.
 * Les endpoints **d'écriture** sont tous auditées via `auditLog`.
 */
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAnyAdmin } from '../middleware/adminRbac.js';
import { validateBody } from '../utils/zodValidation.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';
import adminAuditService from '../services/adminAudit.service.js';
import crowdfundingService from '../services/crowdfunding.service.js';

const router = Router();

/** Helper d'audit — même pattern que admin.routes.ts */
async function auditLog(
  req: AuthRequest,
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>,
) {
  if (!req.user?.id) return;
  await adminAuditService.log({
    admin_id: req.user.id,
    action_type: action,
    target_type: targetType,
    target_id: targetId,
    metadata,
    ip_address: req.ip || 'unknown',
    user_agent: req.get('user-agent') || 'unknown',
  });
}

// =========================
// 1. KPIs CONSOLIDÉS SUPER-APP
// =========================
router.get('/kpis', authenticate, requireAnyAdmin, async (_req, res, next) => {
  try {
    const [
      tontinesActive, tontinesCompleted, tontinesTotalMembers,
      busBookingsTotal, busBookingsPaid,
      hotelBookingsTotal,
      billPaymentsPaid, billPaymentsPending,
      savingsPlansActive, savingsTotalBalance,
      virtualCardsActive,
      livePinnedCount,
      campaignsPending, campaignsActive, campaignsSuspended,
    ] = await Promise.all([
      prisma.tontine.count({ where: { status: 'active' } }),
      prisma.tontine.count({ where: { status: 'completed' } }),
      prisma.tontineMember.count({ where: { status: 'accepted' } }),
      prisma.busBooking.count(),
      prisma.busBooking.count({ where: { payment_status: 'paid' } }),
      prisma.hotelBooking.count(),
      prisma.utilityBillPayment.count({ where: { status: 'paid' } }),
      prisma.utilityBillPayment.count({ where: { status: 'pending' } }),
      prisma.savingsPlan.count({ where: { status: 'active' } }),
      prisma.savingsPlan.aggregate({
        where: { status: 'active' },
        _sum: { balance: true },
      }),
      prisma.virtualCard.count({ where: { status: 'active' } }),
      prisma.livePinnedProduct.count(),
      prisma.campaign.count({ where: { status: 'pending' } }),
      prisma.campaign.count({ where: { status: 'active' } }),
      prisma.campaign.count({ where: { status: 'suspended' } }),
    ]);

    res.json({
      success: true,
      data: {
        tontines: {
          active: tontinesActive,
          completed: tontinesCompleted,
          total_members: tontinesTotalMembers,
        },
        travel: {
          bus_bookings_total: busBookingsTotal,
          bus_bookings_paid: busBookingsPaid,
          hotel_bookings_total: hotelBookingsTotal,
        },
        bills: {
          paid: billPaymentsPaid,
          pending: billPaymentsPending,
        },
        savings: {
          active_plans: savingsPlansActive,
          total_balance_fcfa: Math.round(savingsTotalBalance._sum.balance ?? 0),
        },
        cards: {
          active: virtualCardsActive,
        },
        live_commerce: {
          pinned_products: livePinnedCount,
        },
        crowdfunding: {
          pending: campaignsPending,
          active: campaignsActive,
          suspended: campaignsSuspended,
        },
      },
    });
  } catch (err) { next(err); }
});

// =========================
// 2. TONTINES ADMIN
// =========================
router.get('/tontines', authenticate, requireAnyAdmin, async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const tontines = await prisma.tontine.findMany({
      where,
      include: {
        creator: { select: { id: true, username: true, full_name: true } },
        _count: { select: { members: true, cycles: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: tontines });
  } catch (err) { next(err); }
});

router.post('/tontines/:id/force-cancel', authenticate, requireAnyAdmin,
  validateBody(z.object({ reason: z.string().max(500).optional() })),
  async (req: AuthRequest, res, next) => {
    try {
      const id = param(req, 'id');
      await prisma.tontine.update({
        where: { id },
        data: { status: 'cancelled' },
      });
      await auditLog(req, 'tontine_force_cancel', 'tontine', id, req.body);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

// =========================
// 2b. CROWDFUNDING — lecture + suspension
// =========================
router.get('/crowdfunding', authenticate, requireAnyAdmin, async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        creator: { select: { id: true, username: true, full_name: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: campaigns });
  } catch (err) { next(err); }
});

const suspendCrowdfundingSchema = z.object({
  reason: z.string().max(500).optional(),
  fraudFlag: z.boolean().optional(),
  fraud_flag: z.boolean().optional(),
});

router.post('/crowdfunding/:id/suspend', authenticate, requireAnyAdmin,
  validateBody(suspendCrowdfundingSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const id = param(req, 'id');
      const reason = String(req.body.reason ?? 'Modération');
      const fraudFlag = Boolean(req.body.fraudFlag ?? req.body.fraud_flag);
      const result = await crowdfundingService.suspendCampaign(id, reason, fraudFlag);
      await auditLog(req, 'crowdfunding_suspend', 'campaign', id, { fraudFlag });
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  });

// =========================
// 3. BUS — COMPANIES + ROUTES
// =========================
router.get('/bus/companies', authenticate, requireAnyAdmin, async (_req, res, next) => {
  try {
    const companies = await prisma.busCompany.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { routes: true } } },
    });
    res.json({ success: true, data: companies });
  } catch (err) { next(err); }
});

const busCompanySchema = z.object({
  name: z.string().min(2).max(120),
  logo_url: z.string().url().optional(),
  phone: z.string().max(30).optional(),
  description: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
});

router.post('/bus/companies', authenticate, requireAnyAdmin, validateBody(busCompanySchema), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as z.infer<typeof busCompanySchema>;
    const c = await prisma.busCompany.create({ data: body });
    await auditLog(req, 'bus_company_create', 'bus_company', c.id, body);
    res.status(201).json({ success: true, data: c });
  } catch (err) { next(err); }
});

router.patch('/bus/companies/:id', authenticate, requireAnyAdmin, validateBody(busCompanySchema.partial()), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const body = req.body as Partial<z.infer<typeof busCompanySchema>>;
    const c = await prisma.busCompany.update({ where: { id }, data: body });
    await auditLog(req, 'bus_company_update', 'bus_company', id, body);
    res.json({ success: true, data: c });
  } catch (err) { next(err); }
});

const busRouteSchema = z.object({
  company_id: z.string().uuid(),
  origin_city: z.string().min(2).max(80),
  destination_city: z.string().min(2).max(80),
  departure_time: z.string().max(10),
  arrival_time: z.string().max(10),
  duration_min: z.number().int().min(1).max(2880),
  price_fcfa: z.number().positive(),
  bus_type: z.string().max(40).optional(),
  seats_total: z.number().int().min(1).max(200).optional(),
  is_active: z.boolean().optional(),
});

router.post('/bus/routes', authenticate, requireAnyAdmin, validateBody(busRouteSchema), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as z.infer<typeof busRouteSchema>;
    const r = await prisma.busRoute.create({ data: body });
    await auditLog(req, 'bus_route_create', 'bus_route', r.id, body);
    res.status(201).json({ success: true, data: r });
  } catch (err) { next(err); }
});

router.patch('/bus/routes/:id', authenticate, requireAnyAdmin, validateBody(busRouteSchema.partial()), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const body = req.body as Partial<z.infer<typeof busRouteSchema>>;
    const r = await prisma.busRoute.update({ where: { id }, data: body });
    await auditLog(req, 'bus_route_update', 'bus_route', id, body);
    res.json({ success: true, data: r });
  } catch (err) { next(err); }
});

router.get('/bus/bookings', authenticate, requireAnyAdmin, async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const bookings = await prisma.busBooking.findMany({
      where,
      include: {
        route: { include: { company: true } },
        passenger: { select: { id: true, username: true, full_name: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: bookings });
  } catch (err) { next(err); }
});

// =========================
// 4. HOTELS
// =========================
router.get('/hotels', authenticate, requireAnyAdmin, async (_req, res, next) => {
  try {
    const hotels = await prisma.hotel.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { rooms: true, bookings: true } } },
    });
    res.json({ success: true, data: hotels });
  } catch (err) { next(err); }
});

const hotelSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional(),
  address: z.string().min(2).max(200),
  city: z.string().min(2).max(80),
  country: z.string().max(8).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  star_rating: z.number().min(1).max(5).optional(),
  phone: z.string().max(30).optional(),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  price_fcfa_from: z.number().positive().optional(),
  is_active: z.boolean().optional(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string().url()).optional(),
});

router.post('/hotels', authenticate, requireAnyAdmin, validateBody(hotelSchema), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as z.infer<typeof hotelSchema>;
    const h = await prisma.hotel.create({ data: body });
    await auditLog(req, 'hotel_create', 'hotel', h.id, body);
    res.status(201).json({ success: true, data: h });
  } catch (err) { next(err); }
});

router.patch('/hotels/:id', authenticate, requireAnyAdmin, validateBody(hotelSchema.partial()), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const body = req.body as Partial<z.infer<typeof hotelSchema>>;
    const h = await prisma.hotel.update({ where: { id }, data: body });
    await auditLog(req, 'hotel_update', 'hotel', id, body);
    res.json({ success: true, data: h });
  } catch (err) { next(err); }
});

router.get('/hotels/bookings', authenticate, requireAnyAdmin, async (_req, res, next) => {
  try {
    const bookings = await prisma.hotelBooking.findMany({
      include: {
        hotel: { select: { id: true, name: true, city: true } },
        room: { select: { id: true, name: true } },
        guest: { select: { id: true, username: true, full_name: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: bookings });
  } catch (err) { next(err); }
});

// =========================
// 5. UTILITY BILL PROVIDERS (EDM, Somagep, Canal+, etc.)
// =========================
router.get('/bill-providers', authenticate, requireAnyAdmin, async (_req, res, next) => {
  try {
    const providers = await prisma.utilityBillProvider.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { payments: true } } },
    });
    res.json({ success: true, data: providers });
  } catch (err) { next(err); }
});

const providerSchema = z.object({
  slug: z.string().min(2).max(60),
  name: z.string().min(2).max(120),
  category: z.string().min(2).max(40),
  logo_url: z.string().url().optional(),
  country: z.string().max(8).optional(),
  fields_schema: z.record(z.unknown()),
  is_active: z.boolean().optional(),
});

router.post('/bill-providers', authenticate, requireAnyAdmin, validateBody(providerSchema), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as z.infer<typeof providerSchema>;
    const p = await prisma.utilityBillProvider.create({
      data: {
        slug: body.slug, name: body.name, category: body.category,
        logo_url: body.logo_url, country: body.country ?? 'ML',
        fields_schema: body.fields_schema as any,
        is_active: body.is_active ?? true,
      },
    });
    await auditLog(req, 'bill_provider_create', 'bill_provider', p.id, body);
    res.status(201).json({ success: true, data: p });
  } catch (err) { next(err); }
});

router.patch('/bill-providers/:id', authenticate, requireAnyAdmin, validateBody(providerSchema.partial()), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const body = req.body as Partial<z.infer<typeof providerSchema>>;
    const p = await prisma.utilityBillProvider.update({
      where: { id },
      data: {
        slug: body.slug, name: body.name, category: body.category,
        logo_url: body.logo_url, country: body.country,
        fields_schema: body.fields_schema as any,
        is_active: body.is_active,
      },
    });
    await auditLog(req, 'bill_provider_update', 'bill_provider', id, body);
    res.json({ success: true, data: p });
  } catch (err) { next(err); }
});

router.get('/bill-payments', authenticate, requireAnyAdmin, async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const payments = await prisma.utilityBillPayment.findMany({
      where,
      include: {
        provider: { select: { id: true, name: true, category: true } },
        user: { select: { id: true, username: true, full_name: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: payments });
  } catch (err) { next(err); }
});

// =========================
// 6. SAVINGS PLANS admin
// =========================
router.get('/savings', authenticate, requireAnyAdmin, async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const plans = await prisma.savingsPlan.findMany({
      where,
      include: { user: { select: { id: true, username: true, full_name: true } } },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
    res.json({ success: true, data: plans });
  } catch (err) { next(err); }
});

// =========================
// 7. VIRTUAL CARDS admin
// =========================
router.get('/virtual-cards', authenticate, requireAnyAdmin, async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const cards = await prisma.virtualCard.findMany({
      where,
      include: { user: { select: { id: true, username: true, full_name: true } } },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
    res.json({ success: true, data: cards });
  } catch (err) { next(err); }
});

router.post('/virtual-cards/:id/force-block', authenticate, requireAnyAdmin,
  validateBody(z.object({ reason: z.string().max(500).optional() })),
  async (req: AuthRequest, res, next) => {
    try {
      const id = param(req, 'id');
      await prisma.virtualCard.update({ where: { id }, data: { status: 'blocked' } });
      await auditLog(req, 'virtual_card_force_block', 'virtual_card', id, req.body);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

// =========================
// 8. DOCTORS admin (validation)
// =========================
router.get('/doctors/pending', authenticate, requireAnyAdmin, async (_req, res, next) => {
  try {
    const pendingProviders = await prisma.serviceProvider.findMany({
      where: {
        kyc_status: 'pending',
        service_categories: { has: 'doctor' },
      },
      include: { user: { select: { id: true, username: true, full_name: true, email: true } } },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: pendingProviders });
  } catch (err) { next(err); }
});

/** Approuve le KYC médecin : ServiceProvider + profil Doctor.is_verified (une transaction). */
router.post(
  '/doctors/:providerId/approve',
  authenticate,
  requireAnyAdmin,
  validateBody(z.object({ note: z.string().max(500).optional() })),
  async (req: AuthRequest, res, next) => {
    try {
      const providerId = param(req, 'providerId');
      const provider = await prisma.serviceProvider.findFirst({
        where: {
          id: providerId,
          service_categories: { has: 'doctor' },
        },
      });
      if (!provider) {
        res.status(404).json({ success: false, error: 'Fournisseur médecin introuvable' });
        return;
      }
      if (provider.kyc_status === 'verified') {
        res.json({ success: true, data: { already: true, providerId } });
        return;
      }

      await prisma.$transaction([
        prisma.serviceProvider.update({
          where: { id: providerId },
          data: {
            kyc_status: 'verified',
            is_verified: true,
            status: 'active',
          },
        }),
        prisma.doctor.updateMany({
          where: { user_id: provider.user_id },
          data: { is_verified: true },
        }),
      ]);
      await auditLog(req, 'doctor_kyc_approve', 'service_provider', providerId, {
        user_id: provider.user_id,
        note: (req.body as { note?: string })?.note,
      });
      res.json({ success: true, data: { providerId, user_id: provider.user_id } });
    } catch (err) { next(err); }
  },
);

// =========================
// 8b. RIDES — assignation chauffeur
// =========================
router.get('/rides', authenticate, requireAnyAdmin, async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const rides = await prisma.ride.findMany({
      where,
      include: {
        passenger: { select: { id: true, username: true, full_name: true, profile_image: true } },
        driver: { select: { id: true, username: true, full_name: true, profile_image: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: rides });
  } catch (err) { next(err); }
});

router.get('/drivers', authenticate, requireAnyAdmin, async (_req, res, next) => {
  try {
    const drivers = await prisma.driver.findMany({
      orderBy: { full_name: 'asc' },
      take: 200,
      include: {
        user: { select: { id: true, username: true, full_name: true, profile_image: true } },
      },
    });
    res.json({ success: true, data: drivers });
  } catch (err) { next(err); }
});

const assignDriverSchema = z.object({ driver_user_id: z.string().uuid() });

router.post(
  '/rides/:id/assign-driver',
  authenticate,
  requireAnyAdmin,
  validateBody(assignDriverSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const rideId = param(req, 'id');
      const { driver_user_id } = req.body as z.infer<typeof assignDriverSchema>;

      const [ride, driverRow] = await Promise.all([
        prisma.ride.findUnique({ where: { id: rideId } }),
        prisma.driver.findUnique({
          where: { user_id: driver_user_id },
          include: { user: { select: { id: true, full_name: true, username: true, profile_image: true } } },
        }),
      ]);
      if (!ride) {
        res.status(404).json({ success: false, error: 'Course introuvable' });
        return;
      }
      if (!driverRow || !driverRow.user) {
        res.status(400).json({ success: false, error: 'Chauffeur introuvable ou non vérifié' });
        return;
      }
      const terminal = ['completed', 'cancelled'];
      if (terminal.includes(ride.status)) {
        res.status(400).json({ success: false, error: 'La course est terminée ou annulée' });
        return;
      }

      const u = driverRow.user;
      const driverName = u.full_name || u.username || driverRow.full_name;
      const driverPhone = driverRow.phone;
      const driverAvatar = u.profile_image || driverRow.avatar || undefined;
      const updated = await prisma.ride.update({
        where: { id: rideId },
        data: {
          driver_id: driver_user_id,
          driver_name: driverName,
          driver_phone: driverPhone,
          driver_avatar: driverAvatar,
          status: ride.status === 'requested' ? 'accepted' : ride.status,
        },
        include: {
          passenger: { select: { id: true, username: true, full_name: true, profile_image: true } },
          driver: { select: { id: true, username: true, full_name: true, profile_image: true } },
        },
      });
      await auditLog(req, 'ride_assign_driver', 'ride', rideId, { driver_user_id });
      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  },
);

// =========================
// 8c. HÔTEL — fiche complète (hôtel + chambres)
// =========================
router.get('/hotels/:id/detail', authenticate, requireAnyAdmin, async (req, res, next) => {
  try {
    const id = param(req, 'id');
    const hotel = await prisma.hotel.findUnique({
      where: { id },
      include: { rooms: { orderBy: { name: 'asc' } } },
    });
    if (!hotel) {
      res.status(404).json({ success: false, error: 'Hôtel introuvable' });
      return;
    }
    res.json({ success: true, data: hotel });
  } catch (err) { next(err); }
});

const hotelRoomCreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  capacity: z.number().int().min(1).max(20).optional(),
  price_fcfa: z.number().positive(),
  images: z.array(z.string().min(1).max(2000)).optional(),
  amenities: z.array(z.string().max(80)).optional(),
  is_active: z.boolean().optional(),
});

router.post(
  '/hotels/:hotelId/rooms',
  authenticate,
  requireAnyAdmin,
  validateBody(hotelRoomCreateSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const hotelId = param(req, 'hotelId');
      const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
      if (!hotel) {
        res.status(404).json({ success: false, error: 'Hôtel introuvable' });
        return;
      }
      const body = req.body as z.infer<typeof hotelRoomCreateSchema>;
      const room = await prisma.hotelRoom.create({
        data: {
          hotel_id: hotelId,
          name: body.name,
          description: body.description,
          capacity: body.capacity ?? 2,
          price_fcfa: body.price_fcfa,
          images: body.images ?? [],
          amenities: body.amenities ?? [],
          is_active: body.is_active ?? true,
        },
      });
      await auditLog(req, 'hotel_room_create', 'hotel_room', room.id, { hotelId });
      res.status(201).json({ success: true, data: room });
    } catch (err) { next(err); }
  },
);

const hotelRoomPatchSchema = hotelRoomCreateSchema.partial();

router.patch(
  '/hotels/rooms/:roomId',
  authenticate,
  requireAnyAdmin,
  validateBody(hotelRoomPatchSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const roomId = param(req, 'roomId');
      const body = req.body as z.infer<typeof hotelRoomPatchSchema>;
      const room = await prisma.hotelRoom.update({ where: { id: roomId }, data: body });
      await auditLog(req, 'hotel_room_update', 'hotel_room', roomId, body);
      res.json({ success: true, data: room });
    } catch (err) { next(err); }
  },
);

// =========================
// 9. LIVE COMMERCE admin
// =========================
router.get('/live-commerce/top', authenticate, requireAnyAdmin, async (_req, res, next) => {
  try {
    const top = await prisma.livePinnedProduct.findMany({
      orderBy: { clicks_count: 'desc' },
      take: 30,
      include: {
        product: { select: { id: true, name: true, price: true, currency: true } },
        live_stream: { select: { id: true, title: true, creator_name: true } },
      },
    });
    res.json({ success: true, data: top });
  } catch (err) { next(err); }
});

export default router;
