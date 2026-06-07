import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  isCallDebugEnabled,
  logCallPhase,
  shouldBreadcrumbCallPhase,
} from './callDebug';

const addSentryBreadcrumb = vi.fn();
vi.mock('../lib/sentryMobile', () => ({
  addSentryBreadcrumb: (...args: unknown[]) => addSentryBreadcrumb(...args),
}));

describe('callDebug', () => {
  beforeEach(() => {
    addSentryBreadcrumb.mockClear();
    delete process.env.EXPO_PUBLIC_CALL_DEBUG;
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_CALL_DEBUG;
    const g = globalThis as { __DEV__?: boolean };
    if ('__DEV__' in g) delete g.__DEV__;
  });

  it('shouldBreadcrumbCallPhase ignore ice_local et __DEV__', () => {
    const g = globalThis as { __DEV__?: boolean };
    g.__DEV__ = true;
    expect(shouldBreadcrumbCallPhase('bootstrap')).toBe(false);
    g.__DEV__ = false;
    expect(shouldBreadcrumbCallPhase('ice_local')).toBe(false);
    expect(shouldBreadcrumbCallPhase('sdp_send')).toBe(true);
  });

  it('logCallPhase ajoute breadcrumb Sentry en prod sans CALL_DEBUG', () => {
    const g = globalThis as { __DEV__?: boolean };
    g.__DEV__ = false;
    logCallPhase('call-1', 'media_connected', { ice: 'connected' });
    expect(addSentryBreadcrumb).toHaveBeenCalledWith(
      'afw_call',
      'media_connected',
      expect.objectContaining({ callId: 'call-1', ice: 'connected' }),
    );
  });

  it('isCallDebugEnabled suit EXPO_PUBLIC_CALL_DEBUG', () => {
    const g = globalThis as { __DEV__?: boolean };
    g.__DEV__ = false;
    expect(isCallDebugEnabled()).toBe(false);
    process.env.EXPO_PUBLIC_CALL_DEBUG = '1';
    expect(isCallDebugEnabled()).toBe(true);
  });
});
