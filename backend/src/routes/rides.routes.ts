import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';
import platformControlService from '../services/platformControl.service.js';
import { requireKycFor } from '../services/kycRequired.service.js';
import { evaluate as riskEvaluate } from '../services/riskEngine.service.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const as = (req.query.as as string) || 'passenger';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = req.query.status as string | undefined;
    const where = as === 'driver' ? { driver_id: userId } : { passenger_id: userId };
    if (status) (where as Record<string, unknown>).status = status;
    const [rides, total] = await Promise.all([
      prisma.ride.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { passenger: { select: { id: true, full_name: true } }, driver: { select: { id: true, full_name: true } } },
      }),
      prisma.ride.count({ where }),
    ]);
    res.json({ success: true, data: { rides, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const ride = await prisma.ride.findFirst({
      where: { id, OR: [{ passenger_id: req.user!.id }, { driver_id: req.user!.id }] },
      include: { passenger: { select: { id: true, full_name: true } }, driver: { select: { id: true, full_name: true } } },
    });
    if (!ride) return res.status(404).json({ success: false, message: 'Course non trouvée' });
    res.json({ success: true, data: ride });
  } catch (e) {
    next(e);
  }
});

router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || (req.socket as any)?.remoteAddress;
    if (!(await platformControlService.isRideEnabled())) {
      return res.status(503).json({ success: false, message: 'Transport temporairement indisponible.' });
    }
    const kyc = await requireKycFor(userId, 'ride');
    if (!kyc.allowed) return res.status(403).json({ success: false, message: kyc.message });
    const risk = await riskEvaluate({ userId, ip, action: 'ride_create' });
    if (!risk.allowed) return res.status(403).json({ success: false, message: risk.reason || 'Action non autorisée.' });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { full_name: true } });
    const { pickup_location, pickup_lat, pickup_lng, dropoff_location, dropoff_lat, dropoff_lng, vehicle_type, payment_method, notes } = req.body;
    if (!pickup_location || !dropoff_location) return res.status(400).json({ success: false, message: 'pickup_location et dropoff_location requis' });
    const ride = await prisma.ride.create({
      data: {
        passenger_id: userId,
        passenger_name: user?.full_name ?? undefined,
        pickup_location,
        pickup_lat: pickup_lat != null ? Number(pickup_lat) : undefined,
        pickup_lng: pickup_lng != null ? Number(pickup_lng) : undefined,
        dropoff_location,
        dropoff_lat: dropoff_lat != null ? Number(dropoff_lat) : undefined,
        dropoff_lng: dropoff_lng != null ? Number(dropoff_lng) : undefined,
        vehicle_type: ['moto', 'car', 'tricycle', 'van'].includes(vehicle_type) ? vehicle_type : 'moto',
        payment_method: ['cash', 'wallet', 'mobile_money', 'card'].includes(payment_method) ? payment_method : 'cash',
        notes: notes || undefined,
        status: 'requested',
      },
    });
    res.status(201).json({ success: true, data: ride });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/status', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const { status, cancellation_fee, cancellation_reason } = req.body;
    const allowed = ['requested', 'accepted', 'driver_arriving', 'in_progress', 'completed', 'cancelled'];
    if (!status || !allowed.includes(status)) return res.status(400).json({ success: false, message: 'status invalide' });
    const ride = await prisma.ride.findFirst({ where: { id, OR: [{ passenger_id: req.user!.id }, { driver_id: req.user!.id }] } });
    if (!ride) return res.status(404).json({ success: false, message: 'Course non trouvée' });
    const data: Record<string, unknown> = { status };
    if (status === 'completed') data.completed_at = new Date();
    if (status === 'cancelled') {
      if (cancellation_fee != null) data.cancellation_fee = Number(cancellation_fee);
      if (cancellation_reason != null) data.cancellation_reason = String(cancellation_reason);
    }
    const updated = await prisma.ride.update({ where: { id }, data });
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

export default router;
