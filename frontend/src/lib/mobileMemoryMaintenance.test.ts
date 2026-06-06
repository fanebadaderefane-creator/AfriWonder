import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { QueryClient } from '@tanstack/react-query';

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
  AppState: {
    currentState: 'active',
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
}));

vi.mock('expo-image', () => ({
  Image: {
    clearMemoryCache: vi.fn(() => Promise.resolve()),
    clearDiskCache: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('./sentryMobile', () => ({
  captureSentryException: vi.fn(),
}));

describe('mobileMemoryMaintenance', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(async () => {
    const mod = await import('./mobileMemoryMaintenance');
    mod.stopMobileMemoryMaintenanceForTests();
  });

  it('trimMobileAppCaches respecte le cooldown', async () => {
    const { trimMobileAppCaches } = await import('./mobileMemoryMaintenance');
    const { Image } = await import('expo-image');
    trimMobileAppCaches('menu-plus-focus');
    trimMobileAppCaches('menu-plus-focus');
    expect(Image.clearMemoryCache).toHaveBeenCalledTimes(1);
  });

  it('trim force bypass le cooldown', async () => {
    const { trimMobileAppCaches } = await import('./mobileMemoryMaintenance');
    const { Image } = await import('expo-image');
    vi.mocked(Image.clearMemoryCache).mockClear();
    trimMobileAppCaches('route-change');
    trimMobileAppCaches('route-change', { force: true });
    expect(Image.clearMemoryCache).toHaveBeenCalledTimes(2);
  });

  it('purge les requêtes inactives du QueryClient enregistré', async () => {
    const removeQueries = vi.fn();
    const mockClient = {
      removeQueries,
    } as unknown as QueryClient;
    const mod = await import('./mobileMemoryMaintenance');
    mod.registerMobileQueryClient(mockClient);
    mod.trimMobileAppCaches('manual', { force: true });
    expect(removeQueries).toHaveBeenCalledTimes(1);
  });
});
