/**
 * URLs backend directes (hors `/api/proxy` Expo). Source de vérité des routes : `frontend/src/config/api.ts`.
 */
declare const __DEV__: boolean | undefined;

export const API_BASE_URL =
  typeof __DEV__ !== 'undefined' && __DEV__
    ? 'http://localhost:3000/api'
    : 'https://afri-wonder.vercel.app/api';

export const WS_URL =
  typeof __DEV__ !== 'undefined' && __DEV__
    ? 'http://localhost:3000'
    : 'https://afri-wonder.vercel.app';

export { API_ROUTES } from '../../../frontend/src/config/api';
