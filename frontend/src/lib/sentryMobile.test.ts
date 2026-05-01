import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const initMock = vi.fn();
const captureMessageMock = vi.fn();

vi.mock('@sentry/react-native', () => ({
  default: {},
  init: initMock,
  captureMessage: captureMessageMock,
}));

describe('sentryMobile', () => {
  beforeEach(() => {
    initMock.mockReset();
    captureMessageMock.mockReset();
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    delete process.env.EXPO_PUBLIC_SENTRY_DEBUG;
    delete process.env.EXPO_PUBLIC_APP_ENV;
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    delete process.env.EXPO_PUBLIC_SENTRY_DEBUG;
    delete process.env.EXPO_PUBLIC_APP_ENV;
    const g = globalThis as { __DEV__?: boolean };
    if ('__DEV__' in g) delete g.__DEV__;
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
    g.__DEV__ = false;
    const { initMobileSentry } = await import('./sentryMobile');
    initMobileSentry();
    expect(initMock).toHaveBeenCalledTimes(1);
    expect(initMock.mock.calls[0][0]).toMatchObject({
      dsn: 'https://public@o1.ingest.sentry.io/1',
      sendDefaultPii: false,
      environment: 'production',
    });
  });

  it('en __DEV__ sans SENTRY_DEBUG, ne initialise pas même avec DSN', async () => {
    vi.resetModules();
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@o1.ingest.sentry.io/1';
    const g = globalThis as { __DEV__?: boolean };
    g.__DEV__ = true;
    const { initMobileSentry } = await import('./sentryMobile');
    initMobileSentry();
    expect(initMock).not.toHaveBeenCalled();
  });

  it('en __DEV__ avec EXPO_PUBLIC_SENTRY_DEBUG=1, initialise', async () => {
    vi.resetModules();
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@o1.ingest.sentry.io/1';
    process.env.EXPO_PUBLIC_SENTRY_DEBUG = '1';
    const g = globalThis as { __DEV__?: boolean };
    g.__DEV__ = true;
    const { initMobileSentry } = await import('./sentryMobile');
    initMobileSentry();
    expect(initMock).toHaveBeenCalledTimes(1);
  });

  it('utilise EXPO_PUBLIC_APP_ENV pour environment', async () => {
    vi.resetModules();
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@o1.ingest.sentry.io/1';
    process.env.EXPO_PUBLIC_APP_ENV = 'preview';
    const g = globalThis as { __DEV__?: boolean };
    g.__DEV__ = false;
    const { initMobileSentry } = await import('./sentryMobile');
    initMobileSentry();
    expect(initMock.mock.calls[0][0]).toMatchObject({ environment: 'preview' });
  });

  it('si Sentry.init lève, ne reste pas initialisé (réessai possible)', async () => {
    vi.resetModules();
    initMock.mockImplementationOnce(() => {
      throw new Error('init fail');
    });
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@o1.ingest.sentry.io/1';
    const g = globalThis as { __DEV__?: boolean };
    g.__DEV__ = false;
    const { initMobileSentry } = await import('./sentryMobile');
    initMobileSentry();
    initMock.mockImplementation(() => undefined);
    initMobileSentry();
    expect(initMock).toHaveBeenCalledTimes(2);
  });

  it('captureSentryMessage ne fait rien si non initialisé', async () => {
    vi.resetModules();
    const { captureSentryMessage } = await import('./sentryMobile');
    captureSentryMessage('hello');
    expect(captureMessageMock).not.toHaveBeenCalled();
  });

  it('captureSentryMessage envoie après init', async () => {
    vi.resetModules();
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@o1.ingest.sentry.io/1';
    const g = globalThis as { __DEV__?: boolean };
    g.__DEV__ = false;
    const { initMobileSentry, captureSentryMessage } = await import('./sentryMobile');
    initMobileSentry();
    captureSentryMessage('oops', 'warning', { id: 1 });
    expect(captureMessageMock).toHaveBeenCalledWith('oops', {
      level: 'warning',
      extra: { id: 1 },
    });
  });

  it('captureSentryMessage ignore une erreur Sentry', async () => {
    vi.resetModules();
    captureMessageMock.mockImplementationOnce(() => {
      throw new Error('network');
    });
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@o1.ingest.sentry.io/1';
    const g = globalThis as { __DEV__?: boolean };
    g.__DEV__ = false;
    const { initMobileSentry, captureSentryMessage } = await import('./sentryMobile');
    initMobileSentry();
    expect(() => captureSentryMessage('x')).not.toThrow();
  });
});
