import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('cookieConsent.service', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../cookieConsent.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('getUserPreferences crée des préférences par défaut si aucune n’existe', async () => {
    jest
      .spyOn(prisma.userCookiePreference, 'findUnique')
      .mockResolvedValueOnce(null);

    const createSpy = jest
      .spyOn(prisma.userCookiePreference, 'create')
      .mockResolvedValueOnce({ user_id: 'u1', essential: true } as any);

    const prefs = await service.getUserPreferences('u1');

    expect(prefs.user_id).toBe('u1');
    expect(createSpy).toHaveBeenCalled();
  });

  it('updateUserPreferences upsert et log le consentement', async () => {
    const upsertSpy = jest
      .spyOn(prisma.userCookiePreference, 'upsert')
      .mockResolvedValueOnce({ user_id: 'u1' } as any);

    const logSpy = jest
      .spyOn<any, any>(service as any, 'logConsent')
      .mockResolvedValueOnce(undefined);

    const prefs = await service.updateUserPreferences(
      'u1',
      { analytics: true },
      { ip_address: '1.2.3.4', user_agent: 'jest' },
    );

    expect(prefs.user_id).toBe('u1');
    expect(upsertSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('u1', 'cookies', true, {
      ip_address: '1.2.3.4',
      user_agent: 'jest',
    });
  });

  it('saveGuestConsent enregistre un consentement invité avec expiration', async () => {
    const createSpy = jest
      .spyOn(prisma.guestCookieConsent, 'create')
      .mockResolvedValueOnce({ id: 'g1' } as any);

    const res = await service.saveGuestConsent(
      'sess-1',
      { analytics: true, marketing: false, functional: true, social_media: false },
      '1.2.3.4',
    );

    expect(res.id).toBe('g1');
    expect(createSpy).toHaveBeenCalled();
  });

  it('hasConsent retourne false en cas d’erreur', async () => {
    const getSpy = jest
      .spyOn(service, 'getUserPreferences')
      .mockRejectedValueOnce(new Error('DB error'));

    const res = await service.hasConsent('u1', 'analytics');

    expect(res).toBe(false);
    expect(getSpy).toHaveBeenCalled();
  });
});

