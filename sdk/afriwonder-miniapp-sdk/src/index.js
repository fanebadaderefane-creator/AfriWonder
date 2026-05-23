/**
 * @afriwonder/miniapp-sdk
 * AfriWonder for Business — SDK officiel mini-apps & intégrations (CDC Super-App).
 */

import { AfriWonderClient } from './client.js';

export { AfriWonderClient };

/** Programme B2B / audit roadmap Phase 4 */
export const AFRIWONDER_BUSINESS = {
  program: 'AfriWonder for Business',
  sdkName: '@afriwonder/miniapp-sdk',
  version: '1.1.0',
};

/**
 * Créer une instance du client.
 * @param {{ baseUrl?: string, apiKey?: string, token?: string|(() => Promise<string>) }} options
 * @returns {AfriWonderClient}
 */
export function createClient(options = {}) {
  return new AfriWonderClient(options);
}
