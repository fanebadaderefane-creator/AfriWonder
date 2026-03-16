/**
 * CPO 9.22 — Co-voiturage
 */
import prisma from '../config/database.js';

export interface CreateRideShareInput {
  driver_id: string;
  origin: string;
  destination: string;
  departure_at: Date;
  seats_available?: number;
  price_per_seat?: number;
  notes?: string;
}

export interface ListRideShareOptions {
  page?: number;
  limit?: number;
  origin?: string;
  destination?: string;
  from_date?: Date;
  to_date?: Date;
  status?: string;
}

class RideShareService {
  async create(data: CreateRideShareInput) {
    const seats = Math.max(1, Math.min(8, data.seats_available ?? 4));
    const price = Math.max(0, data.price_per_seat ?? 0);
    if (!data.origin?.trim() || !data.destination?.trim()) {
      const err: any = new Error('origin et destination requis');
      err.statusCode = 400;
      throw err;
    }
    if (data.departure_at <= new Date()) {
      const err: any = new Error('La date de départ doit être dans le futur');
      err.statusCode = 400;
      throw err;
    }
    return prisma.rideShare.create({
      data: {
        driver_id: data.driver_id,
        origin: data.origin.trim(),
        destination: data.destination.trim(),
        departure_at: data.departure_at,
        seats_available: seats,
        price_per_seat: price,
        notes: data.notes?.trim() || null,
        status: 'open',
      },
      include: {
        driver: { select: { id: true, full_name: true, profile_image: true } },
      },
    });
  }

  async list(options: ListRideShareOptions = {}) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(50, Math.max(1, options.limit ?? 20));
    const skip = (page - 1) * limit;
    const where: any = { status: 'open' };
    if (options.origin?.trim()) {
      where.origin = { contains: options.origin.trim(), mode: 'insensitive' };
    }
    if (options.destination?.trim()) {
      where.destination = { contains: options.destination.trim(), mode: 'insensitive' };
    }
    if (options.from_date) {
      where.departure_at = { ...where.departure_at, gte: options.from_date };
    }
    if (options.to_date) {
      where.departure_at = { ...where.departure_at, lte: options.to_date };
    }
    if (options.status) {
      where.status = options.status;
    }
    const [rides, total] = await Promise.all([
      prisma.rideShare.findMany({
        where,
        include: {
          driver: { select: { id: true, full_name: true, profile_image: true } },
          _count: { select: { bookings: true } },
        },
        orderBy: { departure_at: 'asc' },
        skip,
        take: limit,
      }),
      prisma.rideShare.count({ where }),
    ]);
    const ridesWithSeatsLeft = rides.map((r) => {
      const booked = r._count.bookings;
      const seatsLeft = Math.max(0, r.seats_available - booked);
      const { _count, ...rest } = r;
      return { ...rest, seats_left: seatsLeft, bookings_count: booked };
    });
    return {
      rides: ridesWithSeatsLeft,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const ride = await prisma.rideShare.findUnique({
      where: { id },
      include: {
        driver: { select: { id: true, full_name: true, profile_image: true } },
        bookings: { include: { passenger: { select: { id: true, full_name: true } } } },
      },
    });
    if (!ride) return null;
    const totalBooked = ride.bookings.reduce((s, b) => s + b.seats, 0);
    return { ...ride, seats_left: Math.max(0, ride.seats_available - totalBooked) };
  }

  async book(rideShareId: string, passengerId: string, seats = 1) {
    const ride = await prisma.rideShare.findUnique({
      where: { id: rideShareId },
      include: { bookings: true },
    });
    if (!ride) {
      const err: any = new Error('Trajet introuvable');
      err.statusCode = 404;
      throw err;
    }
    if (ride.status !== 'open') {
      const err: any = new Error('Ce trajet n\'accepte plus de passagers');
      err.statusCode = 400;
      throw err;
    }
    if (ride.driver_id === passengerId) {
      const err: any = new Error('Le conducteur ne peut pas réserver sa propre place');
      err.statusCode = 400;
      throw err;
    }
    const totalBooked = ride.bookings.reduce((s, b) => s + b.seats, 0);
    const seatsLeft = ride.seats_available - totalBooked;
    if (seats < 1 || seats > seatsLeft) {
      const err: any = new Error(`Places disponibles: ${seatsLeft}`);
      err.statusCode = 400;
      throw err;
    }
    const existing = ride.bookings.find((b) => b.passenger_id === passengerId);
    if (existing) {
      const err: any = new Error('Vous avez déjà réservé une place sur ce trajet');
      err.statusCode = 400;
      throw err;
    }
    return prisma.rideShareBooking.create({
      data: { ride_share_id: rideShareId, passenger_id: passengerId, seats },
      include: {
        ride_share: { include: { driver: { select: { full_name: true } } } },
      },
    });
  }

  async listMyRides(userId: string, asDriver: boolean) {
    const where = asDriver ? { driver_id: userId } : { bookings: { some: { passenger_id: userId } } };
    return prisma.rideShare.findMany({
      where,
      include: {
        driver: { select: { id: true, full_name: true, profile_image: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { departure_at: 'desc' },
    });
  }
}

const rideShareService = new RideShareService();
export default rideShareService;
