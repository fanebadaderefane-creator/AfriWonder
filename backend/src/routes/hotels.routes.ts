import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../utils/zodValidation.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';

const router = Router();

// GET /api/hotels — recherche hôtels par ville
router.get('/', async (req, res, next) => {
  try {
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    const where: Record<string, unknown> = { is_active: true };
    if (city) where.city = { equals: city, mode: 'insensitive' };
    const hotels = await prisma.hotel.findMany({
      where,
      orderBy: { star_rating: 'desc' },
      take: 50,
      include: { _count: { select: { rooms: true } } },
    });
    res.json({ success: true, data: hotels });
  } catch (err) { next(err); }
});

// GET /api/hotels/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = param(req, 'id');
    const hotel = await prisma.hotel.findUnique({
      where: { id },
      include: { rooms: { where: { is_active: true } } },
    });
    if (!hotel) return res.status(404).json({ success: false, error: 'Hôtel introuvable.' });
    return res.json({ success: true, data: hotel });
  } catch (err) { return next(err); }
});

const bookSchema = z.object({
  hotel_id: z.string().uuid(),
  room_id: z.string().uuid(),
  check_in: z.string(),
  check_out: z.string(),
  guests_count: z.number().int().min(1).max(10),
  notes: z.string().max(500).optional(),
  payment_method: z.enum(['wallet', 'orange_money', 'wave', 'mtn_money', 'moov_money']).optional(),
});

router.post('/bookings', authenticate, validateBody(bookSchema), async (req: AuthRequest, res, next) => {
  try {
    const b = req.body as z.infer<typeof bookSchema>;
    const room = await prisma.hotelRoom.findUnique({ where: { id: b.room_id } });
    if (!room || !room.is_active) return res.status(404).json({ success: false, error: 'Chambre introuvable.' });
    const checkIn = new Date(b.check_in);
    const checkOut = new Date(b.check_out);
    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (24 * 60 * 60 * 1000)));
    const total = room.price_fcfa * nights;
    const reference = `HTL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const booking = await prisma.hotelBooking.create({
      data: {
        hotel_id: b.hotel_id,
        room_id: b.room_id,
        guest_id: req.user!.id,
        check_in: checkIn,
        check_out: checkOut,
        nights,
        guests_count: b.guests_count,
        total_fcfa: total,
        reference,
        notes: b.notes,
        payment_method: b.payment_method,
      },
      include: { hotel: true, room: true },
    });
    return res.status(201).json({ success: true, data: booking });
  } catch (err) { return next(err); }
});

router.get('/bookings/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const bookings = await prisma.hotelBooking.findMany({
      where: { guest_id: req.user!.id },
      include: { hotel: true, room: true },
      orderBy: { check_in: 'desc' },
    });
    res.json({ success: true, data: bookings });
  } catch (err) { next(err); }
});

export default router;
