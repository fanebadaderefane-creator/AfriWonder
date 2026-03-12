import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { travelService } from '../services/travel.service.js';

const router = Router();

router.get('/hotels', async (req, res, next) => {
  try {
    const city = req.query.city as string | undefined;
    const country = req.query.country as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const result = await travelService.listHotels(city, country, page, limit);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.get('/flights', async (req, res, next) => {
  try {
    const origin = req.query.origin as string | undefined;
    const destination = req.query.destination as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const result = await travelService.listFlights(origin, destination, page, limit);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.post('/bookings/hotel', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { hotel_id, check_in, check_out, guests } = req.body;
    if (!hotel_id || !check_in || !check_out) {
      return res.status(400).json({ success: false, error: { message: 'hotel_id, check_in, check_out required' } });
    }
    const booking = await travelService.createHotelBooking(userId, { hotel_id, check_in, check_out, guests });
    res.status(201).json({ success: true, data: booking });
  } catch (e) {
    next(e);
  }
});

router.post('/bookings/flight', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { flight_id } = req.body;
    if (!flight_id) return res.status(400).json({ success: false, error: { message: 'flight_id required' } });
    const booking = await travelService.createFlightBooking(userId, { flight_id });
    res.status(201).json({ success: true, data: booking });
  } catch (e) {
    next(e);
  }
});

router.get('/bookings', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const result = await travelService.getMyBookings(userId, page, limit);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

export default router;
