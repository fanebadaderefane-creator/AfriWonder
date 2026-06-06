import { describe, expect, it } from 'vitest';
import {
  NATIVE_RTC_UNMOUNT_DELAY_MS,
  nativeRtcTeardownDelayMs,
  shouldBlockNativeRtcUrlUpdate,
} from './callNativeTeardown';

describe('callNativeTeardown', () => {
  it('retarde le teardown natif, pas le web', () => {
    expect(nativeRtcTeardownDelayMs('android')).toBe(NATIVE_RTC_UNMOUNT_DELAY_MS);
    expect(nativeRtcTeardownDelayMs('ios')).toBe(NATIVE_RTC_UNMOUNT_DELAY_MS);
    expect(nativeRtcTeardownDelayMs('web')).toBe(0);
  });

  it('bloque les URL RTC pendant teardown ou après ended', () => {
    expect(shouldBlockNativeRtcUrlUpdate({ tearingDown: true, callEnded: false })).toBe(true);
    expect(shouldBlockNativeRtcUrlUpdate({ tearingDown: false, callEnded: true })).toBe(true);
    expect(shouldBlockNativeRtcUrlUpdate({ tearingDown: false, callEnded: false })).toBe(false);
  });
});
