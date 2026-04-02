/**
 * Routes API Transport - Conducteurs (Driver)
 */
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';
import { haversineKm } from '../utils/haversine.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// GET /api/drivers/nearby - Conducteurs à proximité (lat, lng = tri Haversine)
router.get('/nearby', async (req, res, next) => {
  try {
    const lat = req.query.lat != null ? Number(req.query.lat) : null;
    const lng = req.query.lng != null ? Number(req.query.lng) : null;
    const vehicleType = (req.query.vehicle_type as string) || undefined;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const maxDistanceKm = Math.min(50, Math.max(1, parseFloat(req.query.max_km as string) || 10));

    const where: Record<string, unknown> = { status: 'available' };
    if (vehicleType && ['moto', 'car', 'tricycle', 'van'].includes(vehicleType)) {
      where.vehicle_type = vehicleType;
    }
    if (lat != null && lng != null) {
      where.current_lat = { not: null };
      where.current_lng = { not: null };
    }

    const drivers = await prisma.driver.findMany({
      where,
      take: limit * 2,
      include: { user: { select: { id: true, full_name: true, profile_image: true } } },
    });

    let list = drivers.map((d) => ({
      id: d.id,
      user_id: d.user_id,
      full_name: d.full_name,
      phone: d.phone,
      avatar: d.avatar ?? d.user?.profile_image,
      vehicle_type: d.vehicle_type,
      vehicle_brand: d.vehicle_brand,
      vehicle_model: d.vehicle_model,
      license_plate: d.license_plate,
      rating: d.rating,
      total_rides: d.total_rides,
      current_lat: d.current_lat,
      current_lng: d.current_lng,
      status: d.status,
      distance_km: null as number | null,
    }));

    if (lat != null && lng != null && list.length) {
      list = list
        .map((d) => {
          if (d.current_lat != null && d.current_lng != null) {
            const km = haversineKm(lat, lng, d.current_lat, d.current_lng);
            return { ...d, distance_km: km };
          }
          return { ...d, distance_km: null };
        })
        .filter((d) => d.distance_km == null || d.distance_km <= maxDistanceKm)
        .sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999))
        .slice(0, limit);
    } else {
      list = list.slice(0, limit);
    }

    res.json({ success: true, data: { drivers: list } });
  } catch (e) {
    next(e);
  }
});

// GET /api/drivers/me - Mon profil conducteur
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { user_id: req.user!.id },
    });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Profil conducteur non trouvé' });
    }
    res.json({ success: true, data: driver });
  } catch (e) {
    next(e);
  }
});

// PUT /api/drivers/me - Créer ou mettre à jour mon profil conducteur
router.put('/me', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { full_name: true } });
    const {
      full_name,
      phone,
      email,
      avatar,
      vehicle_type,
      vehicle_brand,
      vehicle_model,
      vehicle_color,
      license_plate,
      license_number,
      license_expiry,
      bank_account,
      current_location,
      current_lat,
      current_lng,
      status,
    } = req.body;

    if (!phone || !vehicle_type || !license_plate) {
      return res.status(400).json({ success: false, message: 'phone, vehicle_type et license_plate requis' });
    }

    const driver = await prisma.driver.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        full_name: full_name ?? user?.full_name ?? 'Conducteur',
        phone,
        email: email ?? undefined,
        avatar: avatar ?? undefined,
        vehicle_type: ['moto', 'car', 'tricycle', 'van'].includes(vehicle_type) ? vehicle_type : 'moto',
        vehicle_brand: vehicle_brand ?? undefined,
        vehicle_model: vehicle_model ?? undefined,
        vehicle_color: vehicle_color ?? undefined,
        license_plate,
        license_number: license_number ?? undefined,
        license_expiry: license_expiry ? new Date(license_expiry) : undefined,
        bank_account: bank_account ?? undefined,
        current_location: current_location ?? undefined,
        current_lat: current_lat != null ? Number(current_lat) : undefined,
        current_lng: current_lng != null ? Number(current_lng) : undefined,
        status: ['offline', 'available', 'busy'].includes(status) ? status : 'offline',
      },
      update: {
        ...(full_name != null && { full_name }),
        ...(phone != null && { phone }),
        ...(email !== undefined && { email }),
        ...(avatar !== undefined && { avatar }),
        ...(vehicle_type != null && { vehicle_type: ['moto', 'car', 'tricycle', 'van'].includes(vehicle_type) ? vehicle_type : undefined }),
        ...(vehicle_brand !== undefined && { vehicle_brand }),
        ...(vehicle_model !== undefined && { vehicle_model }),
        ...(vehicle_color !== undefined && { vehicle_color }),
        ...(license_plate != null && { license_plate }),
        ...(license_number !== undefined && { license_number }),
        ...(license_expiry !== undefined && { license_expiry: license_expiry ? new Date(license_expiry) : undefined }),
        ...(bank_account !== undefined && { bank_account }),
        ...(current_location !== undefined && { current_location }),
        ...(current_lat !== undefined && { current_lat: current_lat != null ? Number(current_lat) : undefined }),
        ...(current_lng !== undefined && { current_lng: current_lng != null ? Number(current_lng) : undefined }),
        ...(status != null && { status: ['offline', 'available', 'busy'].includes(status) ? status : undefined }),
      },
    });
    res.json({ success: true, data: driver });
  } catch (e) {
    next(e);
  }
});

// GET /api/drivers/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = param(req, 'id');
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: { user: { select: { id: true, full_name: true, profile_image: true } } },
    });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Conducteur non trouvé' });
    }
    res.json({ success: true, data: driver });
  } catch (e) {
    next(e);
  }
});

export default router;
