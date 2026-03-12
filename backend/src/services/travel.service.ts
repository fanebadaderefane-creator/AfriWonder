import prisma from '../config/database.js';

export const travelService = {
  async listHotels(city?: string, country?: string, page = 1, limit = 20) {
    const where: { city?: string; country?: string } = {};
    if (city) where.city = city;
    if (country) where.country = country;
    const [items, total] = await Promise.all([
      prisma.travelHotel.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.travelHotel.count({ where }),
    ]);
    return { items, total, page, limit };
  },

  async listFlights(origin?: string, destination?: string, page = 1, limit = 20) {
    const where: { origin?: string; destination?: string } = {};
    if (origin) where.origin = origin;
    if (destination) where.destination = destination;
    const [items, total] = await Promise.all([
      prisma.travelFlight.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { departure_at: 'asc' },
      }),
      prisma.travelFlight.count({ where }),
    ]);
    return { items, total, page, limit };
  },

  async createHotelBooking(userId: string, data: { hotel_id: string; check_in: string; check_out: string; guests?: number }) {
    const hotel = await prisma.travelHotel.findUnique({ where: { id: data.hotel_id } });
    if (!hotel) throw new Error('Hotel not found');
    const nights = Math.ceil((new Date(data.check_out).getTime() - new Date(data.check_in).getTime()) / (24 * 60 * 60 * 1000));
    const total_cents = hotel.price_per_night_cents * nights * (data.guests || 1);
    return prisma.travelBooking.create({
      data: {
        user_id: userId,
        type: 'hotel',
        hotel_id: data.hotel_id,
        check_in: new Date(data.check_in),
        check_out: new Date(data.check_out),
        guests: data.guests ?? 1,
        total_cents,
        currency: hotel.currency,
        status: 'pending',
      },
      include: { hotel: true },
    });
  },

  async createFlightBooking(userId: string, data: { flight_id: string }) {
    const flight = await prisma.travelFlight.findUnique({ where: { id: data.flight_id } });
    if (!flight) throw new Error('Flight not found');
    return prisma.travelBooking.create({
      data: {
        user_id: userId,
        type: 'flight',
        flight_id: data.flight_id,
        total_cents: flight.price_cents,
        currency: flight.currency,
        status: 'pending',
      },
      include: { flight: true },
    });
  },

  async getMyBookings(userId: string, page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      prisma.travelBooking.findMany({
        where: { user_id: userId },
        include: { hotel: true, flight: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.travelBooking.count({ where: { user_id: userId } }),
    ]);
    return { items, total, page, limit };
  },
};
