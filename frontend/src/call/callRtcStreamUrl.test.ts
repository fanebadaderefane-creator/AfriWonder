import { describe, expect, it } from 'vitest';
import { isValidNativeRtcStreamUrl } from './callRtcStreamUrl';

describe('callRtcStreamUrl', () => {
  it('rejette URL vide, locale ou invalide', () => {
    expect(isValidNativeRtcStreamUrl('')).toBe(false);
    expect(isValidNativeRtcStreamUrl('   ')).toBe(false);
    expect(isValidNativeRtcStreamUrl(null)).toBe(false);
    expect(isValidNativeRtcStreamUrl('abc', { localUrl: 'abc' })).toBe(false);
    expect(isValidNativeRtcStreamUrl('null')).toBe(false);
    expect(isValidNativeRtcStreamUrl('0')).toBe(false);
    expect(isValidNativeRtcStreamUrl('false')).toBe(false);
  });

  it('accepte URL distante distincte', () => {
    expect(isValidNativeRtcStreamUrl('blob:abc-123', { localUrl: 'blob:local' })).toBe(true);
  });
});
