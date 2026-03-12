/**
 * @afriwonder/miniapp-sdk
 * SDK officiel pour développeurs de mini-apps AfriWonder — CDC Super-App.
 */

import { AfriWonderClient } from './client.js';

export { AfriWonderClient };

/**
 * Créer une instance du client.
 * @param {{ baseUrl?: string, apiKey?: string, token?: string|(() => Promise<string>) }} options
 * @returns {AfriWonderClient}
 */
export function createClient(options = {}) {
  return new AfriWonderClient(options);
}
