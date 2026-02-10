/**
 * Tests unitaires pour config/firebase.ts
 *
 * On mock firebase-admin pour éviter tout appel réel.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('config/firebase', () => {
  const initializeAppMock = jest.fn();
  const certMock = jest.fn();
  const messagingInstance = { send: jest.fn() };

  beforeEach(() => {
    jest.resetModules();

    jest.unstable_mockModule('firebase-admin', () => ({
      __esModule: true,
      default: {
        apps: [],
        initializeApp: initializeAppMock,
        credential: {
          cert: certMock,
        },
        messaging: () => messagingInstance,
      },
      // Certains bundlers accèdent aussi à l'export nommé
      initializeApp: initializeAppMock,
      credential: {
        cert: certMock,
      },
      messaging: () => messagingInstance,
    }));
  });

  it('initialise firebase-admin avec les credentials et exporte messaging', async () => {
    process.env.FCM_PROJECT_ID = 'test-project';
    process.env.FCM_PRIVATE_KEY_ID = 'key-id';
    process.env.FCM_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n';
    process.env.FCM_CLIENT_EMAIL = 'test@example.com';
    process.env.FCM_CLIENT_ID = 'client-id';

    const mod = await import('../firebase.js');

    expect(initializeAppMock).toHaveBeenCalledTimes(1);
    expect(certMock).toHaveBeenCalledTimes(1);
    expect(mod.messaging).toBe(messagingInstance);
  });
});

