import liveService from '../live.service.js';

describe('liveService.getAgoraToken (appels DM)', () => {
  const savedAppId = process.env.AGORA_APP_ID;
  const savedCert = process.env.AGORA_APP_CERTIFICATE;

  afterEach(() => {
    if (savedAppId === undefined) delete process.env.AGORA_APP_ID;
    else process.env.AGORA_APP_ID = savedAppId;
    if (savedCert === undefined) delete process.env.AGORA_APP_CERTIFICATE;
    else process.env.AGORA_APP_CERTIFICATE = savedCert;
  });

  it('retourne null si AGORA_APP_ID / CERTIFICATE absents', async () => {
    delete process.env.AGORA_APP_ID;
    delete process.env.AGORA_APP_CERTIFICATE;
    const result = await liveService.getAgoraToken('dm_call-test', 'user-a', 'host');
    expect(result).toBeNull();
  });

  it('génère un token RTC valide pour canal dm_*', async () => {
    process.env.AGORA_APP_ID = 'a1b2c3d4e5f64782930405060708090a';
    process.env.AGORA_APP_CERTIFICATE = '0123456789abcdef0123456789abcdef';

    const result = await liveService.getAgoraToken('dm_call-test-123', 'user-b', 'host');
    expect(result).not.toBeNull();
    expect(result!.channel).toBe('dm_call-test-123');
    expect(result!.appId).toBe(process.env.AGORA_APP_ID);
    expect(typeof result!.token).toBe('string');
    expect(result!.token.length).toBeGreaterThan(32);
    expect(result!.uid).toBeGreaterThan(0);
    expect(result!.expireTime).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
