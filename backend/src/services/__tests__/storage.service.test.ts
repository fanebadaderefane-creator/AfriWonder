import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  getCdnBaseUrl,
  resolveStorageProviderFromEnv,
  isMediaStorageOperational,
} from '../storage.service.js';

describe('storage.service', () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env = { ...prev };
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it('CDN_BASE_URL prime sur R2_PUBLIC_URL', () => {
    process.env.CDN_BASE_URL = 'https://cdn.example.com/';
    process.env.R2_PUBLIC_URL = 'https://r2.example/';
    expect(getCdnBaseUrl()).toBe('https://cdn.example.com');
  });

  it('STORAGE_PROVIDER=local sans dossier → choix local mais non opérationnel', () => {
    process.env.STORAGE_PROVIDER = 'local';
    delete process.env.LOCAL_MEDIA_ROOT;
    expect(resolveStorageProviderFromEnv()).toBe('local');
    expect(isMediaStorageOperational()).toBe(false);
  });
});
