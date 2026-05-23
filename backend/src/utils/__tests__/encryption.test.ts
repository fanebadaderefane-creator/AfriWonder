/**
 * Tests unitaires pour utils/encryption.ts
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('encryption utils', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    process.env.ENCRYPTION_SECRET = 'test-secret';
    process.env.WALLET_PIN_SALT = 'test-salt';
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('encrypt puis decrypt retournent le texte original', async () => {
    const { encrypt, decrypt } = await import('../encryption.js');
    const plain = 'Bonjour AfriWonder 123 !';

    const encrypted = encrypt(plain);
    expect(typeof encrypted).toBe('string');
    expect(encrypted).not.toBe(plain);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plain);
  });

  it('decrypt lève une erreur sur un format invalide', async () => {
    const { decrypt } = await import('../encryption.js');
    expect(() => decrypt('invalid-format')).toThrow('Format de données chiffrées invalide');
  });

  it('hashData produit un hash déterministe avec le même salt', async () => {
    const { hashData } = await import('../encryption.js');
    const h1 = hashData('1234');
    const h2 = hashData('1234');
    const h3 = hashData('5678');

    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });

  it('verifyHash retourne true pour le bon data / hash', async () => {
    const { hashData, verifyHash } = await import('../encryption.js');
    const hash = hashData('1234');
    expect(verifyHash('1234', hash)).toBe(true);
    expect(verifyHash('0000', hash)).toBe(false);
  });
});

