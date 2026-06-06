/** Stub Vitest : évite le parse Flow de `react-native` sous Vite. */

type TestPlatformOs = 'web' | 'android' | 'ios';

function testPlatformOs(): TestPlatformOs {
  const g = globalThis as { __AFW_TEST_PLATFORM_OS?: TestPlatformOs };
  return g.__AFW_TEST_PLATFORM_OS ?? 'web';
}

export const Platform = {
  get OS(): TestPlatformOs {
    return testPlatformOs();
  },
  select: <T>(spec: { ios?: T; android?: T; web?: T; default?: T }): T | undefined => {
    const os = testPlatformOs();
    if (os === 'ios') return spec.ios ?? spec.default;
    if (os === 'android') return spec.android ?? spec.default;
    return spec.web ?? spec.default;
  },
};

export const AppState = {
  currentState: 'active' as const,
  addEventListener: (_e: string, _l: () => void) => ({ remove: () => {} }),
};

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(s: T) => s,
};
