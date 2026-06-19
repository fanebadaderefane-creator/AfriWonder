import { afterEach, describe, expect, it, vi } from 'vitest';

describe('shouldUseAgoraDmCalls', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('retourne false sur web même si le flag Agora est activé', async () => {
    vi.doMock('react-native', () => ({ Platform: { OS: 'web' } }));
    vi.doMock('../config/featureFlags', () => ({ featureFlags: { dmCallsAgora: true } }));
    const { shouldUseAgoraDmCalls } = await import('./dmCallMediaEngine');
    expect(shouldUseAgoraDmCalls()).toBe(false);
  });

  it('retourne true sur natif quand dmCallsAgora est activé', async () => {
    vi.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
    vi.doMock('../config/featureFlags', () => ({ featureFlags: { dmCallsAgora: true } }));
    const { shouldUseAgoraDmCalls } = await import('./dmCallMediaEngine');
    expect(shouldUseAgoraDmCalls()).toBe(true);
  });

  it('retourne false sur natif quand dmCallsAgora est désactivé (rollback WebRTC)', async () => {
    vi.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
    vi.doMock('../config/featureFlags', () => ({ featureFlags: { dmCallsAgora: false } }));
    const { shouldUseAgoraDmCalls } = await import('./dmCallMediaEngine');
    expect(shouldUseAgoraDmCalls()).toBe(false);
  });
});
