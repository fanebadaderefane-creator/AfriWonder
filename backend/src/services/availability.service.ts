/**
 * Service de gestion des disponibilités des prestataires
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

class AvailabilityService {
  /**
   * Définir les disponibilités d'un prestataire
   */
  async setAvailability(providerId: string, availabilities: {
    day_of_week: number; // 0 (Dimanche) à 6 (Samedi)
    start_time: string; // Format HH:mm
    end_time: string;
    is_available: boolean;
  }[]) {
    // Supprimer les anciennes disponibilités récurrentes
    await prisma.serviceAvailability.deleteMany({
      where: {
        provider_id: providerId,
        is_recurring: true,
      },
    });

    // Créer les nouvelles disponibilités
    const created = await Promise.all(
      availabilities.map((avail) =>
        prisma.serviceAvailability.create({
          data: {
            provider_id: providerId,
            day_of_week: avail.day_of_week,
            start_time: avail.start_time,
            end_time: avail.end_time,
            is_available: avail.is_available,
            is_recurring: true,
          },
        })
      )
    );

    logger.info('Disponibilités mises à jour', { providerId, count: created.length });
    return created;
  }

  /**
   * Récupérer les disponibilités d'un prestataire
   */
  async getAvailability(providerId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      provider_id: providerId,
    };

    const [recurring, exceptions, unavailabilities] = await Promise.all([
      // Disponibilités récurrentes
      prisma.serviceAvailability.findMany({
        where: {
          ...where,
          is_recurring: true,
        },
        orderBy: { day_of_week: 'asc' },
      }),
      // Exceptions (disponibilités spécifiques à une date)
      prisma.serviceAvailability.findMany({
        where: {
          ...where,
          is_recurring: false,
          ...(startDate && endDate && {
            specific_date: {
              gte: startDate,
              lte: endDate,
            },
          }),
        },
        orderBy: { specific_date: 'asc' },
      }),
      // Indisponibilités (congés, vacances)
      prisma.serviceUnavailability.findMany({
        where: {
          provider_id: providerId,
          ...(startDate && endDate && {
            OR: [
              {
                start_date: { lte: endDate },
                end_date: { gte: startDate },
              },
            ],
          }),
        },
        orderBy: { start_date: 'asc' },
      }),
    ]);

    return {
      recurring,
      exceptions,
      unavailabilities,
    };
  }

  /**
   * Ajouter une indisponibilité
   */
  async addUnavailability(providerId: string, data: {
    start_date: Date;
    end_date: Date;
    reason: string;
    notes?: string;
  }) {
    const unavailability = await prisma.serviceUnavailability.create({
      data: {
        provider_id: providerId,
        start_date: data.start_date,
        end_date: data.end_date,
        reason: data.reason,
        notes: data.notes,
      },
    });

    logger.info('Indisponibilité ajoutée', { providerId, unavailabilityId: unavailability.id });
    return unavailability;
  }

  /**
   * Vérifier la disponibilité d'un créneau
   */
  async checkAvailability(providerId: string, date: Date, time: string): Promise<boolean> {
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split('T')[0];

    // Vérifier les indisponibilités
    const unavailability = await prisma.serviceUnavailability.findFirst({
      where: {
        provider_id: providerId,
        start_date: { lte: date },
        end_date: { gte: date },
      },
    });

    if (unavailability) {
      return false;
    }

    // Vérifier les disponibilités récurrentes
    const recurring = await prisma.serviceAvailability.findFirst({
      where: {
        provider_id: providerId,
        day_of_week: dayOfWeek,
        is_recurring: true,
        is_available: true,
      },
    });

    if (!recurring) {
      return false;
    }

    // Vérifier si l'heure est dans la plage
    const [startHour, startMin] = recurring.start_time.split(':').map(Number);
    const [endHour, endMin] = recurring.end_time.split(':').map(Number);
    const [reqHour, reqMin] = time.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const reqMinutes = reqHour * 60 + reqMin;

    if (reqMinutes < startMinutes || reqMinutes >= endMinutes) {
      return false;
    }

    // Vérifier les exceptions
    const exception = await prisma.serviceAvailability.findFirst({
      where: {
        provider_id: providerId,
        specific_date: date,
        is_recurring: false,
      },
    });

    if (exception) {
      return exception.is_available;
    }

    // Vérifier les réservations existantes
    const existingBooking = await prisma.serviceBooking.findFirst({
      where: {
        provider_id: providerId,
        booking_date: date,
        booking_time: time,
        status: {
          notIn: ['cancelled', 'no_show'],
        },
      },
    });

    if (existingBooking) {
      return false;
    }

    return true;
  }

  /**
   * Obtenir les créneaux disponibles pour une date
   */
  async getAvailableSlots(providerId: string, date: Date, duration: number = 60): Promise<string[]> {
    const dayOfWeek = date.getDay();

    // Récupérer la disponibilité récurrente pour ce jour
    const recurring = await prisma.serviceAvailability.findFirst({
      where: {
        provider_id: providerId,
        day_of_week: dayOfWeek,
        is_recurring: true,
        is_available: true,
      },
    });

    if (!recurring) {
      return [];
    }

    // Vérifier les exceptions
    const exception = await prisma.serviceAvailability.findFirst({
      where: {
        provider_id: providerId,
        specific_date: date,
        is_recurring: false,
      },
    });

    if (exception && !exception.is_available) {
      return [];
    }

    // Vérifier les indisponibilités
    const unavailability = await prisma.serviceUnavailability.findFirst({
      where: {
        provider_id: providerId,
        start_date: { lte: date },
        end_date: { gte: date },
      },
    });

    if (unavailability) {
      return [];
    }

    // Générer les créneaux disponibles
    const [startHour, startMin] = recurring.start_time.split(':').map(Number);
    const [endHour, endMin] = recurring.end_time.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const slots: string[] = [];

    // Récupérer les réservations existantes pour cette date
    const existingBookings = await prisma.serviceBooking.findMany({
      where: {
        provider_id: providerId,
        booking_date: date,
        status: {
          notIn: ['cancelled', 'no_show'],
        },
      },
      select: {
        booking_time: true,
        duration: true,
      },
    });

    const bookedSlots = new Set<string>();
    existingBookings.forEach((booking) => {
      const [bookHour, bookMin] = booking.booking_time.split(':').map(Number);
      const bookStartMinutes = bookHour * 60 + bookMin;
      const bookEndMinutes = bookStartMinutes + booking.duration;

      // Marquer tous les créneaux occupés
      for (let m = bookStartMinutes; m < bookEndMinutes; m += 15) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        bookedSlots.add(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      }
    });

    // Générer les créneaux disponibles par tranches de 15 minutes
    for (let minutes = startMinutes; minutes <= endMinutes - duration; minutes += 15) {
      const hour = Math.floor(minutes / 60);
      const min = minutes % 60;
      const slot = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

      // Vérifier si le créneau est libre
      let isAvailable = true;
      for (let m = minutes; m < minutes + duration; m += 15) {
        const h = Math.floor(m / 60);
        const minCheck = m % 60;
        const checkSlot = `${h.toString().padStart(2, '0')}:${minCheck.toString().padStart(2, '0')}`;
        if (bookedSlots.has(checkSlot)) {
          isAvailable = false;
          break;
        }
      }

      if (isAvailable) {
        slots.push(slot);
      }
    }

    return slots;
  }
}

export default new AvailabilityService();
