import {
  assertPersistableMediaUrl,
  isLocalDevMediaUploadEnabled,
} from '../mediaUploadStorage.service.js';

describe('mediaUploadStorage.service', () => {
  const prevEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...prevEnv };
  });

  it('assertPersistableMediaUrl accepte https', () => {
    expect(() => assertPersistableMediaUrl('https://cdn.example.com/voice/a.m4a')).not.toThrow();
  });

  it('assertPersistableMediaUrl refuse blob et file', () => {
    expect(() => assertPersistableMediaUrl('blob:http://localhost/abc')).toThrow(/http/i);
    expect(() => assertPersistableMediaUrl('file:///tmp/x.jpg')).toThrow(/http/i);
  });

  it('isLocalDevMediaUploadEnabled respecte ALLOW_LOCAL_DM_UPLOAD', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_LOCAL_DM_UPLOAD = 'true';
    expect(isLocalDevMediaUploadEnabled()).toBe(true);
    process.env.ALLOW_LOCAL_DM_UPLOAD = 'false';
    expect(isLocalDevMediaUploadEnabled()).toBe(false);
    process.env.NODE_ENV = 'development';
    delete process.env.ALLOW_LOCAL_DM_UPLOAD;
    expect(isLocalDevMediaUploadEnabled()).toBe(true);
  });
});
