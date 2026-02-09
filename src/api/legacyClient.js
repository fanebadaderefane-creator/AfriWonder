// Client déprécié — ne plus utiliser
// Tous les appels API passent par src/api/expressClient.js
// Remplacer par : import { api } from '@/api/expressClient';

export const legacyApi = {
  auth: {
    me: () => { throw new Error('Use api.auth.me() from expressClient'); },
    login: () => { throw new Error('Use api.auth.login() from expressClient'); },
    logout: () => { throw new Error('Use api.auth.logout() from expressClient'); },
  },
  entities: {},
};
