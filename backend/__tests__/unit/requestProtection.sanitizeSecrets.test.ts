import { describe, expect, it } from '@jest/globals';
import { sanitizeDeep } from '../../src/middleware/requestProtection.middleware.js';

describe('requestProtection sanitizeDeep — secrets exempt from HTML stripping', () => {
  it('leaves password bytes unchanged (patterns look like event handlers)', () => {
    const tricky = 'LegitPass1 onclick=x-javascript:void(0) on2fa=stillpart';
    const out = sanitizeDeep({
      identifier: 'a@b.com',
      password: tricky,
    }) as { password: string };
    expect(out.password).toBe(tricky);
  });

  it('still sanitizes non-secret fields in same body', () => {
    const out = sanitizeDeep({
      password: 'safe',
      bio: '<script>x</script>hi',
    }) as { password: string; bio: string };
    expect(out.password).toBe('safe');
    expect(out.bio).toBe('hi');
  });
});
