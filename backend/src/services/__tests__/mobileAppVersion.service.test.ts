import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import prisma from '../../config/database.js';
import {
  DEFAULT_FORCE_UPDATE_MESSAGE,
  DEFAULT_SOFT_UPDATE_MESSAGE,
  getMobileAppVersionPolicy,
  getMobileAppVersionPolicyAsync,
  mergeMobileAppUpdatePolicyForTests,
  saveMobileAppUpdatePolicy,
} from '../mobileAppVersion.service.js';

describe('mobileAppVersion.service', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.MOBILE_ANDROID_LATEST_VERSION_CODE;
    delete process.env.MOBILE_ANDROID_MIN_VERSION_CODE;
    delete process.env.MOBILE_IOS_LATEST_BUILD_NUMBER;
    delete process.env.MOBILE_IOS_MIN_BUILD_NUMBER;
    jest.spyOn(prisma.platformSettings, 'findUnique').mockResolvedValue(null as never);
    jest.spyOn(prisma.platformSettings, 'upsert').mockResolvedValue({} as never);
  });

  afterEach(() => {
    process.env = env;
    jest.restoreAllMocks();
  });

  it('returns zero latest when env unset (no prompt côté client)', () => {
    const p = getMobileAppVersionPolicy();
    expect(p.android.latest_version_code).toBe(0);
    expect(p.ios.latest_version_code).toBe(0);
    expect(p.android.store_url).toContain('play.google.com');
    expect(p.android.update_message).toBe(DEFAULT_SOFT_UPDATE_MESSAGE);
    expect(p.android.force_update_message).toBe(DEFAULT_FORCE_UPDATE_MESSAGE);
    expect(p.android.use_play_in_app_update).toBe(true);
  });

  it('reads android version codes from env', () => {
    process.env.MOBILE_ANDROID_LATEST_VERSION_CODE = '25';
    process.env.MOBILE_ANDROID_MIN_VERSION_CODE = '22';
    const p = getMobileAppVersionPolicy();
    expect(p.android.latest_version_code).toBe(25);
    expect(p.android.min_version_code).toBe(22);
  });

  it('merges stored admin policy over env defaults', () => {
    const envPolicy = getMobileAppVersionPolicy().android;
    const merged = mergeMobileAppUpdatePolicyForTests(envPolicy, {
      latest_version_code: 30,
      min_version_code: 28,
      update_message: 'Message personnalisé',
      use_play_in_app_update: false,
    });
    expect(merged.latest_version_code).toBe(30);
    expect(merged.min_version_code).toBe(28);
    expect(merged.update_message).toBe('Message personnalisé');
    expect(merged.force_update_message).toBe(DEFAULT_FORCE_UPDATE_MESSAGE);
    expect(merged.use_play_in_app_update).toBe(false);
  });

  it('getMobileAppVersionPolicyAsync reads platformSettings', async () => {
    process.env.MOBILE_ANDROID_LATEST_VERSION_CODE = '24';
    jest.spyOn(prisma.platformSettings, 'findUnique').mockResolvedValue({
      key: 'mobile_app_update_policy',
      value: {
        android: { min_version_code: 20, update_message: 'MAJ admin' },
      },
      updated_at: new Date(),
    } as never);

    const p = await getMobileAppVersionPolicyAsync();
    expect(p.android.latest_version_code).toBe(24);
    expect(p.android.min_version_code).toBe(20);
    expect(p.android.update_message).toBe('MAJ admin');
  });

  it('saveMobileAppUpdatePolicy upserts merged payload', async () => {
    const upsert = jest.spyOn(prisma.platformSettings, 'upsert');
    await saveMobileAppUpdatePolicy({
      android: { latest_version_code: 26, force_update_message: 'Obligatoire' },
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'mobile_app_update_policy' },
        create: expect.objectContaining({
          value: expect.objectContaining({
            android: expect.objectContaining({ latest_version_code: 26 }),
          }),
        }),
      }),
    );
  });
});
