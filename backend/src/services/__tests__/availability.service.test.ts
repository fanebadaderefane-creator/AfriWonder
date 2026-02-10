import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('availability.service', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../availability.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('setAvailability supprime les anciennes dispos récurrentes puis crée les nouvelles', async () => {
    const deleteSpy = jest
      .spyOn(prisma.serviceAvailability, 'deleteMany')
      .mockResolvedValueOnce({ count: 3 } as any);

    const createSpy = jest
      .spyOn(prisma.serviceAvailability, 'create')
      .mockResolvedValue({ id: 'a1' } as any);

    const availabilities = [
      { day_of_week: 1, start_time: '09:00', end_time: '12:00', is_available: true },
      { day_of_week: 2, start_time: '14:00', end_time: '18:00', is_available: true },
    ];

    const result = await service.setAvailability('provider-1', availabilities);

    expect(deleteSpy).toHaveBeenCalledWith({
      where: { provider_id: 'provider-1', is_recurring: true },
    });
    expect(createSpy).toHaveBeenCalledTimes(2);
    expect(createSpy).toHaveBeenCalledWith({
      data: {
        provider_id: 'provider-1',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '12:00',
        is_available: true,
        is_recurring: true,
      },
    });
    expect(result.length).toBe(2);
  });

  it('getAvailability renvoie recurring, exceptions et unavailabilities', async () => {
    const recurringRows = [{ id: 'r1' }];
    const exceptionRows = [{ id: 'e1' }];
    const unavailRows = [{ id: 'u1' }];

    const recurringSpy = jest
      .spyOn(prisma.serviceAvailability, 'findMany')
      .mockResolvedValueOnce(recurringRows as any)
      .mockResolvedValueOnce(exceptionRows as any);

    const unavailSpy = jest
      .spyOn(prisma.serviceUnavailability, 'findMany')
      .mockResolvedValueOnce(unavailRows as any);

    const start = new Date('2024-01-01');
    const end = new Date('2024-01-31');
    const res = await service.getAvailability('provider-1', start, end);

    expect(recurringSpy).toHaveBeenCalledTimes(2);
    expect(unavailSpy).toHaveBeenCalledTimes(1);
    expect(res.recurring).toBe(recurringRows);
    expect(res.exceptions).toBe(exceptionRows);
    expect(res.unavailabilities).toBe(unavailRows);
  });

  it('addUnavailability crée une indisponibilité avec les bons champs', async () => {
    const createSpy = jest
      .spyOn(prisma.serviceUnavailability, 'create')
      .mockResolvedValueOnce({ id: 'u1' } as any);

    const start = new Date('2024-02-01');
    const end = new Date('2024-02-05');
    const res = await service.addUnavailability('provider-1', {
      start_date: start,
      end_date: end,
      reason: 'vacances',
      notes: 'fermé',
    });

    expect(res.id).toBe('u1');
    expect(createSpy).toHaveBeenCalledWith({
      data: {
        provider_id: 'provider-1',
        start_date: start,
        end_date: end,
        reason: 'vacances',
        notes: 'fermé',
      },
    });
  });

  it('checkAvailability retourne false si une indisponibilité couvre la date', async () => {
    jest
      .spyOn(prisma.serviceUnavailability, 'findFirst')
      .mockResolvedValueOnce({ id: 'u1' } as any);

    const available = await service.checkAvailability('provider-1', new Date(), '10:00');
    expect(available).toBe(false);
  });

  it('checkAvailability retourne false si aucune disponibilité récurrente', async () => {
    jest
      .spyOn(prisma.serviceUnavailability, 'findFirst')
      .mockResolvedValueOnce(null);

    jest
      .spyOn(prisma.serviceAvailability, 'findFirst')
      .mockResolvedValueOnce(null);

    const available = await service.checkAvailability('provider-1', new Date(), '10:00');
    expect(available).toBe(false);
  });

  it('checkAvailability applique la plage horaire et les réservations existantes', async () => {
    jest
      .spyOn(prisma.serviceUnavailability, 'findFirst')
      .mockResolvedValueOnce(null);

    jest
      .spyOn(prisma.serviceAvailability, 'findFirst')
      .mockResolvedValueOnce({
        start_time: '09:00',
        end_time: '17:00',
        is_available: true,
      } as any);

    // Aucun booking -> disponible
    const bookingSpy = jest
      .spyOn(prisma.serviceBooking, 'findFirst')
      .mockResolvedValueOnce(null);

    const date = new Date('2024-03-10T10:00:00Z');
    const ok = await service.checkAvailability('provider-1', date, '10:00');
    expect(ok).toBe(true);
    expect(bookingSpy).toHaveBeenCalled();

    // Avec booking existant -> false
    bookingSpy.mockResolvedValueOnce({ id: 'b1' } as any);
    const notOk = await service.checkAvailability('provider-1', date, '10:00');
    expect(notOk).toBe(false);
  });

  it('getAvailableSlots retourne une liste vide si pas de dispo récurrente', async () => {
    jest
      .spyOn(prisma.serviceAvailability, 'findFirst')
      .mockResolvedValueOnce(null);

    const slots = await service.getAvailableSlots('provider-1', new Date(), 60);
    expect(slots).toEqual([]);
  });
});

