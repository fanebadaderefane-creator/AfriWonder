import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-constants', () => ({
  default: {
    installationId: 'vitest-install-id-9abc',
    sessionId: undefined,
  },
}));

describe('applyAfriDeviceTrustToFetchInit', () => {
  it('ajoute X-AFW-Device-Id à une requête minimale', async () => {
    const { applyAfriDeviceTrustToFetchInit } = await import('./afwDeviceRequestId');
    const out = applyAfriDeviceTrustToFetchInit({ method: 'GET' });
    expect(out.headers).toBeInstanceOf(Headers);
    const h = out.headers as Headers;
    expect(h.get('X-AFW-Device-Id')).toBe('vitest-install-id-9abc');
  });

  it('préserve les en-têtes existants', async () => {
    const { applyAfriDeviceTrustToFetchInit } = await import('./afwDeviceRequestId');
    const out = applyAfriDeviceTrustToFetchInit({
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    const h = out.headers as Headers;
    expect(h.get('Accept')).toBe('application/json');
    expect(h.get('X-AFW-Device-Id')).toBeTruthy();
  });

  it('ne remplace pas X-AFW-Device-Id si déjà défini', async () => {
    const { applyAfriDeviceTrustToFetchInit } = await import('./afwDeviceRequestId');
    const out = applyAfriDeviceTrustToFetchInit({
      headers: { 'X-AFW-Device-Id': 'custom-preserved-id-8chars' },
    });
    const h = out.headers as Headers;
    expect(h.get('X-AFW-Device-Id')).toBe('custom-preserved-id-8chars');
  });
});
