import { describe, expect, it, vi } from 'vitest';
import {
  logCallExit,
  shouldReportCallExitToSentry,
} from './callCallExit';

const captureSentryMessage = vi.fn();
vi.mock('../lib/sentryMobile', () => ({
  captureSentryMessage: (...args: unknown[]) => captureSentryMessage(...args),
}));

describe('callCallExit', () => {
  it('shouldReportCallExitToSentry — failed toujours, ended jamais', () => {
    expect(shouldReportCallExitToSentry('failed')).toBe(true);
    expect(shouldReportCallExitToSentry('ended')).toBe(false);
    expect(shouldReportCallExitToSentry('declined')).toBe(false);
    expect(shouldReportCallExitToSentry('missed')).toBe(false);
  });

  it('shouldReportCallExitToSentry — cancelled en connecting/ringing seulement', () => {
    expect(
      shouldReportCallExitToSentry('cancelled', { callState: 'connecting' }),
    ).toBe(true);
    expect(
      shouldReportCallExitToSentry('cancelled', { callState: 'ringing' }),
    ).toBe(true);
    expect(
      shouldReportCallExitToSentry('cancelled', { callState: 'connected' }),
    ).toBe(false);
  });

  it('émet console.error avec reason et stack', () => {
    captureSentryMessage.mockClear();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logCallExit('ended', { callId: 'call-test', source: 'unit' });
    expect(spy).toHaveBeenCalled();
    const first = String(spy.mock.calls[0]?.[0] ?? '');
    expect(first).toContain('[AFW_CALL_EXIT]');
    expect(spy.mock.calls[0]?.[1]).toBe('ended');
    expect(captureSentryMessage).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('remonte failed vers Sentry', () => {
    captureSentryMessage.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    logCallExit('failed', {
      callId: 'call-prod',
      callState: 'connecting',
      role: 'receiver',
    });
    expect(captureSentryMessage).toHaveBeenCalledWith(
      'afw_call_exit:failed',
      'error',
      expect.objectContaining({
        feature: 'webrtc_call',
        reason: 'failed',
        callId: 'call-prod',
        callState: 'connecting',
        role: 'receiver',
      }),
    );
  });
});
