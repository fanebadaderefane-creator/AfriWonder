import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';

/**
 * URI calculée comme `expo-auth-session` / `expo-linking` pour l’environnement actuel.
 * À déclarer chez **Google** (client OAuth de type Web) et **Facebook** (URI de redirection OAuth).
 */
export function getComputedOAuthRedirectUri(): string {
  try {
    return AuthSession.makeRedirectUri();
  } catch {
    return '';
  }
}

/** Variantes utiles (Google exige parfois avec ou sans « / » final). */
export function getOAuthRedirectUriVariantsForConsole(): string[] {
  const u = getComputedOAuthRedirectUri().trim();
  if (!u) return [];
  const out = new Set<string>([u]);
  if (u.endsWith('/')) {
    out.add(u.replace(/\/+$/, ''));
  } else {
    out.add(`${u}/`);
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
    'Google : Console → Identifiants → client Web → URI de redirection autorisées.',
    'Facebook : Paramètres de l’app → Facebook Login → Paramètres → URI de redirection OAuth valides.',
  ];
  return lines;
}

/**
 * Affiche dans la console Metro (uniquement en `__DEV__`) les URI à copier-coller
 * dans Google Cloud (client Web) et Meta (Facebook Login). Ouvre l’écran connexion / inscription pour déclencher.
 */
export function logOAuthRedirectDebugInfo(): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
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
    '━━━━━━━━ AfriWonder · OAuth (localhost) — quoi faire avec ça ? ━━━━━━━━',
    '',
    'Sur le WEB en dev, ① est souvent http://localhost:8081 — c’est NORMAL.',
    'Tu dois la déclarer chez Google et Facebook comme « URI de redirection » (voir plus bas).',
    '',
    '① URI(s) à copier dans « URI de redirection autorisées » (Google) et « URI OAuth valides » (Facebook) :',
  ];
  for (const v of variants.length ? variants : ['(vide — ouvrez /login depuis l’app)']) {
    lines.push(`   • ${v}`);
  }
  lines.push(
    '',
    'Google (même client Web) → section « Origines JavaScript autorisées » : ajoutez aussi :',
    `   • ${primaryNoSlash}`,
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
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
}
