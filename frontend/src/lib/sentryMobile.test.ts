import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const initMock = vi.fn();

vi.mock('@sentry/react-native', () => ({
  init: initMock,
}));

describe('initMobileSentry', () => {
  beforeEach(() => {
    initMock.mockClear();
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    delete process.env.EXPO_PUBLIC_SENTRY_DEBUG;
    delete process.env.EXPO_PUBLIC_APP_ENV;
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    delete process.env.EXPO_PUBLIC_SENTRY_DEBUG;
  });

  it('ne fait rien sans DSN', async () => {
    vi.resetModules();
    const { initMobileSentry } = await import('./sentryMobile');
    initMobileSentry();
    initMobileSentry();
    expect(initMock).not.toHaveBeenCalled();
  });

  it('appelle Sentry.init en prod simulée quand DSN est défini', async () => {
    vi.resetModules();
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@o1.ingest.sentry.io/1';
    const g = globalThis as { __DEV__?: boolean };
    const prev = g.__DEV__;
    g.__DEV__ = false;
    const { initMobileSentry } = await import('./sentryMobile');
    initMobileSentry();
    g.__DEV__ = prev;
    expect(initMock).toHaveBeenCalledTimes(1);
    expect(initMock.mock.calls[0][0]).toMatchObject({
      dsn: 'https://public@o1.ingest.sentry.io/1',
      sendDefaultPii: false,
    });
  });
});
