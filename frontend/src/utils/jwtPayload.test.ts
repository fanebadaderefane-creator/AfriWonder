import { describe, expect, it } from 'vitest';
import { accessTokenExpiresWithin, getJwtExpSeconds } from './jwtPayload';

/** JWT factice : payload {"exp":2000000000} (~2033). */
const FAR_FUTURE_PAYLOAD = 'eyJhbGciOiJub25lIn0.' + 'eyJleHAiOjIwMDAwMDAwMDB9' + '.x';

describe('jwtPayload', () => {
  it('lit exp depuis un JWT valide', () => {
    expect(getJwtExpSeconds(FAR_FUTURE_PAYLOAD)).toBe(2000000000);
    /** Marge « court terme » : l’exp 2033 reste largement au-delà de 60 s. */
    expect(accessTokenExpiresWithin(FAR_FUTURE_PAYLOAD, 60)).toBe(false);
  });

  it('sans exp ou jeton invalide → considéré comme à rafraîchir', () => {
    expect(accessTokenExpiresWithin(null, 90)).toBe(true);
    expect(accessTokenExpiresWithin('', 90)).toBe(true);
    expect(accessTokenExpiresWithin('not-a-jwt', 90)).toBe(true);
    const payload = Buffer.from(JSON.stringify({ sub: 'x' }), 'utf8').toString('base64url');
    const noExp = `eyJhbGciOiJub25lIn0.${payload}.x`;
    expect(accessTokenExpiresWithin(noExp, 90)).toBe(true);
  });
});
