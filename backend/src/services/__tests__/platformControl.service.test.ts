import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('platformControl.service', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../platformControl.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('getKillSwitchState retourne tout activé par défaut quand aucune config', async () => {
    jest.spyOn(prisma.platformSettings, 'findUnique').mockResolvedValue(null as any);

    const state = await service.getKillSwitchState();

    expect(state.marketplace_enabled).toBe(true);
    expect(state.payments_enabled).toBe(true);
    expect(state.videos_enabled).toBe(true);
    expect(state.maintenance_mode).toBe(true); // valeur par défaut: true si aucune entrée
  });

  it('setMaintenanceMode met à jour une entrée existante', async () => {
    const findSpy = jest
      .spyOn(prisma.platformSettings, 'findUnique')
      .mockResolvedValueOnce({ key: 'maintenance_mode', value: { enabled: false } } as any);

    const updateSpy = jest
      .spyOn(prisma.platformSettings, 'update')
      .mockResolvedValueOnce({} as any);

    const stateSpy = jest
      .spyOn(service, 'getKillSwitchState')
      .mockResolvedValueOnce({ maintenance_mode: true } as any);

    await service.setMaintenanceMode(true);

    expect(findSpy).toHaveBeenCalledWith({ where: { key: 'maintenance_mode' } });
    expect(updateSpy).toHaveBeenCalled();
    expect(stateSpy).toHaveBeenCalled();
  });

  it('setPaymentsEnabled crée une entrée si elle n’existe pas', async () => {
    const findSpy = jest
      .spyOn(prisma.platformSettings, 'findUnique')
      .mockResolvedValueOnce(null as any);

    const createSpy = jest
      .spyOn(prisma.platformSettings, 'create')
      .mockResolvedValueOnce({} as any);

    const stateSpy = jest
      .spyOn(service, 'getKillSwitchState')
      .mockResolvedValueOnce({ payments_enabled: false } as any);

    await service.setPaymentsEnabled(false);

    expect(findSpy).toHaveBeenCalledWith({ where: { key: 'payments_enabled' } });
    expect(createSpy).toHaveBeenCalled();
    expect(stateSpy).toHaveBeenCalled();
  });

  it('is*Enabled tient compte des modes maintenance / urgence', async () => {
    const stateSpy = jest
      .spyOn(service, 'getKillSwitchState')
      .mockResolvedValue({
        marketplace_enabled: true,
        payments_enabled: true,
        videos_enabled: true,
        ride_enabled: true,
        food_enabled: true,
        health_enabled: true,
        insurance_enabled: true,
        events_enabled: true,
        maintenance_mode: true,
        emergency_mode: false,
      } as any);

    expect(await service.isMarketplaceEnabled()).toBe(false);
    expect(await service.isPaymentsEnabled()).toBe(false);
    expect(await service.isVideosEnabled()).toBe(false);
    expect(await service.isRideEnabled()).toBe(false);
    expect(await service.isFoodEnabled()).toBe(false);
    expect(await service.isHealthEnabled()).toBe(false);
    expect(await service.isInsuranceEnabled()).toBe(false);
    expect(await service.isEventsEnabled()).toBe(false);

    expect(stateSpy).toHaveBeenCalled();
  });
});

