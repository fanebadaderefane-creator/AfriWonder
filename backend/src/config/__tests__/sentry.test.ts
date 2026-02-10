/**
 * Tests unitaires pour config/sentry.ts
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('config/sentry', () => {
  const ORIGINAL_ENV = process.env;
  const initMock = jest.fn();
  const captureExceptionMock = jest.fn();
  const captureMessageMock = jest.fn();
  const nodeProfilingIntegrationMock = jest.fn(() => ({ name: 'profiling' }));

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };

    jest.unstable_mockModule('@sentry/node', () => ({
      __esModule: true,
      init: initMock,
      captureException: captureExceptionMock,
      captureMessage: captureMessageMock,
    }));

    jest.unstable_mockModule('@sentry/profiling-node', () => ({
      __esModule: true,
      nodeProfilingIntegration: nodeProfilingIntegrationMock,
    }));
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.clearAllMocks();
  });

  it('n\'initialise pas Sentry quand SENTRY_DSN est absent', async () => {
    delete process.env.SENTRY_DSN;
    const { initSentry } = await import('../sentry.js');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    initSentry();

    expect(initMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('initialise Sentry quand SENTRY_DSN est défini', async () => {
    process.env.SENTRY_DSN = 'https://example@sentry.test/1';
    process.env.NODE_ENV = 'test';
    const { initSentry } = await import('../sentry.js');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    initSentry();

    expect(initMock).toHaveBeenCalledTimes(1);
    const args = initMock.mock.calls[0][0];
    expect(args.dsn).toBe(process.env.SENTRY_DSN);
    expect(typeof args.beforeSend).toBe('function');
    expect(nodeProfilingIntegrationMock).toHaveBeenCalled();

    logSpy.mockRestore();
  });

  it('captureError et captureMessage délèguent à Sentry', async () => {
    process.env.SENTRY_DSN = 'https://example@sentry.test/1';
    const { initSentry, captureError, captureMessage } = await import('../sentry.js');

    initSentry();

    const error = new Error('test');
    captureError(error, { foo: 'bar' });
    expect(captureExceptionMock).toHaveBeenCalledWith(error, {
      extra: { foo: 'bar' },
    });

    captureMessage('hello', 'warning');
    expect(captureMessageMock).toHaveBeenCalledWith('hello', 'warning');
  });
});

