import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('e2eeMonitoringAlert job', () => {
  let prisma: any;
  let notificationService: any;
  let e2eeService: any;
  let mod: any;

  beforeEach(async () => {
    jest.resetModules();
    jest.restoreAllMocks();

    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const notifMod = await import('../../services/notification.service.js');
    notificationService = notifMod.default;
    const e2eeMod = await import('../../services/e2ee.service.js');
    e2eeService = e2eeMod.default;

    mod = await import('../e2eeMonitoringAlert.job.js');
  });

  it('n envoie rien si e2ee healthy', async () => {
    jest.spyOn(e2eeService, 'getHealthSnapshot').mockResolvedValue({
      devices_registered: 10,
      prekeys_available: 120,
      envelopes_last_hour: 50,
      envelopes_last_day: 300,
      healthy: true,
      alerts: [],
      timestamp: new Date().toISOString(),
    } as any);

    jest.spyOn(prisma.user, 'findMany').mockResolvedValue([{ id: 'a1' }] as any);
    jest.spyOn(prisma.notification, 'findFirst').mockResolvedValue(null as any);
    const createSpy = jest.spyOn(notificationService, 'create').mockResolvedValue({ id: 'notif' } as any);

    const res = await mod.processE2eeMonitoringAlerts();
    expect(res.success).toBe(true);
    expect(res.alertedAdmins).toBe(0);
    expect(res.recoveredAdmins).toBe(0);
    expect(res.reason).toBe('healthy');
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('envoie aux admins quand alertes presentes et pas en cooldown', async () => {
    jest.spyOn(e2eeService, 'getHealthSnapshot').mockResolvedValue({
      devices_registered: 2,
      prekeys_available: 0,
      envelopes_last_hour: 0,
      envelopes_last_day: 1,
      healthy: false,
      alerts: ['prekeys_low'],
      timestamp: new Date().toISOString(),
    } as any);
    jest.spyOn(prisma.user, 'findMany').mockResolvedValue([{ id: 'a1' }, { id: 'a2' }] as any);
    jest.spyOn(prisma.notification, 'count').mockResolvedValue(0 as any);
    const createSpy = jest.spyOn(notificationService, 'create').mockResolvedValue({ id: 'notif' } as any);

    const res = await mod.processE2eeMonitoringAlerts();
    expect(res.success).toBe(true);
    expect(res.alertedAdmins).toBe(2);
    expect(res.recoveredAdmins).toBe(0);
    expect(createSpy).toHaveBeenCalledTimes(2);
  });

  it('respecte le cooldown pour la meme signature', async () => {
    jest.spyOn(e2eeService, 'getHealthSnapshot').mockResolvedValue({
      devices_registered: 1,
      prekeys_available: 0,
      envelopes_last_hour: 0,
      envelopes_last_day: 0,
      healthy: false,
      alerts: ['no_devices_registered', 'prekeys_low'],
      timestamp: new Date().toISOString(),
    } as any);
    jest.spyOn(prisma.user, 'findMany').mockResolvedValue([{ id: 'a1' }] as any);
    jest.spyOn(prisma.notification, 'count').mockResolvedValue(1 as any);
    const createSpy = jest.spyOn(notificationService, 'create').mockResolvedValue({ id: 'notif' } as any);

    const res = await mod.processE2eeMonitoringAlerts();
    expect(res.success).toBe(true);
    expect(res.alertedAdmins).toBe(0);
    expect(res.recoveredAdmins).toBe(0);
    expect(res.reason).toBe('cooldown');
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('envoie une notification de retablissement apres une alerte recente', async () => {
    jest.spyOn(e2eeService, 'getHealthSnapshot').mockResolvedValue({
      devices_registered: 10,
      prekeys_available: 120,
      envelopes_last_hour: 20,
      envelopes_last_day: 200,
      healthy: true,
      alerts: [],
      timestamp: new Date().toISOString(),
    } as any);
    jest.spyOn(prisma.user, 'findMany').mockResolvedValue([{ id: 'a1' }] as any);
    jest.spyOn(prisma.notification, 'findFirst').mockResolvedValue({
      id: 'n1',
      reference_id: 'prekeys_low',
      created_at: new Date(),
    } as any);
    jest.spyOn(prisma.notification, 'count').mockResolvedValue(0 as any);
    const createSpy = jest.spyOn(notificationService, 'create').mockResolvedValue({ id: 'notif' } as any);

    const res = await mod.processE2eeMonitoringAlerts();
    expect(res.success).toBe(true);
    expect(res.alertedAdmins).toBe(0);
    expect(res.recoveredAdmins).toBe(1);
    expect(res.reason).toBe('recovered_sent');
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({ type: 'e2ee_monitoring_recovered' }),
    );
  });

  it('n envoie pas de retablissement si deja envoye pour la meme alerte', async () => {
    jest.spyOn(e2eeService, 'getHealthSnapshot').mockResolvedValue({
      devices_registered: 10,
      prekeys_available: 120,
      envelopes_last_hour: 20,
      envelopes_last_day: 200,
      healthy: true,
      alerts: [],
      timestamp: new Date().toISOString(),
    } as any);
    jest.spyOn(prisma.user, 'findMany').mockResolvedValue([{ id: 'a1' }] as any);
    jest.spyOn(prisma.notification, 'findFirst').mockResolvedValue({
      id: 'n1',
      reference_id: 'prekeys_low',
      created_at: new Date(),
    } as any);
    jest.spyOn(prisma.notification, 'count').mockResolvedValue(1 as any);
    const createSpy = jest.spyOn(notificationService, 'create').mockResolvedValue({ id: 'notif' } as any);

    const res = await mod.processE2eeMonitoringAlerts();
    expect(res.success).toBe(true);
    expect(res.alertedAdmins).toBe(0);
    expect(res.recoveredAdmins).toBe(0);
    expect(res.reason).toBe('healthy');
    expect(createSpy).not.toHaveBeenCalled();
  });
});

