import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { getMobileAppVersionPolicy } from '../mobileAppVersion.service.js';

describe('mobileAppVersion.service', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.MOBILE_ANDROID_LATEST_VERSION_CODE;
    delete process.env.MOBILE_ANDROID_MIN_VERSION_CODE;
    delete process.env.MOBILE_IOS_LATEST_BUILD_NUMBER;
    delete process.env.MOBILE_IOS_MIN_BUILD_NUMBER;
  });

  afterEach(() => {
    process.env = env;
  });

  it('returns zero latest when env unset (no prompt côté client)', () => {
    const p = getMobileAppVersionPolicy();
    expect(p.android.latest_version_code).toBe(0);
    expect(p.ios.latest_version_code).toBe(0);
    expect(p.android.store_url).toContain('play.google.com');
  });

  it('reads android version codes from env', () => {
    process.env.MOBILE_ANDROID_LATEST_VERSION_CODE = '25';
    process.env.MOBILE_ANDROID_MIN_VERSION_CODE = '22';
    const p = getMobileAppVersionPolicy();
    expect(p.android.latest_version_code).toBe(25);
    expect(p.android.min_version_code).toBe(22);
  });
});
