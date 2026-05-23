/**
 * CPO 9.33 — Alertes prix voyage (destination / hôtel)
 */
import prisma from '../config/database.js';

export interface CreateTravelAlertInput {
  user_id: string;
  type: 'flight' | 'hotel';
  origin?: string;
  destination: string;
  target_price: number;
  check_in?: Date;
  check_out?: Date;
}

class TravelAlertService {
  async create(data: CreateTravelAlertInput) {
    if (!data.destination?.trim() || data.target_price <= 0) {
      const err: any = new Error('destination et target_price > 0 requis');
      err.statusCode = 400;
      throw err;
    }
    if (!['flight', 'hotel'].includes(data.type)) {
      const err: any = new Error('type doit être flight ou hotel');
      err.statusCode = 400;
      throw err;
    }
    return prisma.travelPriceAlert.create({
      data: {
        user_id: data.user_id,
        type: data.type,
        origin: data.origin?.trim() || null,
        destination: data.destination.trim(),
        target_price: data.target_price,
        check_in: data.check_in || null,
        check_out: data.check_out || null,
      },
    });
  }

  async listByUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [alerts, total] = await Promise.all([
      prisma.travelPriceAlert.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.travelPriceAlert.count({ where: { user_id: userId } }),
    ]);
    return {
      alerts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async delete(alertId: string, userId: string) {
    const alert = await prisma.travelPriceAlert.findFirst({
      where: { id: alertId, user_id: userId },
    });
    if (!alert) {
      const err: any = new Error('Alerte introuvable');
      err.statusCode = 404;
      throw err;
    }
    await prisma.travelPriceAlert.delete({ where: { id: alertId } });
    return { success: true };
  }
}

const travelAlertService = new TravelAlertService();
export default travelAlertService;
