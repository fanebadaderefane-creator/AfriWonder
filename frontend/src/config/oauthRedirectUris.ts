import * as AuthSession from 'expo-auth-session';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { getGoogleOAuthEnv, resolveGoogleClientIdsForNativeGoogleAuth } from './oauthEnv';
import { googleNativeReverseClientRedirectUri } from './googleNativeOAuthRedirect';
import {
  getGoogleInstalledAppRedirectUriForPlatform,
  type GoogleInstalledClientIds,
} from './googleInstalledAppRedirect';
import { devLog } from '../utils/devLog';

export type { GoogleInstalledClientIds } from './googleInstalledAppRedirect';
export { getGoogleInstalledAppRedirectUriForPlatform } from './googleInstalledAppRedirect';

/** Variante runtime : `Platform.OS` + IDs résolus (même logique que l’écran Connexion Google). */
export function getGoogleInstalledAppRedirectUri(
  ids: GoogleInstalledClientIds & { webClientId?: string },
): string | undefined {
  const expoGoAndroid =
    Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  return getGoogleInstalledAppRedirectUriForPlatform(Platform.OS, ids, {
    webClientId: ids.webClientId,
    skipCustomScheme: expoGoAndroid,
  });
}

/**
 * Même logique que `expo-auth-session/providers/google` (`native: ${applicationId}:/oauthredirect`).
 * En Expo Go → souvent `exp://IP:port/...` ; en APK/AAB → `com.afriwonder.app:/oauthredirect`.
 */
function googleProviderStyleRedirectNative(): string {
  const pkg =
    Platform.OS === 'ios'
      ? String(Constants.expoConfig?.ios?.bundleIdentifier || 'com.afriwonder.app').trim()
      : String(Constants.expoConfig?.android?.package || 'com.afriwonder.app').trim();
  return `${pkg}:/oauthredirect`;
}

/**
 * URI alignée sur le flux Google réel (`SocialOAuthButtons` ne force plus de `scheme` custom).
 * URLs http/https → client Web Google ; `com.googleusercontent.apps.…` → client Android (custom URI). Facebook : `exp://…` en Expo Go.
 */
export function getComputedOAuthRedirectUri(): string {
  try {
    if (Platform.OS === 'web') {
      return AuthSession.makeRedirectUri();
    }
    return AuthSession.makeRedirectUri({
      native: googleProviderStyleRedirectNative(),
    });
  } catch {
    return '';
  }
}

/** Variantes utiles (Google exige parfois avec ou sans « / » final). */
export function getOAuthRedirectUriVariantsForConsole(): string[] {
  const u = getComputedOAuthRedirectUri().trim();
  const out = new Set<string>();
  if (u) {
    out.add(u);
    if (u.endsWith('/')) {
      out.add(u.replace(/\/+$/, ''));
    } else {
      out.add(`${u}/`);
    }
  }
  if (Platform.OS !== 'web') {
    const ids = resolveGoogleClientIdsForNativeGoogleAuth(Platform.OS, getGoogleOAuthEnv());
    const webId = String(ids.webClientId || '').trim();
    for (const raw of [ids.androidClientId, ids.iosClientId].filter(Boolean) as string[]) {
      const id = raw.trim();
      /** Même ID que le client Web → pas de schéma `com.googleusercontent…` (interdit côté Google pour le type WEB). */
      if (webId && id === webId) continue;
      const rev = googleNativeReverseClientRedirectUri(id);
      if (rev) {
        out.add(rev);
        out.add(`${rev}/`);
      }
    }
  }
  return [...out];
}

/** Slug Expo (`app.json` → expo.slug), utile pour l’URI proxy https://auth.expo.io/@owner/slug */
export function getExpoSlug(): string {
  return String(Constants.expoConfig?.slug || 'afriwonder');
}

/**
 * Texte d’aide : URIs souvent exigées en Expo Go / dev.
 * Définissez EXPO_PUBLIC_EXPO_ACCOUNT (owner expo.dev) pour afficher l’URL proxy complète.
 */
