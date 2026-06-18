import { agoraDmChannelFromCallId } from '../agoraDmChannel.js';

describe('agoraDmChannelFromCallId', () => {
  it('préfixe dm_ et conserve alphanum', () => {
    expect(agoraDmChannelFromCallId('call-1781727586194-abc')).toBe(
      'dm_call-1781727586194-abc',
    );
  });

  it('tronque à 64 caractères max', () => {
    const long = 'x'.repeat(80);
    expect(agoraDmChannelFromCallId(long).length).toBeLessThanOrEqual(64);
  });

  it('fallback si callId vide', () => {
    expect(agoraDmChannelFromCallId('')).toMatch(/^dm_dm_\d+$/);
  });
});
