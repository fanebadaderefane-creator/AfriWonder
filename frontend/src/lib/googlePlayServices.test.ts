import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native-device-info', () => ({
  default: {
    hasGms: vi.fn(),
  },
}));

describe('googlePlayServices.android', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('retourne true quand hasGms() est true', async () => {
    const DeviceInfo = (await import('react-native-device-info')).default;
    vi.mocked(DeviceInfo.hasGms).mockResolvedValue(true);
    const { isGoogleMobileServicesReady, resetGoogleMobileServicesCacheForTests } = await import(
      './googlePlayServices.android'
    );
    resetGoogleMobileServicesCacheForTests();
    await expect(isGoogleMobileServicesReady()).resolves.toBe(true);
  });

  it('retourne false quand hasGms() est false (évite dialogue FCM)', async () => {
    const DeviceInfo = (await import('react-native-device-info')).default;
    vi.mocked(DeviceInfo.hasGms).mockResolvedValue(false);
    const { isGoogleMobileServicesReady, resetGoogleMobileServicesCacheForTests } = await import(
      './googlePlayServices.android'
    );
    resetGoogleMobileServicesCacheForTests();
    await expect(isGoogleMobileServicesReady()).resolves.toBe(false);
  });

  it('retourne false si hasGms() lève (prod sans crash)', async () => {
    const DeviceInfo = (await import('react-native-device-info')).default;
    vi.mocked(DeviceInfo.hasGms).mockRejectedValue(new Error('native missing'));
    const { isGoogleMobileServicesReady, resetGoogleMobileServicesCacheForTests } = await import(
      './googlePlayServices.android'
    );
    resetGoogleMobileServicesCacheForTests();
    await expect(isGoogleMobileServicesReady()).resolves.toBe(false);
  });
});

describe('googlePlayServices (fallback iOS)', () => {
  it('retourne true', async () => {
    const { isGoogleMobileServicesReady } = await import('./googlePlayServices');
    await expect(isGoogleMobileServicesReady()).resolves.toBe(true);
  });
});
