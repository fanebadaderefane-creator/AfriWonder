import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));

const captureSentryException = vi.fn();
vi.mock('./sentryMobile', () => ({
  captureSentryException,
  isMobileSentryInitialized: () => false,
}));

describe('mobileRuntimeGuards', () => {
  beforeEach(() => {
    vi.resetModules();
    captureSentryException.mockClear();
  });

  it('installMobileRuntimeGuards est idempotent', async () => {
    const { installMobileRuntimeGuards } = await import('./mobileRuntimeGuards');
    expect(() => {
      installMobileRuntimeGuards();
      installMobileRuntimeGuards();
    }).not.toThrow();
  });
});
