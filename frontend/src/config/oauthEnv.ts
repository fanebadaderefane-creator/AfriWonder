import { Platform } from 'react-native';

export type GoogleOAuthEnv = {
  web: string;
  ios: string;
  android: string;
};

function trim(key: string): string {
  return String(process.env[key] || '').trim();
}

export function getGoogleOAuthEnv(): GoogleOAuthEnv {
  return {
    web: trim('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'),
    ios: trim('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'),
    android: trim('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'),
  };
}

/**
 * IDs utilisés par `Google.useAuthRequest`.
 * - iOS : on peut retomber sur le client Web si le client iOS n’est pas renseigné (usage Expo courant).
 * - Android natif : **pas** de repli Web — Google exige un client de type « Android » avec le package
 *   `com.afriwonder.app` et les empreintes SHA-1 (debug + clé de signature Play / EAS) dans la console Google Cloud.
 */
export function resolveGoogleClientIds(env: GoogleOAuthEnv) {
  const web = env.web || undefined;
  const ios = (env.ios || env.web) || undefined;
  const android = env.android || undefined;
  return { webClientId: web, iosClientId: ios, androidClientId: android };
}

/**
 * Affiche le bouton Google uniquement si la plateforme courante a un client ID utilisable
 * (évite `invariantClientId` / crash Android quand seul iOS est renseigné).
 */
export function isGoogleOAuthConfiguredForPlatform(os: typeof Platform.OS, env: GoogleOAuthEnv): boolean {
  const r = resolveGoogleClientIds(env);
  if (os === 'ios') return Boolean(r.iosClientId);
  if (os === 'android') return Boolean(r.androidClientId);
  return Boolean(r.webClientId || r.iosClientId || r.androidClientId);
}

export function isFacebookOAuthConfigured(): boolean {
  return Boolean(trim('EXPO_PUBLIC_FACEBOOK_APP_ID'));
}

/** Désactive le bouton Apple : EXPO_PUBLIC_APPLE_SIGN_IN=0 | false | off */
export function isAppleSignInDisabledByEnv(): boolean {
  const v = trim('EXPO_PUBLIC_APPLE_SIGN_IN').toLowerCase();
  return v === '0' || v === 'false' || v === 'off' || v === 'no';
}
