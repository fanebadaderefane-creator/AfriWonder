import Constants from 'expo-constants';

/**
 * `true` dans **Expo Go** (scan QR « Go »).
 * SDK 53+ : pas de push distant Android ; charger `expo-notifications` déclenche une erreur console au boot.
 */
export function isExpoGoApp(): boolean {
  return Constants.appOwnership === 'expo';
}
