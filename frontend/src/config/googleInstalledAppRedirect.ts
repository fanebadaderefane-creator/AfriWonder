import { googleNativeReverseClientRedirectUri } from './googleNativeOAuthRedirect';

export type GoogleInstalledClientIds = {
  androidClientId?: string;
  iosClientId?: string;
};

export type GoogleInstalledRedirectOptions = {
  /**
   * Client OAuth **Web** : si le même ID est réutilisé comme `androidClientId` / `iosClientId`,
   * Google renvoie « Custom scheme URIs are not allowed for WEB client type » — ne pas forcer le schéma `com.googleusercontent…`.
   */
  webClientId?: string;
  /** Expo Go Android : flux avec client Web + redirect `exp://` / proxy, pas de reverse URI natif. */
  skipCustomScheme?: boolean;
};

/**
 * Redirection native exacte utilisée avec `Google.useAuthRequest` (PKCE + code).
 * À enregistrer pour le **client OAuth Android** (Google Cloud) : section **Paramètres avancés** → activer
 * le **schéma d’URI personnalisé** / custom URI, puis ajouter cette URI si le formulaire le demande.
 * Ne pas la mettre sur le client « Application Web » : la console n’accepte là que http/https.
 *
 * @see https://developers.google.com/identity/protocols/oauth2/native-app
 */
export function getGoogleInstalledAppRedirectUriForPlatform(
  os: string,
  ids: GoogleInstalledClientIds,
  opts?: GoogleInstalledRedirectOptions,
): string | undefined {
  if (os === 'web') return undefined;
  if (opts?.skipCustomScheme) return undefined;
  const cid = (os === 'android' ? ids.androidClientId : ids.iosClientId) || '';
  const trimmed = cid.trim();
  if (!trimmed) return undefined;
  const web = String(opts?.webClientId || '').trim();
  if (web && trimmed === web) return undefined;
  return googleNativeReverseClientRedirectUri(trimmed) || undefined;
}
