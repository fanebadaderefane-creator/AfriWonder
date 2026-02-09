// Base44 Client - DEPRECATED
// This file is kept for reference only
// All API calls now use src/api/expressClient.js

// If you see errors related to base44, it means some code still references it
// Replace with: import { api } from '@/api/expressClient';

export const base44 = {
  auth: {
    me: () => { throw new Error('Use api.auth.me() from expressClient'); },
    login: () => { throw new Error('Use api.auth.login() from expressClient'); },
    logout: () => { throw new Error('Use api.auth.logout() from expressClient'); },
  },
  entities: {}, 
};