export function getExpoOAuthRedirectHelpLines(): string[] {
  const slug = getExpoSlug();
  const computed = getComputedOAuthRedirectUri();
  const owner =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_EXPO_ACCOUNT?.trim()
      ? process.env.EXPO_PUBLIC_EXPO_ACCOUNT.trim()
      : '<expo_owner>';
  const proxy = `https://auth.expo.io/@${owner}/${slug}`;
  const lines = [
    `URI calculée (dev / build) : ${computed || '(indisponible sur ce runtime)'}`,
    `Expo Go / proxy classique (à ajouter aussi si vous utilisez Expo Go) : ${proxy}`,
    'Google : client Web → URI http/https ; client Android → paramètres avancés / schéma personnalisé pour com.googleusercontent.apps.…',
    'Facebook : Paramètres de l’app → Facebook Login → Paramètres → URI de redirection OAuth valides.',
  ];
  return lines;
}

/** Une seule fois par chargement JS (évite de croire à une erreur à chaque visite de /login). */
let oauthRedirectHelpLogged = false;

/**
 * Affiche dans la console (uniquement en `__DEV__`) les URI à déclarer chez Google / Meta.
 *
 * Ce n’est **pas** un diagnostic : le message peut s’afficher même si la console Google est déjà correcte.
 * Désactiver : `EXPO_PUBLIC_OAUTH_CONSOLE_HELP=0` dans `frontend/.env` puis redémarrer Metro.
 * Forcer à chaque ouverture de l’écran : `EXPO_PUBLIC_OAUTH_CONSOLE_HELP=verbose`.
 */
export function logOAuthRedirectDebugInfo(): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  const helpMode = String(process.env.EXPO_PUBLIC_OAUTH_CONSOLE_HELP ?? '')
    .trim()
    .toLowerCase();
  if (helpMode === '0' || helpMode === 'false' || helpMode === 'off' || helpMode === 'no') return;
  const verbose = helpMode === 'verbose' || helpMode === 'always' || helpMode === '1';
  if (oauthRedirectHelpLogged && !verbose) return;
  oauthRedirectHelpLogged = true;

  const variants = getOAuthRedirectUriVariantsForConsole();
  const slug = getExpoSlug();
  const owner = typeof process !== 'undefined' ? String(process.env?.EXPO_PUBLIC_EXPO_ACCOUNT || '').trim() : '';
  const proxy = owner ? `https://auth.expo.io/@${owner}/${slug}` : `https://auth.expo.io/@<votre_compte_expo>/${slug}`;

  const primaryNoSlash = (variants[0] || getComputedOAuthRedirectUri().trim() || 'http://localhost:8081').replace(
    /\/+$/,
    ''
  );

  const lines: string[] = [
    '',
    '━━━━━━━━ AfriWonder · OAuth — aide développement (pas une erreur) ━━━━━━━━',
    '',
    'Si Google / Meta sont déjà configurés, tu peux ignorer ce bloc ou le masquer :',
    'EXPO_PUBLIC_OAUTH_CONSOLE_HELP=0 dans frontend/.env (puis redémarrer Metro).',
    '',
    'Sur le WEB en dev, ① est souvent http://localhost:8081 — c’est NORMAL.',
    'À déclarer chez Google (client Web = http/https seulement) et Facebook ; pour com.googleusercontent.apps.… voir client Android (paramètres avancés) :',
    '',
    '① URI(s) utiles — Google client Web / Facebook ; variantes com.google… = client Android (custom URI), pas le formulaire Web :',
  ];
  for (const v of variants.length ? variants : ['(vide — ouvrez /login depuis l’app)']) {
    lines.push(`   • ${v}`);
  }
  lines.push(
    '',
    'Google (même client Web) → section « Origines JavaScript autorisées » : ajoutez aussi :',
    `   • ${primaryNoSlash}`,
    '',
    'Si erreur : détails Google → redirect_uri= ; sur console nouvelle, les URI com.google… vont sur le client Android (schéma personnalisé), pas sur le client Web.',
    '',
    '② Uniquement si tu testes avec Expo Go sur TÉLÉPHONE (pas le navigateur) : ajoute aussi :',
    `   ${proxy}`
  );
  if (!owner) {
    lines.push('   (Pour une URL ② exacte : EXPO_PUBLIC_EXPO_ACCOUNT=votre_login_expo dans frontend/.env)');
  }
  lines.push(
    '',
    'Rappel : les « clés » (Client ID Google, ID app Facebook) = autre chose ; elles vont dans frontend/.env',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ''
  );
  devLog(lines.join('\n'));
}
