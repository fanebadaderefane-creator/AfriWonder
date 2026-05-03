import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { applyExpoGoAndroidGoogleWebClientOverride } from './googleOAuthExpoGoPolicy';

export type GoogleOAuthEnv = {
  web: string;
  ios: string;
  android: string;
};

/** Rempli par `app.config.js` depuis les variables d’environnement au démarrage Metro / EAS (repli si l’inline `process.env` échoue). */
export type AfwOAuthExtra = {
  googleWebClientId?: string;
  googleIosClientId?: string;
  googleAndroidClientId?: string;
  facebookAppId?: string;
};

function trimEnv(key: string): string {
  return String(process.env[key] || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

function getAfwOAuthExtra(): AfwOAuthExtra {
  try {
    const raw = Constants.expoConfig?.extra as { afwOAuth?: AfwOAuthExtra } | undefined;
    const o = raw?.afwOAuth;
    if (!o || typeof o !== 'object') return {};
    return o;
  } catch {
    return {};
  }
}

export function getGoogleOAuthEnv(): GoogleOAuthEnv {
  const x = getAfwOAuthExtra();
  return {
    web: trimEnv('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID') || String(x.googleWebClientId || '').trim(),
    ios: trimEnv('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID') || String(x.googleIosClientId || '').trim(),
    android: trimEnv('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID') || String(x.googleAndroidClientId || '').trim(),
  };
}

export function getFacebookAppId(): string {
  const x = getAfwOAuthExtra();
  return trimEnv('EXPO_PUBLIC_FACEBOOK_APP_ID') || String(x.facebookAppId || '').trim();
}

/**
 * IDs utilisés par `Google.useAuthRequest`.
 * - iOS : on peut retomber sur le client Web si le client iOS n’est pas renseigné (usage Expo courant).
 * - Android **APK / dev build / standalone** : client « Android » + package `com.afriwonder.app` + SHA-1 dans Google Cloud.
 * - Android **Expo Go** : exception — voir `resolveGoogleClientIdsForNativeGoogleAuth` (client Web + redirect `exp://`).
 */
export function resolveGoogleClientIds(env: GoogleOAuthEnv) {
  const web = env.web || undefined;
  const ios = (env.ios || env.web) || undefined;
  const android = env.android || undefined;
  return { webClientId: web, iosClientId: ios, androidClientId: android };
}

/**
 * Sur **web**, `expo-auth-session` attend un `webClientId`. Si seul le client iOS est renseigné (erreur de config fréquente),
 * on réutilise cet ID pour le flux navigateur — à privilégier tout de même un client « Application Web » dans Google Cloud.
 * On ne replie **pas** le client Android vers le web (type d’identifiant incompatible).
 */
export function resolveGoogleClientIdsForAuthSession(
  os: typeof Platform.OS,
  env: GoogleOAuthEnv,
): ReturnType<typeof resolveGoogleClientIds> {
  const r = resolveGoogleClientIds(env);
  if (os !== 'web') return r;
  if (r.webClientId) return r;
  if (r.iosClientId) return { ...r, webClientId: r.iosClientId };
  return r;
}

/**
 * IDs passés à `Google.useAuthRequest` sur mobile.
 * Expo Go Android : le provider utilise `exp://…` ; il faut le **client Web** comme `client_id`, pas le client Android
 * (sinon Google renvoie `invalid_request`). APK / standalone : empreinte SHA + client Android inchangés.
 */
export function resolveGoogleClientIdsForNativeGoogleAuth(
  os: typeof Platform.OS,
  env: GoogleOAuthEnv,
): ReturnType<typeof resolveGoogleClientIds> {
  const base = resolveGoogleClientIdsForAuthSession(os, env);
  return applyExpoGoAndroidGoogleWebClientOverride(base, {
    platformOs: os,
    executionEnvironment: String(Constants.executionEnvironment ?? ''),
  });
}

/**
 * Affiche le bouton Google uniquement si la plateforme courante a un client ID utilisable
 * (évite `invariantClientId` / crash Android quand seul iOS est renseigné).
 */
export function isGoogleOAuthConfiguredForPlatform(os: typeof Platform.OS, env: GoogleOAuthEnv): boolean {
  const r = resolveGoogleClientIdsForAuthSession(os, env);
  if (os === 'ios') return Boolean(r.iosClientId);
  if (os === 'android') {
    const expoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (expoGo) return Boolean(r.webClientId || r.androidClientId);
    if (!r.androidClientId) return false;
    /**
     * Même chaîne que le client Web → erreur Google « Custom scheme URIs are not allowed for WEB client type ».
     * Il faut un **client OAuth de type Android** distinct dans Google Cloud (package + SHA-1).
     */
    if (r.webClientId && r.androidClientId.trim() === r.webClientId.trim()) return false;
    return true;
  }
  return Boolean(r.webClientId);
}

export function isFacebookOAuthConfigured(): boolean {
  return Boolean(getFacebookAppId());
}

/** Désactive le bouton Apple : EXPO_PUBLIC_APPLE_SIGN_IN=0 | false | off */
export function isAppleSignInDisabledByEnv(): boolean {
  const v = trimEnv('EXPO_PUBLIC_APPLE_SIGN_IN').toLowerCase();
  return v === '0' || v === 'false' || v === 'off' || v === 'no';
}

/** Message d’aide (dev) quand les boutons OAuth sont grisés / indisponibles. */
export function getOAuthMissingConfigHint(os: typeof Platform.OS): string {
  const env = getGoogleOAuthEnv();
  const lines: string[] = [];
  if (!isGoogleOAuthConfiguredForPlatform(os, env)) {
    lines.push(
      'Google : fichier frontend/.env (copie de .env.example) avec EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID pour le web ; EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID + SHA-1 (keystore debug/EAS/Play) dans Google Cloud pour Android.',
    );
  }
  if (!isFacebookOAuthConfigured()) {
    lines.push(
      'Facebook : EXPO_PUBLIC_FACEBOOK_APP_ID dans frontend/.env et URI de redirection OAuth valides dans Meta (voir logs Metro sur /login).',
    );
  }
  if (!lines.length) return '';
  return `\n\n— À vérifier —\n${lines.join('\n')}\nEnsuite : arrêter Metro puis relancer depuis le dossier frontend (npx expo start).`;
}
