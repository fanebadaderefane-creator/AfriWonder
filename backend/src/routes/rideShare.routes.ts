/**
 * CPO 9.22 — Co-voiturage
 */
import { Router } from 'express';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import rideShareService from '../services/rideShare.service.js';

const router = Router();

// GET /api/ride-share — liste des trajets (filtres: origin, destination, from_date, to_date, page, limit)
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const origin = req.query.origin as string | undefined;
    const destination = req.query.destination as string | undefined;
    const from_date = req.query.from_date ? new Date(req.query.from_date as string) : undefined;
    const to_date = req.query.to_date ? new Date(req.query.to_date as string) : undefined;
    const result = await rideShareService.list({
      page,
      limit,
      origin,
      destination,
      from_date: from_date && !isNaN(from_date.getTime()) ? from_date : undefined,
      to_date: to_date && !isNaN(to_date.getTime()) ? to_date : undefined,
    });
    res.json({ success: true, data: result.rides, pagination: result.pagination });
  } catch (e) {
    next(e);
  }
});

// GET /api/ride-share/me — mes trajets (conducteur ou passager)
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const asDriver = req.query.as === 'driver';
    const rides = await rideShareService.listMyRides(userId, asDriver);
    res.json({ success: true, data: rides });
  } catch (e) {
    next(e);
  }
});

// GET /api/ride-share/:id — détail d'un trajet
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const ride = await rideShareService.getById(param(req, 'id'));
    if (!ride) return res.status(404).json({ success: false, error: { message: 'Trajet introuvable' } });
    res.json({ success: true, data: ride });
  } catch (e) {
    next(e);
  }
});

// POST /api/ride-share — créer un trajet (conducteur)
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const driverId = req.user!.id;
    const { origin, destination, departure_at, seats_available, price_per_seat, notes } = req.body;
    const departureAt = departure_at ? new Date(departure_at) : null;
    if (!origin?.trim() || !destination?.trim() || !departureAt || isNaN(departureAt.getTime())) {
      return res.status(400).json({ success: false, error: { message: 'origin, destination et departure_at (ISO) requis' } });
    }
    const ride = await rideShareService.create({
      driver_id: driverId,
      origin: origin.trim(),
      destination: destination.trim(),
      departure_at: departureAt,
      seats_available: seats_available != null ? parseInt(String(seats_available), 10) : undefined,
      price_per_seat: price_per_seat != null ? parseFloat(String(price_per_seat)) : undefined,
      notes,
    });
    res.status(201).json({ success: true, data: ride });
  } catch (e: any) {
    if (e?.statusCode) return res.status(e.statusCode).json({ success: false, error: { message: e.message } });
    next(e);
  }
});

// POST /api/ride-share/:id/book — réserver une ou plusieurs places
router.post('/:id/book', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const rideShareId = param(req, 'id');
    const passengerId = req.user!.id;
    const seats = Math.max(1, parseInt(String(req.body?.seats), 10) || 1);
    const booking = await rideShareService.book(rideShareId, passengerId, seats);
    res.status(201).json({ success: true, data: booking, message: 'Réservation enregistrée' });
  } catch (e: any) {
    if (e?.statusCode) return res.status(e.statusCode).json({ success: false, error: { message: e.message } });
    next(e);
  }
});

export default router;
