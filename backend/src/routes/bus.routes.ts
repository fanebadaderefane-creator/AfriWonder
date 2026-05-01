import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../utils/zodValidation.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';

const router = Router();

// GET /api/bus/routes — rechercher un trajet bus
router.get('/routes', async (req, res, next) => {
  try {
    const origin = typeof req.query.origin === 'string' ? req.query.origin.trim() : '';
    const dest = typeof req.query.destination === 'string' ? req.query.destination.trim() : '';
    const where: Record<string, unknown> = { is_active: true };
    if (origin) where.origin_city = { equals: origin, mode: 'insensitive' };
    if (dest) where.destination_city = { equals: dest, mode: 'insensitive' };
    const routes = await prisma.busRoute.findMany({
      where,
      include: { company: true },
      orderBy: { departure_time: 'asc' },
      take: 100,
    });
    res.json({ success: true, data: routes });
  } catch (err) { next(err); }
});

// GET /api/bus/cities — villes disponibles
router.get('/cities', async (_req, res, next) => {
  try {
    const routes = await prisma.busRoute.findMany({
      where: { is_active: true },
      select: { origin_city: true, destination_city: true },
    });
    const set = new Set<string>();
    for (const r of routes) {
      set.add(r.origin_city);
      set.add(r.destination_city);
    }
    res.json({ success: true, data: [...set].sort() });
  } catch (err) { next(err); }
});

const bookSchema = z.object({
  route_id: z.string().uuid(),
  travel_date: z.string(),
  seats: z.number().int().min(1).max(10),
  passenger_name: z.string().min(2).max(120),
  passenger_phone: z.string().min(8).max(20),
  payment_method: z.enum(['wallet', 'orange_money', 'wave', 'mtn_money', 'moov_money']).optional(),
});

// POST /api/bus/bookings — réserver un billet
router.post('/bookings', authenticate, validateBody(bookSchema), async (req: AuthRequest, res, next) => {
  try {
    const { route_id, travel_date, seats, passenger_name, passenger_phone, payment_method } = req.body as z.infer<typeof bookSchema>;
    const route = await prisma.busRoute.findUnique({ where: { id: route_id } });
    if (!route || !route.is_active) return res.status(404).json({ success: false, error: 'Trajet introuvable.' });
    const total = route.price_fcfa * seats;
    const reference = `BUS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const booking = await prisma.busBooking.create({
      data: {
        route_id,
        passenger_id: req.user!.id,
        passenger_name,
        passenger_phone,
        travel_date: new Date(travel_date),
        seats,
        total_fcfa: total,
        reference,
        status: 'pending',
        payment_status: 'unpaid',
        payment_method,
      },
      include: { route: { include: { company: true } } },
    });
    return res.status(201).json({ success: true, data: booking });
  } catch (err) { return next(err); }
});

// GET /api/bus/bookings — mes réservations
router.get('/bookings', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const bookings = await prisma.busBooking.findMany({
      where: { passenger_id: req.user!.id },
      include: { route: { include: { company: true } } },
      orderBy: { travel_date: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: bookings });
  } catch (err) { next(err); }
});

// GET /api/bus/bookings/:id
router.get('/bookings/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const b = await prisma.busBooking.findFirst({
      where: { id, passenger_id: req.user!.id },
      include: { route: { include: { company: true } } },
    });
    if (!b) return res.status(404).json({ success: false, error: 'Réservation introuvable.' });
    return res.json({ success: true, data: b });
  } catch (err) { return next(err); }
});

export default router;
